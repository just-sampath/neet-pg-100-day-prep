create extension if not exists pgcrypto;

create table if not exists app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day_one_date date,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  schedule_shift_days integer not null default 0,
  shift_applied_at timestamptz,
  shift_events jsonb not null default '[]'::jsonb,
  schedule_seed_version integer not null default 0,
  schedule_seeded_at timestamptz,
  quote_state jsonb not null default
    '{"daySelections":{},"categoryCycles":{"daily":{"usedQuoteIds":[],"cycleCount":0},"tough_day":{"usedQuoteIds":[],"cycleCount":0},"celebration":{"usedQuoteIds":[],"cycleCount":0}}}'::jsonb,
  processed_dates jsonb not null default
    '{"lateNightSweepDates":[],"midnightDates":[],"weeklySummaryDates":[]}'::jsonb,
  morning_revision_selections jsonb not null default '{}'::jsonb,
  morning_revision_actual_minutes jsonb not null default '{}'::jsonb,
  morning_revision_auto_add_notice jsonb not null default '{}'::jsonb,
  simulated_now_iso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedule_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 105),
  phase_id text not null,
  phase_name text not null,
  phase_group text not null check (phase_group in ('phase_1', 'phase_2', 'phase_3')),
  primary_focus_raw text not null,
  primary_focus_parts text[] not null default '{}'::text[],
  primary_focus_subject_ids text[] not null default '{}'::text[],
  resource_raw text not null,
  resource_parts text[] not null default '{}'::text[],
  deliverable_raw text not null,
  notes_raw text,
  source_minutes integer,
  buffer_minutes integer,
  planned_study_minutes integer,
  total_study_hours numeric(5,2),
  gt_test_type text not null default 'No' check (gt_test_type in ('No', 'Diagnostic 100Q', 'Full GT', '120Q half-sim')),
  gt_plan_ref text,
  mapped_date date not null,
  original_mapped_date date not null,
  traffic_light text not null default 'green' check (traffic_light in ('green', 'yellow', 'red')),
  traffic_light_updated_at timestamptz not null default now(),
  is_extension_day boolean not null default false,
  shift_hidden_reason text check (shift_hidden_reason in ('buffer_absorbed', 'compression_merged')),
  merged_partner_day integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_number)
);

create table if not exists schedule_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null,
  block_key text not null,
  slot_order smallint not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null,
  timeline_kind text not null check (timeline_kind in ('study', 'break', 'meal')),
  display_label text not null,
  semantic_block_key text not null,
  block_intent text not null check (block_intent in ('setup', 'revision', 'core_study', 'consolidation', 'practice', 'pyq_image', 'recall', 'assessment', 'analysis', 'repair', 'logistics', 'shutdown', 'break', 'meal')),
  trackable boolean not null,
  raw_text text not null,
  recovery_lane text not null check (recovery_lane in ('none', 'core_recovery', 'soft_carry', 'assessment_recovery')),
  phase_fence text not null check (phase_fence in ('same_phase_only', 'current_phase_preferred', 'no_auto_cross_phase', 'not_reschedulable')),
  default_revision_eligible boolean not null default false,
  reschedulable boolean not null default false,
  traffic_light_green text not null check (traffic_light_green in ('visible', 'hidden')),
  traffic_light_yellow text not null check (traffic_light_yellow in ('visible', 'hidden')),
  traffic_light_red text not null check (traffic_light_red in ('visible', 'hidden')),
  backlog_when_hidden boolean not null default false,
  actual_start time,
  actual_end time,
  timing_note text,
  timing_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_number, block_key),
  foreign key (user_id, day_number) references schedule_days(user_id, day_number) on delete cascade
);

create table if not exists schedule_topic_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_item_id text not null,
  day_number integer not null,
  block_key text not null,
  item_order smallint not null,
  kind text not null check (kind in ('topic', 'task', 'revision_ref', 'gt_step')),
  label text not null,
  raw_text text not null,
  planned_minutes integer not null default 0,
  subject_ids text[] not null default '{}'::text[],
  revision_eligible boolean not null default false,
  recovery_lane text not null check (recovery_lane in ('none', 'core_recovery', 'soft_carry', 'assessment_recovery')),
  phase_fence text not null check (phase_fence in ('same_phase_only', 'current_phase_preferred', 'no_auto_cross_phase', 'not_reschedulable')),
  notes text,
  revision_type text check (revision_type in ('D+1', 'D+3', 'D+7', 'D+14', 'D+28')),
  reference_label text,
  reference_day_number integer,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped', 'missed', 'rescheduled')),
  completed_at timestamptz,
  source_tag text check (source_tag in ('missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade')),
  note text,
  is_pinned boolean not null default false,
  is_recovery boolean not null default false,
  original_day_number integer,
  original_block_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, source_item_id),
  foreign key (user_id, day_number) references schedule_days(user_id, day_number) on delete cascade,
  foreign key (user_id, day_number, block_key) references schedule_blocks(user_id, day_number, block_key) on delete cascade,
  check (
    is_recovery = false
    or (original_day_number is not null and original_block_key is not null)
  )
);

