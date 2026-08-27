alter table public.egg_digital_products
  add column if not exists is_archived boolean not null default false;

create index if not exists egg_digital_products_creator_active_idx
  on public.egg_digital_products (creator_id, is_active, is_archived);

create unique index if not exists egg_product_orders_stripe_session_unique_idx
  on public.egg_product_orders (stripe_session_id)
  where stripe_session_id is not null;

-- The existing Egg.Soon catalogue was seeded demo data. Archive it instead of
-- deleting products or their linked order history.
update public.egg_digital_products as product
set is_archived = true,
    is_active = false
where product.id in (
  'c6821077-e998-4214-bf89-2170bc53d019'::uuid,
  'a96807ae-d8c8-4bd9-b590-bb1ed75876db'::uuid
)
and product.creator_id = '74c7feb1-30c5-4a8d-9d76-4d085dc86835'::uuid;

drop policy if exists "egg_public_active_products_viewable" on public.egg_digital_products;
drop policy if exists "egg_products_public_read" on public.egg_digital_products;
create policy "egg_public_active_products_viewable" on public.egg_digital_products
  for select
  using (
    is_active = true
    and is_archived = false
    and creator_id in (
      select id from public.egg_creator_profiles where is_public = true
    )
  );

create or replace function public.increment_product_sales(p_product_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.egg_digital_products
  set total_sales = coalesce(total_sales, 0) + 1,
      total_revenue = coalesce(total_revenue, 0) + coalesce(p_amount, 0),
      stock = case
        when coalesce(is_unlimited_stock, true) then stock
        else greatest(coalesce(stock, 0) - 1, 0)
      end
  where id = p_product_id;
end;
$$;
