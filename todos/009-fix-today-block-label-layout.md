# 009 Fix Today Block Label Layout

- [x] Task complete

## Why This Exists

Longer block labels such as `Consolidation` should read cleanly on the actual target devices. If labels wrap badly or crowd nearby text, the timeline loses trust and legibility.

## Spec Coverage

- PRD: Sections 5, 14, 16
- Architecture: Sections 3, 10, 26

## Current Gap

- Open in code. The current Today timeline uses a narrow metadata column that is vulnerable to awkward wrapping and text pressure for longer labels.

## Checklist

- [x] Rework the block-card layout so long labels fit cleanly.
- [x] Verify the fix on both phone-sized and tablet-sized layouts.
- [x] Ensure the label, time slot, and status badge still scan as one coherent header.

## Acceptance Criteria

- [x] Long block labels do not clip, overlap, or feel cramped.
- [x] The Today timeline remains readable on both compact and wide viewports.
- [x] The layout fix does not make short labels look oddly spaced or oversized.

## Implementation Notes

- Main surfaces: `src/app/(app)/today/page.tsx`, `src/app/globals.css`
- This is a real layout task; verify it in the full timeline, not only as an isolated component tweak.
