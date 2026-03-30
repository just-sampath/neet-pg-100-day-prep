-- Migration 0004: Backlog items evolution
-- Adds source_item_id uniqueness, subject tier, phase tracking, new source tags,
-- and additional metadata columns for the backlog recovery system.

-- Step 1: Add new columns
alter table backlog_items
  add column if not exists source_item_id text,
  add column if not exists subject_tier text,
  add column if not exists planned_minutes integer not null default 0,
  add column if not exists phase integer,
  add column if not exists manual_sort_override integer,
  add column if not exists subject_ids text[] not null default '{}',
  add column if not exists recovery_lane text not null default 'none',
  add column if not exists phase_fence text not null default 'not_reschedulable',
  add column if not exists updated_at timestamptz not null default now();

-- Step 2: Backfill source_item_id from id for existing rows
update backlog_items set source_item_id = id where source_item_id is null;
alter table backlog_items alter column source_item_id set not null;

-- Step 3: Add check constraints on new columns
alter table backlog_items
  add constraint backlog_items_subject_tier_check
    check (subject_tier is null or subject_tier in ('A', 'B', 'C'));

alter table backlog_items
  add constraint backlog_items_recovery_lane_check
    check (recovery_lane in ('none', 'core_recovery', 'soft_carry', 'assessment_recovery'));

alter table backlog_items
  add constraint backlog_items_phase_fence_check
    check (phase_fence in ('same_phase_only', 'current_phase_preferred', 'no_auto_cross_phase', 'not_reschedulable'));

-- Step 4: Migrate existing source tags yellow_day/red_day → traffic_light
update backlog_items set source_tag = 'traffic_light' where source_tag in ('yellow_day', 'red_day');

-- Step 5: Replace source_tag check constraint to include new values
-- Drop old constraint and add new one with all allowed values
alter table backlog_items drop constraint if exists backlog_items_source_tag_check;
alter table backlog_items
  add constraint backlog_items_source_tag_check
    check (source_tag in (
      'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade',
      'manual_skip', 'manual_missed', 'traffic_light'
    ));

-- Step 6: Add unique constraint on (user_id, source_item_id)
alter table backlog_items
  add constraint backlog_items_user_source_item_unique
    unique (user_id, source_item_id);

-- Step 7: Add new indexes
create index if not exists backlog_items_user_status_idx
  on backlog_items(user_id, status);

create index if not exists backlog_items_user_tier_day_idx
  on backlog_items(user_id, subject_tier, original_day)
  where status = 'pending';
