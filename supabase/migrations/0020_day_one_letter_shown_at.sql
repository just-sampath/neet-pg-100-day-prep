-- Track when the Day 1 welcome letter was first shown (once per account)
ALTER TABLE IF EXISTS app_settings
  ADD COLUMN IF NOT EXISTS day_one_letter_shown_at timestamptz;