create unique index if not exists schedule_topic_assignments_user_slot_order_unique
  on schedule_topic_assignments(user_id, day_number, block_key, item_order);

create table if not exists phase_config (
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_number integer not null check (phase_number in (1, 2, 3)),
  phase_id text not null,
  original_start_day integer not null,
  original_end_day integer not null,
  extension_budget integer not null,
  extensions_used integer not null default 0,
  current_start_day integer not null,
  current_end_day integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, phase_number)
);

create table if not exists subject_tiers (
  subject_id text primary key,
  display_order smallint not null,
  subject_name text not null unique,
  aliases text[] not null default '{}'::text[],
  wor_hours numeric(6,2) not null,
  first_pass_days integer not null,
  priority_tier text not null,
  priority_rank smallint not null check (priority_rank in (1, 2, 3)),
  resource_decision_raw text not null,
  must_focus_topics text[] not null default '{}'::text[],
  seed_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_catalog (
  quote_id text primary key,
  display_order integer not null,
  quote_text text not null,
  author text not null,
  category text not null check (category in ('daily', 'tough_day', 'celebration')),
  seed_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_catalog_category_display_unique
  on quote_catalog(category, display_order);

create table if not exists gt_plan_items (
  gt_plan_ref text primary key,
  source_day_number integer not null unique,
  test_type text not null check (test_type in ('No', 'Diagnostic 100Q', 'Full GT', '120Q half-sim')),
  purpose_raw text not null,
  what_to_measure_raw text not null,
  what_to_measure_items text[] not null default '{}'::text[],
  must_output_raw text not null,
  must_output_items text[] not null default '{}'::text[],
  resource_raw text not null,
  review_raw text not null,
  wrap_up_raw text not null,
  notes_raw text,
  seed_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists revision_map_days (
  day_number integer primary key,
  d1_due_topics text,
  d3_due_topics text,
  d7_due_topics text,
  d14_due_topics text,
  d28_due_topics text,
  morning_queue_rule text not null,
  seed_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists revision_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_id text not null,
  source_item_id text not null,
  source_day integer not null,
  source_block_key text not null,
  revision_type text not null check (revision_type in ('D+1', 'D+3', 'D+7', 'D+14', 'D+28')),
  completed_at timestamptz not null default now(),
  primary key (user_id, revision_id)
);

create index if not exists revision_completions_user_source_item_lookup
  on revision_completions(user_id, source_item_id);

create table if not exists backlog_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_day integer not null,
  original_block_key text not null,
  original_start time,
  original_end time,
  priority_order integer not null default 0,
  topic_description text not null,
  subject text not null,
  source_tag text not null check (source_tag in ('missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade')),
  status text not null default 'pending' check (status in ('pending', 'rescheduled', 'completed', 'dismissed')),
  suggested_day integer,
  suggested_block_key text,
  suggested_note text,
  rescheduled_to_day integer,
  rescheduled_to_block_key text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  dismissed_at timestamptz
);

create index if not exists backlog_items_user_lookup on backlog_items(user_id);
create index if not exists backlog_items_user_pending_priority_idx on backlog_items(user_id, priority_order, created_at)
  where status = 'pending';

create table if not exists mcq_bulk_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  fix_codes text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists gt_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
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
  weakest_subjects text[] not null default '{}'::text[],
  knowledge_vs_behaviour integer,
  unsure_right_count integer,
  change_before_next_gt text,
  created_at timestamptz not null default now()
);

create table if not exists weekly_summaries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null,
  week_start_date date not null,
  week_end_date date not null,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, week_key)
);

create index if not exists schedule_days_user_mapped_date_idx on schedule_days(user_id, mapped_date);
create index if not exists schedule_blocks_user_day_slot_idx on schedule_blocks(user_id, day_number, slot_order);
create index if not exists schedule_topic_assignments_user_day_block_idx on schedule_topic_assignments(user_id, day_number, block_key, item_order);
create index if not exists schedule_topic_assignments_user_pinned_idx on schedule_topic_assignments(user_id, is_pinned)
  where is_pinned = true;
create index if not exists schedule_topic_assignments_user_status_idx on schedule_topic_assignments(user_id, status);
create index if not exists phase_config_user_lookup on phase_config(user_id);
create index if not exists mcq_bulk_logs_user_lookup on mcq_bulk_logs(user_id);
create index if not exists mcq_item_logs_user_lookup on mcq_item_logs(user_id);
create index if not exists gt_logs_user_lookup on gt_logs(user_id);
create index if not exists weekly_summaries_user_lookup on weekly_summaries(user_id);
