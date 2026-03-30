-- Migration 0005: Add end_of_day_sweep and block_overrun_2245 source tags
-- for the two automated backlog triggers (23:15 sweep and 22:45 overrun cutoff).

-- Step 1: Replace source_tag check constraint to include new values
alter table backlog_items drop constraint if exists backlog_items_source_tag_check;
alter table backlog_items
  add constraint backlog_items_source_tag_check
    check (source_tag in (
      'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade',
      'manual_skip', 'manual_missed', 'traffic_light',
      'end_of_day_sweep', 'block_overrun_2245'
    ));

-- Step 2: Update processed_dates default to include endOfDaySweepDates
alter table app_settings
  alter column processed_dates set default
    '{"lateNightSweepDates":[],"midnightDates":[],"weeklySummaryDates":[],"endOfDaySweepDates":[]}'::jsonb;
