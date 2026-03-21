# 001 Day 1 Defaults To Tomorrow

- [ ] Task complete

## Why This Exists

The first setup state should feel ready to use immediately. Leaving Day 1 blank adds friction to the very first interaction even though the product decision is now to default the mapping anchor to tomorrow.

## Spec Coverage

- PRD: Sections 4.4, 13
- Architecture: Sections 10, 25

## Current Gap

- Open in code. The first setup input on Today starts blank, Settings falls back to an empty value, and the server action does not apply a default when Day 1 is still unset.

## Checklist

- [ ] Prefill tomorrow on the first setup form in `src/app/(app)/today/page.tsx` when `dayOneDate` is absent.
- [ ] Prefill tomorrow in `src/app/(app)/settings/page.tsx` only when `settings.dayOneDate` is still unset.
- [ ] Keep an explicit stored Day 1 date authoritative once it exists.
- [ ] Ensure `setDayOneDateAction()` does not depend on an empty client field to determine the intended fallback.

## Acceptance Criteria

- [ ] A fresh account opens the first setup state with tomorrow already selected.
- [ ] Settings shows the saved Day 1 when present and tomorrow only as the fallback when unset.
- [ ] The first-run setup requires less manual input without changing the mapped-schedule rules.

## Implementation Notes

- Main surfaces: `src/app/(app)/today/page.tsx`, `src/app/(app)/settings/page.tsx`, `src/lib/server/actions.ts`
- Use the existing timezone/date helpers in `src/lib/utils/date.ts` for consistent tomorrow calculation.
