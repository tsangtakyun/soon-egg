
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS facebook_followers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS threads_followers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS douyin_followers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS linkedin_handle text,
ADD COLUMN IF NOT EXISTS linkedin_followers integer DEFAULT 0;
;
