# Beside You

**Beside You** is a free NEET PG 2026 preparation companion for students preparing alone with existing resources like Marrow, Bhatia, or PrepLadder.

It is not another content platform. It is the missing structure layer: a 100-day plan, daily execution surface, revision rhythm, recovery queue, MCQ/GT analytics, and sleep-aware end-of-day flow built around the reality that preparation rarely goes perfectly.

Live demo: [beside-you.fun](https://beside-you.fun)

## Why this exists

NEET PG preparation can become a second exam before the real one: deciding what to study, when to revise, how to recover missed days, and whether yesterday's backlog has already ruined the week.

Many aspirants move to coaching hubs because they need structure and routine. But not everyone can relocate, pay lakhs, or thrive inside a rigid high-pressure system. Many students already trust their own resource stack, but still need a plan that tells them what to do today and how to recover when the day goes wrong.

Beside You is built for those solo aspirants. It does not replace coaching, question banks, or video platforms. It sits above them as a calm operating system for the final stretch.

## Who it is for

Beside You is for NEET PG aspirants who:

- are preparing independently, from home, or away from a formal coaching routine
- already use resources like Marrow, Bhatia, PrepLadder, notes, QBank modules, or GTs
- need a clear 100-day structure instead of a blank calendar
- struggle with backlogs, missed days, anxiety, or planning fatigue
- want revision, MCQs, and GT review to happen inside one coherent system
- need a recoverable plan instead of a brittle timetable.

## What makes it different

Most plans assume the student executes perfectly. Beside You assumes real preparation is uneven.

The app is built around recovery loops: traffic-light planning reduces today's load, backlog suggestions place missed work forward, revision queues protect memory, analytics reveal repeated mistakes, weekly summaries reconnect the whole system, and sleep protection stops the day from expanding endlessly.

That is the core idea: one bad day should create a recovery path, not a collapsed plan.

## Core product features

### Expert-informed 100-day NEET PG plan

- Maps the final stretch into daily study blocks, 3 full revisions, 6 GTs, MCQs/IBQs, breaks, and final assault time.
- Reduces daily planning load, so the student spends energy studying instead of rebuilding the timetable every morning.

### Today view that says what to do next

- Shows the day as one chronological rail: study blocks, revision, MCQ entry, breaks, meals, and rescheduled recovery work.
- Keeps the interface intentionally quiet: no noisy streaks, no fake urgency, no notification system.

### Red / Yellow / Green day planning

- Adapts the day to the student's real capacity: Green for full-load days, Yellow for lighter days, Red for survival-mode days.
- Protects high-value work while moving recoverable blocks into backlog, so one bad day does not collapse the plan.

### Schedule queue with backlog and forward suggestions

- Turns missed, skipped, hidden, or overrun blocks into recovery items with original day, slot, subject, and source reason.
- Suggests realistic future slots, supports single or bulk rescheduling, and places accepted work back inside the target day.
- Makes backlog part of the schedule instead of a separate guilt list.

### Spaced revision queue from actual completion

- Creates revision checkpoints from completed topics at 1, 3, 7, 14, and 28 days.
- Shows the first 75 minutes in the morning revision queue, with overflow and restudy pressure surfaced clearly.
- Keeps revision tied to real progress, not only the original spreadsheet plan.

### Fast MCQ logging with useful analytics

- Supports quick bulk MCQ totals for daily discipline and detailed one-by-one entries for error logging.
- Tracks volume, accuracy, right/wrong/guessed-right mix, subject accuracy, weak subjects, topics, sources, cause codes, fix codes, priority, and tags.
- Turns MCQ history into revision direction instead of another spreadsheet.

### GT logging and exam-behaviour analytics

- Records score, AIR/percentile context, correct/wrong/unattempted counts, and section A-E performance.
- Captures device, overall feeling, time-loss reasons, weak subjects/topics, dominant error types, and knowledge-vs-behaviour split.
- Helps separate content gaps from execution problems like panic, overthinking, poor pacing, and avoidable mistakes.

### Weekly summaries that connect the system

- Pulls together schedule completion, traffic-light mix, morning revision, MCQs, GTs, backlog, overrun blocks, subjects studied, and schedule health.
- Highlights top wrong subjects, repeated cause codes, revision overflow, restudy pressure, and backlog sources.
- Converts a messy week into a short recovery readout.

### Starting quotes, ending quotes, and quiet emotional framing

- Uses daily quotes, tough-day quotes, and completion quotes as gentle framing, not motivation spam.
- Keeps quote cycles non-repeating and persistent across refreshes/devices.
- Supports the emotional tone of the app without becoming a reminder system.

### Sleep protection and wind-down flow

- Uses late-night prompts to move remaining work into backlog and stop the day cleanly.
- Routes overflow into recovery when time edits would cross the protected study window.
- Takes a clear product stance: missed work can be recovered; sleep should not be sacrificed to make the UI look complete.

### Built around existing subscriptions

- Assumes the student already has trusted videos, notes, QBanks, and GT sources.
- Does not try to replace Marrow, Bhatia, PrepLadder, or any other content platform.
- Organizes the structure layer around the resources the student already uses.

### Local-first development with hosted shared-state support

- Runs in `local` mode for immediate testing after clone.
- Runs in `supabase` mode for auth, persistence, realtime sync, and hosted cron flows.
- Keeps the repo easy to validate locally while still supporting the real two-device use case.

The 100-day schedule is expert-informed and reviewed with inputs from junior residents who have gone through the NEET PG journey, including 2 Pulmonology 2nd-year JRs and 2 Dermatology 3rd-year JRs.

## Quick Start

1. Install dependencies:

```bash
npm install
```

1. Generate the workbook-derived schedule and quote data:

```bash
npm run generate:data
```

1. Start the app:

```bash
npm run dev
```

1. Choose a runtime in `.env.local`.

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

1. Log in with the active runtime credentials.

Default local credentials:

- Email: `aspirant@beside-you.local`
- Password: `beside-you-2026`

## Core Commands

```bash
npm run dev
npm run generate:data
npm run lint
npm run typecheck
npm test
npm run verify
```

## Technical notes

- Built with Next.js App Router, React, TypeScript, Tailwind CSS, Supabase, Vitest, and workbook-derived static data generation.
- `local` runtime keeps the repo runnable without hosted infrastructure.
- `supabase` runtime is the real hosted path for auth, persistence, realtime sync, and cron-backed midnight/weekly automation.
- The workbook and CSV inputs remain the source of truth for generated schedule and quote data. If parsing changes, run `npm run generate:data`.
- Runtime branching stays at the persistence/auth/sync boundary so domain logic does not fork between local and hosted modes.

## Docs

- [AGENTS.md](./AGENTS.md)
- [docs/local-development.md](./docs/local-development.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/operations.md](./docs/operations.md)
