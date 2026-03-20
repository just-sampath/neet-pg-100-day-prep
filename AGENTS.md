# Beside You Agent Guide

This repo is a single-user NEET PG 2026 study companion. The codebase now has a runtime-aware persistence boundary:

- `local` mode exists for immediate local testability
- `supabase` mode is the hosted shared-state path for auth, persistence, and realtime sync

The product goal is still one quiet, supportive companion for one aspirant across two devices.

## Product Goal

- Show the user exactly what to do today.
- Track block-by-block completion against a fixed 100-day plan.
- Handle yellow/red days and backlog gently.
- Recompute revision work from actual usage, not only from the original Excel plan.
- Log MCQ and GT performance with fast input and readable trends.
- Stay intentionally silent: no push notifications, no proactive reminder system.

## Source Of Truth

- Product spec: `specs/beside-you-prd.md`
- Draft architecture: `specs/beside-you-technical-architecture.md`
- Schedule workbook: `resources/neet_pg_2026_100_day_schedule.xlsx`
- Quotes CSV: `resources/quotes.csv`
- Generated app data: `src/lib/generated/schedule-data.ts`, `src/lib/generated/quotes-data.ts`

## Runtime Modes

Runtime selection is controlled by `BESIDE_YOU_RUNTIME`.

- If set to `local`, the app uses the file-backed local runtime.
- If set to `supabase`, the app requires valid Supabase env vars and uses the hosted runtime.
- If unset, the app resolves to `supabase` when the public Supabase env vars are present; otherwise it falls back to `local`.

### Local Mode

Used for immediate local testing and day-to-day development when hosted infra is unnecessary.

- Auth is cookie + file-backed local session.
- Data lives in `.data/local-store.json`.
- Time-based behavior can be simulated with the dev toolbar or `/api/dev/*` routes.
- `AutoRefresh` keeps the small polling loop only in this mode.

### Supabase Mode

Used for the hosted shared-state runtime and for validating spec-level sync behavior.

- Auth uses `supabase.auth.signInWithPassword()`.
- Session refresh happens through `proxy.ts` and `src/lib/supabase/proxy.ts`.
- Mutable state is persisted in Supabase tables and hydrated into the shared `UserState` model.
- Realtime sync is driven by `src/components/app/sync-status.tsx`.
- Quiet connectivity state is surfaced as `Sync reconnecting` or `No connection`.

## Commands

```bash
npm install
npm run generate:data
npm run dev
npm run lint
npm run typecheck
npm test
npm run verify
npm run build:webpack
```

Supabase schema apply:

```bash
supabase db push
```

## Local Credentials

Configured by env vars:

- `BESIDE_YOU_LOCAL_EMAIL`
- `BESIDE_YOU_LOCAL_PASSWORD`
- `BESIDE_YOU_LOCAL_NAME`

Defaults:

- `aspirant@beside-you.local`
- `beside-you-2026`

## File Map

### App Router

- `src/app/layout.tsx`: root layout, fonts, metadata, theme shell
- `src/app/manifest.ts`: PWA manifest
- `src/app/page.tsx`: redirect to `/today` or `/login`
- `src/app/(auth)/login/page.tsx`: login
- `src/app/(app)/layout.tsx`: app shell, nav, sync badge, auth guard
- `src/app/(app)/today/page.tsx`: main Today view
- `src/app/(app)/backlog/page.tsx`: backlog queue
- `src/app/(app)/mcq/*`: MCQ forms and analytics
- `src/app/(app)/gt/*`: GT forms and analytics
- `src/app/(app)/schedule/*`: full schedule browser and day detail
- `src/app/(app)/weekly/*`: weekly summaries
- `src/app/(app)/settings/page.tsx`: setup, theme, export, dev tools
- `src/app/api/*`: export and dev-only helper routes
- `proxy.ts`: request-time auth routing and Supabase session refresh

### Domain And Data

- `src/lib/domain/types.ts`: all shared domain types
- `src/lib/domain/constants.ts`: exam date, hard boundary, traffic-light block sets, compression rules
- `src/lib/domain/schedule.ts`: schedule mapping, revision derivation, shift preview, backlog suggestions
- `src/lib/domain/quotes.ts`: quote selection
- `src/lib/data/local-store.ts`: runtime-aware persistence boundary for local and Supabase modes
- `src/lib/data/app-state.ts`: automations, read models, weekly summary generation
- `src/lib/server/actions.ts`: all UI mutations
- `src/lib/auth/session.ts`: runtime-aware auth/session boundary
- `src/lib/runtime/mode.ts`: runtime selection and env checks

### Supabase

