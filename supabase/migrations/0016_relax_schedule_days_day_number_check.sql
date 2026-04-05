-- Relax the day_number check constraint on schedule_days to accommodate
-- extension days beyond the original 100-day workbook plan (Day 101+).
-- The old constraint (1–105) was too tight once phase-free repack creates
-- extensions that append after the schedule tail.

alter table schedule_days
  drop constraint if exists schedule_days_day_number_check;

alter table schedule_days
  add constraint schedule_days_day_number_check check (day_number >= 1);
