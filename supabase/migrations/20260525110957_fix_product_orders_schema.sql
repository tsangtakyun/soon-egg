
-- Make buyer_email nullable (Stripe guest checkout may not have email)
ALTER TABLE egg_product_orders
ALTER COLUMN buyer_email DROP NOT NULL;

-- Add creator_id if missing
ALTER TABLE egg_product_orders
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES egg_creator_profiles(id);
;
