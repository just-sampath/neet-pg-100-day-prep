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

## Force Midnight Processing

- UI: dev toolbar time travel to next day `00:01`
- API: `POST /api/dev/midnight`

## Inspect Automation Runs

Use the `automation_job_runs` table to investigate:

- duplicate-run prevention
- processed IST dates
- per-user midnight and weekly metadata
- failed hosted job attempts
