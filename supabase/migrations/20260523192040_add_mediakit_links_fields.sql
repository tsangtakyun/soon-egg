
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_links_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mediakit_links_title text,
ADD COLUMN IF NOT EXISTS mediakit_links_subtitle text,
ADD COLUMN IF NOT EXISTS mediakit_links_layout text DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS mediakit_links_collapsible boolean DEFAULT false;
;
