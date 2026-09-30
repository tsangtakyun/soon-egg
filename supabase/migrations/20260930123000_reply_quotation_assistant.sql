create table if not exists public.egg_quote_profiles (
  workspace_id uuid primary key references public.egg_creator_profiles(id) on delete cascade,
  currency text not null default 'HKD' check (currency in ('HKD','USD','TWD','GBP')),
  commercial_rules jsonb not null default '{}'::jsonb,
  payment_profile jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.egg_quotations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  project_id uuid not null references public.egg_reply_projects(id) on delete cascade,
  quote_number text not null,
  access_token uuid not null default gen_random_uuid() unique,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','approved','sent','void')),
  snapshot jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, quote_number, version)
);

create table if not exists public.egg_quote_sequences (
  workspace_id uuid primary key references public.egg_creator_profiles(id) on delete cascade,
  last_value bigint not null default 0 check (last_value >= 0)
);

create or replace function public.next_egg_quote_sequence(target_workspace uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare next_value bigint;
begin
  insert into public.egg_quote_sequences(workspace_id, last_value)
  values (target_workspace, 1)
  on conflict (workspace_id)
  do update set last_value = public.egg_quote_sequences.last_value + 1
  returning last_value into next_value;
  return next_value;
end;
$$;

create index if not exists egg_quotations_project_idx
  on public.egg_quotations(workspace_id, project_id, created_at desc);

alter table public.egg_quote_profiles enable row level security;
alter table public.egg_quotations enable row level security;
alter table public.egg_quote_sequences enable row level security;
revoke all on public.egg_quote_profiles, public.egg_quotations, public.egg_quote_sequences from anon, authenticated;
revoke all on function public.next_egg_quote_sequence(uuid) from public, anon, authenticated;
grant all on public.egg_quote_profiles, public.egg_quotations, public.egg_quote_sequences to service_role;
grant execute on function public.next_egg_quote_sequence(uuid) to service_role;

comment on table public.egg_quotations is 'Immutable quotation snapshots after sent; application only creates a new version for later changes.';
