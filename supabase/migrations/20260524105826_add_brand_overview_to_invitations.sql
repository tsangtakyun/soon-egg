
ALTER TABLE egg_brand_invitations
ADD COLUMN IF NOT EXISTS brand_overview text,
ADD COLUMN IF NOT EXISTS budget_range text,
ADD COLUMN IF NOT EXISTS duration_weeks integer;
;
