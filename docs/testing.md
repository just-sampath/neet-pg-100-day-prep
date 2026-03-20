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
17. Log a GT entry.
18. Generate a weekly summary.
19. Export JSON.

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

## Static Data Regression Expectations

- `Block_Hours` must remain the source of truth for trackable block timing.
- `Daywise_Plan` must remain exactly 100 mapped days.
- `GT_Test_Plan` day references must match GT-tagged days in `Daywise_Plan`.
- Revision tests should fail if `block_a` and `block_b` stop producing independent revision identities.
- If any of these assumptions break, `npm run generate:data` or `vitest` should fail loudly.
