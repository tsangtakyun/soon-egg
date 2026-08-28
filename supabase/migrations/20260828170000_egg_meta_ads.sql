alter table public.egg_creator_profiles
  add column if not exists meta_user_access_token text,
  add column if not exists meta_token_expires_at timestamptz;

create table if not exists public.egg_meta_ad_launches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  launch_attempt_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  campaign_name text not null,
  status text not null default 'processing' check (status in ('processing', 'paused', 'failed')),
  meta_campaign_id text,
  meta_adset_id text,
  ads jsonb not null default '[]'::jsonb,
  request_details jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, launch_attempt_id)
);

create index if not exists egg_meta_ad_launches_workspace_created_idx
  on public.egg_meta_ad_launches (workspace_id, created_at desc);

alter table public.egg_meta_ad_launches enable row level security;
revoke all on public.egg_meta_ad_launches from anon, authenticated;
grant all on public.egg_meta_ad_launches to service_role;
