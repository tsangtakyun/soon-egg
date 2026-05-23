alter table egg_creator_profiles
  add column if not exists pronouns text,
  add column if not exists location text,
  add column if not exists facebook_followers integer default 0,
  add column if not exists threads_followers integer default 0,
  add column if not exists mediakit_is_public boolean default false,
  add column if not exists mediakit_access_level text default 'public',
  add column if not exists mediakit_bg_color text default '#FFF5E6',
  add column if not exists mediakit_text_color text default '#1a1a1a',
  add column if not exists mediakit_accent_color text default '#E63946',
  add column if not exists mediakit_accent_text_color text default '#FFFFFF',
  add column if not exists mediakit_font text default 'Poppins',
  add column if not exists mediakit_lock_contact boolean default false,
  add column if not exists mediakit_collab_title text,
  add column if not exists mediakit_collab_message text,
  add column if not exists mediakit_total_followers_enabled boolean default true,
  add column if not exists mediakit_about_enabled boolean default true,
  add column if not exists mediakit_lock_about boolean default false,
  add column if not exists mediakit_about_title text default 'ABOUT ME',
  add column if not exists mediakit_rates_enabled boolean default true,
  add column if not exists mediakit_lock_rates boolean default false,
  add column if not exists mediakit_brand_partners_enabled boolean default true,
  add column if not exists mediakit_lock_brand_partners boolean default false,
  add column if not exists mediakit_case_studies_enabled boolean default true,
  add column if not exists mediakit_lock_case_studies boolean default false,
  add column if not exists mediakit_links_enabled boolean default true,
  add column if not exists mediakit_links_title text,
  add column if not exists mediakit_links_subtitle text,
  add column if not exists mediakit_links_layout text default 'list';

alter table egg_rate_cards
  add column if not exists is_starting_price boolean default false;

create table if not exists egg_brand_partners (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  brand_name text,
  brand_logo_url text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists egg_case_studies (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  title text,
  brand_name text,
  description text,
  result text,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table egg_brand_partners enable row level security;
alter table egg_case_studies enable row level security;

drop policy if exists "egg_users_manage_own_brand_partners" on egg_brand_partners;
create policy "egg_users_manage_own_brand_partners" on egg_brand_partners
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_public_brand_partners_viewable" on egg_brand_partners;
create policy "egg_public_brand_partners_viewable" on egg_brand_partners
  for select using (
    creator_id in (
      select id from egg_creator_profiles
      where is_public = true and mediakit_is_public = true and coalesce(mediakit_access_level, 'public') <> 'private'
    )
  );

drop policy if exists "egg_users_manage_own_case_studies" on egg_case_studies;
create policy "egg_users_manage_own_case_studies" on egg_case_studies
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_public_case_studies_viewable" on egg_case_studies;
create policy "egg_public_case_studies_viewable" on egg_case_studies
  for select using (
    creator_id in (
      select id from egg_creator_profiles
      where is_public = true and mediakit_is_public = true and coalesce(mediakit_access_level, 'public') <> 'private'
    )
  );
