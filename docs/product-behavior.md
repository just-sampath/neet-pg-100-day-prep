# Product Behavior

## Traffic Light

- Green: full schedule
- Yellow: reduced day, hidden blocks moved to backlog as `yellow_day`
- Red: salvage day, only the minimum visible blocks stay, and hidden blocks move to backlog as `red_day`
- The Today timeline keeps all study blocks in chronological order even on Yellow/Red days; hidden blocks collapse in-place as neutral `Rescheduled` cards.
- Same-day upgrades restore only the blocks that become visible again.

## Backlog

- Neutral wording only
- Manual skip, midnight miss, wind-down moves, and overrun cascade create backlog items
- `morning_revision` stays out of the backlog queue and returns to the revision system instead
- Each backlog item preserves its original slot timing so the queue can show where it came from
- The queue defaults to pending items and shows original mapped date plus days in backlog
- Backlog suggestions depend on block type:
  - content blocks: same-subject consolidation, then next-day consolidation, then next same-subject focus block
  - MCQ blocks: next open MCQ block with merge guidance
  - PYQ/Image blocks: next-day PYQ slot, then next weekend PYQ slot
  - Consolidation blocks: next-day consolidation, then next same-subject afternoon consolidation
  - Night recall: next open night recall slot
- Accepted or manually rescheduled backlog items render inside the destination block on Today and Schedule Day views
- If that destination block is completed, the assigned backlog item completes with it
- If that destination block is skipped or missed, the assigned backlog item returns to `pending`

## Schedule Shift

- Shift suggestion appears only when 2 or more of the last 7 visible study days have at least 5 blocks marked `missed` or `skipped`
- The earliest such day becomes the shift anchor
- The preview is always shown before apply
- Day 84 is consumed first when available
- Further recovery uses fixed compression pairs in this order: `95+96`, `97+98`, `91+92`
- Days 99 and 100 are never compressed
- The hard stop is August 20, 2026; if the shifted plan would place the final visible study day on or after that date, apply is blocked
- Applying a shift clears active backlog from the shifted span and resets unresolved progress from the anchor forward
- GT markers and all mapped-date schedule views move through the same shift mapping, so the preview and applied calendar stay aligned

## Schedule Browser

- The browser lists all 100 days.
- Each row shows day number, mapped date, phase, primary focus, and GT indicator when relevant.
- Today is auto-focused when opening the browser.
- Past visible days can be corrected retroactively.
- Future days are view-only.
- Shift-hidden days remain visible for auditability but are read-only.
- When a shift changed the live mapping, the browser and day detail surface both the current mapped date and the original planned date.
- Day detail also explains absorbed buffer days and merged compression days so schedule changes stay legible.

## Revision Queue

- Built from `block_a` and `block_b` anchors plus actual completion shifts
- Actual completion date in IST wins; mapped planned date is fallback only
- Max 5 morning items
- Overflow goes to night recall then break micro-slots
- 3+ consecutive overflow days surface the supportive overflow warning
- `1-2` days missed stay in the morning queue
- `3-6` days missed become catch-up items
- `7+` days missed become restudy flags
- Retroactive source completion moves future revision anchors and can invalidate earlier impossible revision checkoffs

## Wind-Down

- `22:30`: offer wrap-up
- `22:45`: if the `22:30` prompt was dismissed once, show one more wrap-up prompt
- `23:00`: handle night recall explicitly
- `23:15`: sweep remaining visible work to backlog
- `23:15` and manual wrap-up exclude `morning_revision` from the backlog queue
- midnight: mark pending blocks as missed

## Overrun Handling

- Editing a block later can preview the next affected visible block.
- If the spill is still sleep-safe, the user can keep the next block visible or move that overflow to backlog.
- If the spill would push the day past `23:00`, the remaining affected tail is forced into backlog to protect sleep.

## Today View

- Morning revision shows individual rows with equal time-per-item display.
- Break and meal slots stay visible as thin separators between study blocks.
- The Today screen includes a direct MCQ quick-log entry point.
- Completion uses a quiet celebration treatment rather than a loud success screen.

## MCQ Tracker

- Bulk entry keeps the high-speed path minimal: date, attempted, correct, derived wrong, with optional subject and source context.
- Bulk subject values are restricted to the canonical schedule subject list.
- One-by-one entry keeps the required path to `MCQ ID + result tap`.
- `Add details` is collapsed by default and remembers its last open/closed state within the current session.
- After a one-by-one submit, subject, source, and expander state persist; the rest of the optional fields clear.
- Cause codes, priority codes, fix codes, and tags are enforced to the canonical PRD vocabularies.
- Topic and source suggestions come from prior entries, not hard-coded lists.

## MCQ Analytics

- Trend uses daily solved volume with an accuracy line and no target or streak framing.
- Breakdown keeps `Right`, `Guessed Right`, and `Wrong` separate so weak confidence is still visible.
- Subject accuracy only uses entries that were tagged with a subject.
- Weekly summaries pull top wrong subjects and top cause codes from the same MCQ analytics source.
