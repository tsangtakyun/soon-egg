alter table egg_creator_profiles
add column if not exists stripe_account_id text,
add column if not exists stripe_onboarding_complete boolean default false;

alter table egg_product_orders
add column if not exists creator_id uuid references egg_creator_profiles(id) on delete cascade,
add column if not exists product_title text,
add column if not exists stripe_session_id text,
add column if not exists stripe_payment_intent_id text,
add column if not exists delivery_name text,
add column if not exists delivery_address text,
add column if not exists delivery_district text,
add column if not exists tracking_number text,
add column if not exists updated_at timestamptz default now();

update egg_product_orders
set creator_id = egg_digital_products.creator_id,
    product_title = egg_digital_products.title
from egg_digital_products
where egg_product_orders.product_id = egg_digital_products.id
  and egg_product_orders.creator_id is null;

drop policy if exists "egg_users_update_product_orders" on egg_product_orders;
create policy "egg_users_update_product_orders" on egg_product_orders
  for update using (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  ) with check (
    creator_id in (select id from egg_creator_profiles where user_id = auth.uid())
  );

create or replace function increment_product_sales(p_product_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
as $$
begin
  update egg_digital_products
  set total_sales = coalesce(total_sales, 0) + 1,
      total_revenue = coalesce(total_revenue, 0) + coalesce(p_amount, 0)
  where id = p_product_id;
end;
$$;
