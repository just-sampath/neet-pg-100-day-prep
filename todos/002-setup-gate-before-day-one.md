# 002 Setup Gate Before Day 1

- [x] Task complete

## Why This Exists

Before Day 1 is anchored, the rest of the app has no meaningful schedule context. The product decision is now to keep the user in setup instead of letting them browse half-initialized sections.

## Spec Coverage

- PRD: Sections 3, 4.4, 13
- Architecture: Sections 7, 10, 25

## Current Gap

- Open in code. The app shell always renders the full navigation, and app pages remain reachable even when `dayOneDate` is still null.

## Checklist

- [x] Add a shared guard for app routes that redirects back to `/today` when Day 1 is unset.
- [x] Keep `/today` reachable so it can act as the setup surface.
- [x] Hide or disable the primary navigation until setup is complete.
- [x] Preserve logout access even while setup gating is active.

## Acceptance Criteria

- [x] Before Day 1 is set, `/backlog`, `/mcq`, `/gt`, `/schedule`, `/weekly`, and `/settings` redirect back to `/today`.
- [x] Before Day 1 is set, the app does not expose normal in-app navigation.
- [x] After Day 1 is set, the full app becomes reachable again with no extra unlock step.

## Implementation Notes

- Main surfaces: `src/app/(app)/layout.tsx`, `src/components/app/nav-bar.tsx`, route/page guards under `src/app/(app)/*`
- Keep the behavior server-driven rather than relying only on client-side link hiding.
