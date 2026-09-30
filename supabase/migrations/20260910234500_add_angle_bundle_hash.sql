alter table public.egg_content_angles
  add column if not exists knowledge_bundle_hash text;

notify pgrst, 'reload schema';
