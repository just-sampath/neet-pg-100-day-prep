# Deployment Readiness And Runbook (2026-04-03)

## Executive Verdict

The repo is **deployment-ready pending host-level build verification** for first Supabase + Vercel deployment.

Local verification status in this workspace:

- `npm run verify`: pass
- targeted Supabase sync and repack tests: pass
- `npm run build`: still stalls in this sandbox during optimized production build; verify on deployment host/CI runner before release

The code/database blockers below are implemented in this branch and should be validated with `supabase db push` plus hosted smoke checks.

## Resolved Blockers (Implemented)

### 1) `phase_closed` `source_tag` constraint mismatch

- Fix applied: added `supabase/migrations/0007_phase_closed_source_tag.sql`.
- This migration extends both `backlog_items.source_tag` and `schedule_topic_assignments.source_tag` checks to include `'phase_closed'`.

### 2) Supabase persistence payload drift for `backlog_items`

- Fix applied: both main Supabase persistence paths now use canonical `buildBacklogRows(...)` for `backlog_items`.
- Added regression test coverage in `tests/local-store-supabase-sync.test.ts` asserting evolved backlog columns are present.

### 3) Cron-job persistence ignores admin client and can hit RLS failures

- Fix applied: `persistSupabaseStoreForUser(...)` now threads the provided `SupabaseClient` into the write path.
- Added regression test coverage in `tests/local-store-supabase-sync.test.ts` to ensure injected client is used.

### 4) Deployment docs are stale vs actual migration set

- Fix applied: updated `docs/deployment.md`, `docs/local-development.md`, and `docs/operations.md` to current migration sequence (`0001`-`0007`).
- Added `tests/docs-migrations-consistency.test.ts` so docs cannot reference missing migration files.

---

## Recommended Deployment Strategy

Use a **shell-first flow** for repeatability and auditability.

- Prefer shell for:
  - schema push (`supabase db push`)
  - environment setup (`vercel env add`, `vercel env pull`)
  - deployment (`vercel --prod`)
- Use dashboards only where required:
  - create Supabase project
  - copy project keys
  - import repo (if using Git-based Vercel setup)

## Step-By-Step Runbook (After Blockers Are Fixed)

### 0) Prerequisites

- Node `20.19+`
- npm `11+`
- Supabase CLI installed
- Vercel CLI installed

### 1) Local Preflight

```bash
npm ci
npm run generate:data
npm run verify
npm run build
```

### 2) Create Supabase Project

1. Create project in Supabase dashboard.
2. Capture:
   - Project ref
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 3) Link And Push Migrations (Shell)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push --dry-run
supabase db push
```

### 4) Configure Supabase Auth User

Create your initial aspirant user in Supabase Auth (email + password).

### 5) Configure App Env Locally

Create `.env.local`:

```env
BESIDE_YOU_RUNTIME=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CRON_SECRET=<long-random-secret>
```

Run local hosted-mode smoke check:

```bash
npm run dev
```

Then test cron routes manually:

```bash
curl -X POST http://localhost:3000/api/cron/midnight \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/weekly \
  -H "Authorization: Bearer $CRON_SECRET"

curl http://localhost:3000/api/keep-alive \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 6) Deploy To Vercel

Option A (Git import, recommended):

1. Import repo in Vercel.
2. Confirm framework = Next.js.
3. Set env vars for at least Production:
   - `BESIDE_YOU_RUNTIME=supabase`
   - `NEXT_PUBLIC_APP_URL=https://<your-domain>`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
   - `CRON_SECRET=...`
4. Deploy.

Option B (shell CLI deploy):

```bash
vercel
vercel --prod
```

If managing envs via CLI:

```bash
vercel env add BESIDE_YOU_RUNTIME production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add CRON_SECRET production
```

### 7) Configure Scheduled Automation

Current codebase already uses:

- Vercel cron (`vercel.json`) for keep-alive
- Supabase `pg_cron` SQL (`supabase/sql/005_setup_cron.sql`) for midnight + weekly POST routes

After Vercel production URL exists:

1. In Supabase SQL editor, store secrets:

```sql
select vault.create_secret('https://<your-domain>', 'app_base_url');
select vault.create_secret('<same-cron-secret-as-vercel>', 'cron_secret');
```

1. Run:

- `supabase/sql/005_setup_cron.sql`

1. Verify jobs:

```sql
select jobid, jobname, schedule
from cron.job
where jobname in ('beside-you-midnight-rollover', 'beside-you-weekly-summary');
```

### 8) Post-Deploy Validation (Must Pass)

1. Login on two devices/sessions.
2. Confirm realtime sync for traffic-light, block completion, MCQ, GT, settings.
3. Trigger cron endpoints with bearer secret.
4. Confirm `automation_job_runs` records one run per run-key and remains idempotent.
5. Confirm backlog reschedule lifecycle and quote stability across refresh/devices.

---

## Internet-Backed Notes Used For This Runbook

- Supabase migration deployment flow uses CLI login/link/push sequence.
- Supabase scheduled invocation pattern uses `pg_cron` + `pg_net` + Vault secrets calling `net.http_post`.
- Vercel env-var changes apply to **new** deployments; redeploy after env updates.
- Vercel Git import and CLI deploy are both valid.
- Vercel Cron Jobs are production-focused and trigger HTTP endpoints; current app uses authenticated cron routes.

## Sources

- Supabase database migrations: <https://supabase.com/docs/guides/deployment/database-migrations>
- Supabase schedule functions (`pg_cron`, `pg_net`, Vault): <https://supabase.com/docs/guides/functions/schedule-functions>
- Supabase CLI reference (`link`, `db push`): <https://supabase.com/docs/reference/cli/supabase-db-push>
- Supabase RLS guide: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase service-role/RLS behavior: <https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z>
- Vercel Git deployments: <https://vercel.com/docs/git>
- Vercel env vars: <https://vercel.com/docs/environment-variables/managing-environment-variables>
- Vercel Cron Jobs: <https://vercel.com/docs/cron-jobs>
- Vercel `vercel.json` config: <https://vercel.com/docs/project-configuration/vercel-json>
- Vercel import existing project: <https://vercel.com/docs/getting-started-with-vercel/import>
