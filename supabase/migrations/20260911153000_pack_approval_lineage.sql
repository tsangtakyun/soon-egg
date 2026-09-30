alter table public.egg_content_packs
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft','approved','dismissed')),
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by_role text,
  add column if not exists approved_at timestamptz,
  add column if not exists approval_method text,
  add column if not exists approved_content jsonb,
  add column if not exists approved_content_hash text;

create table if not exists public.egg_pack_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  pack_id uuid not null references public.egg_content_packs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  event_type text not null check (event_type in ('approved','dismissed','reopened','content_modified')),
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists egg_pack_workflow_events_pack_idx
  on public.egg_pack_workflow_events(workspace_id, pack_id, created_at desc);

alter table public.egg_pack_workflow_events enable row level security;
revoke all on public.egg_pack_workflow_events from public, anon, authenticated;
grant all on public.egg_pack_workflow_events to service_role;

notify pgrst, 'reload schema';
