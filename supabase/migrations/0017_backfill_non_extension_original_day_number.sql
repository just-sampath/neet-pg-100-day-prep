-- Backfill missing original_day_number on workbook rows so runtime mapping and
-- legacy-to-canonical migration have stable anchors in Supabase scoped reads.

update schedule_days as day
set original_day_number = case
  when settings.day_one_date is not null then greatest(1, (day.original_mapped_date - settings.day_one_date) + 1)
  else day.day_number
end
from app_settings as settings
where settings.user_id = day.user_id
  and day.is_extension_day = false
  and day.original_day_number is null;

-- Safety fallback for any row that did not join app_settings for any reason.
update schedule_days
set original_day_number = day_number
where is_extension_day = false
  and original_day_number is null;

alter table schedule_days
  drop constraint if exists schedule_days_non_extension_original_day_number_check;

alter table schedule_days
  add constraint schedule_days_non_extension_original_day_number_check
  check (is_extension_day or original_day_number is not null);
