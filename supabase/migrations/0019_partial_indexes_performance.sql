-- Partial indexes for the most frequent scoped-read query patterns.
-- These cover the hot-path PostgREST filters used by every page render.

-- 1. schedule_topic_assignments: the OR-filter queries revision_eligible=true
--    alongside day_number-based filters. This index covers the global branch.
create index if not exists idx_sta_user_revision_eligible
  on schedule_topic_assignments (user_id, source_item_id)
  where revision_eligible = true;

-- 2. backlog_items: scoped readers load pending backlog on every today-page render.
create index if not exists idx_backlog_user_pending
  on backlog_items (user_id)
  where status = 'pending';

-- 3. schedule_days: scoped readers load visible (non-shifted) days by mapped_date.
create index if not exists idx_schedule_days_user_visible
  on schedule_days (user_id, mapped_date desc)
  where shift_hidden_reason is null;
