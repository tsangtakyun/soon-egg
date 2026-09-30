-- Separate user-confirmed lifecycle from AI summaries and interaction timestamps.
alter table public.egg_reply_projects
  add column if not exists lifecycle_status text not null default 'negotiating'
    check (lifecycle_status in ('negotiating', 'confirmed', 'archived')),
  add column if not exists status_updated_at timestamptz;

create index if not exists egg_reply_projects_lifecycle_idx
  on public.egg_reply_projects (creator_id, lifecycle_status, updated_at desc);
