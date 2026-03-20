alter table backlog_items
  add column if not exists original_start time,
  add column if not exists original_end time;
