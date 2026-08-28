alter table public.egg_reply_projects
  add column if not exists brief jsonb not null default '{}'::jsonb;

create table if not exists public.egg_reply_prompt_profiles (
  profile_key text primary key,
  system_prompt text not null check (char_length(system_prompt) between 100 and 50000),
  updated_at timestamptz not null default now()
);

alter table public.egg_reply_prompt_profiles enable row level security;
revoke all on public.egg_reply_prompt_profiles from anon, authenticated;
grant all on public.egg_reply_prompt_profiles to service_role;
