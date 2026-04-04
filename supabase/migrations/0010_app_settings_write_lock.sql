alter table if exists app_settings
  add column if not exists write_lock_token text,
  add column if not exists write_lock_expires_at timestamptz;
