
ALTER TABLE egg_brand_invitations
ADD COLUMN IF NOT EXISTS brand_website text,
ADD COLUMN IF NOT EXISTS collab_formats text[],
ADD COLUMN IF NOT EXISTS budget_range text;
;
