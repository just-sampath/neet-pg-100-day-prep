# Testing

## Automated

```bash
npm run verify
npm run build:webpack
```

`npm run verify` covers:

- static data generation
- lint
- typecheck
- vitest
- workbook-to-generated-data regression checks
- revision-engine branch coverage for:
  - planned fallback anchors
  - late actual-completion anchor shifts
  - morning queue cap and overflow slot order
  - `1-2`, `3-6`, and `7+` overdue routing
  - explicit revision completion exclusion
  - retroactive completion recomputation and invalid early-checkoff cleanup
- Today-view branch coverage for:
  - chronological timeline ordering with inline break/meal separators
  - collapsed hidden-block placement inside the main rail
  - 22:30 wrap-up prompt
  - 22:45 one-time reappearance
  - 23:00 night recall handling
  - 23:15 safety-net auto-move states
- Backlog/traffic-light branch coverage for:
  - exact yellow and red visible sets
  - same-day traffic-light restoration
  - manual skip metadata
  - midnight miss creation with morning-revision exclusion
  - wind-down backlog creation with morning-revision exclusion
  - overrun preview and forced-sleep backlog branches
  - PRD backlog suggestion precedence for content, MCQ, PYQ/weekend, consolidation, and night recall
  - queue ordering, original mapped-date metadata, bulk reschedule, and assigned-recovery destination sync
- schedule-shift branch coverage for:
  - last-7-day shift eligibility detection
  - earliest-missed-day anchoring
  - Day 84 buffer consumption
  - fixed compression order `95+96`, `97+98`, `91+92`
  - protection of Days 99 and 100
  - repeated-shift safety
  - hard-boundary enforcement at August 20, 2026
  - preview-to-apply mapping consistency
- schedule-browser branch coverage for:
  - original planned date stability after shifts
  - past/today/future/shift-hidden editability boundaries
  - today highlighting in the browser list
  - day-detail retroactive mode only on past visible days
- MCQ branch coverage for:
  - bulk-entry math validation and derived wrong-count behavior
  - canonical subject/result/cause/priority/fix/tag enforcement
  - stored legacy MCQ log normalization before analytics
  - recent topic/source suggestions from prior entries
  - trend, breakdown, subject-accuracy, weak-subject, and cause-code aggregations
  - weekly-summary MCQ insight feed
- GT branch coverage for:
  - score, attempt-context, section A-E, and wrapper validation
  - workbook GT-label mapping after schedule shifts
  - recurring-topic normalization and top-3 cap
  - score trend, section pattern, section time-loss, comparison, wrapper-trend, and weakness aggregations
  - AIR vs percentile comparison direction handling
  - weekly-summary GT insight feed
- Weekly-summary branch coverage for:
  - midweek partial snapshot generation
  - Sunday `23:30` IST automation cutoff
  - safe regeneration/upsert for the same week
  - stored payload integrity for schedule, revision, backlog, MCQ, and GT signals
- Quote-system branch coverage for:
  - CSV-to-generated-data alignment
  - same-date quote stability without double-advancing the cycle
  - category exhaustion/reset without premature repeat
  - Green -> Yellow/Red -> Green restoration of the original daily quote
  - stale persisted quote-state normalization
- settings/PWA branch coverage for:
  - manifest metadata and icon definitions
  - install-guidance platform detection
  - install-guidance state resolution
  - settings/about download metadata
- release-hardening branch coverage for:
  - forbidden push, reminder, background-sync, and share API drift
  - online-first service-worker fallback shape

For the final ship gate, also run [docs/release-smoke-test.md](./release-smoke-test.md).

## Local Mode Manual Pass

Use:

```env
BESIDE_YOU_RUNTIME=local
```

Then verify:

