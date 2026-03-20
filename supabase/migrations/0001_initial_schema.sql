create table if not exists app_settings (
  user_id uuid primary key,
  day_one_date date,
  theme text not null default 'dark',
  schedule_shift_days integer not null default 0,
  shift_applied_at timestamptz
);

create table if not exists day_states (
  id uuid primary key,
  user_id uuid not null,
  day_number integer not null,
  traffic_light text not null default 'green',
  updated_at timestamptz not null default now()
);

create table if not exists block_progress (
  id uuid primary key,
  user_id uuid not null,
  day_number integer not null,
  block_key text not null,
  status text not null default 'pending',
  actual_start time,
  actual_end time,
  completed_at timestamptz,
  source_tag text,
  note text
);

create table if not exists revision_completions (
  id uuid primary key,
  user_id uuid not null,
  source_day integer not null,
  revision_type text not null,
  completed_at timestamptz not null default now()
);

create table if not exists backlog_items (
  id uuid primary key,
  user_id uuid not null,
  original_day integer not null,
  original_block_key text not null,
  topic_description text not null,
  subject text not null,
  source_tag text not null,
  status text not null default 'pending',
  suggested_day integer,
  suggested_block_key text,
  suggested_note text,
  rescheduled_to_day integer,
  rescheduled_to_block_key text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  dismissed_at timestamptz
);

create table if not exists mcq_bulk_logs (
  id uuid primary key,
  user_id uuid not null,
  entry_date date not null,
  total_attempted integer not null,
  correct integer not null,
  wrong integer not null,
  subject text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists mcq_item_logs (
  id uuid primary key,
  user_id uuid not null,
  entry_date date not null,
  mcq_id text not null,
  result text not null,
  subject text,
  topic text,
  source text,
  cause_code text,
  priority text,
  correct_rule text,
  what_fooled_me text,
  fix_codes text[],
  tags text[],
  created_at timestamptz not null default now()
);

create table if not exists gt_logs (
  id uuid primary key,
  user_id uuid not null,
  gt_number text not null,
  gt_date date not null,
  day_number integer,
  score numeric,
  correct integer,
  wrong integer,
  unattempted integer,
  air_percentile text,
  device text,
  attempted_live boolean,
  overall_feeling text,
  section_a jsonb not null default '{}'::jsonb,
  section_b jsonb not null default '{}'::jsonb,
  section_c jsonb not null default '{}'::jsonb,
  section_d jsonb not null default '{}'::jsonb,
  section_e jsonb not null default '{}'::jsonb,
  error_types text,
  recurring_topics text,
  knowledge_vs_behaviour integer,
  unsure_right_count integer,
  change_before_next_gt text,
  created_at timestamptz not null default now()
);

create table if not exists weekly_summaries (
  id uuid primary key,
  user_id uuid not null,
  week_key text not null,
  week_start_date date not null,
  week_end_date date not null,
  payload jsonb not null,
  generated_at timestamptz not null default now()
);
