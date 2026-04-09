-- Manual runbook script: verify hosted reset readiness before users start again.
--
-- This script checks:
-- 1) user-state tables are empty immediately after the reset, before any user logs in again
-- 2) reference table counts for diagnostic visibility only
-- 3) auth accounts still exist
-- 4) the atomic mutation RPC still exists
--
-- NOTE:
-- In the current runtime, schedule / quote / GT / revision reference data is loaded
-- from bundled generated files in the app build. That means empty
-- subject_tiers / quote_catalog / gt_plan_items / revision_map_days tables are not,
-- by themselves, a production blocker for tomorrow's user flows.
--
-- The blocking checks are:
-- - auth users still exist
-- - the atomic mutation RPC still exists
-- - one real canary login + Day 1 setup + one mutation succeeds
--
-- Also note: section (1) is only expected to be all-zero before the first
-- post-reset login. Once a canary or real user signs in, the app will recreate
-- app_settings / schedule_* / phase_config rows, and those non-zero counts are healthy.

-- 1) User-state tables should all be empty before the first post-reset login.
select
  (select count(*) from public.app_settings) as app_settings_count,
  (select count(*) from public.schedule_days) as schedule_days_count,
  (select count(*) from public.schedule_blocks) as schedule_blocks_count,
  (select count(*) from public.schedule_topic_assignments) as schedule_topic_assignments_count,
  (select count(*) from public.phase_config) as phase_config_count,
  (select count(*) from public.revision_completions) as revision_completions_count,
  (select count(*) from public.backlog_items) as backlog_items_count,
  (select count(*) from public.mcq_bulk_logs) as mcq_bulk_logs_count,
  (select count(*) from public.mcq_item_logs) as mcq_item_logs_count,
  (select count(*) from public.gt_logs) as gt_logs_count,
  (select count(*) from public.weekly_summaries) as weekly_summaries_count;

-- 2) Reference table counts (informational only in the current runtime).
-- These are still useful to inspect, but zero counts do not block normal hosted
-- schedule rendering or persistence because runtime reference data comes from the
-- app's bundled generated JSON files.
select
  (select count(*) from public.subject_tiers) as subject_tiers_count,
  (select count(*) from public.quote_catalog) as quote_catalog_count,
  (select count(*) from public.gt_plan_items) as gt_plan_items_count,
  (select count(*) from public.revision_map_days) as revision_map_days_count,
  (select min(day_number) from public.revision_map_days) as revision_map_min_day,
  (select max(day_number) from public.revision_map_days) as revision_map_max_day;

-- 3) Optional detail: quote coverage by category (informational only).
select
  category,
  count(*) as quote_count
from public.quote_catalog
group by category
order by category;

-- 4) Auth users must still exist so people can log back in.
select
  count(*) as auth_users_count,
  min(created_at) as oldest_user_created_at,
  max(created_at) as newest_user_created_at
from auth.users;

-- Optional detail: inspect current auth users.
select id, email, created_at
from auth.users
order by created_at desc;

-- 5) Critical atomic mutation RPC must exist.
select
  count(*) as atomic_mutation_rpc_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'apply_user_state_mutation_atomic';
