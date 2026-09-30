
-- Add Stripe Connect fields to creator profiles
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Update product orders table
ALTER TABLE egg_product_orders
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS buyer_email text,
ADD COLUMN IF NOT EXISTS buyer_name text,
ADD COLUMN IF NOT EXISTS delivery_name text,
ADD COLUMN IF NOT EXISTS delivery_phone text,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_district text,
ADD COLUMN IF NOT EXISTS delivery_notes text,
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES egg_digital_products(id),
ADD COLUMN IF NOT EXISTS product_title text,
ADD COLUMN IF NOT EXISTS amount integer,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'HKD',
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- status: pending → paid → processing → shipped → delivered / cancelled
;
