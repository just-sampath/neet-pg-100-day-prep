delete from weekly_summaries older
using weekly_summaries newer
where older.user_id = newer.user_id
  and older.week_key = newer.week_key
  and (
    older.generated_at < newer.generated_at
    or (older.generated_at = newer.generated_at and older.id::text < newer.id::text)
  );

create unique index if not exists weekly_summaries_user_week_key_unique
  on weekly_summaries(user_id, week_key);
