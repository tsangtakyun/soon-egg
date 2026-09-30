
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS pronouns text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS content_categories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mediakit_header_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mediakit_contact_form_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mediakit_total_followers_enabled boolean DEFAULT true;
;
