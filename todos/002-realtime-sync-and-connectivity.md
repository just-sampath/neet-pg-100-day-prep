# 002 Realtime Sync And Connectivity

- [x] Task complete

## Why This Exists

The PRD expects the phone and tablet to stay in sync within seconds. The current app approximates this with local persistence plus polling, which is not the architecture target.

## Spec Coverage

- PRD: Sections 15, 16
- Architecture: Sections 21, 26

## Current Gap

- Closed in code. Supabase mode now uses Realtime subscriptions for the shared state tables, with local polling retained only for explicit local mode.

## Checklist

- [x] Replace client polling with Supabase Realtime subscriptions for relevant state tables.
- [x] Subscribe to changes for day state, block progress, backlog, MCQ logs, GT logs, settings, and weekly summaries.
- [x] Define the exact conflict policy as last-write-wins and implement it consistently.
- [x] Surface a clear but quiet `No connection` or degraded-sync state in the UI.
- [x] Recover cleanly after reconnect and refetch the authoritative state.
- [x] Avoid duplicate optimistic updates when realtime echoes the originating write.
- [x] Ensure realtime listeners are scoped, cleaned up, and do not leak across route transitions.
- [x] Add tests or manual validation steps for two-session sync.

## Acceptance Criteria

- [x] A change on one device appears on the other within seconds.
- [x] Temporary network loss is visible without spamming the user.
- [x] Reconnect restores consistency without a full logout or broken UI state.
- [x] The app no longer relies on a fixed polling loop for core sync.

## Implementation Notes

- Realtime sync and quiet connectivity state live in `src/components/app/sync-status.tsx`.
- `src/components/app/auto-refresh.tsx` now only polls in explicit local mode.
- Realtime publication coverage and user-scoped RLS are added in `supabase/migrations/0002_runtime_rls_realtime.sql`.
- Conflict policy is last-write-wins through authoritative server persistence plus route refresh on Realtime events.
