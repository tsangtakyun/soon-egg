alter table public.egg_topic_ideas
  add column if not exists media_urls text[] not null default '{}'::text[];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'egg-topic-media',
  'egg-topic-media',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
