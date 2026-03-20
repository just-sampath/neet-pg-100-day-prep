# 003 Cron Jobs And Server Automation

- [ ] Task complete

## Why This Exists

Midnight rollover, auto-miss behavior, schedule-shift detection, and weekly summary generation should run server-side on time even if the app is closed.

## Spec Coverage

- PRD: Sections 6.2, 6.3, 6.5, 6.6, 9, 11
- Architecture: Sections 12.1 Path 3, 12.1 Path 5, 13, 17, 20, 27

## Current Gap

- Important automations currently depend on the app being opened or refreshed.
- Dev helper routes simulate cron behavior locally, but the hosted architecture path is not implemented end to end.

## Checklist

- [ ] Implement the midnight auto-miss job using the production server-side job path.
- [ ] Run overdue-revision rollover during midnight processing.
- [ ] Detect schedule-shift conditions during midnight processing.
- [ ] Generate weekly summaries on the defined schedule server-side.
- [ ] Add keep-alive or equivalent reliability support if the chosen hosting path needs it.
- [ ] Make scheduled jobs idempotent so reruns do not duplicate state.
- [ ] Record enough job telemetry or logs to debug failures safely.
- [ ] Keep local manual trigger endpoints or scripts for full local testability.
- [ ] Document the exact schedule boundary in IST and verify timezone handling.

## Acceptance Criteria

- [ ] Midnight rollover completes correctly even when the app is closed.
- [ ] Weekly summaries appear without manual generation.
- [ ] Re-running a job does not duplicate backlog items, revision items, or summaries.
- [ ] Local developers can still test all scheduled behavior without waiting for wall-clock time.
