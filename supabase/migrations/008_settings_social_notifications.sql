ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS youtube_handle text,
ADD COLUMN IF NOT EXISTS tiktok_handle text,
ADD COLUMN IF NOT EXISTS xiaohongshu_handle text,
ADD COLUMN IF NOT EXISTS facebook_handle text,
ADD COLUMN IF NOT EXISTS threads_handle text,
ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{
  "notify_brand_invite": true,
  "notify_order": true,
  "notify_perk_update": true
}'::jsonb;
