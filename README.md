# Beside You

Mobile-first NEET PG 2026 study companion built with Next.js App Router.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Generate the static schedule and quotes modules:

```bash
npm run generate:data
```

3. Start the app:

```bash
npm run dev
```

4. Choose a runtime in `.env.local`.

For immediate local testing:

```env
BESIDE_YOU_RUNTIME=local
```

For the hosted/shared-state path:

```env
BESIDE_YOU_RUNTIME=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

5. Log in with the active runtime credentials.

Default local credentials:

- Email: `aspirant@beside-you.local`
- Password: `beside-you-2026`

## What’s Included

- Runtime-aware local and Supabase-backed modes
- Build-time schedule and quote generation from the provided workbook/CSV with workbook validation
- Today view, traffic light system, backlog queue, schedule browser, MCQ logging, GT logging, weekly summaries, export
- Today view now keeps the full day in one chronological rail with inline break/meal separators, collapsed rescheduled blocks, an MCQ quick-log entry point, and a quiet completion glow
- Dev-only time travel controls for 22:30 / 23:00 / 23:15 / midnight behavior
- Open-app wind-down state machine with 22:30 wrap-up, one 22:45 reappearance, 23:00 night recall handling, and 23:15 safety-net backlog sweep
- Traffic-light restoration and backlog creation now preserve original slot timing, keep morning revision out of the backlog queue, and support overrun-triggered recovery paths
- Backlog queue now uses block-type-aware recovery suggestions, bulk reschedule-to-suggestion flows, original mapped-date metadata, and target-day integration directly inside destination block cards
- Schedule shift now uses an anchored preview/apply flow with Day 84 absorption, fixed Final Assault compression order, repeated-shift safety, and hard-boundary enforcement at August 20, 2026
- Schedule Browser now auto-focuses today, keeps future days read-only, exposes retroactive completion only on past days, and shows original planned dates when shifts change the live mapping
- MCQ tracking now matches the spec: derived-wrong bulk entry, canonical 19-subject dropdowns, quick-tap one-by-one result buttons, remembered `Add details` state, recent topic/source suggestions, and analytics for trend, breakdown, subject accuracy, weak subjects, and cause codes
- GT tracking now matches the spec: workbook-preloaded GT context, structured attempt context, section A-E review, wrapper trend fields, repeated weak-subject tracking, and analytics for score trend, section patterns, comparison, wrapper drift, and time-loss patterns
- Weekly summaries now match the spec: Sunday `23:30` IST automation, safe week-key regeneration, partial manual snapshots through today, and full review detail pages for schedule, revision, MCQ, GT, backlog, and subject coverage
- Supabase auth, persistence, RLS, and Realtime integration path for shared-state deployment
- Production cron routes for IST midnight rollover and weekly summary automation
- Job telemetry in `automation_job_runs` plus manual cron setup SQL for Supabase
- Workbook-derived block templates from `Block_Hours` plus regression tests that compare generated data back to the source workbook
- Block-level revision engine with actual-completion anchors, planned fallback, overflow routing, overdue recovery buckets, and retroactive recomputation coverage

## Core Commands

```bash
npm run dev
npm run generate:data
npm run lint
npm run typecheck
npm test
npm run verify
```

## Docs

- [AGENTS.md](./AGENTS.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/local-development.md](./docs/local-development.md)
- [docs/testing.md](./docs/testing.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/operations.md](./docs/operations.md)
- [docs/product-behavior.md](./docs/product-behavior.md)
