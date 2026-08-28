create table if not exists public.egg_creator_workspace_members (
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create unique index if not exists egg_creator_workspace_members_email_key
  on public.egg_creator_workspace_members(workspace_id, lower(email));

create table if not exists public.egg_creator_workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists egg_creator_workspace_pending_invite_key
  on public.egg_creator_workspace_invitations(workspace_id, lower(email)) where status = 'pending';

alter table public.egg_reply_prompt_profiles
  add column if not exists workspace_id uuid references public.egg_creator_profiles(id) on delete cascade;
create unique index if not exists egg_reply_prompt_profiles_workspace_key
  on public.egg_reply_prompt_profiles(workspace_id) where workspace_id is not null;

insert into public.egg_reply_prompt_profiles (profile_key, system_prompt, workspace_id, updated_at)
select 'workspace_' || profile.id::text, source.system_prompt, profile.id, now()
from public.egg_creator_profiles profile
cross join lateral (
  select system_prompt from public.egg_reply_prompt_profiles
  where profile_key = 'renee_talent_manager' limit 1
) source
where not exists (
  select 1 from public.egg_reply_prompt_profiles existing where existing.workspace_id = profile.id
)
on conflict (profile_key) do nothing;

create table if not exists public.egg_reply_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  system_prompt text not null check (char_length(system_prompt) between 100 and 50000),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.egg_creator_workspace_members (workspace_id, user_id, email, role)
select profile.id, profile.user_id, lower(coalesce(auth_user.email, profile.username || '@workspace.local')), 'owner'
from public.egg_creator_profiles profile
left join auth.users auth_user on auth_user.id = profile.user_id
where profile.user_id is not null
on conflict (workspace_id, user_id) do update set role = 'owner', updated_at = now();

alter table public.egg_creator_workspace_members enable row level security;
alter table public.egg_creator_workspace_invitations enable row level security;
alter table public.egg_reply_prompt_versions enable row level security;
revoke all on public.egg_creator_workspace_members from anon, authenticated;
revoke all on public.egg_creator_workspace_invitations from anon, authenticated;
revoke all on public.egg_reply_prompt_versions from anon, authenticated;
grant all on public.egg_creator_workspace_members to service_role;
grant all on public.egg_creator_workspace_invitations to service_role;
grant all on public.egg_reply_prompt_versions to service_role;
