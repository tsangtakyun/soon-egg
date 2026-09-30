alter table public.egg_stripe_events
  add column if not exists updated_at timestamptz not null default now();

alter table public.egg_product_orders
  add column if not exists sales_counted_at timestamptz;

create or replace function public.increment_product_sales_once(
  p_stripe_session_id text,
  p_product_id uuid,
  p_amount numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select id into v_order_id
  from public.egg_product_orders
  where stripe_session_id = p_stripe_session_id
    and product_id = p_product_id
    and payment_status = 'paid'
    and sales_counted_at is null
  for update;

  if v_order_id is null then return false; end if;

  update public.egg_digital_products
  set total_sales = coalesce(total_sales, 0) + 1,
      total_revenue = coalesce(total_revenue, 0) + coalesce(p_amount, 0),
      stock = case when coalesce(is_unlimited_stock, true) then stock else greatest(coalesce(stock, 0) - 1, 0) end
  where id = p_product_id;

  update public.egg_product_orders set sales_counted_at = now() where id = v_order_id;
  return true;
end;
$$;

revoke all on function public.increment_product_sales_once(text, uuid, numeric) from public;
grant execute on function public.increment_product_sales_once(text, uuid, numeric) to service_role;
