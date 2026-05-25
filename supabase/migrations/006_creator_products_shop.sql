alter table egg_digital_products
add column if not exists external_url text,
add column if not exists stock_quantity integer,
add column if not exists stock_unlimited boolean default true;
