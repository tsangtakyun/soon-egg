
CREATE TABLE IF NOT EXISTS brand_perks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cw_workspace_id uuid NOT NULL,
  brand_name text NOT NULL,
  brand_website text,
  brand_logo_url text,
  type text NOT NULL CHECK (type IN ('service', 'product')),
  title text NOT NULL,
  description text,
  requirements text,
  quota integer DEFAULT 10,
  claimed_count integer DEFAULT 0,
  valid_until date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perk_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  perk_id uuid REFERENCES brand_perks(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  creator_username text NOT NULL,
  -- Service type fields
  preferred_date date,
  preferred_time text,
  party_size integer DEFAULT 1,
  -- Product type fields
  delivery_name text,
  delivery_phone text,
  delivery_address text,
  delivery_district text,
  delivery_notes text,
  -- Status
  status text DEFAULT 'pending',
  message text,
  claimed_at timestamptz DEFAULT now(),
  UNIQUE(perk_id, creator_id)
);
;
