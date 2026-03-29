alter table if exists app_settings
  add column if not exists morning_revision_actual_minutes jsonb default '{}'::jsonb,
  add column if not exists morning_revision_auto_add_notice jsonb default '{}'::jsonb;
