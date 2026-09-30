create table if not exists public.egg_creator_dna_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  category text not null,
  scope text not null default 'all',
  rule_text text not null,
  evidence_signal_ids uuid[] not null default '{}',
  evidence_count integer not null default 0,
  status text not null default 'suggested' check (status in ('suggested','confirmed')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists egg_creator_dna_rules_workspace_idx on public.egg_creator_dna_rules(workspace_id, status, is_active);
alter table public.egg_creator_dna_rules enable row level security;
revoke all on public.egg_creator_dna_rules from anon, authenticated;
grant all on public.egg_creator_dna_rules to service_role;
notify pgrst, 'reload schema';
