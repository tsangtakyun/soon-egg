
ALTER TABLE egg_project_briefs
ADD COLUMN IF NOT EXISTS kol_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS kol_first_submission_date date,
ADD COLUMN IF NOT EXISTS kol_final_submission_date date,
ADD COLUMN IF NOT EXISTS kol_confirmation_notes text,
ADD COLUMN IF NOT EXISTS deal_status text DEFAULT 'received';
-- deal_status: received → confirmed → in_progress → submitted → completed
;
