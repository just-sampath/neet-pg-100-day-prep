# 015 Settings, PWA, And Installability

- [ ] Task complete

## Why This Exists

The app is meant to behave like a reliable installed companion, not only a browser tab. Settings and installability are therefore product features, not polish-only extras.

## Spec Coverage

- PRD: Sections 13, 14.4, 15, 16
- Architecture: Sections 22, 23, 25

## Current Gap

- Basic settings exist, but some metadata and installability details are still minimal.
- PWA assets and offline-state behavior are not fully production-grade.

## Checklist

- [ ] Keep Day 1 setup and editing reliable and easy to discover.
- [ ] Keep theme toggle working across sessions and devices.
- [ ] Show the fixed exam date clearly.
- [ ] Export all user data as JSON from the real runtime store.
- [ ] Add app version and key links to the settings/about area.
- [ ] Complete the manifest with production-ready icons and metadata.
- [ ] Add the required installability assets for iPhone and Android.
- [ ] Ensure the standalone installed experience looks intentional.
- [ ] Define and implement safe offline caching behavior.
- [ ] Show quiet connectivity or degraded-state messaging when needed.

## Acceptance Criteria

- [ ] The app can be installed cleanly on supported mobile devices.
- [ ] Settings changes persist correctly.
- [ ] Exported data is complete and portable.
- [ ] Offline and reconnect behavior is understandable and safe.
