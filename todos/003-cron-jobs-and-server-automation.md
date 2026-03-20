# 003 Cron Jobs And Server Automation

- [x] Task complete

## Why This Exists

Midnight rollover, auto-miss behavior, schedule-shift detection, and weekly summary generation should run server-side on time even if the app is closed.

## Spec Coverage

- PRD: Sections 6.2, 6.3, 6.5, 6.6, 9, 11
- Architecture: Sections 12.1 Path 3, 12.1 Path 5, 13, 17, 20, 27

## Status

- Production cron routes now exist for midnight rollover and weekly summary generation.
- Supabase-mode midnight and weekly automation no longer depend on a page refresh.
- Job runs are idempotent and recorded in `automation_job_runs`.
- Dev helper routes still exist so local testing remains immediate.

## Checklist

- [x] Implement the midnight auto-miss job using the production server-side job path.
- [x] Run overdue-revision rollover during midnight processing.
- [x] Detect schedule-shift conditions during midnight processing.
- [x] Generate weekly summaries on the defined schedule server-side.
- [x] Add keep-alive or equivalent reliability support if the chosen hosting path needs it.
- [x] Make scheduled jobs idempotent so reruns do not duplicate state.
- [x] Record enough job telemetry or logs to debug failures safely.
- [x] Keep local manual trigger endpoints or scripts for full local testability.
- [x] Document the exact schedule boundary in IST and verify timezone handling.

## Acceptance Criteria

- [x] Midnight rollover completes correctly even when the app is closed.
- [x] Weekly summaries appear without manual generation.
- [x] Re-running a job does not duplicate backlog items, revision items, or summaries.
- [x] Local developers can still test all scheduled behavior without waiting for wall-clock time.
