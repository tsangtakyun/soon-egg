alter table public.egg_instagram_media
  add column if not exists saved integer,
  add column if not exists shares integer;

comment on column public.egg_instagram_media.plays is
  'Legacy Meta metric. No longer collected; use views instead.';

create table if not exists public.egg_instagram_media_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  instagram_media_id text not null,
  snapshot_date date not null default (timezone('utc', now()))::date,
  published_at timestamptz,
  media_type text,
  media_product_type text,
  followers_at_capture integer not null default 0,
  views integer,
  reach integer,
  saved integer,
  shares integer,
  total_interactions integer,
  like_count integer not null default 0,
  comments_count integer not null default 0,
  save_rate_by_reach numeric(10, 6),
  share_rate_by_reach numeric(10, 6),
  graph_provider text not null,
  graph_version text not null,
  captured_at timestamptz not null default now(),
  unique (creator_id, instagram_media_id, snapshot_date)
);

create index if not exists egg_ig_media_snapshots_creator_date_idx
  on public.egg_instagram_media_metric_snapshots (creator_id, snapshot_date desc);

create index if not exists egg_ig_media_snapshots_media_date_idx
  on public.egg_instagram_media_metric_snapshots (instagram_media_id, snapshot_date desc);

alter table public.egg_instagram_media_metric_snapshots enable row level security;
revoke all on table public.egg_instagram_media_metric_snapshots from public, anon, authenticated;
grant all on table public.egg_instagram_media_metric_snapshots to service_role;