- `src/lib/supabase/client.ts`: browser Supabase client
- `src/lib/supabase/server.ts`: server Supabase client
- `src/lib/supabase/proxy.ts`: request-time session refresh for `proxy.ts`
- `supabase/migrations/0001_initial_schema.sql`: base schema
- `supabase/migrations/0002_runtime_rls_realtime.sql`: runtime metadata, RLS, uniqueness, and realtime publication coverage

### Client Sync / Runtime UX

- `src/components/app/auto-refresh.tsx`: local-only polling/visibility refresh
- `src/components/app/sync-status.tsx`: Supabase realtime subscription manager and degraded-sync badge
- `src/components/app/dev-toolbar.tsx`: dev time travel and manual automation helpers

### Generated Data

- `scripts/generate-static-data.mjs`: parses workbook/CSV into typed TS files
- `src/lib/generated/*`: committed generated data modules

### Docs And Ops

- `AGENTS.md`: this file
- `docs/*`: human/operator docs
- `todos/*`: production-readiness gates

## Product Invariants

- No study activity should be suggested before `06:30` or after `23:00`.
- The app must never introduce push notifications or reminder pressure.
- Yellow and red days are supportive reshapes, not failure states.
- The backlog is neutral language only.
- Schedule data and quotes are build-time source data from repo files, not user-uploaded at runtime.
- The exam date is fixed to `2026-08-30`.
- The hard study boundary is `2026-08-20`.
- Time-based features must stay locally testable without waiting for wall-clock time.

## Traffic Light Rules

### Green

- All 7 trackable blocks remain visible.

### Yellow

- Visible: `morning_revision`, `block_a`, `block_b`, `mcq`, `night_recall`
- Hidden to backlog: `consolidation`, `pyq_image`

### Red

- Visible: `morning_revision`, `block_a`, `mcq`
- Hidden to backlog: everything else
- UI copy should frame this as salvage mode, not failure

## Schedule Shift Rules

- First absorbed day uses Day 84 buffer.
- Further absorbed days use fixed compression pairs in this order:
  - `95 + 96`
  - `97 + 98`
  - `91 + 92`
- Day 99 and Day 100 are never compressed.

## Revision Logic

- Revisions are derived from actual completion when available.
- If no completion exists yet, planned mapped date acts as the temporary anchor.
- Intervals: `D+1`, `D+3`, `D+7`, `D+14`, `D+28`
- Morning queue shows up to 5 items.
- Overflow spills to night recall first, then break micro-slots.
- `3-6` day misses become catch-up revision.
- `7+` day misses become restudy flags.

## Testing Checklist

Every feature should be runnable locally. Minimum manual pass:

1. Log in.
2. Set Day 1 date.
3. Toggle Green/Yellow/Red and confirm block visibility/backlog behavior.
4. Complete and skip blocks.
5. Edit a block time and confirm sleep protection warning.
6. Mark revision items complete.
7. Use dev time travel to trigger:
   - 22:30 wind-down prompt
   - 23:00 night recall prompt
   - 23:15 late-night sweep
   - next-day midnight rollover
8. Log MCQ bulk and item data.
9. Log GT data.
10. Generate a weekly summary.
11. Export JSON.

Supabase runtime pass:

1. Set `BESIDE_YOU_RUNTIME=supabase` with valid Supabase env vars.
2. Run `supabase db push`.
3. Log in with the seeded Supabase user.
4. Open a second browser window or device.
5. Confirm traffic-light, block-progress, MCQ, GT, and settings updates sync within seconds.
6. Disconnect and reconnect the network once and confirm the degraded-sync badge behavior is quiet and recoverable.

## Preferred Engineering Patterns

- Server-first reads, small client islands.
- Keep mutations in `src/lib/server/actions.ts` unless a new file materially improves clarity.
- Avoid duplicating domain logic in pages. Add helper functions to `src/lib/domain/*` or `src/lib/data/app-state.ts`.
- Keep generated data committed so the repo works immediately after clone.
- If you change workbook parsing, rerun `npm run generate:data`.
- Keep runtime branching at the persistence/auth/sync boundary; do not fork domain logic per runtime unless there is no cleaner option.

## What To Avoid

- Do not reintroduce scaffold/demo UI from `create-next-app`.
- Do not add noisy gamification or streak mechanics.
- Do not add notification infrastructure.
- Do not make the app depend on hosted services just to validate core flows in local mode.
- Do not change the traffic-light semantics casually; they are product-defining behavior.

## Known Tradeoffs

- Local mode still exists because it keeps the repo fully runnable without hosted infra.
- Supabase mode is now implemented for auth, persistence, and realtime sync, but later production gates still remain in `todos/`.
- Conflict policy is last-write-wins via server persistence plus authoritative refresh rather than client-side record merging.
