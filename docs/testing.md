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

## Local Mode Manual Pass

Use:

```env
BESIDE_YOU_RUNTIME=local
```

Then verify:

1. Log in with the local seeded account.
2. Set Day 1 date.
3. Verify Today view loads a mapped day.
4. Toggle Green, Yellow, Red and confirm visible/rescheduled blocks.
5. Complete a block and refresh.
6. Skip a block and verify backlog entry appears.
7. Edit a block time and trigger sleep protection.
8. Mark a revision item complete.
9. Complete `block_a` or `block_b` late and confirm future revision anchors move.
10. Open a past schedule day and complete a block with a retroactive date.
11. Confirm the old planned revision placement disappears and the new anchor date gains the item.
12. Log MCQ bulk and item data.
13. Log a GT entry.
14. Generate a weekly summary.
15. Export JSON.

## Time-Based Manual Pass

1. Set simulated time to `22:30`.
2. Confirm wind-down prompt appears.
3. Set simulated time to `23:00`.
4. Confirm night recall prompt appears.
5. Set simulated time to `23:15`.
6. Confirm remaining work is swept to backlog.
7. Trigger `/api/dev/midnight` or set next day `00:01`.
8. Confirm missed blocks are marked and weekly automation can run.

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
