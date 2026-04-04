alter table if exists app_settings
  add column if not exists state_version bigint not null default 0;
