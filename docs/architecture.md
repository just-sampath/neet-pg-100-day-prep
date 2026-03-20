# Architecture

## Overview

Beside You is implemented as a Next.js 16 App Router application with a runtime-aware persistence boundary.

- In `local` mode, mutable state stays in `.data/local-store.json` for immediate local testing.
- In `supabase` mode, the same `UserState` model is hydrated from Supabase tables, authenticated with `@supabase/ssr`, and synced through Supabase Realtime.
- If `BESIDE_YOU_RUNTIME` is unset, the app resolves to `supabase` when the public Supabase env vars are present; otherwise it falls back to `local`.

The core design goal is to keep one domain model and one set of page/read-model functions while swapping the backing store cleanly.

## Layers

### Static Source Layer

- `resources/neet_pg_2026_100_day_schedule.xlsx`
- `resources/quotes.csv`
- `scripts/generate-static-data.mjs`
- generated modules under `src/lib/generated`

These files are build-time truth and should only change through source edits plus regeneration.

### Domain Layer

- `src/lib/domain/types.ts`
- `src/lib/domain/constants.ts`
- `src/lib/domain/schedule.ts`
- `src/lib/domain/quotes.ts`

This layer defines schedule mapping, traffic-light scope, revision derivation, shift absorption, backlog suggestions, and quote category selection.

### Runtime Resolution Layer

- `src/lib/runtime/mode.ts`

This layer decides whether the app is operating in `local` or `supabase` mode and provides the shared runtime labels/env checks used by auth, persistence, and UI.

### Persistence Layer

- `src/lib/data/local-store.ts`
- `.data/local-store.json`
- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_runtime_rls_realtime.sql`
- `supabase/migrations/0003_automation_job_runs.sql`

`src/lib/data/local-store.ts` is now the runtime-aware persistence boundary.

- In `local` mode it reads and writes `.data/local-store.json`.
- In `supabase` mode it loads and persists the same in-memory `LocalStore` shape from:
  - `app_settings`
  - `day_states`
  - `block_progress`
  - `revision_completions`
  - `backlog_items`
  - `mcq_bulk_logs`
  - `mcq_item_logs`
  - `gt_logs`
  - `weekly_summaries`

Additional runtime metadata is stored in `app_settings`:

- `processed_dates`
- `simulated_now_iso`

This keeps the current automation model compatible across both runtimes.

`0003_automation_job_runs.sql` adds a job-run ledger for hosted automation:

- `job_name`
- `run_key`
- `scheduled_date`
- `status`
- `processed_users`
- `metadata`
- `started_at`
- `finished_at`

### Read Model / Automation Layer

- `src/lib/data/app-state.ts`

This layer:

- applies late-night and midnight automation
- derives Today view data
- builds schedule browser data
- generates weekly summaries

It remains storage-agnostic because it only works on the shared `UserState` model.

### Server Automation Layer

- `src/lib/server/automation-jobs.ts`
- `src/lib/server/cron-auth.ts`
- `src/app/api/cron/midnight/route.ts`
- `src/app/api/cron/weekly/route.ts`
- `src/app/api/keep-alive/route.ts`
- `src/lib/supabase/admin.ts`

This layer owns hosted scheduled work in `supabase` mode.

- Midnight rollover runs at `00:00` IST and is keyed idempotently by the processed IST date.
- Weekly summary generation runs at `23:30` IST each Sunday and is keyed idempotently by the processed IST date.
- Keep-alive exists as a lightweight hosting reliability path.
- Cron routes are protected by `Authorization: Bearer ${CRON_SECRET}`.
- Job runs are recorded in `automation_job_runs` for safe re-run detection and failure investigation.

### Mutation Layer

- `src/lib/server/actions.ts`
- `src/app/api/*`

Server Actions remain the main UI mutation path. They now mutate through the runtime-aware store boundary rather than directly assuming file-backed persistence.

### Auth Layer

- `src/lib/auth/session.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/proxy.ts`
- `proxy.ts`

Auth is runtime-aware:

- `local` mode uses the seeded cookie-backed local session.
- `supabase` mode uses `supabase.auth.signInWithPassword()` and secure SSR session cookies.
- `proxy.ts` refreshes Supabase sessions on each request when Supabase mode is active.

### Sync Layer

- `src/components/app/auto-refresh.tsx`
- `src/components/app/sync-status.tsx`

Sync is runtime-aware:

- `local` mode keeps the 5-second refresh loop plus visibility refresh for same-machine testing.
- `supabase` mode disables the polling loop and uses Supabase Realtime subscriptions for authoritative refresh.
- The UI shows a quiet status badge for degraded sync: `Sync reconnecting` or `No connection`.

## Request Flow

### Local Mode

1. Login creates a local session cookie.
2. Pages call `requireCurrentUser()`.
3. Reads and writes go through `.data/local-store.json`.
4. UI refresh is driven by visibility changes plus the lightweight polling loop.
5. Midnight and weekly automation can still be triggered through the dev toolbar or `/api/dev/*`.

### Supabase Mode

1. Login uses `supabase.auth.signInWithPassword()`.
2. `proxy.ts` refreshes the Supabase session cookie on incoming requests.
3. Pages call `requireCurrentUser()`.
4. Reads hydrate the in-memory `LocalStore` shape from Supabase rows.
5. Mutations update the in-memory store and persist back to Supabase.
6. Realtime events trigger `router.refresh()` on connected sessions.
7. Midnight and weekly automation run through authenticated cron routes instead of page-open side effects.

## Conflict Policy

- Conflict handling is last-write-wins.
- The authoritative copy is always the persisted server state.
- Realtime subscribers do not attempt local merge logic; they refresh from the server-backed read model.

## Realtime Coverage

Supabase mode subscribes to changes on:

- `app_settings`
- `day_states`
- `block_progress`
- `revision_completions`
- `backlog_items`
- `mcq_bulk_logs`
- `mcq_item_logs`
- `gt_logs`
- `weekly_summaries`

`0002_runtime_rls_realtime.sql` adds these tables to the `supabase_realtime` publication and enforces user-scoped RLS.

## Automation Scheduling

Hosted scheduling is aligned to IST:

- Midnight rollover: `00:00` IST, which is `18:30` UTC on the previous day
- Weekly summary: `23:30` IST Sunday, which is `18:00` UTC Sunday

The repo includes:

- `supabase/sql/005_setup_cron.sql` for `pg_cron` + `net.http_post`
- `vercel.json` keep-alive configuration

In `local` mode, time-based behavior remains manually testable without waiting for wall-clock time.

## Export Path

- `GET /api/export` now reads through `readStore()`.
- That means export comes from `.data/local-store.json` in local mode and from Supabase-backed persisted state in Supabase mode.

## Schedule Mapping

- Day 1 date is user-configured.
- Day N date = `dayOne + (N - 1) + shiftDays - absorptionSavings`
- absorption savings come from:
  - Day 84 buffer
  - fixed compression pairs

## PWA

- `src/app/manifest.ts`
- `public/sw.js`
- `src/components/app/register-sw.tsx`

Installability is supported with a minimal service worker and manifest. Offline-first behavior is still intentionally out of scope.
