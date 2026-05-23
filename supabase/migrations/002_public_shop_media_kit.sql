alter table egg_creator_profiles
  add column if not exists contact_email text,
  add column if not exists mediakit_bio text,
  add column if not exists brand_deals_count integer default 0;

alter table egg_product_orders
  add column if not exists buyer_name text,
  add column if not exists quantity integer default 1;

create table if not exists egg_rate_cards (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references egg_creator_profiles(id) on delete cascade,
  service_name text,
  service_name_zh text,
  platform text,
  price decimal(10,2),
  currency text default 'HKD',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table egg_rate_cards enable row level security;

drop policy if exists "egg_users_manage_own_rate_cards" on egg_rate_cards;
create policy "egg_users_manage_own_rate_cards" on egg_rate_cards
  for all using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

drop policy if exists "egg_public_active_rate_cards_viewable" on egg_rate_cards;
create policy "egg_public_active_rate_cards_viewable" on egg_rate_cards
  for select using (
    is_active = true and creator_id in (select id from egg_creator_profiles where is_public = true)
  );

drop policy if exists "egg_public_insert_product_orders" on egg_product_orders;
create policy "egg_public_insert_product_orders" on egg_product_orders
  for insert with check (
    product_id in (
      select egg_digital_products.id from egg_digital_products
      join egg_creator_profiles on egg_creator_profiles.id = egg_digital_products.creator_id
      where egg_creator_profiles.is_public = true and egg_digital_products.is_active = true
    )
  );
