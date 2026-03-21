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
- Midnight and weekly automation run through authenticated cron routes in this mode.

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

Cron validation:

```bash
curl -X POST http://localhost:3000/api/cron/midnight \
  -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/weekly \
  -H "Authorization: Bearer $CRON_SECRET"
curl http://localhost:3000/api/keep-alive \
  -H "Authorization: Bearer $CRON_SECRET"
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
- `src/lib/domain/backlog.ts`: traffic-light restore rules, backlog-creation guards, and overrun preview logic
- `src/lib/domain/backlog-queue.ts`: backlog suggestion engine, queue sorting, priority movement, target validation, and assigned-recovery read models
- `src/lib/domain/gt.ts`: GT validation, mapped GT schedule helpers, comparison analytics, and weakness tracking
- `src/lib/domain/mcq.ts`: canonical MCQ vocabularies, validation, normalization, recent-suggestion helpers, analytics aggregations, and weekly-summary feed support
- `src/lib/domain/weekly.ts`: weekly-summary normalization, week-key lookup, status labeling, and cadence helpers
- `src/lib/domain/schedule.ts`: schedule mapping, revision derivation, schedule-browser editability, and anchored schedule-shift preview logic
- `src/lib/domain/today.ts`: Today timeline ordering, wind-down prompt branching, and Today-view display helpers
- `src/lib/domain/quotes.ts`: quote selection, per-category cycle state, and Today-view quote routing
- `src/lib/data/local-store.ts`: runtime-aware persistence boundary for local and Supabase modes
- `src/lib/data/app-state.ts`: automations, read models, weekly summary generation
- `src/lib/server/actions.ts`: all UI mutations
- `src/lib/auth/session.ts`: runtime-aware auth/session boundary
- `src/lib/runtime/mode.ts`: runtime selection and env checks

### Supabase

- `src/lib/supabase/client.ts`: browser Supabase client
- `src/lib/supabase/server.ts`: server Supabase client
- `src/lib/supabase/admin.ts`: service-role client for hosted automation
- `src/lib/supabase/proxy.ts`: request-time session refresh for `proxy.ts`
- `supabase/migrations/0001_initial_schema.sql`: base schema
- `supabase/migrations/0002_runtime_rls_realtime.sql`: runtime metadata, RLS, uniqueness, and realtime publication coverage
- `supabase/migrations/0003_automation_job_runs.sql`: hosted job ledger for cron telemetry and idempotence
- `supabase/migrations/0004_revision_completion_identity.sql`: block-aware revision completion identity
- `supabase/migrations/0005_backlog_creation_metadata.sql`: original slot timing metadata for backlog items
- `supabase/migrations/0006_backlog_queue_priority.sql`: queue priority ordering for backlog items
- `supabase/migrations/0007_schedule_shift_events.sql`: persistent shift-event history for anchored schedule shifts
- `supabase/migrations/0008_gt_weakest_subjects.sql`: explicit weakest-subject persistence for GT wrapper analytics
- `supabase/migrations/0009_weekly_summary_uniqueness.sql`: one summary per user per week plus duplicate cleanup
- `supabase/migrations/0010_quote_state_history.sql`: persisted quote-cycle state for local and Supabase parity
- `supabase/sql/005_setup_cron.sql`: `pg_cron` setup for midnight and weekly jobs

### Server Automation

- `src/lib/server/automation-jobs.ts`: hosted midnight, weekly, and keep-alive job runners
- `src/lib/server/cron-auth.ts`: bearer-token auth guard for cron routes
- `src/app/api/cron/midnight/route.ts`: midnight rollover route
- `src/app/api/cron/weekly/route.ts`: weekly summary route
- `src/app/api/keep-alive/route.ts`: lightweight health route used by keep-alive scheduling
- `vercel.json`: keep-alive schedule

### Client Sync / Runtime UX

- `src/components/app/auto-refresh.tsx`: local-only polling/visibility refresh
- `src/components/app/sync-status.tsx`: Supabase realtime subscription manager and degraded-sync badge
- `src/components/app/dev-toolbar.tsx`: dev time travel and manual automation helpers

### Generated Data

- `scripts/generate-static-data.mjs`: validates workbook/CSV structure and parses them into typed TS files
- `src/lib/generated/*`: committed generated data modules

The generated schedule bundle includes:

- `trackableBlockOrder`
- `blockTemplates`
- `workbookReadme`
- `days`
- `phases`
- `gtPlan`
- `subjects`

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

## Quote Rules

- Quotes come only from the build-time `resources/quotes.csv` source file.
- Categories are fixed: `daily`, `tough_day`, `celebration`.
- Green days show the date's `daily` quote.
- Yellow and Red days show the date's `tough_day` quote.
- Switching back to Green on the same date restores the same `daily` quote already selected for that date.
- Completion uses a separate `celebration` quote path for that date.
- Quotes do not repeat within a category until that category cycle is exhausted.
- Quote history is stored per user in runtime persistence so refreshes and devices stay consistent.
- If a category pool is very small, fallback selection must stay deterministic and avoid an immediate repeat when possible.

## Traffic Light Rules

### Green

- All 7 trackable blocks remain visible.

### Yellow

- Visible: `morning_revision`, `block_a`, `block_b`, `mcq`, `night_recall`
- Hidden to backlog: `consolidation`, `pyq_image`
- Hidden blocks stay inline as neutral `Rescheduled` cards and create `yellow_day` backlog items.

### Red

- Visible: `morning_revision`, `block_a`, `mcq`
- Hidden to backlog: everything else
- UI copy should frame this as salvage mode, not failure
- Today copy explicitly uses: `A salvage day, not a zero day.`
- Same-day upgrades only restore the blocks that become visible again.

## Backlog Creation Rules

- Manual skip creates backlog entries for trackable study blocks except `morning_revision`.
- Midnight auto-miss marks pending visible blocks as `missed`; `morning_revision` re-enters the revision system instead of the backlog queue.
- Wind-down wrap-up and the 23:15 sweep move remaining visible study blocks into backlog as `missed`, excluding `morning_revision`.
- Overrun-triggered recovery uses `overrun_cascade` as the source tag.
- Backlog items now preserve `originalStart` and `originalEnd` so the queue can explain where the work came from.
- The backlog queue defaults to `pending`, shows original mapped date plus queue age, supports manual and bulk reschedule, and keeps assigned recovery synchronized with the destination block lifecycle.

## Schedule Shift Rules

- Shift is suggested only when 2 or more of the last 7 visible study days have 5+ blocks marked `missed` or `skipped`.
- The earliest such day becomes the shift anchor.
- First absorbed day uses Day 84 buffer.
- Further absorbed days use fixed compression pairs in this order:
  - `95 + 96`
  - `97 + 98`
  - `91 + 92`
- Day 99 and Day 100 are never compressed.
- Shift preview must be reviewed before apply; apply must validate the preview server-side.
- Applying a shift clears active backlog items from the shifted span and resets unresolved progress from the shifted anchor forward.

## Schedule Browser Rules

- The browser shows all 100 days with day number, mapped date, phase, primary focus, and GT indicator when present.
- Opening `/schedule` should default-scroll near Today.
- Browser rows use status colors for `today`, `completed`, `missed`, and `upcoming`.
- Future days are view-only.
- Past days expose retroactive completion only; they do not expose skip, time-edit, or pace-dial controls.
- Shift-hidden days remain visible for auditability but are read-only.
- Day detail should surface original planned date when the mapped date has shifted.
- Day detail should explain absorbed or merged shift state when relevant.

## Revision Logic

- Revisions are derived from actual completion when available.
- If no completion exists yet, planned mapped date acts as the temporary anchor.
- Revision sources are `block_a` and `block_b`, each with their own identity.
- Intervals: `D+1`, `D+3`, `D+7`, `D+14`, `D+28`
- Morning queue shows up to 5 items.
- Overflow spills to night recall first, then break micro-slots.
- `3-6` day misses become catch-up revision.
- `7+` day misses become restudy flags.
- Retroactive completion can move the anchor later; if that makes an earlier revision checkoff impossible, the old checkoff is removed during reconciliation.

## MCQ Rules

- Bulk entry keeps the fast path to date, attempted, correct, and derived wrong count, with optional subject and source.
- Bulk and one-by-one subject tagging must use the canonical 19-subject schedule list.
- One-by-one required path is only `MCQ ID` plus a result tap.
- `Add details` is collapsed by default and remembers its session state.
- After one-by-one submit, keep `subject`, `source`, and expander state; clear the rest.
- Cause codes: `R`, `C`, `A`, `D`, `I`, `M`, `V`, `B`, `T`, `K`
- Priority levels: `P1`, `P2`, `P3`
- Fix codes: `N`, `Q20`, `Q40M`, `A1`, `A3`, `T2`, `I10`, `F5`, `E`, `AI`, `G`
- Tags: `protocol`, `volatile`, `management`, `image`, `emergency`, `screening`, `staging`
- Analytics must expose daily trend, right/guessed-right/wrong breakdown, subject accuracy, weak subjects, and cause codes without introducing targets or streaks.

## GT Rules

- GT schedule context comes from workbook `GT_Test_Plan` and shifts with the live mapped schedule.
- GT number prefills from the mapped GT label, while workbook purpose text stays visible as context.
- Attempt context is structured:
  - device: `Laptop`, `Mobile`, `Tablet`
  - attempted live: `Yes` / `No`
  - overall feeling: `Calm`, `Rushed`, `Blank`, `Fatigued`, `Overthinking`
- The section review always uses five expandable sections `A-E`.
- Each section tracks:
  - `timeEnough`
  - `panicStarted`
  - `guessedTooMuch`
  - `timeLostOn`
- The GT wrapper stores:
  - `errorTypes`
  - top 3 `recurringTopics`
  - `weakestSubjects`
  - `knowledgeVsBehaviour`
  - `unsureRightCount`
  - `changeBeforeNextGt`
- GT analytics must expose:
  - score trend
  - section patterns
  - section time-loss patterns
  - GT-over-GT comparison
  - wrapper trend
  - repeated weak subjects
  - repeated recurring topics
- Weekly summaries use the latest GT in the week: GT number, score, AIR/percentile text, and wrapper summary.

## Weekly Summary Rules

- Weekly automation runs at Sunday `23:30` IST and covers Monday-Sunday of that week.
- Manual generation stays available at any time from the Weekly page.
- Manual generation snapshots the current week only through the current IST date; it must not count future days or logs.
- Weekly summaries are upserted by `weekKey`, not appended blindly, so regenerating the same week refreshes the stored record instead of creating duplicates.
- The stored weekly payload must include:
  - schedule adherence counts and rate
  - traffic-light counts
  - morning revision counts and rate
  - revision overflow / catch-up / restudy pressure
  - overrun count and per-block labels
  - MCQ totals, accuracy, trend, wrong subjects, and cause codes
  - latest GT in the week with score / AIR / wrapper summary
  - schedule health, backlog snapshot, and subjects studied

## Testing Checklist

Every feature should be runnable locally. Minimum manual pass:

1. Log in.
2. Set Day 1 date.
3. Toggle Green/Yellow/Red and confirm block visibility/backlog behavior.
4. Confirm the Today timeline keeps break and meal separators inline and shows hidden blocks as collapsed `Rescheduled` cards in-place.
5. Confirm the Today view exposes the MCQ quick-log entry point directly.
6. Complete and skip blocks.
7. Edit a block time and confirm sleep protection warning.
8. Edit a block time into the next visible block and confirm the overrun decision path appears.
9. Edit a late block so it would breach `23:00` and confirm the forced backlog path appears.
10. Mark revision items complete.
11. Complete `block_a` or `block_b` on a later date and confirm the revision queue moves.
12. Use dev time travel to trigger:
   - 22:30 wind-down prompt
   - 22:45 wrap-up reappearance after one dismiss
   - 23:00 night recall prompt
   - 23:15 late-night sweep
   - next-day midnight rollover
13. Use a past schedule day to complete a block retroactively and confirm the old planned revision placement disappears.
14. Open `/schedule` and confirm it auto-focuses near Today.
15. Open a future day and confirm the page is view-only.
16. Open a shift-hidden day and confirm it stays view-only while still explaining the active mapping.
17. Log MCQ bulk and item data.
18. Confirm bulk `wrong` auto-derives from attempted and correct.
19. Confirm one-by-one `MCQ ID + result tap` works with details closed.
20. Expand `Add details`, submit once, and confirm subject/source plus expander state persist while optional note fields clear.
21. Log GT data with mapped GT prefill, section A-E details, and wrapper notes.
22. Confirm GT recurring topics stop at 3 and weakest-subject chips persist.
23. Confirm GT analytics show score trend, section patterns, comparison, wrapper trend, and weakness repetition.
24. Generate a weekly summary.
25. Open the weekly detail page and confirm it shows schedule adherence, revision pressure, overrun labels, MCQ signal, GT signal, backlog breakdown, and subjects studied.
26. Toggle Green -> Yellow/Red -> Green on Today and confirm the original daily quote returns for that date.
27. Complete the visible day and confirm the celebration quote appears as its own completion moment.
28. Refresh and confirm the quote for the current date/category stays stable.
29. Export JSON.
30. Reschedule a backlog item into a future slot and confirm it renders inside the destination block.
31. Complete that destination block and confirm the assigned backlog item closes with it.
32. Miss that destination block in a separate run and confirm the assigned backlog item returns to `pending`.
33. Create two heavily missed days in the last 7-day window and confirm the shift offer appears.
34. Open shift preview and confirm it anchors from the earliest missed day, not just from today.
35. Apply the shift and confirm Today moves to the shifted anchor day, GT markers move with the calendar, and covered backlog is cleared.

Supabase runtime pass:

1. Set `BESIDE_YOU_RUNTIME=supabase` with valid Supabase env vars.
2. Run `supabase db push`.
3. Log in with the seeded Supabase user.
4. Open a second browser window or device.
5. Confirm traffic-light, block-progress, MCQ, GT, and settings updates sync within seconds.
6. Disconnect and reconnect the network once and confirm the degraded-sync badge behavior is quiet and recoverable.
7. Call the cron routes with `CRON_SECRET` and confirm midnight and weekly jobs return success.
8. Confirm repeated cron calls are idempotent by checking the app state or `automation_job_runs`.
9. Refresh the same date in two sessions and confirm the quote shown for that date/category stays consistent across devices.

## Preferred Engineering Patterns

- Server-first reads, small client islands.
- Keep mutations in `src/lib/server/actions.ts` unless a new file materially improves clarity.
- Avoid duplicating domain logic in pages. Add helper functions to `src/lib/domain/*` or `src/lib/data/app-state.ts`.
- Keep generated data committed so the repo works immediately after clone.
- If you change workbook parsing, rerun `npm run generate:data`.
- Treat the workbook as truth. If generation fails, fix the workbook assumptions or the parser against the workbook, not by reintroducing hidden schedule constants.
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
- Local mode still simulates scheduled behavior with dev routes, while Supabase mode relies on the hosted cron path for midnight and weekly jobs.
- Conflict policy is last-write-wins via server persistence plus authoritative refresh rather than client-side record merging.
