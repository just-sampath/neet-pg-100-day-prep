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

1.

## Notes

- These files intentionally track product behavior and runtime correctness more than folder structure.
- The current repo already covers part of the product well in local mode, but local mode itself is not the production target described by the architecture.
- Keep `AGENTS.md` and `docs/` in sync when any of these tasks materially change workflows or operational assumptions.
