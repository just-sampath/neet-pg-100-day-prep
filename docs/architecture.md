# Architecture

## Overview

Beside You is a Next.js App Router application with one shared domain model and two runtime backends:

- `local`: file-backed state for immediate local testing
- `supabase`: hosted auth, persistence, and realtime sync

The schedule is build-time source data. User progress is runtime state.

## Build-Time Source Data

Authoritative files:

- `resources/NEET_PG_FINAL_SCHEDULE.xlsx`
- `resources/quotes.csv`
- `specs/world_of_revision_index.md`
- `scripts/generate-static-data.mjs`

Generated outputs:

- `src/lib/generated/schedule-data.ts`
- `src/lib/generated/quotes-data.ts`

The generator now parses the workbook directly and validates:

- required sheets: `Daywise_Plan`, `WOR_Topic_Map`, `Subject_Tiering`, `Revision_Map`
- exactly `100` mapped days
- exactly `3` macro phases
- exactly `19` subjects in subject tiering
- exact Phase 1 WOR topic-minute alignment
- derived GT entries from `Daywise_Plan`

There is no live dependency on `resources/manual-json/*`.

## Schedule Model

The runtime schedule is phase-dominant:

- `phase_1`: Days `1-63`
- `phase_2`: Days `64-82`
- `phase_3`: Days `83-100`

The workbook day is represented through a stable semantic block model:

- `morning_revision`
- `block_a`
- `block_b`
- `block_c`
- `mcq_practice`
- `final_review`
- `wrap_up_log`

Slot geometry comes from the new workbook and is fixed at:

- `06:30-07:45`
- `07:45-08:00`
- `08:00-11:00`
- `11:00-11:15`
- `11:15-14:15`
- `14:15-15:00`
- `15:00-17:45`
- `17:45-18:00`
- `18:00-20:00`
- `20:00-20:30`
- `20:30-22:15`
- `22:15-22:45`

Timing rules:

- Phase 1 topic items in `block_a`, `block_b`, and `block_c` use exact planned minutes from `WOR_Topic_Map`
- Phase 2 and Phase 3 items split block time equally inside the block
- `revisionEligible` is only true for Phase 1 source-learning topic items
- backlog and recovery stay phase-fenced to the 3 macro phases

## Traffic Light And Backlog

Traffic-light reshaping is driven by generated block policies:

- Green: all study blocks visible
- Yellow: `block_c` and `final_review` hidden to backlog
- Red: `block_b`, `block_c`, and `final_review` hidden to backlog
- `wrap_up_log` stays visible and is never backlog work
- `morning_revision` never becomes a backlog item

Backlog suggestions remain supportive, but are now phase-dominant first and block-type aware second.

## Revision System

Revision is derived from actual completion, not static workbook dates.

- Phase 1 completion in `block_a`, `block_b`, or `block_c` creates `D+1`, `D+3`, `D+7`, `D+14`, and `D+28`
- morning revision uses the `06:30-07:45` block
- the visible morning queue caps at `5` items
- overflow goes to `final_review`, then break micro-slots
- `3-6` day misses become catch-up revision assigned to `block_c` or `final_review`
- `7+` day misses become next-phase restudy pressure

The workbook morning text remains useful as a fallback display layer, but live revision state is authoritative once usage exists.

## GT, MCQ, And Weekly Models

- GT schedule context is derived from GT-tagged `Daywise_Plan` rows, not a separate GT sheet
- MCQ and GT logs persist through the shared runtime store model
- weekly summaries aggregate schedule, revision, MCQ, GT, backlog, and overrun signals from runtime data

## Runtime Boundary

Runtime choice is centralized in `src/lib/runtime/mode.ts`.

`local` mode:

- cookie + file-backed auth/session
- persistence in `.data/local-store.json`
- optional auto-refresh polling
- dev time travel and dev routes available

`supabase` mode:

- Supabase password auth
- shared persistence through Supabase tables
- realtime sync through `src/components/app/sync-status.tsx`
- authenticated cron routes for midnight and weekly jobs

Domain logic is shared across both modes. Only the auth, persistence, and sync boundary changes.

## Key Modules

- `src/lib/domain/schedule.ts`: schedule mapping, revision derivation, shift preview logic
- `src/lib/domain/backlog-queue.ts`: backlog suggestions, queue ordering, recovery assignment
- `src/lib/data/app-state.ts`: read models and midnight/weekly automation
- `src/lib/server/actions.ts`: server mutations used by the UI
- `src/app/(app)/today/page.tsx`: Today read model surface
- `src/app/(app)/schedule/*`: schedule browser and retro completion UI
- `src/app/(app)/gt/*`: GT entry and analytics
- `src/app/(app)/weekly/*`: weekly summaries

## Operational Invariants

- no study activity before `06:30` or after `23:00`
- no push notifications or reminder pressure
- schedule data stays build-time and repo-owned
- mutable state is never treated as authoritative offline cache
- local mode must remain sufficient for end-to-end schedule testing
