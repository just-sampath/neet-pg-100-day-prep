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
- `supabase/migrations/0008_gt_weakest_subjects.sql`
- `supabase/migrations/0009_weekly_summary_uniqueness.sql`
- `supabase/migrations/0010_quote_state_history.sql`

Expected behavior in Supabase mode:

- Login uses `supabase.auth.signInWithPassword()`
- Sessions are refreshed via `proxy.ts`
- Reads and writes go through Supabase tables
- Cross-session updates arrive through Realtime subscriptions
- The header shows a quiet degraded-sync badge if the network drops
- Midnight and weekly automation are expected to run from cron routes, not from simply opening the app
- Settings export reads from the active runtime store and remains available from the Settings page

## Verification Commands

```bash
npm run verify
npm run build:webpack
```

`npm run generate:data` is intentionally strict. If workbook sheets, phase spans, WOR topic timings, GT-tagged day rows, or required day fields drift from the expected source format, generation fails immediately instead of silently producing bad schedule data.

## Device Hardening Check

Before calling a branch release-ready, run [docs/release-smoke-test.md](./release-smoke-test.md), especially:

- iPhone 12 portrait `390 x 844`
- Samsung Galaxy Tab S9 portrait `800 x 1280`
- route loading, not-found, and error recovery surfaces
- analytics empty-state and deferred-chart behavior

## Time Travel

Use the dev toolbar on Today or Settings.

Recommended timestamps to test:

- `YYYY-MM-DDT21:45`
- `YYYY-MM-DDT22:00`
- `YYYY-MM-DDT22:15`
- `YYYY-MM-DDT22:45`
- next day `T00:01`

For the `22:45` safety-net path, set the simulated time directly to `22:45` rather than waiting from `21:45`, because the server-side sweep uses the stored simulated timestamp.

API equivalent:

```bash
curl -X POST http://localhost:3000/api/dev/time-travel \
  -H "Content-Type: application/json" \
  -d '{"simulatedNow":"2026-05-20T21:45:00.000Z"}'
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
14. Open `/schedule` and confirm it lands near Today with the current day highlighted.
15. Open a future day and confirm it is view-only.
16. Open a past day and confirm retroactive completion is available with an editable actual completion date.
17. Toggle Green -> Yellow/Red -> Green on the same date and confirm the original daily quote returns.
18. Refresh both sessions and confirm the quote shown for the current date/category stays consistent.
19. Open Settings and confirm theme changes, export, and runtime label stay consistent across both sessions.

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
- weekly returns whether a summary was generated for the eligible IST week, and generation should only occur after Sunday `23:30` IST
- keep-alive returns a lightweight health payload

## Regenerate Static Data

Whenever `resources/` changes:

```bash
npm run generate:data
```

This now regenerates:

- validated day slots and GT-tagged rows from `Daywise_Plan`
- exact Phase 1 topic timing from `WOR_Topic_Map`
- validated subject metadata from `Subject_Tiering`
- workbook morning guidance from `Revision_Map`

## Installability Check

After one clean load:

1. Open `/settings`.
2. Confirm the install card chooses the right branch for the device:
   - install prompt in Chromium when available
   - Share-sheet instructions on iPhone/iPad
   - installed acknowledgment in standalone mode
3. Disconnect the network and navigate once.
4. Confirm the fallback page is calm and clearly says reconnect is required before trusting new writes.
