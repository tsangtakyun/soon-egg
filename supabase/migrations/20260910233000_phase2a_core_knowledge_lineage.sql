alter table public.egg_content_angles
  add column if not exists hook_pattern_code text,
  add column if not exists hook_modifiers text[] not null default '{}',
  add column if not exists knowledge_refs jsonb not null default '[]'::jsonb,
  add column if not exists knowledge_bundle_version text,
  add column if not exists knowledge_bundle_hash text;

alter table public.egg_content_packs
  add column if not exists hook_pattern_code text,
  add column if not exists hook_modifiers text[] not null default '{}',
  add column if not exists knowledge_refs jsonb not null default '[]'::jsonb,
  add column if not exists knowledge_bundle_version text,
  add column if not exists knowledge_bundle_hash text;

create table if not exists public.egg_knowledge_generation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  project_id uuid not null references public.egg_content_projects(id) on delete cascade,
  pack_id uuid references public.egg_content_packs(id) on delete set null,
  stage text not null check (stage in ('angles','pack')),
  bundle_version text,
  bundle_hash text,
  shown_refs jsonb not null default '[]'::jsonb,
  applied_refs jsonb not null default '[]'::jsonb,
  hook_pattern_code text,
  hook_modifiers text[] not null default '{}',
  model text,
  status text not null default 'completed' check (status in ('completed','bundle_unavailable')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists egg_knowledge_runs_workspace_idx
  on public.egg_knowledge_generation_runs(workspace_id, created_at desc);

alter table public.egg_knowledge_generation_runs enable row level security;
revoke all on public.egg_knowledge_generation_runs from public,anon,authenticated;
grant all on public.egg_knowledge_generation_runs to service_role;

notify pgrst, 'reload schema';
