# 004 Remove Duplicate Today Branding

- [ ] Task complete

## Why This Exists

The Today screen currently feels like it introduces the app twice. The shell already carries the product identity, so repeating a second `Beside You` block inside the page body reads as clutter rather than warmth.

## Spec Coverage

- PRD: Sections 5, 14
- Architecture: Sections 10, 24

## Current Gap

- Open in code. The app-shell header shows `Beside You`, and `src/app/(app)/today/page.tsx` renders `AppLogo` again in both the first-setup and standard Today states.

## Checklist

- [ ] Remove the redundant in-page branding block from the standard Today view.
- [ ] Simplify the first-setup state so it does not feel like a duplicate masthead beneath the shell header.
- [ ] Preserve access to the easter egg if removing `AppLogo` from Today would otherwise eliminate it from the main app flow.

## Acceptance Criteria

- [ ] The Today screen presents one clear product masthead, not two competing ones.
- [ ] The first-setup surface feels lighter and less repetitive.
- [ ] Easter egg availability remains intentionally placed rather than accidentally removed.

## Implementation Notes

- Main surfaces: `src/app/(app)/layout.tsx`, `src/app/(app)/today/page.tsx`, `src/components/app/logo.tsx`
- This is a layout and interaction-placement task, not a content rewrite of the login page.
