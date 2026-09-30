
ALTER TABLE egg_creator_profiles
ADD COLUMN IF NOT EXISTS mediakit_layout text DEFAULT 'webpage',
ADD COLUMN IF NOT EXISTS mediakit_bg_color text DEFAULT '#FFF5E6',
ADD COLUMN IF NOT EXISTS mediakit_text_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS mediakit_accent_color text DEFAULT '#E63946',
ADD COLUMN IF NOT EXISTS mediakit_accent_text_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS mediakit_font text DEFAULT 'Poppins',
ADD COLUMN IF NOT EXISTS mediakit_color_preset text DEFAULT 'custom';
;
