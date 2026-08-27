create table if not exists public.egg_instagram_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  snapshot_date date not null default (timezone('utc', now()))::date,
  followers integer not null default 0,
  engagement_rate numeric(7, 4),
  engagement_sample_size integer not null default 0,
  reach_7d integer,
  accounts_engaged_7d integer,
  total_interactions_7d integer,
  captured_at timestamptz not null default now(),
  unique (creator_id, snapshot_date)
);

alter table public.egg_instagram_metric_snapshots enable row level security;

revoke all on table public.egg_instagram_metric_snapshots from anon, authenticated;
grant select, insert, update on table public.egg_instagram_metric_snapshots to authenticated;

drop policy if exists "Creators can read own Instagram snapshots" on public.egg_instagram_metric_snapshots;
create policy "Creators can read own Instagram snapshots"
  on public.egg_instagram_metric_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.user_id = auth.uid()
    )
  );

drop policy if exists "Creators can insert own Instagram snapshots" on public.egg_instagram_metric_snapshots;
create policy "Creators can insert own Instagram snapshots"
  on public.egg_instagram_metric_snapshots
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.user_id = auth.uid()
    )
  );

drop policy if exists "Creators can update own Instagram snapshots" on public.egg_instagram_metric_snapshots;
create policy "Creators can update own Instagram snapshots"
  on public.egg_instagram_metric_snapshots
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.user_id = auth.uid()
    )
  );
