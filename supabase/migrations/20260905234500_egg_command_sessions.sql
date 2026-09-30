create table if not exists public.egg_command_sessions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  title text not null default '新對話', messages jsonb not null default '[]'::jsonb, interpreted_context jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists egg_command_sessions_workspace_updated_idx on public.egg_command_sessions(workspace_id, updated_at desc);
alter table public.egg_command_sessions enable row level security;
revoke all on public.egg_command_sessions from anon, authenticated;
grant all on public.egg_command_sessions to service_role;
notify pgrst, 'reload schema';
