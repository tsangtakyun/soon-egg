
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_rates_enabled boolean DEFAULT true;

ALTER TABLE egg_rate_cards
ADD COLUMN IF NOT EXISTS is_starting_price boolean DEFAULT false;
;
