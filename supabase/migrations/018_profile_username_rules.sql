alter table public.egg_creator_profiles
  drop constraint if exists egg_creator_profiles_username_format;

alter table public.egg_creator_profiles
  add constraint egg_creator_profiles_username_format
  check (
    char_length(username) between 3 and 30
    and username = lower(username)
    and username ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'
  ) not valid;

alter table public.egg_creator_profiles
  validate constraint egg_creator_profiles_username_format;
