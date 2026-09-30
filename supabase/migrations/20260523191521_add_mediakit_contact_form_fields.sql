
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_collab_title text DEFAULT '品牌合作查詢',
ADD COLUMN IF NOT EXISTS mediakit_collab_message text DEFAULT '歡迎發送合作邀請，我會盡快回覆！';
;
