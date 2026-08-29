create table if not exists public.egg_creator_scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  topic text,
  background text,
  tone text,
  framework text,
  hook_variant text,
  ai_draft text not null,
  parts jsonb not null default '{}'::jsonb,
  model text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists egg_creator_scripts_workspace_created_idx
  on public.egg_creator_scripts(workspace_id, created_at desc);

alter table public.egg_creator_scripts enable row level security;
revoke all on public.egg_creator_scripts from anon, authenticated;
grant all on public.egg_creator_scripts to service_role;

