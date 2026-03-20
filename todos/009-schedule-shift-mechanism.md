# 009 Schedule Shift Mechanism

- [ ] Task complete

## Why This Exists

Schedule shift is the safety valve for multi-day disruption. The compression order and hard study boundary are fixed product rules and must be implemented exactly.

## Spec Coverage

- PRD: Sections 4.4, 6.5, 13
- Architecture: Sections 13, 16, 25

## Current Gap

- Shift preview exists, but applying a shift is still too shallow.
- The workflow does not yet fully enforce backlog cleanup, GT propagation, and the hard no-study-after-boundary rule.

## Checklist

- [ ] Detect shift eligibility when 2 or more days are effectively missed.
- [ ] Use Day 84 as the first absorbed day.
- [ ] Apply compression pairs in the exact order: `95+96`, `97+98`, `91+92`.
- [ ] Never compress Day 99 or Day 100.
- [ ] Never place study work on or after `2026-08-20`.
- [ ] Show a dry-run preview before the shift is applied.
- [ ] Require explicit user confirmation before applying the shift.
- [ ] Re-map GT dates and any date-dependent views after the shift.
- [ ] Clear or reconcile backlog items that are now covered by the new mapping.
- [ ] Keep the original exam date display unchanged.
- [ ] Add tests around the buffer, compression order, and hard boundary.

## Acceptance Criteria

- [ ] The preview matches the applied result exactly.
- [ ] Hard boundaries are enforced, not only displayed.
- [ ] GT planning, schedule browsing, and backlog all stay internally consistent after a shift.
- [ ] No hidden data corruption occurs when a shift is applied more than once over time.
