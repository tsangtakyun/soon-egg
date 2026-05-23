create extension if not exists "pgcrypto";

create table if not exists egg_creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  cover_url text,
  instagram_handle text,
  instagram_followers integer,
  instagram_engagement_rate decimal(5,2),
  facebook_handle text,
  threads_handle text,
  youtube_handle text,
  youtube_subscribers integer,
  youtube_avg_views integer,
  xiaohongshu_handle text,
  xiaohongshu_followers integer,
  tiktok_handle text,
  tiktok_followers integer,
  douyin_handle text,
  content_categories text[],
  content_language text default 'zh-HK',
  audience_demographics jsonb,
  ai_profile_summary text,
  is_public boolean default true,
  ai_credits integer default 30,
  plan text default 'free',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table egg_creator_profiles add column if not exists facebook_handle text;
alter table egg_creator_profiles add column if not exists threads_handle text;
alter table egg_creator_profiles add column if not exists douyin_handle text;
alter table egg_creator_profiles add column if not exists onboarding_completed boolean default false;

create table if not exists egg_profile_blocks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  block_type text not null,
  title text,
  url text,
  thumbnail_url text,
  is_visible boolean default true,
  sort_order integer,
  metadata jsonb,
  click_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists egg_profile_themes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  theme_name text,
  background_color text,
  background_gradient text,
  text_color text,
  button_style text,
  button_color text,
  font_family text,
  custom_css text,
  is_active boolean default false,
  created_at timestamptz default now()
);

create table if not exists egg_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_zh text,
  logo_url text,
  category text,
  region text[],
  description text,
  description_zh text,
  website text,
  instagram_handle text,
  is_verified boolean default false,
  min_followers integer default 1000,
  commission_rate decimal(5,2),
  affiliate_program_url text,
  contact_email text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists egg_brand_deals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  brand_id uuid references egg_brands(id) on delete cascade,
  status text default 'prospecting',
  deal_type text,
  platform text,
  deliverables text,
  proposed_rate decimal(10,2),
  agreed_rate decimal(10,2),
  currency text default 'HKD',
  ai_match_score integer,
  pitch_message text,
  notes text,
  deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists egg_digital_products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  title text not null,
  title_zh text,
  description text,
  price decimal(10,2),
  currency text default 'HKD',
  product_type text,
  file_url text,
  thumbnail_url text,
  is_active boolean default true,
  total_sales integer default 0,
  total_revenue decimal(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists egg_product_orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references egg_digital_products(id),
  buyer_email text not null,
  amount decimal(10,2),
  currency text default 'HKD',
  status text default 'pending',
  stripe_payment_id text,
  created_at timestamptz default now()
);

create table if not exists egg_analytics_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  event_type text,
  source text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table egg_creator_profiles enable row level security;
alter table egg_profile_blocks enable row level security;
alter table egg_profile_themes enable row level security;
alter table egg_brands enable row level security;
alter table egg_brand_deals enable row level security;
alter table egg_digital_products enable row level security;
alter table egg_product_orders enable row level security;
alter table egg_analytics_events enable row level security;

drop policy if exists "egg_users_manage_own_profile" on egg_creator_profiles;
create policy "egg_users_manage_own_profile" on egg_creator_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "egg_public_profiles_viewable" on egg_creator_profiles;
create policy "egg_public_profiles_viewable" on egg_creator_profiles
  for select using (is_public = true);

drop policy if exists "egg_users_manage_own_blocks" on egg_profile_blocks;
create policy "egg_users_manage_own_blocks" on egg_profile_blocks
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_public_visible_blocks_viewable" on egg_profile_blocks;
create policy "egg_public_visible_blocks_viewable" on egg_profile_blocks
  for select using (
    is_visible = true and creator_id in (select id from egg_creator_profiles where is_public = true)
  );

drop policy if exists "egg_users_manage_own_themes" on egg_profile_themes;
create policy "egg_users_manage_own_themes" on egg_profile_themes
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_public_active_themes_viewable" on egg_profile_themes;
create policy "egg_public_active_themes_viewable" on egg_profile_themes
  for select using (
    is_active = true and creator_id in (select id from egg_creator_profiles where is_public = true)
  );

drop policy if exists "egg_brands_are_public" on egg_brands;
create policy "egg_brands_are_public" on egg_brands
  for select using (true);

drop policy if exists "egg_users_manage_own_deals" on egg_brand_deals;
create policy "egg_users_manage_own_deals" on egg_brand_deals
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_users_manage_own_products" on egg_digital_products;
create policy "egg_users_manage_own_products" on egg_digital_products
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_public_active_products_viewable" on egg_digital_products;
create policy "egg_public_active_products_viewable" on egg_digital_products
  for select using (
    is_active = true and creator_id in (select id from egg_creator_profiles where is_public = true)
  );

