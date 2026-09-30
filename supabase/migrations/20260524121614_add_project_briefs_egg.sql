
CREATE TABLE IF NOT EXISTS egg_project_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  cw_brief_id uuid NOT NULL,
  cw_workspace_id uuid,
  cw_campaign_id uuid,
  brand_name text,
  title text NOT NULL,
  background text,
  objectives text,
  deliverables text[],
  timeline text,
  budget text,
  dos text,
  donts text,
  reference_links text[],
  additional_notes text,
  status text DEFAULT 'received',
  received_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_project_briefs_creator_idx 
ON egg_project_briefs(creator_id);
;
