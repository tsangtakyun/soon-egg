-- Repair historical rows where the Media Kit toggle said public while the
-- profile-level visibility gate still made the public URL return 404.
update public.egg_creator_profiles
set is_public = true,
    mediakit_access_level = 'public'
where mediakit_is_public = true
  and (is_public is distinct from true or coalesce(mediakit_access_level, 'public') = 'private');