drop policy if exists "egg_users_view_product_orders" on egg_product_orders;
create policy "egg_users_view_product_orders" on egg_product_orders
  for select using (
    product_id in (
      select egg_digital_products.id from egg_digital_products
      join egg_creator_profiles on egg_creator_profiles.id = egg_digital_products.creator_id
      where egg_creator_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "egg_users_manage_own_analytics" on egg_analytics_events;
create policy "egg_users_manage_own_analytics" on egg_analytics_events
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

insert into egg_brands (name, name_zh, category, region, min_followers, commission_rate, is_verified, description_zh)
values
  ('Bonjour', '卓悅', '美妝零售', array['HK'], 5000, 6, true, '香港美妝零售品牌，適合護膚、美妝、生活類創作者。'),
  ('Sasa', '莎莎', '美妝零售', array['HK','TW','SG'], 4000, 7, true, '亞洲美妝零售網絡，主打護膚和彩妝內容。'),
  ('Chow Tai Fook', '周大福', '珠寶', array['HK','TW','CN'], 12000, 4, true, '高認知度珠寶品牌，適合時尚、婚禮、生活品味內容。'),
  ('Maxim''s', '美心', '餐飲', array['HK'], 3000, 5, true, '香港餐飲集團，節慶、甜品、外賣內容都有合作空間。'),
  ('Tsit Wing', '捷榮', '食品飲料', array['HK'], 2500, 5, false, '咖啡、奶茶和餐飲供應品牌，適合辦公室及港式飲食內容。'),
  ('My Beauty Diary', '我的美麗日記', '美妝', array['TW','HK','SG'], 5000, 8, true, '台灣面膜品牌，適合開箱、護膚測評和日常保養。'),
  ('OSIM', 'OSIM', '健康電器', array['TW','SG','HK'], 9000, 6, false, '健康生活及按摩電器品牌，適合 wellness、家庭和工作壓力內容。'),
  ('85度C', '85度C', '餐飲', array['TW','HK'], 3000, 5, false, '台式咖啡甜點品牌，適合探店、下午茶和生活日常。'),
  ('Charles & Keith', null, '時裝配件', array['SG','HK','TW','MY'], 10000, 7, true, '新加坡時尚配件品牌，適合穿搭、上班族和約會造型內容。'),
  ('Eu Yan Sang', '余仁生', '健康養生', array['SG','HK','MY'], 5000, 6, false, '中式健康養生品牌，適合家庭、健康、節慶送禮內容。'),
  ('Tiger Balm', '虎標', '健康', array['SG','HK','MY'], 3500, 5, false, '泛亞洲健康品牌，適合運動、旅遊和日常痛症內容。'),
  ('Klook', 'Klook客路', '旅遊體驗', array['HK','TW','SG','MY'], 7000, 9, true, '旅遊體驗平台，適合本地玩樂、短途旅行和親子內容。'),
  ('Carousell', 'Carousell', '電商平台', array['SG','HK','TW'], 5000, 4, false, '二手交易平台，適合生活整理、可持續消費和潮物內容。'),
  ('foodpanda', null, '外賣平台', array['HK','SG','TW','MY'], 6000, 5, true, '外賣平台，適合美食、生活效率和優惠攻略內容。'),
  ('OpenRice', '開飯喇', '餐飲平台', array['HK'], 4000, 5, true, '香港餐飲平台，適合探店、排行榜和隱世美食內容。'),
  ('SK-II', null, '護膚', array['HK','TW','SG','JP'], 15000, 8, true, '高端護膚品牌，適合成熟護膚、美容儀式和成分內容。'),
  ('Innisfree', null, '韓系護膚', array['HK','TW','SG'], 7000, 7, false, '韓系護膚品牌，適合學生、日常保養和清透妝容。'),
  ('Sulwhasoo', '雪花秀', '韓系護膚', array['HK','TW','SG'], 12000, 8, true, '高端韓系護膚品牌，適合品味生活和抗老護膚內容。'),
  ('LANEIGE', '蘭芝', '韓系美妝', array['HK','TW','SG'], 8000, 7, false, '韓系美妝護膚品牌，適合補水、底妝和睡眠面膜內容。'),
  ('Vitasoy', '維他奶', '食品飲料', array['HK','SG'], 3500, 4, true, '香港飲品品牌，適合校園、懷舊、本地文化內容。'),
  ('Want Want', '旺旺', '零食', array['TW','HK'], 3000, 4, false, '台灣零食品牌，適合童年回憶、零食開箱和節慶內容。')
on conflict do nothing;
