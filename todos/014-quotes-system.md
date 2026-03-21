# 014 Quotes System

- [x] Task complete

## Why This Exists

Quotes are part of the product's emotional tone. The system needs to respect traffic-light context while avoiding repetitive or random-feeling repetition.

## Spec Coverage

- PRD: Sections 5.2, 5.3, 5.9, 12
- Architecture: Section 18

## Current Gap

- Quotes now use persisted per-category non-repeating cycles with per-day selections.
- Traffic-light switching restores the same daily quote for the date, while celebration uses its own separate cycle.

## Checklist

- [x] Load quotes from the repo CSV at build time.
- [x] Keep quote categories mapped to green, yellow, red, and celebration contexts.
- [x] Prevent repeats until the relevant category cycle is exhausted.
- [x] Persist quote history in the correct runtime store.
- [x] Handle category switching without awkward repeated quotes.
- [x] Ensure the fallback logic is deterministic and safe if a category pool is small.
- [x] Keep quote rendering quiet and non-intrusive.

## Acceptance Criteria

- [x] Traffic-light changes result in an appropriate quote tone.
- [x] Repeats do not occur prematurely.
- [x] Celebration moments can use a distinct quote path without breaking the normal cycle.
- [x] Quote state is consistent across refreshes and devices.
