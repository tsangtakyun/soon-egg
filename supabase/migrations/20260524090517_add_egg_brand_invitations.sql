
CREATE TABLE IF NOT EXISTS egg_brand_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  cw_campaign_id uuid NOT NULL,
  cw_workspace_id uuid NOT NULL,
  campaign_name text,
  brand_name text,
  cover_image_url text,
  theme text,
  call_to_action text,
  starts_on date,
  message text,
  status text DEFAULT 'pending',
  sent_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS egg_brand_invitations_creator_idx 
ON egg_brand_invitations(creator_id);

CREATE UNIQUE INDEX IF NOT EXISTS egg_brand_invitations_unique
ON egg_brand_invitations(creator_id, cw_campaign_id);
;
