-- SOON Core / Master Supabase migration DRAFT.
-- SUPERSEDED for approval by 20261007160000_egg_wallet_minimal_proposal.sql.
-- Do not apply: this earlier draft does not handle timeout/late completion or
-- cross-period refunds. Kept only to document the disabled Preview adapter.
-- Do not apply to the EGG Supabase project. Requires separate approval.
create table if not exists public.egg_credit_wallets (
  user_id uuid primary key,
  email text not null unique,
  plan text not null check (plan in ('free','creator')),
  included_balance integer not null default 0 check (included_balance >= 0),
  purchased_balance integer not null default 0 check (purchased_balance >= 0),
  monthly_allowance integer not null check (monthly_allowance in (30,150)),
  period_start timestamptz not null,
  period_end timestamptz not null,
  updated_at timestamptz not null default now(),
  check (period_end > period_start)
);

create table if not exists public.egg_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.egg_credit_wallets(user_id),
  email text not null,
  workspace_id uuid not null,
  idempotency_key text not null,
  action text not null check (action in ('soon_ai_chat','script_generate','egg_this_generate')),
  amount integer not null check (amount > 0),
  included_amount integer not null default 0 check (included_amount >= 0),
  purchased_amount integer not null default 0 check (purchased_amount >= 0),
  status text not null check (status in ('reserved','committed','refunded')),
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (included_amount + purchased_amount = amount)
);

alter table public.egg_credit_wallets enable row level security;
alter table public.egg_credit_ledger enable row level security;
revoke all on public.egg_credit_wallets, public.egg_credit_ledger from public, anon, authenticated;
grant select, insert, update, delete on public.egg_credit_wallets, public.egg_credit_ledger to service_role;

