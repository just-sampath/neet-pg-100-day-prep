alter table if exists gt_logs
  add column if not exists weakest_subjects text[] not null default '{}'::text[];
