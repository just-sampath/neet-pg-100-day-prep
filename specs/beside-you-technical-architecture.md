# Beside You Technical Architecture

## 1. Purpose

This document defines the current repo architecture for Beside You after the workbook migration to the phase-dominant schedule model.

The implementation target is one quiet NEET PG study companion with:

- build-time schedule data from repo-owned files
- runtime-aware persistence for `local` and `supabase`
- one shared domain model across both runtimes

## 2. Build-Time Source Data

### 2.1 Authoritative Files

- `resources/NEET_PG_FINAL_SCHEDULE.xlsx`
- `resources/quotes.csv`
- `specs/world_of_revision_index.md`

### 2.2 Workbook Roles

- `Daywise_Plan`: authoritative day order, phase spans, block text, GT-tagged rows, notes, and minute totals
- `WOR_Topic_Map`: authoritative Phase 1 topic identity and planned minutes
- `Subject_Tiering`: subject aliases, tiering, and priority metadata
- `Revision_Map`: workbook morning guidance and fallback revision display hints

### 2.3 Generation

`scripts/generate-static-data.mjs` parses the workbook directly and writes committed TypeScript modules under `src/lib/generated/`.

Generation must fail loudly if any of the following drift:

- required sheet names
- 100-day continuity
- 3 macro-phase spans
- 19-subject tiering coverage
- Phase 1 WOR topic-minute alignment
- derived GT-day mapping

## 3. Generated Schedule Model

### 3.1 Phase Model

The schedule is phase-dominant and limited to 3 macro phases:

1. `phase_1`: Days `1-63`
2. `phase_2`: Days `64-82`
3. `phase_3`: Days `83-100`

All backlog, revision overflow, and recovery rules fence against these phases rather than the retired micro-phase catalog.

### 3.2 Stable Block Model

Each day is normalized into stable semantic blocks:

- `morning_revision`
- `block_a`
- `block_b`
- `block_c`
- `mcq_practice`
- `final_review`
- `wrap_up_log`

Slot geometry is fixed at:

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

### 3.3 Timing Rules

- Phase 1 topic items in `block_a`, `block_b`, and `block_c` use exact minutes from `WOR_Topic_Map`
- Phase 2 and Phase 3 split block time equally across their parsed items
- `revisionEligible` is true only for Phase 1 source-learning topic items
- `reschedulable` and `phaseFence` remain part of generated data and are consumed by backlog/recovery logic

## 4. Runtime Architecture

### 4.1 Shared Domain

Core domain logic lives under `src/lib/domain/*` and must remain runtime-agnostic.

Primary modules:

- `schedule.ts`
- `backlog.ts`
- `backlog-queue.ts`
- `today.ts`
- `gt.ts`
- `mcq.ts`
- `weekly.ts`

### 4.2 Read Models And Automation

`src/lib/data/app-state.ts` owns:

- Today read models
- midnight rollover logic
- weekly summary generation
- traffic-light reshape side effects
- backlog assignment lifecycle
- shift preview/apply data shaping

### 4.3 Mutations

UI writes go through `src/lib/server/actions.ts`.

Pages should not duplicate domain mutation rules locally.

## 5. Runtime Modes

### 5.1 Local

- file-backed persistence in `.data/local-store.json`
- local auth/session boundary
- dev time-travel support
- optional polling refresh path

### 5.2 Supabase

- password auth through Supabase
- shared persistence through tables mirroring the `UserState` model
- realtime sync through `src/components/app/sync-status.tsx`
- authenticated cron routes for midnight and weekly jobs

Runtime selection is centralized in `src/lib/runtime/mode.ts`.

## 6. Product-Critical Behavior

### 6.1 Traffic Light

- Green: full schedule
- Yellow: `block_c` and `final_review` hidden to backlog
- Red: `block_b`, `block_c`, and `final_review` hidden to backlog
- `wrap_up_log` remains visible and never becomes backlog work
- `morning_revision` never becomes backlog work

### 6.2 Revision

- only Phase 1 completion in `block_a`, `block_b`, or `block_c` creates revision anchors
- intervals remain `D+1`, `D+3`, `D+7`, `D+14`, `D+28`
- visible morning queue caps at `5`
- overflow order: `final_review`, then break micro-slots
- `3-6` day misses route to `block_c` or `final_review`
- `7+` day misses become next-phase restudy pressure

### 6.3 Wind-Down

Open-app prompts follow the new late-day flow:

- `21:45` wrap-up offer
- `22:00` one repeat wrap-up offer
- `22:15` final-review prompt
- `22:45` safety-net sweep

### 6.4 GT

GT schedule context is derived from GT rows in `Daywise_Plan`, not from a separate workbook sheet.

## 7. Persistence Model

The shared runtime state includes:

- settings
- day states
- block progress
- revision completions
- backlog items
- MCQ logs
- GT logs
- weekly summaries
- quote state
- shift events

Local and Supabase backends store equivalent logical data even though their storage mechanics differ.

## 8. Operational Invariants

- no study before `06:30`
- no study after `23:00`
- no push notifications or reminder infrastructure
- schedule and quotes remain repo-owned build-time data
- offline mode must never present mutable cached state as authoritative truth
- local mode must remain sufficient for schedule, backlog, revision, MCQ, GT, and weekly-flow testing
