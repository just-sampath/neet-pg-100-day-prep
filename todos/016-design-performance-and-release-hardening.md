# 016 Design, Performance, And Release Hardening

- [ ] Task complete

## Why This Exists

The remaining work is not only about missing features. Production readiness also requires device fitness, accessibility, performance discipline, and a release-quality verification pass across the whole product.

## Spec Coverage

- PRD: Sections 11, 14.1, 14.2, 14.3, 16, 17, 20
- Architecture: Sections 3, 26, 27

## Current Gap

- The UI direction is strong, but the full release hardening pass against the target devices and non-functional requirements is not complete.

## Checklist

- [ ] Validate the full app on the iPhone 12 target viewport.
- [ ] Validate the full app on the Samsung Galaxy Tab S9 target viewport.
- [ ] Check safe-area behavior, touch-target sizing, and scroll ergonomics.
- [ ] Audit contrast, keyboard access, focus states, and semantic labeling.
- [ ] Ensure loading, empty, and error states exist where needed.
- [ ] Remove performance hotspots in server and client rendering paths.
- [ ] Keep initial page loads and route transitions within an acceptable mobile budget.
- [ ] Expand automated test coverage around high-risk product logic.
- [ ] Add a final manual smoke-test script that covers all critical flows.
- [ ] Verify the shipped app still excludes forbidden scope such as push reminders, streaks, social features, and other out-of-scope systems from the PRD.
- [ ] Reconcile `AGENTS.md`, `README.md`, and `docs/` with the final shipped behavior.
- [ ] Complete a final production deploy rehearsal from a clean environment.

## Acceptance Criteria

- [ ] The app feels stable and intentional on both target device classes.
- [ ] Accessibility blockers are resolved.
- [ ] Critical user journeys are covered by automated tests and a manual release script.
- [ ] The repo docs match the actual runtime behavior.
- [ ] The release preserves the silent-companion product boundaries defined by the PRD.
- [ ] A clean production deployment can be performed without ad hoc fixes.
