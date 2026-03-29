alter table if exists app_settings
  add column if not exists morning_revision_selections jsonb default '{}'::jsonb;