1. Log in with the local seeded account.
2. Set Day 1 date.
3. Verify Today view loads a mapped day.
4. Confirm break and meal separators stay inline in the Today timeline.
5. Toggle Green, Yellow, Red and confirm visible blocks stay interactive while hidden blocks collapse in-place as `Rescheduled`.
6. Confirm the Today view exposes the MCQ quick-log entry point.
7. Complete a block and refresh.
8. Skip a block and verify backlog entry appears.
9. Skip `morning_revision` and confirm it does not create a backlog entry.
10. Edit `block_a` later into `block_b` and confirm the overrun decision path appears.
11. Edit a late block so it would breach `23:00` and confirm the forced backlog path appears.
12. Mark a revision item complete.
13. Complete `block_a` or `block_b` late and confirm future revision anchors move.
14. Open a past schedule day and complete a block with a retroactive date.
15. Confirm the old planned revision placement disappears and the new anchor date gains the item.
16. Log MCQ bulk and item data.
17. Confirm bulk `wrong` auto-derives from attempted and correct.
18. Confirm one-by-one `MCQ ID + result tap` works without opening details.
19. Expand `Add details`, submit once, and confirm subject/source plus expander state persist while the other optional fields clear.
20. Log a GT entry.
21. Confirm the GT form prefills the mapped GT label and day, not a generic free-text string.
22. Confirm recurring GT topics stop at 3 and weakest-subject chips persist after save.
23. Confirm GT analytics show score trend, section patterns, comparison, wrapper trend, section time-loss reasons, and weak-subject/topic repetition.
24. Generate a weekly summary.
25. Open the weekly detail page and confirm it shows schedule adherence, revision health, overrun labels, MCQ trends, GT summary, backlog breakdown, and subjects studied.
26. Toggle Green -> Yellow/Red -> Green and confirm the original daily quote returns for the same date.
27. Complete the visible day and confirm the celebration quote appears as its own completion moment.
28. Refresh and confirm the quote stays stable for the current date/category.
29. Export JSON.
30. Reschedule a backlog item and confirm it renders inside the destination block card rather than a detached recovery strip.
31. Complete the destination block and confirm the assigned backlog item closes automatically.
32. In a separate pass, skip or miss the destination block and confirm the assigned backlog item returns to `pending`.
33. Create two heavily missed days in the last 7-day window and confirm the shift offer appears.
34. Open shift preview and confirm it starts from the earliest missed day, uses Day 84 first, and lists the exact compression pair when needed.
35. Apply the shift and confirm Today moves to the shifted anchor day, GT markers move with it, and backlog from the shifted span is cleared.
36. Open `/schedule` and confirm the browser scrolls near Today and highlights it.
37. Open a future day from the browser and confirm it is view-only.
38. Open a past day and confirm only retroactive completion is available.
39. Open an absorbed or merged shift-hidden day and confirm it is view-only while still showing why the mapping changed.
40. Open `/settings` and confirm version, runtime label, export, and workbook/spec links render cleanly on mobile width.
41. Install the app or check the install guidance card and confirm the platform-specific instructions are sensible.
42. Disconnect the network after loading once and confirm a fresh navigation falls back to the quiet offline page instead of stale app state.

## Time-Based Manual Pass

1. Set simulated time to `22:30`.
2. Confirm wind-down prompt appears.
3. Dismiss with `I'm almost done` and confirm the wrap-up prompt reappears once at `22:45`.
4. Set simulated time to `23:00`.
5. Confirm the night recall prompt appears.
6. Set simulated time to `23:15`.
7. Confirm remaining work is swept to backlog and the safety-net message appears.
8. Confirm `morning_revision` does not enter the backlog queue from the wind-down or midnight path.
9. Trigger `/api/dev/midnight` or set next day `00:01`.
10. Confirm missed blocks are marked and weekly automation can run.
11. If a backlog item had been assigned to a target slot, confirm midnight releases it back to `pending` when that target slot was never completed.

## Supabase Runtime Pass

Use:

```env
BESIDE_YOU_RUNTIME=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

And apply the schema:

```bash
supabase db push
```

Then verify:

1. Log in with the seeded Supabase user.
2. Refresh and confirm the session persists.
3. Open the app in a second window or device with the same account.
4. Change traffic light in window A and confirm window B updates within seconds.
5. Complete or skip a block in window A and confirm window B updates.
6. Add an MCQ entry and a GT entry in window A and confirm window B updates.
7. Disconnect the network and confirm the app shows `No connection` or `Sync reconnecting`.
8. Reconnect and confirm the app recovers without logout or manual reload.
9. Export JSON and confirm the exported data reflects the persisted Supabase state.
10. Refresh the same date in both sessions and confirm the current quote for that date/category remains consistent.
11. Open Settings in both sessions and confirm theme changes stay in sync.

## Hosted Automation Pass

In Supabase mode, with `CRON_SECRET` configured:

1. Run `supabase db push`.
2. Start the app locally or deploy it with the same env vars.
3. Call `POST /api/cron/midnight` with `Authorization: Bearer <CRON_SECRET>`.
4. Confirm backlog/revision rollover runs once for the processed IST date.
5. Call the same endpoint again and confirm it does not duplicate state.
6. Call `POST /api/cron/weekly` with `Authorization: Bearer <CRON_SECRET>`.
7. Confirm the eligible weekly summary is created once for the correct IST week.
8. Call `GET /api/keep-alive` and confirm a lightweight success payload.
9. Inspect `automation_job_runs` and confirm run records exist for each invocation.

## Runtime-Specific Expectations

- Local mode may still use the lightweight refresh loop.
- Supabase mode should not rely on the fixed polling loop for core sync.
- Conflict policy is last-write-wins through authoritative server persistence and refresh on Realtime events.
- In Supabase mode, midnight and weekly automation should come from cron routes, not page-open refresh behavior.
- Offline fallback should never be treated as writable cached study state; reconnect before trusting fresh mutations.

## Static Data Regression Expectations

- `Block_Hours` must remain the source of truth for trackable block timing.
- `Daywise_Plan` must remain exactly 100 mapped days.
- `GT_Test_Plan` day references must match GT-tagged days in `Daywise_Plan`.
- Revision tests should fail if `block_a` and `block_b` stop producing independent revision identities.
- If any of these assumptions break, `npm run generate:data` or `vitest` should fail loudly.
