create table if not exists public.egg_reply_projects (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  notes text not null default '' check (char_length(notes) <= 2000),
  tone text not null default 'friendly' check (tone in ('friendly', 'professional', 'concise', 'firm')),
  language text not null default 'zh-HK' check (language in ('zh-HK', 'zh-TW', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists egg_reply_projects_creator_updated_idx
  on public.egg_reply_projects (creator_id, updated_at desc);

alter table public.egg_reply_messages
  add column if not exists project_id uuid references public.egg_reply_projects(id) on delete cascade;

create index if not exists egg_reply_messages_project_created_idx
  on public.egg_reply_messages (project_id, created_at asc);

alter table public.egg_reply_projects enable row level security;
revoke all on public.egg_reply_projects from anon, authenticated;
grant all on public.egg_reply_projects to service_role;

