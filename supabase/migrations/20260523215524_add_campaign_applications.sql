
CREATE TABLE IF NOT EXISTS egg_campaign_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  cw_campaign_id uuid NOT NULL,
  cw_workspace_id uuid,
  campaign_name text,
  brand_name text,
  cover_image_url text,
  theme text,
  call_to_action text,
  starts_on date,
  status text DEFAULT 'applied',
  pitch_message text,
  applied_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_campaign_applications_creator_idx 
ON egg_campaign_applications(creator_id);

CREATE UNIQUE INDEX IF NOT EXISTS egg_campaign_applications_unique 
ON egg_campaign_applications(creator_id, cw_campaign_id);
;
