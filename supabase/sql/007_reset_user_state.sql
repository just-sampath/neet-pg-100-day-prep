-- Manual runbook script: reset all hosted user state while keeping schema,
-- migrations, reference data, and auth accounts intact.
--
-- Intended use:
-- - Production data is corrupted and users have agreed to restart fresh.
-- - You want users to keep their existing login credentials.
--
-- Before running:
-- 1) Deploy the latest application fix first.
-- 2) Confirm all migrations are applied.
-- 3) Take a database backup / snapshot in Supabase.
--
-- After running:
-- - Users can sign back in and set Day 1 again.
-- - If you need same-day cron jobs to rerun from a truly blank slate,
--   decide separately whether to clear public.automation_job_runs.

begin;

truncate table
  public.weekly_summaries,
  public.gt_logs,
  public.mcq_item_logs,
  public.mcq_bulk_logs,
  public.backlog_items,
  public.revision_completions,
  public.phase_config,
  public.schedule_topic_assignments,
  public.schedule_blocks,
  public.schedule_days,
  public.app_settings;

commit;

-- Optional verification:
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
