# Release Smoke Test

Use this checklist before calling the app production-ready. It is the final manual gate for task `016`.

## 1. Clean Environment Rehearsal

Start from a clean clone or a clean checkout on another machine.

```bash
npm ci
npm run verify
npm run build:webpack
```

If you are validating Supabase mode too:

```bash
supabase db push
```

Acceptance:

- `npm run verify` passes without ad hoc edits
- `npm run build:webpack` passes without ad hoc edits
- Supabase migrations apply cleanly

## 2. Device Targets

Validate these two target classes from the architecture doc:

- iPhone 12 portrait: `390 x 844`
- Samsung Galaxy Tab S9 portrait: `800 x 1280`

Check each route:

- `/today`
- `/backlog`
- `/mcq`
- `/mcq/analytics`
- `/gt`
- `/gt/analytics`
- `/schedule`
- `/schedule/[day]`
- `/weekly`
- `/weekly/[week]`
- `/settings`

Acceptance:

- no clipped safe-area content
- no touch target smaller than a comfortable thumb tap
- no unreadable density on the phone layout
- no awkward wasted space on the tablet layout
- route transitions feel quiet and immediate

## 3. Core Manual Pass

1. Log in.
2. Set Day 1.
3. Confirm Today loads with the mapped date, quote, pace dial, and timeline.
4. Toggle `Green -> Yellow -> Red -> Green` and confirm visibility, inline collapsed cards, and backlog behavior still match the PRD.
5. Complete, skip, and time-edit blocks, including the overrun branch and the sleep-protection branch.
6. Confirm revision, overflow, catch-up, and restudy sections behave correctly.
7. Use the MCQ quick log from Today.
8. Log MCQ bulk and one-by-one entries, then open MCQ analytics.
9. Log a GT entry, then open GT analytics.
10. Reschedule a backlog item and confirm it appears inside the destination block on the target day.
11. Complete the destination block and confirm the assigned backlog item closes.
12. Generate a weekly summary and open its detail page.
13. Export JSON from Settings.

## 4. Loading, Empty, and Error States

Check these specifically:

- while route data is loading, the app shows calm placeholder panels and never a spinner
- empty backlog / weekly / analytics states read as neutral, not punitive
- unknown routes show a useful not-found page
- forced route errors recover with retry or a clean path back to Today

## 5. Supabase Sync Pass

With `BESIDE_YOU_RUNTIME=supabase` and valid env vars:

1. Open two sessions.
2. Change traffic light in one session and confirm the other updates.
3. Complete or skip a block and confirm the other updates.
4. Log MCQ and GT entries and confirm the other session updates.
5. Disconnect once and confirm the degraded-sync badge stays quiet and recoverable.

## 6. Hosted Automation Pass

With `CRON_SECRET` set:

1. Call `/api/cron/midnight`.
2. Call it again and confirm idempotence.
3. Call `/api/cron/weekly`.
4. Call `/api/keep-alive`.

Acceptance:

- midnight rollover runs exactly once per eligible IST date
- weekly summary runs exactly once per eligible IST week
- the keep-alive route responds cleanly

## 7. Product Boundary Guard

Verify the shipped app still excludes these out-of-scope systems:

- no push notifications
- no reminder engine
- no streaks, points, or gamified pressure
- no social feed, sharing workflow, or leaderboard
- no offline mutable shadow state pretending to be truth

## 8. Release Sign-Off

Only sign off when all of the following are true:

- verify/build are clean
- both target device classes feel stable
- core study flows work end to end
- Supabase sync is calm and reliable
- docs match what the app actually does
- the app still behaves like a silent companion, not a productivity game
