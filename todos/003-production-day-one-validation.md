# 003 Production Day 1 Validation

- [ ] Task complete

## Why This Exists

The product decision is to keep Day 1 selection realistic in production while still preserving full flexibility for local testing and developer workflows.

## Spec Coverage

- PRD: Sections 4.4, 13, 16
- Architecture: Sections 10, 25

## Current Gap

- Open in code. `setDayOneDateAction()` currently accepts any submitted date in every environment, including past dates and same-day-after-noon values.

## Checklist

- [ ] Add server-side production-only validation for past Day 1 values.
- [ ] Add server-side production-only validation for choosing the current IST date after 12:00 PM IST.
- [ ] Keep non-production behavior permissive for local testing.
- [ ] Mirror the rules in the UI where possible without relying on the client as the source of truth.

## Acceptance Criteria

- [ ] In production, a user cannot save a Day 1 date earlier than the current effective IST date.
- [ ] In production, a user cannot save the current effective IST date once the effective IST time is after 12:00 PM.
- [ ] In non-production, time-travel and arbitrary test setups still work.

## Implementation Notes

- Main surfaces: `src/lib/server/actions.ts`, `src/app/(app)/today/page.tsx`, `src/app/(app)/settings/page.tsx`
- Use `getEffectiveNow()`, `toDateOnlyInTimeZone()`, and `getMinutesInTimeZone()` from the existing date/runtime layer.
