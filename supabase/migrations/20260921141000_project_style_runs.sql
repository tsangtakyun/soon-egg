create table if not exists public.egg_project_style_runs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.egg_content_projects(id) on delete cascade,
 workspace_id uuid not null, input_hash text not null, registry_version text not null, result jsonb not null,
 created_at timestamptz not null default now(), unique(project_id,input_hash,registry_version)
 );
 alter table public.egg_project_style_runs enable row level security;
 revoke all on public.egg_project_style_runs from public,anon,authenticated;
 grant all on public.egg_project_style_runs to service_role;