create or replace function public.provision_egg_credit_wallet(
  p_user_id uuid, p_email text, p_plan text, p_monthly_allowance integer,
  p_period_start timestamptz, p_period_end timestamptz
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if (p_plan='free' and p_monthly_allowance<>30)
     or (p_plan='creator' and p_monthly_allowance<>150)
     or p_plan not in ('free','creator') or p_period_end<=p_period_start then
    raise exception 'invalid_credit_entitlement';
  end if;
  insert into public.egg_credit_wallets(
    user_id,email,plan,included_balance,purchased_balance,monthly_allowance,
    period_start,period_end
  ) values (
    p_user_id,lower(trim(p_email)),p_plan,p_monthly_allowance,0,p_monthly_allowance,
    p_period_start,p_period_end
  )
  on conflict (user_id) do update set
    email=excluded.email,
    plan=excluded.plan,
    monthly_allowance=excluded.monthly_allowance,
    included_balance=case
      when public.egg_credit_wallets.period_start<>excluded.period_start
        or public.egg_credit_wallets.period_end<>excluded.period_end
      then excluded.monthly_allowance
      else public.egg_credit_wallets.included_balance
    end,
    period_start=excluded.period_start,
    period_end=excluded.period_end,
    updated_at=now();
end;
$$;

-- The application must provision/reset the wallet with server-verified period
-- boundaries before calling this function. Free periods are HK calendar months;
-- Creator periods are the active Stripe subscription's exact billing cycle.
create or replace function public.reserve_egg_credits(
  p_user_id uuid, p_email text, p_workspace_id uuid, p_idempotency_key text,
  p_action text, p_amount integer, p_policy_version text
)
returns table (outcome text, balance integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_wallet public.egg_credit_wallets%rowtype;
  v_existing public.egg_credit_ledger%rowtype;
  v_included integer;
  v_purchased integer;
begin
  if p_amount < 1 or p_action not in ('soon_ai_chat','script_generate','egg_this_generate')
     or length(trim(p_idempotency_key)) < 8 then
    raise exception 'invalid_credit_reservation';
  end if;
  select * into v_existing from public.egg_credit_ledger
    where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    select * into v_wallet from public.egg_credit_wallets where user_id = p_user_id;
    return query select ('already_' || v_existing.status)::text,
      (v_wallet.included_balance + v_wallet.purchased_balance)::integer;
    return;
  end if;

  select * into v_wallet from public.egg_credit_wallets where user_id = p_user_id for update;
  if not found or now() >= v_wallet.period_end then
    raise exception 'credit_wallet_period_not_provisioned';
  end if;
  if v_wallet.included_balance + v_wallet.purchased_balance < p_amount then
    return query select 'insufficient'::text,
      (v_wallet.included_balance + v_wallet.purchased_balance)::integer;
    return;
  end if;
  v_included := least(v_wallet.included_balance, p_amount);
  v_purchased := p_amount - v_included;
  update public.egg_credit_wallets set
    included_balance = included_balance - v_included,
    purchased_balance = purchased_balance - v_purchased,
    updated_at = now()
  where user_id = p_user_id;
  insert into public.egg_credit_ledger(
    user_id,email,workspace_id,idempotency_key,action,amount,included_amount,
    purchased_amount,status,policy_version
  ) values (
    p_user_id,lower(trim(p_email)),p_workspace_id,p_idempotency_key,p_action,p_amount,
    v_included,v_purchased,'reserved',p_policy_version
  );
  return query select 'reserved'::text,
    (v_wallet.included_balance + v_wallet.purchased_balance - p_amount)::integer;
end;
$$;

create or replace function public.commit_egg_credits(p_user_id uuid, p_idempotency_key text)
returns table (outcome text, balance integer)
language plpgsql security definer set search_path = public
as $$
declare v_row public.egg_credit_ledger%rowtype; v_balance integer;
begin
  select * into v_row from public.egg_credit_ledger where user_id=p_user_id and idempotency_key=p_idempotency_key for update;
  if not found then raise exception 'credit_reservation_not_found'; end if;
  select included_balance+purchased_balance into v_balance from public.egg_credit_wallets where user_id=v_row.user_id;
  if v_row.status='committed' then return query select 'already_committed'::text,v_balance; return; end if;
  if v_row.status='refunded' then return query select 'already_refunded'::text,v_balance; return; end if;
  update public.egg_credit_ledger set status='committed',updated_at=now() where id=v_row.id;
  return query select 'committed'::text,v_balance;
end;
$$;

create or replace function public.refund_egg_credits(p_user_id uuid, p_idempotency_key text)
returns table (outcome text, balance integer)
language plpgsql security definer set search_path = public
as $$
declare v_row public.egg_credit_ledger%rowtype; v_balance integer;
begin
  select * into v_row from public.egg_credit_ledger where user_id=p_user_id and idempotency_key=p_idempotency_key for update;
  if not found then raise exception 'credit_reservation_not_found'; end if;
  if v_row.status='reserved' then
    update public.egg_credit_wallets set
      included_balance=included_balance+v_row.included_amount,
      purchased_balance=purchased_balance+v_row.purchased_amount,
      updated_at=now() where user_id=v_row.user_id;
    update public.egg_credit_ledger set status='refunded',updated_at=now() where id=v_row.id;
    v_row.status := 'refunded';
  end if;
  select included_balance+purchased_balance into v_balance from public.egg_credit_wallets where user_id=v_row.user_id;
  return query select case when v_row.status='refunded' then 'refunded' else 'already_committed' end,v_balance;
end;
$$;

revoke all on function public.reserve_egg_credits(uuid,text,uuid,text,text,integer,text) from public,anon,authenticated;
revoke all on function public.provision_egg_credit_wallet(uuid,text,text,integer,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.commit_egg_credits(uuid,text) from public,anon,authenticated;
revoke all on function public.refund_egg_credits(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_egg_credits(uuid,text,uuid,text,text,integer,text) to service_role;
grant execute on function public.provision_egg_credit_wallet(uuid,text,text,integer,timestamptz,timestamptz) to service_role;
grant execute on function public.commit_egg_credits(uuid,text) to service_role;
grant execute on function public.refund_egg_credits(uuid,text) to service_role;
