# Operations

## Runtime Selection

- `BESIDE_YOU_RUNTIME=local`: file-backed local testing
- `BESIDE_YOU_RUNTIME=supabase`: hosted shared-state runtime
- If unset, the app prefers Supabase when the public Supabase env vars are present; otherwise it falls back to local mode

## Apply Runtime Schema

When deploying or validating Supabase mode:

```bash
supabase db push
```

This must include:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`
- `supabase/migrations/0003_automation_job_runs.sql`
- `supabase/migrations/0004_revision_completion_identity.sql`
- `supabase/migrations/0005_backlog_creation_metadata.sql`
- `supabase/migrations/0006_backlog_queue_priority.sql`
- `supabase/migrations/0007_schedule_shift_events.sql`

## Hosted Automation

Hosted automation uses three routes:

- `POST /api/cron/midnight`
- `POST /api/cron/weekly`
- `GET /api/keep-alive`

All three require:

- `Authorization: Bearer <CRON_SECRET>`

Scheduling is aligned to IST:

- midnight rollover: `00:00` IST / `18:30` UTC daily
- weekly summary: `23:30` IST Sunday / `18:00` UTC Sunday

Provision the schedules by running:

- `supabase/sql/005_setup_cron.sql`

This SQL expects Supabase Vault secrets for:

- `app_base_url`
- `cron_secret`

## Update The Schedule

1. Edit `resources/neet_pg_2026_100_day_schedule.xlsx`
2. Run:

```bash
npm run generate:data
```

3. Verify affected flows locally.

Generation now validates workbook structure. If it fails:

- check sheet names first
- check `Block_Hours` duration values against the slot ranges
- check `GT_Test_Plan` day references against `Daywise_Plan`
- check required day-plan columns before changing app code

## Update Quotes

1. Edit `resources/quotes.csv`
2. Run:

```bash
npm run generate:data
```

## Export User Data

- UI: Settings > Export JSON
- API: `GET /api/export`
- Export reads from the active runtime store, so it returns file-backed state in local mode and persisted Supabase state in Supabase mode

## Reset Local State

- UI: Settings dev tools
- API: `POST /api/dev/reset`
- This reset path is for local mode/test flows. In Supabase mode, treat data resets as a database operation rather than a JSON file reset.

## Force Weekly Summary

- UI: Weekly page or dev toolbar
- API: `POST /api/dev/weekly`
- Manual generation refreshes the same `week_key`; it should not create duplicate weekly cards for the same Monday-Sunday window.

## Force Midnight Processing

- UI: dev toolbar time travel to next day `00:01`
- API: `POST /api/dev/midnight`

## Backlog Creation Notes

- `morning_revision` is intentionally excluded from skip/miss backlog creation and re-enters the revision system instead.
- Wind-down and midnight paths use `missed` as the backlog source tag for remaining visible study blocks.
- Traffic-light downgrade paths use `yellow_day` or `red_day`.
- Overrun-triggered recovery uses `overrun_cascade`.
- Backlog items preserve `originalStart` and `originalEnd` for queue displays and debugging.
- Backlog items also preserve `priorityOrder`, and the queue now exposes original mapped date plus days-in-backlog.
- Assigned recovery inside a destination block is authoritative only while that block remains unfinished.
- If the destination block is completed, the assigned backlog item completes with it.
- If the destination block is skipped or missed, the assigned backlog item is released back to `pending`.

## Revision Engine Notes

- Revision completions are now keyed per source block via `revision_id`.
- `block_a` and `block_b` from the same study day intentionally produce separate revision series.
- If a retroactive source completion is moved later, impossible earlier revision checkoffs are pruned during reconciliation.

## Schedule Shift Notes

- Shift history is stored in `app_settings.shift_events`, not only as a flat total.
- Each event records the anchor day, shift size, consumed buffer day, consumed compression pairs, and the missed days that triggered the change.
- Preview/apply must stay in lockstep: the server recalculates the preview and validates its signature before mutating state.
- Shift cleanup dismisses active backlog items from the shifted span and resets unresolved progress from the anchor forward.

## Schedule Browser Notes

- Browser rows now expose both `mappedDate` and `originalPlannedDate` when they differ.
- Day detail editability is derived on the server:
  - past visible day: retroactive completion only
  - today: full controls
  - future day: read-only
  - shift-hidden day: read-only
- If browser behavior drifts, check the `editState` branch in `getDayDetailData()` before changing UI code.

## Inspect Automation Runs

Use the `automation_job_runs` table to investigate:

- duplicate-run prevention
- processed IST dates
- per-user midnight and weekly metadata
- failed hosted job attempts
