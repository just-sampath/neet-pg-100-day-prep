-- Migration 0006: Add repack_overflow source tag and phase_closed status
-- for the midnight repack engine (Chunk 4).

-- Step 1: Extend backlog_items source_tag constraint to include repack_overflow
alter table backlog_items drop constraint if exists backlog_items_source_tag_check;
alter table backlog_items
  add constraint backlog_items_source_tag_check
    check (source_tag in (
      'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade',
      'manual_skip', 'manual_missed', 'traffic_light',
      'end_of_day_sweep', 'block_overrun_2245', 'repack_overflow'
    ));

-- Step 2: Extend backlog_items status constraint to include phase_closed
alter table backlog_items drop constraint if exists backlog_items_status_check;
alter table backlog_items
  add constraint backlog_items_status_check
    check (status in ('pending', 'rescheduled', 'completed', 'dismissed', 'phase_closed'));

-- Step 3: Extend schedule_topic_assignments source_tag constraint to include new values
-- The inline check must be replaced by a named constraint via drop+add
do $$
begin
  -- Drop the inline check constraint (Postgres names inline checks as <table>_<col>_check)
  alter table schedule_topic_assignments drop constraint if exists schedule_topic_assignments_source_tag_check;
exception when others then null;
end $$;
alter table schedule_topic_assignments
  add constraint schedule_topic_assignments_source_tag_check
    check (source_tag in (
      'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade',
      'manual_skip', 'manual_missed', 'traffic_light',
      'end_of_day_sweep', 'block_overrun_2245', 'repack_overflow'
    ));

-- Step 4: Update processed_dates default to include repackDates
alter table app_settings
  alter column processed_dates set default
    '{"lateNightSweepDates":[],"midnightDates":[],"weeklySummaryDates":[],"endOfDaySweepDates":[],"repackDates":[]}'::jsonb;
