
-- ============================================
-- SOON-EGG Creator Network — Full Schema
-- ============================================

-- Creator profiles
CREATE TABLE IF NOT EXISTS egg_creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,

  -- Social accounts
  instagram_handle TEXT,
  instagram_followers INTEGER DEFAULT 0,
  instagram_engagement_rate DECIMAL(5,2) DEFAULT 0,
  instagram_access_token TEXT,
  instagram_user_id TEXT,
  youtube_handle TEXT,
  youtube_subscribers INTEGER DEFAULT 0,
  youtube_avg_views INTEGER DEFAULT 0,
  xiaohongshu_handle TEXT,
  xiaohongshu_followers INTEGER DEFAULT 0,
  tiktok_handle TEXT,
  tiktok_followers INTEGER DEFAULT 0,
  threads_handle TEXT,
  facebook_handle TEXT,
  douyin_handle TEXT,

  -- AI-generated metadata
  content_categories TEXT[],
  content_language TEXT DEFAULT 'zh-HK',
  audience_demographics JSONB DEFAULT '{}',
  ai_profile_summary TEXT,

  -- Settings
  is_public BOOLEAN DEFAULT true,
  ai_credits INTEGER DEFAULT 30,
  plan TEXT DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link in Bio blocks
CREATE TABLE IF NOT EXISTS egg_profile_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  title TEXT,
  url TEXT,
  thumbnail_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile themes
CREATE TABLE IF NOT EXISTS egg_profile_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  theme_name TEXT,
  background_color TEXT DEFAULT '#ffffff',
  background_gradient TEXT,
  background_image TEXT,
  text_color TEXT DEFAULT '#000000',
  button_style TEXT DEFAULT 'rounded',
  button_color TEXT DEFAULT '#000000',
  font_family TEXT DEFAULT 'sans-serif',
  custom_css TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asian brand database
CREATE TABLE IF NOT EXISTS egg_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_zh TEXT,
  logo_url TEXT,
  category TEXT,
  region TEXT[] DEFAULT '{}',
  description TEXT,
  description_zh TEXT,
  website TEXT,
  instagram_handle TEXT,
  is_verified BOOLEAN DEFAULT false,
  min_followers INTEGER DEFAULT 1000,
  commission_rate DECIMAL(5,2),
  affiliate_program_url TEXT,
  contact_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand deals
CREATE TABLE IF NOT EXISTS egg_brand_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES egg_brands(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'prospecting',
  deal_type TEXT,
  platform TEXT,
  deliverables TEXT,
  proposed_rate DECIMAL(10,2),
  agreed_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'HKD',
  ai_match_score INTEGER,
  pitch_message TEXT,
  notes TEXT,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital products
CREATE TABLE IF NOT EXISTS egg_digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_zh TEXT,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'HKD',
  product_type TEXT DEFAULT 'download',
  file_url TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product orders
CREATE TABLE IF NOT EXISTS egg_product_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES egg_digital_products(id),
  buyer_email TEXT NOT NULL,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'HKD',
  status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events
CREATE TABLE IF NOT EXISTS egg_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES egg_creator_profiles(id) ON DELETE CASCADE,
  event_type TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE egg_creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_profile_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_profile_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_brand_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================
CREATE POLICY "egg_creator_own" ON egg_creator_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "egg_creator_public_read" ON egg_creator_profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "egg_blocks_own" ON egg_profile_blocks
  FOR ALL USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "egg_blocks_public_read" ON egg_profile_blocks
  FOR SELECT USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE is_public = true)
  );

CREATE POLICY "egg_themes_own" ON egg_profile_themes
  FOR ALL USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "egg_themes_public_read" ON egg_profile_themes
  FOR SELECT USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE is_public = true)
  );

CREATE POLICY "egg_brands_public_read" ON egg_brands
  FOR SELECT USING (true);

