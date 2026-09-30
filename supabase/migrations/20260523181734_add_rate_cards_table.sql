
CREATE TABLE IF NOT EXISTS egg_rate_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_name_zh text,
  platform text,
  price numeric NOT NULL,
  currency text DEFAULT 'HKD',
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_rate_cards_creator_idx ON egg_rate_cards(creator_id);

ALTER TABLE egg_creator_profiles 
ADD COLUMN IF NOT EXISTS mediakit_bio text,
ADD COLUMN IF NOT EXISTS mediakit_is_public boolean DEFAULT true;
;
