alter table app_settings
  add column if not exists shift_events jsonb not null default '[]'::jsonb;

update app_settings
set shift_events = '[]'::jsonb
where shift_events is null;
