
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_about_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mediakit_about_title text DEFAULT 'About Me';
;
