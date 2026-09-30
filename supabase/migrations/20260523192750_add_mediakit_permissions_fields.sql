
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_allow_matching boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mediakit_access_level text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS mediakit_lock_contact boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mediakit_lock_about boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mediakit_lock_case_studies boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mediakit_lock_brand_partners boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mediakit_lock_rates boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mediakit_lock_analytics boolean DEFAULT false;
;
