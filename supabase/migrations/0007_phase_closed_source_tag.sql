-- Migration 0007: Allow phase_closed as a source_tag.
-- Runtime repack logic writes sourceTag='phase_closed' on both
-- backlog_items and schedule_topic_assignments when items are terminally closed.

alter table backlog_items drop constraint if exists backlog_items_source_tag_check;
alter table backlog_items
  add constraint backlog_items_source_tag_check
    check (source_tag in (
      'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade',
      'manual_skip', 'manual_missed', 'traffic_light',
      'end_of_day_sweep', 'block_overrun_2245', 'repack_overflow', 'phase_closed'
    ));

alter table schedule_topic_assignments drop constraint if exists schedule_topic_assignments_source_tag_check;
alter table schedule_topic_assignments
  add constraint schedule_topic_assignments_source_tag_check
    check (source_tag in (
      'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade',
      'manual_skip', 'manual_missed', 'traffic_light',
      'end_of_day_sweep', 'block_overrun_2245', 'repack_overflow', 'phase_closed'
    ));
