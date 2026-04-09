-- Manual runbook script: reset one user's hosted state while keeping
-- schema, migrations, reference data, and auth accounts intact.
--
-- Use this as a canary before a full production reset.
-- Replace the UUID below with the target auth.users id.

begin;

-- Replace this UUID before running.
-- Example:
--   select id, email from auth.users order by created_at desc;
-- Then paste the chosen id below.
with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.weekly_summaries
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.gt_logs
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.mcq_item_logs
where user_id = (select user_id from target_user);

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.mcq_bulk_logs
where user_id = (select user_id from target_user);

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

with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
delete from public.app_settings
where user_id = (select user_id from target_user);

commit;

-- Optional verification:
with target_user as (
  select '00000000-0000-0000-0000-000000000000'::uuid as user_id
)
select
  (select count(*) from public.app_settings where user_id = (select user_id from target_user)) as app_settings_count,
  (select count(*) from public.schedule_days where user_id = (select user_id from target_user)) as schedule_days_count,
  (select count(*) from public.schedule_blocks where user_id = (select user_id from target_user)) as schedule_blocks_count,
  (select count(*) from public.schedule_topic_assignments where user_id = (select user_id from target_user)) as schedule_topic_assignments_count,
  (select count(*) from public.phase_config where user_id = (select user_id from target_user)) as phase_config_count,
  (select count(*) from public.revision_completions where user_id = (select user_id from target_user)) as revision_completions_count,
  (select count(*) from public.backlog_items where user_id = (select user_id from target_user)) as backlog_items_count,
  (select count(*) from public.mcq_bulk_logs where user_id = (select user_id from target_user)) as mcq_bulk_logs_count,
  (select count(*) from public.mcq_item_logs where user_id = (select user_id from target_user)) as mcq_item_logs_count,
  (select count(*) from public.gt_logs where user_id = (select user_id from target_user)) as gt_logs_count,
  (select count(*) from public.weekly_summaries where user_id = (select user_id from target_user)) as weekly_summaries_count;
