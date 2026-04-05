-- Optimise RLS policies: wrap auth.uid() in a subselect so the planner
-- evaluates it once per statement instead of once per row.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions

do $$
declare
  entry record;
begin
  for entry in
    select * from (
      values
        ('app_settings', 'app_settings'),
        ('schedule_days', 'schedule_days'),
        ('schedule_blocks', 'schedule_blocks'),
        ('schedule_topic_assignments', 'schedule_topic_assignments'),
        ('phase_config', 'phase_config'),
        ('revision_completions', 'revision_completions'),
        ('backlog_items', 'backlog_items'),
        ('mcq_bulk_logs', 'mcq_bulk_logs'),
        ('mcq_item_logs', 'mcq_item_logs'),
        ('gt_logs', 'gt_logs'),
        ('weekly_summaries', 'weekly_summaries')
    ) as items(tablename, policy_prefix)
  loop
    -- Drop existing per-row auth.uid() policies
    execute format('drop policy if exists %I on %I', entry.policy_prefix || '_select_own', entry.tablename);
    execute format('drop policy if exists %I on %I', entry.policy_prefix || '_insert_own', entry.tablename);
    execute format('drop policy if exists %I on %I', entry.policy_prefix || '_update_own', entry.tablename);
    execute format('drop policy if exists %I on %I', entry.policy_prefix || '_delete_own', entry.tablename);

    -- Recreate with (select auth.uid()) subselect
    execute format('create policy %I on %I for select using ((select auth.uid()) = user_id)', entry.policy_prefix || '_select_own', entry.tablename);
    execute format('create policy %I on %I for insert with check ((select auth.uid()) = user_id)', entry.policy_prefix || '_insert_own', entry.tablename);
    execute format('create policy %I on %I for update using ((select auth.uid()) = user_id)', entry.policy_prefix || '_update_own', entry.tablename);
    execute format('create policy %I on %I for delete using ((select auth.uid()) = user_id)', entry.policy_prefix || '_delete_own', entry.tablename);
  end loop;
end
$$;
