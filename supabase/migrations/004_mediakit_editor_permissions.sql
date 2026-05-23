alter table egg_creator_profiles
  add column if not exists mediakit_allow_matching boolean default false,
  add column if not exists mediakit_lock_analytics boolean default false;
