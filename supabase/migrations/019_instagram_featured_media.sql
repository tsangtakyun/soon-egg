create table if not exists public.egg_instagram_media (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.egg_creator_profiles(id) on delete cascade,
  instagram_media_id text not null,
  media_type text,
  media_product_type text,
  caption text,
  permalink text,
  media_url text,
  thumbnail_url text,
  published_at timestamptz,
  like_count integer not null default 0,
  comments_count integer not null default 0,
  views integer,
  reach integer,
  plays integer,
  total_interactions integer,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  synced_at timestamptz not null default now(),
  unique (creator_id, instagram_media_id)
);

create index if not exists egg_instagram_media_creator_featured_idx
  on public.egg_instagram_media (creator_id, is_featured, sort_order);

alter table public.egg_instagram_media enable row level security;

revoke all on table public.egg_instagram_media from anon, authenticated;
grant select, insert, update, delete on table public.egg_instagram_media to authenticated;
grant select on table public.egg_instagram_media to anon;

drop policy if exists "Creators manage own Instagram media" on public.egg_instagram_media;
create policy "Creators manage own Instagram media"
  on public.egg_instagram_media
  for all
  to authenticated
  using (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id and profile.user_id = auth.uid()
    )
  );

drop policy if exists "Public can view featured Instagram media" on public.egg_instagram_media;
create policy "Public can view featured Instagram media"
  on public.egg_instagram_media
  for select
  to anon, authenticated
  using (
    is_featured = true
    and exists (
      select 1 from public.egg_creator_profiles profile
      where profile.id = creator_id
        and profile.mediakit_is_public = true
        and coalesce(profile.mediakit_access_level, 'public') <> 'private'
    )
  );

