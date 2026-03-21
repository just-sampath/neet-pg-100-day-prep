# Local Development

## Prerequisites

- Node.js `20.19.0+` or `22+`
- npm `11+`

## Setup

```bash
npm install
npm run generate:data
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Runtime Modes

Runtime selection is controlled by `BESIDE_YOU_RUNTIME` in `.env.local`.

### Local Mode

Use this for immediate local testing without any hosted dependencies.

```env
BESIDE_YOU_RUNTIME=local
```

Defaults:

- Email: `aspirant@beside-you.local`
- Password: `beside-you-2026`

Override with:

- `BESIDE_YOU_LOCAL_EMAIL`
- `BESIDE_YOU_LOCAL_PASSWORD`
- `BESIDE_YOU_LOCAL_NAME`

Persistence:

- File: `.data/local-store.json`

Reset options:

- UI: Settings page dev tools
- API: `POST /api/dev/reset`

### Supabase Mode

Use this when you want the hosted/shared-state runtime locally.

```env
BESIDE_YOU_RUNTIME=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

Apply the schema first:

```bash
supabase db push
```

This applies both:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`
- `supabase/migrations/0003_automation_job_runs.sql`
- `supabase/migrations/0004_revision_completion_identity.sql`
- `supabase/migrations/0005_backlog_creation_metadata.sql`
- `supabase/migrations/0006_backlog_queue_priority.sql`
- `supabase/migrations/0007_schedule_shift_events.sql`

Expected behavior in Supabase mode:

- Login uses `supabase.auth.signInWithPassword()`
- Sessions are refreshed via `proxy.ts`
- Reads and writes go through Supabase tables
- Cross-session updates arrive through Realtime subscriptions
- The header shows a quiet degraded-sync badge if the network drops
- Midnight and weekly automation are expected to run from cron routes, not from simply opening the app

## Verification Commands

```bash
npm run verify
npm run build:webpack
```

`npm run generate:data` is intentionally strict. If workbook fields, sheet names, GT references, or block durations drift from the expected source format, generation fails immediately instead of silently producing bad schedule data.

## Time Travel

Use the dev toolbar on Today or Settings.

Recommended timestamps to test:

- `YYYY-MM-DDT22:30`
- `YYYY-MM-DDT22:45`
- `YYYY-MM-DDT23:00`
- `YYYY-MM-DDT23:15`
- next day `T00:01`

For the 23:15 safety-net path, set the simulated time directly to `23:15` rather than waiting from `22:30`, because the server-side sweep uses the stored simulated timestamp.

API equivalent:

```bash
curl -X POST http://localhost:3000/api/dev/time-travel \
  -H "Content-Type: application/json" \
  -d '{"simulatedNow":"2026-05-20T22:30:00.000Z"}'
```

Manual automation helpers:

- `POST /api/dev/midnight`
- `POST /api/dev/weekly`

## Realtime Manual Check

In Supabase mode:

1. Open two browser windows with the same user.
2. Change traffic light in one window.
3. Complete or skip a block in one window.
4. Add an MCQ or GT entry in one window.
5. Confirm the other window refreshes within seconds.
6. Disconnect the network briefly and confirm `No connection` or `Sync reconnecting` appears quietly.
7. Complete `block_a` or `block_b` on a past day with a retroactive date and confirm the revision queue moves to the new anchor date.
8. Confirm backlog items show original slot timing and that `morning_revision` stays out of the skip/miss backlog paths.
9. Reschedule a backlog item and confirm it appears inside the destination block on the target day.
10. Complete or miss that destination block and confirm the assigned backlog item synchronizes correctly.
11. Create two heavily missed days in the last 7-day window and confirm the shift offer appears.
12. Open the shift preview and confirm it anchors from the earliest missed day, consumes Day 84 first, and blocks apply if August 20 would be breached.
13. Apply the shift and confirm Today, Schedule Browser, and GT markers all move together.

## Cron Manual Check

In Supabase mode, with `CRON_SECRET` set and the app running locally:

```bash
curl -X POST http://localhost:3000/api/cron/midnight \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/weekly \
  -H "Authorization: Bearer $CRON_SECRET"

curl http://localhost:3000/api/keep-alive \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected results:

- midnight returns a processed-user count and idempotent run metadata
- weekly returns whether a summary was generated for the eligible IST week
- keep-alive returns a lightweight health payload

## Regenerate Static Data

Whenever `resources/` changes:

```bash
npm run generate:data
```

This now regenerates:

- normalized `blockTemplates` from `Block_Hours`
- validated day slots from `Daywise_Plan`
- validated subject metadata from `Subject_Strategy`
- validated GT plan entries from `GT_Test_Plan`
- workbook readme metadata from `Readme`
