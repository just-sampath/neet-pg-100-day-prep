alter table if exists app_settings enable row level security;
alter table if exists schedule_days enable row level security;
alter table if exists schedule_blocks enable row level security;
alter table if exists schedule_topic_assignments enable row level security;
alter table if exists phase_config enable row level security;
alter table if exists revision_completions enable row level security;
alter table if exists backlog_items enable row level security;
alter table if exists mcq_bulk_logs enable row level security;
alter table if exists mcq_item_logs enable row level security;
alter table if exists gt_logs enable row level security;
alter table if exists weekly_summaries enable row level security;
alter table if exists subject_tiers enable row level security;
alter table if exists quote_catalog enable row level security;
alter table if exists gt_plan_items enable row level security;
alter table if exists revision_map_days enable row level security;

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
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = entry.tablename
        and policyname = entry.policy_prefix || '_select_own'
    ) then
      execute format('create policy %I on %I for select using (auth.uid() = user_id)', entry.policy_prefix || '_select_own', entry.tablename);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = entry.tablename
        and policyname = entry.policy_prefix || '_insert_own'
    ) then
      execute format('create policy %I on %I for insert with check (auth.uid() = user_id)', entry.policy_prefix || '_insert_own', entry.tablename);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = entry.tablename
        and policyname = entry.policy_prefix || '_update_own'
    ) then
      execute format('create policy %I on %I for update using (auth.uid() = user_id)', entry.policy_prefix || '_update_own', entry.tablename);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = entry.tablename
        and policyname = entry.policy_prefix || '_delete_own'
    ) then
      execute format('create policy %I on %I for delete using (auth.uid() = user_id)', entry.policy_prefix || '_delete_own', entry.tablename);
    end if;
  end loop;
end
$$;

do $$
declare
  entry record;
begin
  for entry in
    select * from (
      values
        ('subject_tiers', 'subject_tiers_select_all'),
        ('quote_catalog', 'quote_catalog_select_all'),
        ('gt_plan_items', 'gt_plan_items_select_all'),
        ('revision_map_days', 'revision_map_days_select_all')
    ) as items(tablename, policyname)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = entry.tablename
        and policyname = entry.policyname
    ) then
      execute format('create policy %I on %I for select using (auth.role() = ''authenticated'')', entry.policyname, entry.tablename);
    end if;
  end loop;
end
$$;

do $$
begin
  alter publication supabase_realtime add table app_settings;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table schedule_days;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table schedule_blocks;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table schedule_topic_assignments;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table phase_config;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table revision_completions;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table backlog_items;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table mcq_bulk_logs;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table mcq_item_logs;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table gt_logs;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table weekly_summaries;
exception when duplicate_object then null;
end
$$;
