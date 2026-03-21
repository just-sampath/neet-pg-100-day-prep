# 015 Settings, PWA, And Installability

- [x] Task complete

## Why This Exists

The app is meant to behave like a reliable installed companion, not only a browser tab. Settings and installability are therefore product features, not polish-only extras.

## Spec Coverage

- PRD: Sections 13, 14.4, 15, 16
- Architecture: Sections 22, 23, 25

## Current Gap

- The settings surface now exposes Day 1, theme, fixed exam date, version, runtime label, full export, and direct study-document links.
- Installability now uses a real manifest, generated icons, Apple icon metadata, standalone guidance, and an online-first fallback page instead of a bare placeholder PWA shell.

## Checklist

- [x] Keep Day 1 setup and editing reliable and easy to discover.
- [x] Keep theme toggle working across sessions and devices.
- [x] Show the fixed exam date clearly.
- [x] Export all user data as JSON from the real runtime store.
- [x] Add app version and key links to the settings/about area.
- [x] Complete the manifest with production-ready icons and metadata.
- [x] Add the required installability assets for iPhone and Android.
- [x] Ensure the standalone installed experience looks intentional.
- [x] Define and implement safe offline caching behavior.
- [x] Show quiet connectivity or degraded-state messaging when needed.

## Acceptance Criteria

- [x] The app can be installed cleanly on supported mobile devices.
- [x] Settings changes persist correctly.
- [x] Exported data is complete and portable.
- [x] Offline and reconnect behavior is understandable and safe.
