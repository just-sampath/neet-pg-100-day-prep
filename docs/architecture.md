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

The generator validates workbook structure before output:

- required sheets: `Readme`, `Daywise_Plan`, `Block_Hours`, `Subject_Strategy`, `GT_Test_Plan`
- required day-plan columns and 100-day continuity
- `Block_Hours` duration consistency against the slot ranges
- GT/Test cross-checking between `Daywise_Plan` and `GT_Test_Plan`
- subject-list coverage against the schedule corpus

### Domain Layer

- `src/lib/domain/types.ts`
- `src/lib/domain/constants.ts`
- `src/lib/domain/backlog.ts`
- `src/lib/domain/backlog-queue.ts`
- `src/lib/domain/gt.ts`
- `src/lib/domain/mcq.ts`
- `src/lib/domain/weekly.ts`
- `src/lib/domain/schedule.ts`
- `src/lib/domain/today.ts`
- `src/lib/domain/quotes.ts`

This layer defines schedule mapping, traffic-light scope, revision derivation, backlog suggestion/queue behavior, shift absorption, backlog-creation rules, overrun preview logic, GT validation/analytics vocabularies, MCQ validation/analytics vocabularies, weekly-summary normalization/cadence helpers, and quote category selection.

`src/lib/domain/today.ts` owns the Today-screen-specific pure helpers that should stay easy to test:

- chronological timeline ordering with inline break/meal separators
- hidden-block collapsing for Yellow/Red days
- open-app wind-down prompt branching for `22:30`, `22:45`, `23:00`, and `23:15`

Revision derivation is now block-level, not day-level:

- `block_a` and `block_b` each create their own revision series
- actual completion dates in IST take precedence as anchors
- mapped schedule dates remain the fallback when no completion exists yet
- overdue routing is derived on read, so retroactive edits automatically recompute the queue

### Runtime Resolution Layer

- `src/lib/runtime/mode.ts`

This layer decides whether the app is operating in `local` or `supabase` mode and provides the shared runtime labels/env checks used by auth, persistence, and UI.

### Persistence Layer

- `src/lib/data/local-store.ts`
- `.data/local-store.json`
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
- `quote_state`

This keeps the current automation model compatible across both runtimes.

`0004_revision_completion_identity.sql` upgrades revision completion persistence from a day-only key to a block-aware identity:

- `revision_id`
- `source_block_key`

That change prevents `block_a` and `block_b` from colliding when they belong to the same schedule day.

`0005_backlog_creation_metadata.sql` extends backlog persistence with original slot timing:

- `original_start`
- `original_end`

That lets the backlog queue explain where a recovered block came from without relying on regenerated display text alone.

`0006_backlog_queue_priority.sql` adds queue ordering persistence:

- `priority_order`

That keeps manual backlog reordering stable across reloads and runtimes.

`0007_schedule_shift_events.sql` adds persistent anchored shift history:

- `shift_events`

Each shift is stored as an explicit event with:

- `anchorDayNumber`
- `shiftDays`
- `bufferDayUsed`
- `compressedPairs`
- `missedDays`
- `appliedAt`

This keeps repeated shifts deterministic and lets mapped-date views recompute from the same event history in both runtimes.

`0008_gt_weakest_subjects.sql` adds explicit GT wrapper weakness persistence:

- `weakest_subjects`

That keeps GT weakness analytics structured instead of relying on free-text inference.

`0010_quote_state_history.sql` adds persisted quote-cycle state:

- `quote_state`

That keeps per-category quote history stable across refreshes, local runs, and Supabase multi-device sessions.

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
- builds MCQ tracker and analytics read models
- builds schedule browser data
- generates weekly summaries
- owns traffic-light downgrade/upgrade behavior and backlog creation branches

It remains storage-agnostic because it only works on the shared `UserState` model.

Implemented backlog creation behavior:

- traffic-light downgrade creates `yellow_day` or `red_day` backlog items only for still-pending hidden blocks
- same-day upgrades restore only the blocks that become visible again
- manual skip excludes `morning_revision` from the backlog queue
- wind-down and midnight keep `morning_revision` in the revision system instead of the backlog queue
- overrun cascade can either move the next affected block to backlog or force the affected tail to backlog when sleep would be breached
- assigned backlog recovery now renders inside the destination block on Today and Schedule Day views rather than as a detached side list
- assigned backlog recovery is synchronized to the destination block lifecycle: completing the destination slot completes the assigned backlog item, while missing that slot releases it back to `pending`

Implemented MCQ behavior:

- bulk entry uses canonical subject values and derives `wrong` from attempted minus correct
- one-by-one entry keeps the minimal `MCQ ID + result tap` path separate from the optional details bundle
- the details expander persists within a session without polluting server markup
- recent topic and source suggestions are derived from prior entries
- analytics read models expose trend, breakdown, subject accuracy, weak subjects, and cause-code rankings
- weekly summaries consume the same canonical wrong-subject and cause-code signals

Implemented weekly-summary behavior:

