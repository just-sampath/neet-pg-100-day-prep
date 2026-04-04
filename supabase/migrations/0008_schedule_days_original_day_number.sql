-- Migration 0008: add schedule_days.original_day_number for runtime day mapping.
-- Runtime persistence writes this column from schedule day state.

alter table schedule_days
  add column if not exists original_day_number integer;

update schedule_days
set original_day_number = day_number
where original_day_number is null;

create index if not exists schedule_days_user_original_day_idx
  on schedule_days(user_id, original_day_number);
