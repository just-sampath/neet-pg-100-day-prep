alter table if exists revision_completions
  add column if not exists revision_id text,
  add column if not exists source_block_key text default 'block_a';

update revision_completions
set
  source_block_key = coalesce(source_block_key, 'block_a'),
  revision_id = coalesce(revision_id, source_day::text || ':' || coalesce(source_block_key, 'block_a') || ':' || revision_type)
where revision_id is null
   or source_block_key is null;

alter table if exists revision_completions
  alter column revision_id set not null,
  alter column source_block_key set not null;

drop index if exists revision_completions_user_source_unique;

create unique index if not exists revision_completions_user_source_block_unique
  on revision_completions(user_id, source_day, source_block_key, revision_type);
