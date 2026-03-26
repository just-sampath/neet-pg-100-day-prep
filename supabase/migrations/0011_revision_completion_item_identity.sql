alter table if exists revision_completions
  add column if not exists source_item_id text;

update revision_completions
set source_item_id = coalesce(
  source_item_id,
  nullif(regexp_replace(revision_id, ':' || revision_type || '$', ''), ''),
  revision_id
)
where source_item_id is null;

alter table if exists revision_completions
  alter column source_item_id set not null;

drop index if exists revision_completions_user_source_unique;
drop index if exists revision_completions_user_source_block_unique;

create unique index if not exists revision_completions_user_revision_unique
  on revision_completions(user_id, revision_id);

create index if not exists revision_completions_user_source_item_lookup
  on revision_completions(user_id, source_item_id);
