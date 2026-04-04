create or replace function public._apply_single_key_table_delta(
  p_table regclass,
  p_user_id uuid,
  p_key_column text,
  p_changed_rows jsonb,
  p_removed_keys jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_removed_keys) = 'array' and jsonb_array_length(p_removed_keys) > 0 then
    execute format(
      'delete from %s as target
       using (
         select value as key_value
         from jsonb_array_elements_text($1)
       ) as removed
       where target.user_id = $2
         and target.%I::text = removed.key_value',
      p_table,
      p_key_column
    )
    using p_removed_keys, p_user_id;
  end if;

  if jsonb_typeof(p_changed_rows) = 'array' and jsonb_array_length(p_changed_rows) > 0 then
    execute format(
      'delete from %s as target
       using (
         select value->>%L as key_value
         from jsonb_array_elements($1)
       ) as delta
       where target.user_id = $2
         and target.%I::text = delta.key_value',
      p_table,
      p_key_column,
      p_key_column
    )
    using p_changed_rows, p_user_id;

    execute format(
      'insert into %s
       select *
       from jsonb_populate_recordset(null::%s, $1) as row_value
       where row_value.user_id = $2',
      p_table,
      p_table
    )
    using p_changed_rows, p_user_id;
  end if;
end;
$$;

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
