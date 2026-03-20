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

## Time Travel

Use the dev toolbar on Today or Settings.

Recommended timestamps to test:

- `YYYY-MM-DDT22:30`
- `YYYY-MM-DDT23:00`
- `YYYY-MM-DDT23:15`
- next day `T00:01`

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
