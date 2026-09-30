
ALTER TABLE egg_digital_products 
ADD COLUMN IF NOT EXISTS stock integer,
ADD COLUMN IF NOT EXISTS is_unlimited_stock boolean DEFAULT true;

ALTER TABLE egg_product_orders
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS buyer_name text;

CREATE TABLE IF NOT EXISTS egg_cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  product_id uuid REFERENCES egg_digital_products(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_cart_items_session_idx ON egg_cart_items(session_id);
;