CREATE POLICY "egg_deals_own" ON egg_brand_deals
  FOR ALL USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "egg_products_own" ON egg_digital_products
  FOR ALL USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "egg_products_public_read" ON egg_digital_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "egg_orders_buyer" ON egg_product_orders
  FOR SELECT USING (buyer_email = auth.email());

CREATE POLICY "egg_analytics_own" ON egg_analytics_events
  FOR ALL USING (
    creator_id IN (SELECT id FROM egg_creator_profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION egg_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER egg_creator_profiles_updated_at
  BEFORE UPDATE ON egg_creator_profiles
  FOR EACH ROW EXECUTE FUNCTION egg_update_updated_at();

CREATE TRIGGER egg_brand_deals_updated_at
  BEFORE UPDATE ON egg_brand_deals
  FOR EACH ROW EXECUTE FUNCTION egg_update_updated_at();

-- ============================================
-- Seed: Asian Brands
-- ============================================
INSERT INTO egg_brands (name, name_zh, category, region, min_followers, description_zh) VALUES
  ('Bonjour', '卓悅', '美妝零售', ARRAY['HK'], 5000, '香港連鎖美妝零售商'),
  ('Sasa', '莎莎', '美妝零售', ARRAY['HK','TW','SG'], 4000, '泛亞洲美妝零售品牌'),
  ('Chow Tai Fook', '周大福', '珠寶', ARRAY['HK','TW','CN'], 12000, '香港知名珠寶品牌'),
  ('Maxims', '美心', '餐飲', ARRAY['HK'], 3000, '香港最大餐飲集團之一'),
  ('OpenRice', '開飯喇', '餐飲平台', ARRAY['HK'], 2000, '香港最大餐廳搜尋平台'),
  ('My Beauty Diary', '我的美麗日記', '美妝', ARRAY['TW','HK','SG'], 5000, '台灣人氣面膜品牌'),
  ('OSIM', 'OSIM', '健康電器', ARRAY['TW','SG','HK'], 5000, '亞洲知名按摩器材品牌'),
  ('Charles and Keith', 'Charles & Keith', '時裝配件', ARRAY['SG','HK','TW','MY'], 8000, '新加坡時尚鞋履品牌'),
  ('Eu Yan Sang', '余仁生', '健康養生', ARRAY['SG','HK','MY'], 3000, '百年中藥養生品牌'),
  ('Klook', 'Klook客路', '旅遊體驗', ARRAY['HK','TW','SG','MY'], 5000, '亞洲領先旅遊體驗平台'),
  ('foodpanda', 'foodpanda', '外賣平台', ARRAY['HK','SG','TW','MY'], 3000, '外賣送餐平台'),
  ('Vitasoy', '維他奶', '食品飲料', ARRAY['HK','SG'], 5000, '香港經典豆奶品牌'),
  ('Innisfree', 'Innisfree', '韓系護膚', ARRAY['HK','TW','SG'], 5000, '韓國自然主義護膚品牌'),
  ('LANEIGE', '蘭芝', '韓系美妝', ARRAY['HK','TW','SG'], 5000, '韓國人氣美妝品牌'),
  ('Sulwhasoo', '雪花秀', '韓系護膚', ARRAY['HK','TW','SG'], 10000, '韓國高端漢方護膚品牌'),
  ('SK-II', 'SK-II', '護膚', ARRAY['HK','TW','SG'], 10000, '日本高端護膚品牌'),
  ('Carousell', 'Carousell', '電商平台', ARRAY['SG','HK','TW'], 3000, '亞洲二手交易平台'),
  ('Tiger Balm', '虎標', '健康', ARRAY['SG','HK','MY'], 3000, '百年虎標萬金油品牌'),
  ('Want Want', '旺旺', '零食', ARRAY['TW','HK'], 3000, '台灣人氣零食品牌'),
  ('85C Bakery', '85度C', '餐飲', ARRAY['TW','HK'], 3000, '台灣連鎖烘焙品牌')
ON CONFLICT DO NOTHING;
;
