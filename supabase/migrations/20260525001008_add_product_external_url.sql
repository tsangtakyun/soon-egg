
ALTER TABLE egg_digital_products
ADD COLUMN IF NOT EXISTS external_url text,
ADD COLUMN IF NOT EXISTS category text;

-- product_type values: physical, digital, service, workshop, other
-- category: e.g. 美容, 時尚, 食品, 教育, etc.
;
