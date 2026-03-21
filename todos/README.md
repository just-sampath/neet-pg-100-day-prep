# Production Readiness TODOs

This folder is the final production-readiness task list for Beside You.

It is derived from:

- `specs/beside-you-prd.md`
- `specs/beside-you-technical-architecture-OLD.md` (current draft architecture file present in this repo)

## How To Use This Folder

- Each markdown file is exactly one task.
- Every checkbox must be complete before the repo should be called production-ready.
- The order below is the recommended implementation order.
- Local testability must remain intact while production systems are added.
- If a task requires a spec decision, update the PRD or architecture first, then resume implementation.

## Required File Format

- Naming convention: `NNN-short-kebab-case.md`
- One file per task. Do not group multiple open tasks into one file.
- Start each file with a top-level title in this format: `# 00N Task Name`
- The first checkbox must be the task status line:
  - `- [ ] Task complete` while open
  - `- [x] Task complete` once done
- Every task file must include these sections in this order:
  1. `## Why This Exists`
  2. `## Spec Coverage`
  3. `## Current Gap`
  4. `## Checklist`
  5. `## Acceptance Criteria`
  6. `## Implementation Notes`
- `Spec Coverage` should cite the relevant PRD sections and the relevant architecture sections by number.
- Architecture references should currently point to the draft file that exists in this repo: `specs/beside-you-technical-architecture-OLD.md`.

Template:

```md
# 00N Task Name

- [ ] Task complete

## Why This Exists

Short product reason.

## Spec Coverage

- PRD: Sections X, Y
- Architecture: Sections A, B

## Current Gap

- Open in code. Describe the mismatch briefly.

## Checklist

- [ ] Concrete implementation step.
- [ ] Concrete implementation step.

## Acceptance Criteria

- [ ] User-visible outcome.
- [ ] User-visible outcome.

## Implementation Notes

- Relevant files or design constraints.
```

## Release Definition

The codebase is production-ready only when:

- All task files in this folder are fully checked off.
- `npm run verify` passes locally.
- The hosted path is Supabase-backed, not file-store-backed.
- Scheduled behavior runs from real server jobs, not only from open-app simulation.
- Core flows work on both a phone-sized viewport and a tablet-sized viewport.
- The implementation matches the PRD behavior, not only the current local-demo behavior.

## Task Order

1. `001-day-one-default-tomorrow.md`
2. `002-setup-gate-before-day-one.md`
3. `003-production-day-one-validation.md`
4. `004-remove-duplicate-today-branding.md`
5. `005-move-pace-dial-higher.md`
6. `006-hide-empty-recovery-radar.md`
7. `007-collapse-actual-timing-by-default.md`
8. `008-simplify-time-presentation.md`
9. `009-fix-today-block-label-layout.md`
10. `010-rewrite-backlog-copy.md`
11. `011-fix-dropdown-readability.md`
12. `012-clarify-retroactive-completion-wording.md`
13. `013-move-mcq-add-details-above-results.md`
14. `014-theme-analytics-surfaces.md`

## Notes

- These files intentionally track product behavior and runtime correctness more than folder structure.
- The current repo already covers part of the product well in local mode, but local mode itself is not the production target described by the architecture.
- Keep `AGENTS.md` and `docs/` in sync when any of these tasks materially change workflows or operational assumptions.
