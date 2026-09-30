insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'egg-content-inputs',
  'egg-content-inputs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
