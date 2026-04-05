-- Release gate audit for schedule_days invariants after extension migrations.
-- Run this after `supabase db push` in hosted environments.
--
-- Example:
--   psql "$SUPABASE_DB_URL" -f supabase/sql/006_schedule_days_release_gate.sql
--
-- The script raises an exception (non-zero exit) if any check fails.

do $$
declare
  non_extension_null_original_count bigint;
  duplicate_workbook_original_count bigint;
  extension_with_original_count bigint;
begin
  select count(*)
    into non_extension_null_original_count
  from schedule_days
  where is_extension_day = false
    and original_day_number is null;

  if non_extension_null_original_count > 0 then
    raise exception
      'release_gate(schedule_days) failed: % non-extension rows have null original_day_number',
      non_extension_null_original_count;
  end if;

  select count(*)
    into duplicate_workbook_original_count
  from (
    select user_id, original_day_number
    from schedule_days
    where is_extension_day = false
    group by user_id, original_day_number
    having count(*) > 1
  ) as duplicates;

  if duplicate_workbook_original_count > 0 then
    raise exception
      'release_gate(schedule_days) failed: % duplicate non-extension original_day_number values',
      duplicate_workbook_original_count;
  end if;

  select count(*)
    into extension_with_original_count
  from schedule_days
  where is_extension_day = true
    and original_day_number is not null;

  if extension_with_original_count > 0 then
    raise exception
      'release_gate(schedule_days) failed: % extension rows carry original_day_number unexpectedly',
      extension_with_original_count;
  end if;
end;
$$;

select
  'non_extension_null_original_day_number' as check_name,
  count(*) as violation_count
from schedule_days
where is_extension_day = false
  and original_day_number is null
union all
select
  'duplicate_non_extension_original_day_number_per_user' as check_name,
  count(*) as violation_count
from (
  select user_id, original_day_number
  from schedule_days
  where is_extension_day = false
  group by user_id, original_day_number
  having count(*) > 1
) as duplicates
union all
select
  'extension_day_with_original_day_number' as check_name,
  count(*) as violation_count
from schedule_days
where is_extension_day = true
  and original_day_number is not null;
