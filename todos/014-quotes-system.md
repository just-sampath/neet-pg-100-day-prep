# 014 Quotes System

- [ ] Task complete

## Why This Exists

Quotes are part of the product's emotional tone. The system needs to respect traffic-light context while avoiding repetitive or random-feeling repetition.

## Spec Coverage

- PRD: Sections 5.2, 5.3, 5.9, 12
- Architecture: Section 18

## Current Gap

- Quotes are selected deterministically by index rather than by non-repeating history.
- Traffic-light mood mapping exists, but history and depletion behavior are not complete.

## Checklist

- [ ] Load quotes from the repo CSV at build time.
- [ ] Keep quote categories mapped to green, yellow, red, and celebration contexts.
- [ ] Prevent repeats until the relevant category cycle is exhausted.
- [ ] Persist quote history in the correct runtime store.
- [ ] Handle category switching without awkward repeated quotes.
- [ ] Ensure the fallback logic is deterministic and safe if a category pool is small.
- [ ] Keep quote rendering quiet and non-intrusive.

## Acceptance Criteria

- [ ] Traffic-light changes result in an appropriate quote tone.
- [ ] Repeats do not occur prematurely.
- [ ] Celebration moments can use a distinct quote path without breaking the normal cycle.
- [ ] Quote state is consistent across refreshes and devices.
