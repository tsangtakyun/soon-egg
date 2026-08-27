do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'egg_profile_blocks_safe_title'
  ) then
    alter table public.egg_profile_blocks
      add constraint egg_profile_blocks_safe_title
      check (title is not null and char_length(btrim(title)) between 1 and 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'egg_profile_blocks_safe_url'
  ) then
    alter table public.egg_profile_blocks
      add constraint egg_profile_blocks_safe_url
      check (
        url is not null
        and char_length(url) <= 2048
        and url ~* '^(https?://.+|mailto:[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+)$'
      ) not valid;
  end if;
end $$;

alter table public.egg_profile_blocks validate constraint egg_profile_blocks_safe_title;
alter table public.egg_profile_blocks validate constraint egg_profile_blocks_safe_url;
