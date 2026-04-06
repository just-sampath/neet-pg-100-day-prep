create or replace function public._apply_schedule_block_delta(
  p_user_id uuid,
  p_changed_rows jsonb,
  p_removed_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_removed_rows) = 'array' and jsonb_array_length(p_removed_rows) > 0 then
    delete from schedule_blocks as target
    using (
      select
        (value->>'day_number')::integer as day_number,
        value->>'block_key' as block_key
      from jsonb_array_elements(p_removed_rows)
      where value ? 'day_number' and value ? 'block_key'
    ) as removed
    where target.user_id = p_user_id
      and target.day_number = removed.day_number
      and target.block_key = removed.block_key;
  end if;

  if jsonb_typeof(p_changed_rows) = 'array' and jsonb_array_length(p_changed_rows) > 0 then
    delete from schedule_blocks as target
    using (
      select
        (value->>'day_number')::integer as day_number,
        value->>'block_key' as block_key
      from jsonb_array_elements(p_changed_rows)
      where value ? 'day_number' and value ? 'block_key'
    ) as changed
    where target.user_id = p_user_id
      and target.day_number = changed.day_number
      and target.block_key = changed.block_key;

    insert into schedule_blocks
    select *
    from jsonb_populate_recordset(null::schedule_blocks, p_changed_rows) as row_value
    where row_value.user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.apply_user_state_mutation_atomic(
  p_user_id uuid,
  p_expected_state_version bigint,
  p_next_state_version bigint,
  p_settings jsonb,
  p_deltas jsonb
)
returns table (
  applied boolean,
  state_version bigint,
  conflict_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_state_version bigint;
  v_theme text;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  if p_next_state_version <> p_expected_state_version + 1 then
    raise exception 'invalid_next_state_version';
  end if;

  insert into app_settings (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select settings.state_version
    into v_current_state_version
  from app_settings as settings
  where settings.user_id = p_user_id
  for update;

  if v_current_state_version is distinct from p_expected_state_version then
    return query
    select false, v_current_state_version, 'version_mismatch';
    return;
  end if;

  perform public._apply_single_key_table_delta(
    'schedule_days'::regclass,
    p_user_id,
    'day_number',
    coalesce(p_deltas->'schedule_days'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'schedule_days'->'removed', '[]'::jsonb)
  );

  perform public._apply_schedule_block_delta(
    p_user_id,
    coalesce(p_deltas->'schedule_blocks'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'schedule_blocks'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'schedule_topic_assignments'::regclass,
    p_user_id,
    'source_item_id',
    coalesce(p_deltas->'schedule_topic_assignments'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'schedule_topic_assignments'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'phase_config'::regclass,
    p_user_id,
    'phase_number',
    coalesce(p_deltas->'phase_config'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'phase_config'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'revision_completions'::regclass,
    p_user_id,
    'revision_id',
    coalesce(p_deltas->'revision_completions'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'revision_completions'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'backlog_items'::regclass,
    p_user_id,
    'id',
    coalesce(p_deltas->'backlog_items'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'backlog_items'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'mcq_bulk_logs'::regclass,
    p_user_id,
    'id',
    coalesce(p_deltas->'mcq_bulk_logs'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'mcq_bulk_logs'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'mcq_item_logs'::regclass,
    p_user_id,
    'id',
    coalesce(p_deltas->'mcq_item_logs'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'mcq_item_logs'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'gt_logs'::regclass,
    p_user_id,
    'id',
    coalesce(p_deltas->'gt_logs'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'gt_logs'->'removed', '[]'::jsonb)
  );

  perform public._apply_single_key_table_delta(
    'weekly_summaries'::regclass,
    p_user_id,
    'week_key',
    coalesce(p_deltas->'weekly_summaries'->'changed', '[]'::jsonb),
    coalesce(p_deltas->'weekly_summaries'->'removed', '[]'::jsonb)
  );

  v_theme := coalesce(p_settings->>'theme', 'dark');
  if v_theme not in ('dark', 'light') then
    v_theme := 'dark';
  end if;

  update app_settings
  set
    day_one_date = nullif(p_settings->>'day_one_date', '')::date,
    theme = v_theme,
    schedule_shift_days = coalesce((p_settings->>'schedule_shift_days')::integer, 0),
    shift_applied_at = nullif(p_settings->>'shift_applied_at', '')::timestamptz,
    shift_events = coalesce(p_settings->'shift_events', '[]'::jsonb),
    schedule_seed_version = coalesce((p_settings->>'schedule_seed_version')::integer, 0),
    schedule_seeded_at = nullif(p_settings->>'schedule_seeded_at', '')::timestamptz,
    quote_state = coalesce(p_settings->'quote_state', '{}'::jsonb),
    processed_dates = coalesce(p_settings->'processed_dates', '{}'::jsonb),
    morning_revision_selections = coalesce(p_settings->'morning_revision_selections', '{}'::jsonb),
    morning_revision_actual_minutes = coalesce(p_settings->'morning_revision_actual_minutes', '{}'::jsonb),
    morning_revision_auto_add_notice = coalesce(p_settings->'morning_revision_auto_add_notice', '{}'::jsonb),
    simulated_now_iso = nullif(p_settings->>'simulated_now_iso', '')::timestamptz,
    state_version = p_next_state_version,
    write_lock_token = null,
    write_lock_expires_at = null,
    updated_at = now()
  where user_id = p_user_id;

  return query
  select true, p_next_state_version, null::text;
end;
$$;
