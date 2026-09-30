create table if not exists public.egg_reply_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  project_id uuid not null references public.egg_reply_projects(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists egg_reply_generation_jobs_project_status_idx
  on public.egg_reply_generation_jobs (creator_id, project_id, status, created_at desc);

alter table public.egg_reply_generation_jobs enable row level security;
revoke all on public.egg_reply_generation_jobs from anon, authenticated;
grant all on public.egg_reply_generation_jobs to service_role;
