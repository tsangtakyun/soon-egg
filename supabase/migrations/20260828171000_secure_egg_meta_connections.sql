create table if not exists public.egg_meta_connections (
  workspace_id uuid primary key references public.egg_creator_profiles(id) on delete cascade,
  user_access_token text not null,
  token_expires_at timestamptz,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.egg_meta_connections enable row level security;
revoke all on public.egg_meta_connections from anon, authenticated;
grant all on public.egg_meta_connections to service_role;

alter table public.egg_creator_profiles
  drop column if exists meta_user_access_token,
  drop column if exists meta_token_expires_at;
