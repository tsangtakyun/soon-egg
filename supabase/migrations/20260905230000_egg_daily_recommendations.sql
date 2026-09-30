create table if not exists public.egg_daily_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  recommendation_date date not null,
  rank integer not null check (rank between 1 and 3),
  title text not null, angle text not null, why_you text not null, audience_value text not null,
  production_mode text not null, effort text not null,
  source_topic_id uuid references public.egg_topic_ideas(id) on delete set null,
  source_context jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(workspace_id, recommendation_date, rank)
);
create index if not exists egg_daily_recommendations_workspace_date_idx on public.egg_daily_recommendations(workspace_id, recommendation_date desc);
alter table public.egg_daily_recommendations enable row level security;
revoke all on public.egg_daily_recommendations from anon, authenticated;
grant all on public.egg_daily_recommendations to service_role;
notify pgrst, 'reload schema';
