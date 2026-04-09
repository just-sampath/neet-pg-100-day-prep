# Supabase SQL Runbook

## Full Hosted User-State Reset

Use `supabase/sql/007_reset_user_state.sql` when production user data is corrupted and you intentionally want a fresh start.

This script:

- clears app user-state tables
- keeps schema and migrations intact
- keeps reference tables intact
- keeps Supabase auth accounts intact so users can sign back in

Run it only after taking a production backup and deploying the latest app fix.

## Single-User Canary Reset

Use `supabase/sql/008_reset_single_user_state_template.sql` first if you want to validate the fix with one consenting production user before resetting everyone.

Replace the placeholder UUID with that user's `auth.users.id`, run the script, and then verify the full login → Day 1 setup → schedule → mutation flow from the user's perspective.

## Single-User Schedule Reset While Keeping Settings

Use `supabase/sql/009_reset_single_user_schedule_keep_settings_template.sql` if you want to test the fix for one user without clearing their `app_settings` row yet.

This keeps settings like `day_one_date`, theme, and quote state, but clears schedule-derived tables so the app can re-seed and backfill them through the fixed runtime path.

## Post-Reset Readiness Checks

Use `supabase/sql/010_post_reset_readiness_checks.sql` after the full reset to confirm:

- user-state tables are empty before the first post-reset login
- auth users still exist
- the atomic schedule mutation RPC still exists

Important nuance for the current runtime:

- once a canary or real user logs in after the reset, `app_settings`, `schedule_days`,
  `schedule_blocks`, `schedule_topic_assignments`, and `phase_config` will repopulate;
  that is expected and healthy
- the reference-table counts are informational only right now; normal hosted user flows
  use bundled generated reference data from the app build rather than requiring
  `subject_tiers`, `quote_catalog`, `gt_plan_items`, or `revision_map_days` to be populated
- the real production gate is still one canary login + Day 1 setup + one persisted mutation

## Schedule-Day Release Gate

Run this immediately after applying migrations in a hosted environment:

```bash
psql "$SUPABASE_DB_URL" -f supabase/sql/006_schedule_days_release_gate.sql
```

Release must be blocked if the script exits non-zero.

The gate enforces:

- non-extension `schedule_days` rows never have `original_day_number = null`
- non-extension workbook anchors (`original_day_number`) are unique per user
- extension rows do not carry `original_day_number`
