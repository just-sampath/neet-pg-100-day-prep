alter table backlog_items
  add column if not exists priority_order integer not null default 0;
