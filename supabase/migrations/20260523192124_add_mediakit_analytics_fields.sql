
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_analytics_enabled boolean DEFAULT true;
;
