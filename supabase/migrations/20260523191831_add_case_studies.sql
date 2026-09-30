
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_case_studies_enabled boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS egg_case_studies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  brand_name text,
  description text,
  result text,
  image_url text,
  link_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_case_studies_creator_idx ON egg_case_studies(creator_id);
;
