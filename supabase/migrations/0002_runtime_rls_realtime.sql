alter table if exists app_settings
  add column if not exists processed_dates jsonb not null default
    '{"lateNightSweepDates":[],"midnightDates":[],"weeklySummaryDates":[]}'::jsonb,
  add column if not exists simulated_now_iso timestamptz;

create unique index if not exists day_states_user_day_unique
  on day_states(user_id, day_number);

create unique index if not exists block_progress_user_day_block_unique
  on block_progress(user_id, day_number, block_key);

create unique index if not exists revision_completions_user_source_unique
  on revision_completions(user_id, source_day, revision_type);

create index if not exists day_states_user_lookup on day_states(user_id);
create index if not exists block_progress_user_lookup on block_progress(user_id);
create index if not exists revision_completions_user_lookup on revision_completions(user_id);
create index if not exists mcq_bulk_logs_user_lookup on mcq_bulk_logs(user_id);
create index if not exists mcq_item_logs_user_lookup on mcq_item_logs(user_id);
create index if not exists gt_logs_user_lookup on gt_logs(user_id);
create index if not exists weekly_summaries_user_lookup on weekly_summaries(user_id);

alter table if exists app_settings enable row level security;
alter table if exists day_states enable row level security;
alter table if exists block_progress enable row level security;
alter table if exists revision_completions enable row level security;
alter table if exists backlog_items enable row level security;
alter table if exists mcq_bulk_logs enable row level security;
alter table if exists mcq_item_logs enable row level security;
alter table if exists gt_logs enable row level security;
alter table if exists weekly_summaries enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'app_settings_select_own'
  ) then
    create policy app_settings_select_own on app_settings for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'app_settings_insert_own'
  ) then
    create policy app_settings_insert_own on app_settings for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'app_settings_update_own'
  ) then
    create policy app_settings_update_own on app_settings for update using (auth.uid() = user_id);
  end if;
end
$$;

do $$
declare
  entry record;
begin
  for entry in
    select * from (
      values
        ('day_states', 'day_states_select_own'),
        ('day_states', 'day_states_insert_own'),
        ('day_states', 'day_states_update_own'),
        ('day_states', 'day_states_delete_own'),
        ('block_progress', 'block_progress_select_own'),
        ('block_progress', 'block_progress_insert_own'),
        ('block_progress', 'block_progress_update_own'),
        ('block_progress', 'block_progress_delete_own'),
        ('revision_completions', 'revision_completions_select_own'),
        ('revision_completions', 'revision_completions_insert_own'),
        ('revision_completions', 'revision_completions_update_own'),
        ('revision_completions', 'revision_completions_delete_own'),
        ('backlog_items', 'backlog_items_select_own'),
        ('backlog_items', 'backlog_items_insert_own'),
        ('backlog_items', 'backlog_items_update_own'),
        ('backlog_items', 'backlog_items_delete_own'),
        ('mcq_bulk_logs', 'mcq_bulk_logs_select_own'),
        ('mcq_bulk_logs', 'mcq_bulk_logs_insert_own'),
        ('mcq_bulk_logs', 'mcq_bulk_logs_update_own'),
        ('mcq_bulk_logs', 'mcq_bulk_logs_delete_own'),
        ('mcq_item_logs', 'mcq_item_logs_select_own'),
        ('mcq_item_logs', 'mcq_item_logs_insert_own'),
        ('mcq_item_logs', 'mcq_item_logs_update_own'),
        ('mcq_item_logs', 'mcq_item_logs_delete_own'),
        ('gt_logs', 'gt_logs_select_own'),
        ('gt_logs', 'gt_logs_insert_own'),
        ('gt_logs', 'gt_logs_update_own'),
        ('gt_logs', 'gt_logs_delete_own'),
        ('weekly_summaries', 'weekly_summaries_select_own'),
        ('weekly_summaries', 'weekly_summaries_insert_own'),
        ('weekly_summaries', 'weekly_summaries_update_own'),
        ('weekly_summaries', 'weekly_summaries_delete_own')
    ) as items(tablename, policyname)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = entry.tablename
        and policyname = entry.policyname
    ) then
      if entry.policyname like '%select%' then
        execute format('create policy %I on %I for select using (auth.uid() = user_id)', entry.policyname, entry.tablename);
      elsif entry.policyname like '%insert%' then
        execute format('create policy %I on %I for insert with check (auth.uid() = user_id)', entry.policyname, entry.tablename);
      elsif entry.policyname like '%update%' then
        execute format('create policy %I on %I for update using (auth.uid() = user_id)', entry.policyname, entry.tablename);
      elsif entry.policyname like '%delete%' then
        execute format('create policy %I on %I for delete using (auth.uid() = user_id)', entry.policyname, entry.tablename);
      end if;
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
  alter publication supabase_realtime add table day_states;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table block_progress;
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
