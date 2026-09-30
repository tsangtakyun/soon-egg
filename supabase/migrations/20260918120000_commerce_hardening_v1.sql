-- EGG Commerce Hardening v1
-- Money snapshots are stored in integer minor currency units.

alter table public.egg_creator_profiles
  add column if not exists commerce_fee_bps integer not null default 1000,
  add column if not exists commerce_fee_effective_at timestamptz not null default now();

alter table public.egg_creator_profiles
  drop constraint if exists egg_creator_profiles_commerce_fee_bps_check;
alter table public.egg_creator_profiles
  add constraint egg_creator_profiles_commerce_fee_bps_check
  check (commerce_fee_bps between 0 and 10000);

alter table public.egg_product_orders
  add column if not exists gross_amount_minor bigint,
  add column if not exists platform_fee_bps integer,
  add column if not exists platform_fee_amount_minor bigint,
  add column if not exists creator_net_amount_minor bigint,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists stripe_event_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_transfer_id text,
  add column if not exists stripe_application_fee_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists egg_product_orders_stripe_event_unique_idx
  on public.egg_product_orders (stripe_event_id)
  where stripe_event_id is not null;

with snapshots as (
  select id,
    round(coalesce(amount, 0) * 100)::bigint as gross_minor,
    round(coalesce(amount, 0) * 10)::bigint as fee_minor
  from public.egg_product_orders
  where gross_amount_minor is null
)
update public.egg_product_orders orders
set gross_amount_minor = snapshots.gross_minor,
    platform_fee_bps = 1000,
    platform_fee_amount_minor = snapshots.fee_minor,
    creator_net_amount_minor = snapshots.gross_minor - snapshots.fee_minor,
    payment_status = case when status in ('paid', 'processing', 'shipped', 'delivered') then 'paid' else coalesce(status, 'pending') end
from snapshots
where orders.id = snapshots.id;

create table if not exists public.egg_stripe_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.egg_order_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.egg_product_orders(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('refund', 'dispute', 'dispute_won', 'dispute_lost')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  stripe_event_id text not null unique,
  stripe_refund_id text,
  stripe_dispute_id text,
  reason text,
  status text,
  created_at timestamptz not null default now()
);

alter table public.egg_stripe_events enable row level security;
alter table public.egg_order_adjustments enable row level security;
revoke all on public.egg_stripe_events from anon, authenticated;
revoke all on public.egg_order_adjustments from anon, authenticated;
grant all on public.egg_stripe_events to service_role;
grant all on public.egg_order_adjustments to service_role;

create index if not exists egg_order_adjustments_order_idx
  on public.egg_order_adjustments (order_id, created_at desc);

-- Publishing a Media Kit is one invariant: the public profile must also be
-- visible. Unpublishing the Media Kit does not hide the creator's main profile.
create or replace function public.set_egg_mediakit_public(
  p_workspace_id uuid,
  p_is_public boolean
)
returns public.egg_creator_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.egg_creator_profiles;
begin
  if not exists (
    select 1 from public.egg_creator_workspace_members membership
    where membership.workspace_id = p_workspace_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  ) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  update public.egg_creator_profiles
  set mediakit_is_public = p_is_public,
      is_public = case when p_is_public then true else is_public end,
      mediakit_access_level = case when p_is_public then 'public' else mediakit_access_level end
  where id = p_workspace_id
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.set_egg_mediakit_public(uuid, boolean) from public;
grant execute on function public.set_egg_mediakit_public(uuid, boolean) to authenticated;
