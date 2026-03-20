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

## Update The Schedule

1. Edit `resources/neet_pg_2026_100_day_schedule.xlsx`
2. Run:

```bash
npm run generate:data
```

3. Verify affected flows locally.

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
