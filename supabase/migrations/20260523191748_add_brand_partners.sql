
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_brand_partners_enabled boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS egg_brand_partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  brand_logo_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_brand_partners_creator_idx ON egg_brand_partners(creator_id);
;
