ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS buy_me_a_coffee_url text;

ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS cover_url text;

ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS youtube_latest_video_id text;

CREATE TABLE IF NOT EXISTS egg_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  follower_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_follows_creator_id_idx ON egg_follows(creator_id);
