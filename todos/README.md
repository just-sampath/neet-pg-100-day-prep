# Production Readiness TODOs

This folder is the final production-readiness task list for Beside You.

It is derived from:
- `specs/beside-you-prd.md`
- `specs/beside-you-technical-architecture.md`

## How To Use This Folder

- Each markdown file is one production gate.
- Every checkbox must be complete before the repo should be called production-ready.
- The order below is the recommended implementation order.
- Local testability must remain intact while production systems are added.
- If a task requires a spec decision, update the PRD or architecture first, then resume implementation.

## Release Definition

The codebase is production-ready only when:
- All task files in this folder are fully checked off.
- `npm run verify` passes locally.
- The hosted path is Supabase-backed, not file-store-backed.
- Scheduled behavior runs from real server jobs, not only from open-app simulation.
- Core flows work on both a phone-sized viewport and a tablet-sized viewport.
- The implementation matches the PRD behavior, not only the current local-demo behavior.

## Task Order

1. [x] [001-runtime-platform-and-auth.md](./001-runtime-platform-and-auth.md)
2. [x] [002-realtime-sync-and-connectivity.md](./002-realtime-sync-and-connectivity.md)
3. [x] [003-cron-jobs-and-server-automation.md](./003-cron-jobs-and-server-automation.md)
4. [x] [004-excel-ingestion-and-static-content.md](./004-excel-ingestion-and-static-content.md)
5. [x] [005-revision-engine-spec-alignment.md](./005-revision-engine-spec-alignment.md)
6. [006-today-view-and-wind-down.md](./006-today-view-and-wind-down.md)
7. [007-traffic-light-and-backlog-creation.md](./007-traffic-light-and-backlog-creation.md)
8. [008-backlog-suggestion-and-queue.md](./008-backlog-suggestion-and-queue.md)
9. [009-schedule-shift-mechanism.md](./009-schedule-shift-mechanism.md)
10. [010-schedule-browser-and-retroactive-editing.md](./010-schedule-browser-and-retroactive-editing.md)
11. [011-mcq-tracker-and-analytics.md](./011-mcq-tracker-and-analytics.md)
12. [012-gt-tracker-and-analytics.md](./012-gt-tracker-and-analytics.md)
13. [013-weekly-summary-and-review.md](./013-weekly-summary-and-review.md)
14. [014-quotes-system.md](./014-quotes-system.md)
15. [015-settings-pwa-and-installability.md](./015-settings-pwa-and-installability.md)
16. [016-design-performance-and-release-hardening.md](./016-design-performance-and-release-hardening.md)

## Notes

- These files intentionally track product behavior and runtime correctness more than folder structure.
- The current repo already covers part of the product well in local mode, but local mode itself is not the production target described by the architecture.
- Keep `AGENTS.md` and `docs/` in sync when any of these tasks materially change workflows or operational assumptions.
