-- Manual runbook script: reset one user's schedule-derived state while
-- preserving app_settings (day_one_date, theme, quote state, etc.), auth,
-- and non-schedule logs.
--
-- Use this as a canary check before any wider reset.
-- Replace the UUID below with the target auth.users id.
--
-- IMPORTANT:
-- - This preserves app_settings on purpose.
-- - After running it, the user's next schedule mutation in the app
--   should trigger a full schedule-table backfill via the fixed code path.
-- - This is a verification/reset helper, not a full fresh-start reset.

begin;

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.backlog_items
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.revision_completions
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.phase_config
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.schedule_topic_assignments
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.schedule_blocks
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.schedule_days
where user_id = (select user_id from target_user);

commit;

-- Optional verification:
with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
select
  (select day_one_date from public.app_settings where user_id = (select user_id from target_user)) as preserved_day_one_date,
  (select theme from public.app_settings where user_id = (select user_id from target_user)) as preserved_theme,
  (select count(*) from public.schedule_days where user_id = (select user_id from target_user)) as schedule_days_count,
  (select count(*) from public.schedule_blocks where user_id = (select user_id from target_user)) as schedule_blocks_count,
  (select count(*) from public.schedule_topic_assignments where user_id = (select user_id from target_user)) as schedule_topic_assignments_count,
  (select count(*) from public.phase_config where user_id = (select user_id from target_user)) as phase_config_count,
  (select count(*) from public.revision_completions where user_id = (select user_id from target_user)) as revision_completions_count,
  (select count(*) from public.backlog_items where user_id = (select user_id from target_user)) as backlog_items_count;
