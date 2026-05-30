-- Run in Master Supabase (fqnnjwxxwxggreoognkv).
-- This table powers SOON-EGG credit checkout packages.

CREATE TABLE IF NOT EXISTS credit_packages (
  id text PRIMARY KEY,
  name text,
  emoji text,
  credits integer,
  price_hkd numeric
);

INSERT INTO credit_packages (id, name, emoji, credits, price_hkd)
VALUES
  ('starter', 'Starter Pack', '⚡', 300, 38),
  ('growth', 'Growth Pack', '🚀', 1000, 98),
  ('creator', 'Creator Pack', '✨', 2500, 198),
  ('pro', 'Pro Pack', '💎', 6000, 398)
ON CONFLICT (id) DO NOTHING;