- manual generation creates a partial snapshot only through the current IST date
- Sunday automation seals the full Monday-Sunday week at `23:30` IST
- regeneration refreshes the same `week_key` instead of creating duplicate summaries
- weekly detail pages expose schedule adherence, revision pressure, overrun lists, MCQ signal, GT signal, backlog snapshot, and subjects studied

Implemented GT behavior:

- GT schedule context is derived from the workbook GT plan after schedule shifts are applied
- the GT form captures the PRD score section, structured attempt context, five expandable sections `A-E`, and the wrapper fields
- recurring wrapper topics are capped to the top 3
- weakest subjects are persisted as structured subject values
- analytics read models expose score trend, section patterns, section time-loss summaries, GT-over-GT deltas, wrapper trend, and repeated weak-subject/topic patterns
- weekly summaries pull the latest GT in the week from the same GT log model

Implemented quote behavior:

- quote categories remain build-time source data from `quotes.csv`
- quote selection is persisted per user through `quote_state`
- each category uses a non-repeat cycle until exhausted
- the same date keeps its own selected `daily`, `tough_day`, and `celebration` ids
- switching Green -> Yellow/Red -> Green restores the original daily quote for that date
- celebration uses its own distinct quote path rather than reusing the daily/tough-day line

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
- Weekly summary storage is also constrained by `user_id + week_key`, so concurrent writes converge on one stored summary per week.
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
- Each shift is anchored to the earliest heavily missed day in the last-7-day window.
- Day N date = `dayOne + (N - 1) + sum(shiftDays for events whose anchor <= N) - absorptionSavings`
- absorption savings come from:
  - Day 84 buffer, when that buffer has been consumed by a prior shift event
  - fixed compression pairs `95+96`, `97+98`, `91+92`, when those pairs have been consumed by prior shift events
- hidden shift days remain in the 100-day data model but are treated as absorbed/merged in the browser and skipped by lived-day resolution

## Revision Engine

The revision engine is implemented in `src/lib/domain/schedule.ts` and intentionally stays derived rather than persisted as a mutable queue table in local mode.

Implemented behavior:

- revision sources: `block_a` and `block_b`
- intervals: `D+1`, `D+3`, `D+7`, `D+14`, `D+28`
- anchor precedence:
  - actual completion date in IST when available
  - otherwise the mapped planned date
- morning queue:
  - maximum 5 visible items
  - ordered by scheduled date, revision urgency, then source block
- overflow routing:
  - first overflow item to `night_recall`
  - then to break micro-slots `08:00`, `10:45`, `16:45`, `21:45`
  - 3+ consecutive overflow days surface the supportive warning from the PRD
- overdue routing:
  - `1-2` days overdue stay in the main morning queue
  - `3-6` days overdue become catch-up revision items assigned to `consolidation` or `pyq_image`
  - `7+` days overdue become restudy flags assigned to the next revision phase
- retroactive completion:
  - moving a source block’s actual completion date moves all future revision anchors automatically
  - impossible early revision checkoffs are dropped during reconciliation so the recalculated queue stays honest

## Schedule Browser And Day Detail

The schedule browser read model now carries both live and historical context:

- `mappedDate`: the current visible date after shift events
- `originalPlannedDate`: the date implied directly by `day_one_date` before shift recovery
- `status`: `today`, `completed`, `missed`, or `upcoming`
- `hiddenShiftLabel`: whether the day is absorbed as a buffer day or merged by compression
- `mergedPartnerDay`: which later day is currently merged into the visible day

Day detail derives a server-side `editState` from the mapped date and shift state:

- past visible day: retroactive completion allowed
- today: full interactive controls allowed
- future day: view-only
- shift-hidden day: view-only

That editability is enforced in both the read model and the server actions so future-day mutation cannot happen through the normal UI flow.

## Generated Static Bundle

`src/lib/generated/schedule-data.ts` now includes:

- `trackableBlockOrder`
- `blockTemplates`
- `workbookReadme`
- `days`
- `phases`
- `gtPlan`
- `subjects`

This keeps the runtime schedule traceable back to the workbook instead of relying on unspoken block-template constants.

## PWA

- `src/app/manifest.ts`
- `src/app/apple-icon.tsx`
- `src/app/icons/*.png/route.ts`
- `public/sw.js`
- `public/offline.html`
- `src/components/app/register-sw.tsx`
- `src/components/app/install-status-card.tsx`
- `src/lib/domain/pwa.ts`
- `src/lib/domain/app-meta.ts`

Implemented task-15 behavior:

- the manifest now exposes standalone display, portrait orientation, dark navy theme color, and production PNG icons including a maskable Android icon
- `apple-icon.tsx` provides Apple touch icon metadata for Add to Home Screen flows
- the settings page now exposes version, runtime label, exam date, JSON export, and direct links to the workbook/PRD/architecture documents
- install guidance is platform-aware and distinguishes installed, prompt-capable, iPhone/iPad Share-sheet, and generic menu-install cases
- the service worker is online-first and caches only `offline.html` for navigation fallback
- offline fallback is intentionally static and never treated as cached writable study state
