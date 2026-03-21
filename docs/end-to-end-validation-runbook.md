# End-to-End Validation Runbook

Use this document as the full manual test plan for Beside You.

Follow it in order.
Do not sign off on a build if any required acceptance criterion fails.

This runbook is designed for:
- local engineering validation
- local production-build validation
- local Supabase validation
- deployed preview/production validation

It is intentionally explicit so you can follow it without improvising.

## 1. Exit Rule

A build is ready to move forward only when all of the following are true:

- every required test case in this document passes
- `npm run verify` passes in your environment
- `npm run build:webpack` passes in your environment
- no acceptance criterion is waived without a written note
- all deployed-only checks pass again after deployment

## 2. Environment Codes

Use these codes throughout the document:

- `LD`: local dev build, `npm run dev`
- `LP`: local production build, `npm run build:webpack && npm start`
- `LS`: local app against Supabase, `BESIDE_YOU_RUNTIME=supabase`
- `DS`: deployed Supabase build, preview or production URL over HTTPS

Rules:

- Use `LD` for deep functional checks, time travel, and repeatable state setup.
- Use `LP`, `LS`, or `DS` for performance timing. Do not use `LD` timing as a sign-off metric.
- Use `DS` for final installability, service worker, real-device behavior, and production parity.

## 3. Required Test Kit

Prepare all of the following before starting:

- one phone-sized viewport at minimum `375px` width
- one tablet-sized viewport around `800 x 1280`
- one desktop browser with DevTools
- one second browser profile, second browser, or second device for sync checks
- stopwatch, screen recording, or DevTools Performance panel for timing checks
- one dedicated test account for Supabase runtime
- a clean local state or disposable Supabase state before the first full pass

Recommended device/browser targets:

- iPhone SE width check: `375px` portrait
- iPhone 12 class check: `390 x 844`
- Samsung Tab S9 class check: `800 x 1280`
- Safari on iPhone/iPad for Apple install flow
- Chromium on Android/tablet for install prompt flow

## 4. Shared Setup

For all non-shifted baseline cases, use this initial state:

- runtime: `local` for `LD` and `LP`
- Day 1 date: `2026-05-01`
- current simulated date for core day checks: `2026-05-03`
- expected current plan day at that point: `Day 3`

Local default credentials:

- email: `aspirant@beside-you.local`
- password: `beside-you-2026`

Supabase baseline:

- use one dedicated test user
- start from a known-clean state before the first `LS` pass
- if you repeat the full suite on deployed, either reset the test user state first or create a fresh disposable test user

## 5. Local Dev Helper Calls

Use these only in `LD`.
Do not use these on deployed environments.

Open the logged-in app in the browser, then use the DevTools console on the same tab.

Reset local state:

```js
await fetch("/api/dev/reset", { method: "POST" });
location.reload();
```

Set simulated time to an exact IST timestamp:

```js
await fetch("/api/dev/time-travel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ simulatedNow: "2026-05-03T06:30:00+05:30" }),
});
location.reload();
```

Advance to next-day midnight rollover:

```js
await fetch("/api/dev/midnight", { method: "POST" });
location.reload();
```

Force weekly automation against the current simulated time:

```js
await fetch("/api/dev/weekly", { method: "POST" });
location.reload();
```

## 6. Performance Measurement Rules

Use these rules for every performance-sensitive case:

1. Run performance timing in `LP`, `LS`, or `DS`, not `LD`.
2. Use a production build for local timing: `npm run build:webpack && npm start`.
3. Use a clean browser profile or Incognito for cold-load checks.
4. Clear site data before the first cold-load run of each environment.
5. Run each timing check three times.
6. Record all three numbers.
7. If one run is a clear outlier caused by your machine, rerun once. If the rerun still fails, treat it as a real fail.

Performance acceptance thresholds sourced from product requirements:

- Today view load: under `1.0s`
- Page transitions: under `300ms` on warm soft navigation
- Time to interactive: under `2.0s`
- Cross-device sync: under `3.0s`
- Form submissions: should feel immediate
- Routine interactions: no spinner-based waiting

Manual interpretation rules:

- "Today view load" means the page is materially usable:
  - day counter visible
  - quote visible
  - first schedule content visible
- "Feel immediate" means the UI responds at once to the tap:
  - checkbox fills immediately
  - traffic light changes immediately
  - form state resets or confirms immediately
- Analytics routes may defer heavy charts, but the route shell must appear immediately and remain readable while charts load.

## 7. Test Cases

### PERF-01 Today Cold Load

Runs in:
- `LP`
- `LS`
- `DS`

Setup:

- start from login or a fresh app session
- clear site data
- use a real production build
- land on `/today`

Steps:

1. Start timing on navigation or hard reload.
2. Stop timing when all of the following are visible:
   - day counter
   - date
   - quote text and author
   - first Today timeline content
3. Repeat three times.

Acceptance:

- at least two of three runs are under `1.0s`
- no run feels stalled or blank
- no full-page spinner appears
- calm placeholders are acceptable only briefly and must not block orientation

### PERF-02 Warm Route Navigation

Runs in:
- `LP`
- `LS`
- `DS`

Routes:

- `/today`
- `/backlog`
- `/mcq`
- `/mcq/analytics`
- `/gt`
- `/gt/analytics`
- `/schedule`
- `/schedule/3`
- `/weekly`
- `/settings`

Steps:

1. Start on `/today`.
2. Navigate through every route using the app UI.
3. Return to `/today`.
4. Repeat the route chain once more.

Acceptance:

- warm transitions settle in under `300ms`
- no blank white flashes
- no spinner-only route states
- analytics pages may show calm placeholder panels before charts arrive
- Today and Schedule remain immediate and orientation-first

### PERF-03 Mutation Responsiveness

Runs in:
- `LP`
- `LS`
- `DS`

Steps:

1. Toggle traffic light once.
2. Complete one block.
3. Skip one block.
4. Save one safe time edit.
5. Submit one MCQ bulk entry.

Acceptance:

- every action changes the visible UI immediately
- no tap leaves the interface appearing frozen
- no routine mutation uses a blocking spinner
- data persists after refresh

### AUTH-01 Login, Guard, Persistence, Logout

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/today` while signed out.
2. Confirm redirect to `/login`.
3. Log in.
4. Refresh the page.
5. Open a second tab.
6. Confirm the session is still valid.
7. Log out.
8. Confirm protected routes redirect back to `/login`.

Acceptance:

- signed-out access is guarded
- login succeeds with valid credentials
- session persists across refresh and new tab
- logout clears access cleanly

### TODAY-01 Header, Phase, Date, Quote, and Easter Egg

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Setup:

- clean baseline state
- Day 1 set to `2026-05-01`
- current date `2026-05-03`

Steps:

1. Open `/today`.
2. Verify the header content.
3. Double-tap the app name or logo.
4. Dismiss the easter egg.

Acceptance:

- app name, day counter, phase, and date are visible
- one calm quote line and author are visible
- the easter egg appears on double tap only
- the easter egg feels gentle and dismissible, not noisy

### TODAY-02 Timeline Order and Visual Context

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/today`.
2. Scan the timeline from top to bottom.
3. Confirm trackable blocks and non-trackable separators appear in chronological order.

Acceptance:

- all visible blocks are in correct time order
- break and meal separators stay inline inside the same main flow
- there is no detached "hidden blocks" rail

### TODAY-03 Green, Yellow, Red, and Same-Day Restore

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Start on Green.
2. Switch to Yellow.
3. Confirm visible blocks are exactly:
   - `morning_revision`
   - `block_a`
   - `block_b`
   - `mcq`
   - `night_recall`
4. Confirm hidden blocks are exactly:
   - `consolidation`
   - `pyq_image`
5. Switch to Red.
6. Confirm visible blocks are exactly:
   - `morning_revision`
   - `block_a`
   - `mcq`
7. Confirm Red copy reads exactly:
   - `A salvage day, not a zero day.`
8. Switch back to Green on the same date.

Acceptance:

- Yellow and Red reshape immediately
- hidden blocks remain inline as collapsed `Rescheduled` cards
- hidden blocks create backlog items with correct source tags
- already-completed blocks stay completed
- same-day restore returns only the blocks that should become visible again
- same-day return to Green restores the original daily quote for that date

### TODAY-04 Block Completion, Skip, and Persistence

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Complete one visible block.
2. Refresh.
3. Skip one visible study block.
4. Open `/backlog`.
5. Skip `morning_revision` in a separate clean pass.

Acceptance:

- completed block gets an immediate completed state
- completion persists after refresh
- skipped study block creates one backlog item
- skipped `morning_revision` does not enter backlog
- backlog wording remains neutral

### TODAY-05 Safe Time Edit

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Edit one visible block within safe time bounds.
2. Save.
3. Refresh.

Acceptance:

- new times persist for today only
- future days are unaffected
- no sleep-protection warning appears if the edit stays inside `06:30` to `23:00`

### TODAY-06 Overrun Decision: Keep Next Block Visible

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Setup:

- use a clean day where `block_a` and `block_b` are still pending

Steps:

1. Edit `block_a` so it ends at `12:00`.
2. Confirm the app explains that `block_b` now starts later.
3. Choose `Keep it visible`.
4. Refresh.

Acceptance:

- the overrun decision appears when `block_a` spills into `block_b`
- the next affected block remains visible
- the next affected block now shows shifted timing
- the next affected block is not pushed into backlog

### TODAY-07 Overrun Decision: Move Overflow To Backlog

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Setup:

- use a clean day where `block_a` and `block_b` are still pending

Steps:

1. Edit `block_a` so it ends at `12:00`.
2. Choose `Move overflow to backlog`.
3. Open `/backlog`.

Acceptance:

- the affected next block is moved to backlog
- the backlog item source tag is `overrun_cascade`
- the backlog item keeps its original slot metadata
- the original block progress for that affected block reads as rescheduled rather than completed

### TODAY-08 Sleep Protection

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Edit a late block so the edit would push work past `23:00`, or set a start before `06:30`.
2. Confirm the warning path appears.
3. Choose the backlog option.

Acceptance:

- the warning appears before the unsafe timing is accepted
- the copy stays supportive
- the protected block moves to backlog instead of extending study time beyond the boundary
- no unsafe final schedule is suggested

### TODAY-09 Completion Moment

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Complete every visible block for the current traffic light.
2. Observe the completion state.
3. Refresh.

Acceptance:

- a celebration quote appears as a separate completion moment
- the celebration quote is distinct from the ordinary daily or tough-day line
- the completion state persists after refresh

### REV-01 Morning Revision Queue Display

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/today` on a date where morning revision items exist.
2. Inspect the morning revision section.

Acceptance:

- each revision item has its own checkbox
- each item shows topic and revision type such as `D+1`
- equal-time guidance is visible when items exist

### REV-02 Revision Overflow Routing

Runs in:
- `LD`

Setup:

- reset state
- set Day 1 to `2026-05-01`
- set simulated time to `2026-05-11T06:30:00+05:30`

Steps:

1. Open `/today`.
2. Inspect the morning revision section.
3. Inspect any `Also review today` or overflow subsection.

Acceptance:

- morning queue caps at five items
- overflow appears separately instead of being hidden
- overflow uses night recall first, then break micro-slots

### REV-03 Late Completion Moves Revision Anchors

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Complete `block_a` or `block_b` on a later actual completion date than planned.
2. Navigate to the next revision day where its `D+1` item would appear.

Acceptance:

- future revision items move to the new actual-completion anchor
- revision dates are based on lived completion, not only the original workbook mapping

### REV-04 Retroactive Completion Reconciliation

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open a past schedule day.
2. Retroactively complete `block_a` or `block_b` with an actual completion date later than originally planned.
3. Revisit the originally planned revision date.
4. Revisit the new date implied by the retroactive completion.

Acceptance:

- the old impossible revision placement disappears
- the new revision anchor date gains the item
- any backlog item for that source block is removed if the retroactive completion covers it

### BACK-01 Backlog Queue Default View and Metadata

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Create at least three backlog items from different sources:
   - skipped
   - yellow or red day
   - overrun
2. Open `/backlog`.

Acceptance:

- default view is pending items
- each item shows original day and mapped date
- each item shows block type and topic
- each item shows queue age
- each item shows source tag
- each item shows suggestion details if available
- language stays neutral and non-punitive

### BACK-02 Suggestion Engine

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Skip one content block.
2. Inspect its suggested recovery slot.
3. Repeat with MCQ, PYQ, consolidation, and night recall when practical.

Acceptance:

- content block suggestions favor same-subject or consolidation recovery
- MCQ suggestions target the next MCQ slot
- suggestions never propose study before `06:30` or after `23:00`
- if no compatible safe slot exists, the item stays pending with a neutral explanation

### BACK-03 Manual Reschedule Into A Destination Block

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Reschedule one backlog item into a future day and slot.
2. Open the destination day on `/today` or `/schedule/[day]`.

Acceptance:

- the backlog item renders inside the destination block
- it is not shown as a detached duplicate item elsewhere
- the assigned recovery is readable and clearly attached to the destination slot

### BACK-04 Destination Completion Closes Assigned Recovery

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Use a day with one assigned recovery in a destination slot.
2. Complete the destination block.
3. Open `/backlog`.

Acceptance:

- the assigned backlog item closes automatically with the destination block
- it no longer remains pending

### BACK-05 Destination Miss Releases Assigned Recovery

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Use a day with one assigned recovery in a destination slot.
2. Skip the destination block, or let it miss through midnight in a separate run.
3. Open `/backlog`.

Acceptance:

- the assigned backlog item returns to `pending`
- it is not silently lost

### BACK-06 Queue Reordering and Bulk Actions

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Create at least three pending backlog items.
2. Move one up and one down in priority.
3. Use one bulk reschedule action.
4. Use one bulk dismiss action on a disposable data set.
5. Refresh.

Acceptance:

- manual priority changes persist
- bulk operations apply only to the intended subset
- the queue still reads neutrally after bulk actions

### SHIFT-01 Shift Offer Appears After Two Heavily Missed Days

Runs in:
- `LD`

Setup:

- reset state
- set Day 1 to `2026-05-01`
- set simulated time to `2026-06-07T08:00:00+05:30`

Steps:

1. On Day 38, skip or miss at least five visible blocks.
2. Trigger midnight to advance to Day 39.
3. On Day 39, skip or miss at least five visible blocks.
4. Trigger midnight to advance to Day 40.
5. Open `/today`.

Acceptance:

- the shift offer appears
- it is non-intrusive
- the app does not apply the shift automatically

### SHIFT-02 Shift Preview Details

Runs in:
- `LD`
- `LS`
- `DS`

Setup:

- continue from `SHIFT-01` or create an equivalent state

Steps:

1. Open shift preview.
2. Inspect anchor day, buffer use, compression plan, and hard boundary notice.

Acceptance:

- the earliest heavily missed day is used as the anchor
- Day 84 buffer is used before compression pairs
- compression order follows:
   - `95 + 96`
   - `97 + 98`
   - `91 + 92`
- Day 99 and Day 100 are not compressed
- the August 20, 2026 hard boundary is visible in the preview

### SHIFT-03 Apply Shift

Runs in:
- `LD`
- `LS`
- `DS`

Setup:

- continue from a valid shift preview

Steps:

1. Apply the previewed shift.
2. Return to `/today`.
3. Open `/schedule`.
4. Open one shifted future day and one shift-hidden day.

Acceptance:

- Today moves to the shifted anchor day rather than the old numeric day
- mapped dates update downstream from the anchor
- GT markers move with the shifted schedule
- backlog from the shifted covered span is cleared
- unresolved progress from the anchor forward is reset
- shift-hidden days remain visible for auditability and are read-only

### SHIFT-04 Hard Boundary Enforcement

Runs in:
- `LD`

Setup:

- reset state
- set Day 1 to `2026-05-15`
- create the same two heavily missed days pattern needed for a shift

Steps:

1. Open shift preview.
2. Try to apply the shift.

Acceptance:

- preview clearly indicates a hard-boundary violation
- the shift does not apply
- no study day is pushed onto or past `2026-08-20`

### SCHEDULE-01 Schedule Browser List

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/schedule`.
2. Inspect the list around Today.

Acceptance:

- all 100 days are present
- each row shows day number, mapped date, phase, primary focus, and GT indicator when relevant
- the view opens near Today by default
- statuses distinguish today, completed, missed, and upcoming

### SCHEDULE-02 Past, Future, and Shift-Hidden Day Rules

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open one past day.
2. Open one future day.
3. If a shift has been applied, open one shift-hidden day.

Acceptance:

- past days allow retroactive completion only
- past days do not expose skip, time edit, or pace controls
- future days are view-only
- shift-hidden days are view-only and explain their absorbed or merged state
- shifted days surface original planned date when relevant

### MCQ-01 Today Quick Log Entry Point

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/today`.
2. Locate the MCQ quick-log entry point.

Acceptance:

- the Today view exposes MCQ logging directly
- the entry point is easy to find on phone and tablet layouts

### MCQ-02 Bulk Entry

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/mcq`.
2. Enter date, attempted, and correct.
3. Leave wrong empty once.
4. Submit.
5. Repeat with subject and source.

Acceptance:

- wrong count auto-derives from attempted and correct when omitted
- subject choices use the canonical 19-subject list
- submit path is fast and direct
- saved data appears in analytics and weekly summaries where relevant

### MCQ-03 One-By-One Minimal Path

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open the one-by-one entry mode.
2. Keep `Add details` collapsed.
3. Submit one entry using only `MCQ ID` plus result tap.

Acceptance:

- minimal path works without expanding details
- submit is possible with only required fields
- completion is fast enough for batch logging

### MCQ-04 One-By-One Details Persistence

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Expand `Add details`.
2. Enter subject, source, and optional note fields.
3. Submit once.
4. Start a second item.

Acceptance:

- expander state stays in its last session state
- subject persists
- source persists
- other optional note-like fields clear
- canonical cause, priority, fix-code, and tag values remain constrained to the supported vocabularies

### MCQ-05 MCQ Analytics

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Log enough bulk and one-by-one MCQ data to cover multiple days and subjects.
2. Open `/mcq/analytics`.

Acceptance:

- daily trend is visible
- right vs guessed-right vs wrong breakdown is visible
- subject accuracy is visible when subject data exists
- weak subjects and cause codes are visible
- there are no targets, streaks, or gamified pressure metrics
- sparse-data empty states remain readable

### GT-01 GT Form Prefill and Context

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/gt` on a mapped GT day if possible.
2. Inspect the prefilled GT number and context text.

Acceptance:

- GT number prefills from the mapped GT plan
- workbook purpose/context text is visible
- GT day mapping follows schedule shifts when shifts exist

### GT-02 GT Entry Structure and Persistence

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Submit a GT entry with:
   - score fields
   - device
   - attempted live
   - overall feeling
   - section A-E details
   - wrapper fields
2. Save.
3. Reopen the entry if editable or inspect analytics/state results.

Acceptance:

- all five sections A-E exist
- each section supports:
   - `timeEnough`
   - `panicStarted`
   - `guessedTooMuch`
   - `timeLostOn`
- recurring topics stop at top 3
- weakest-subject chips persist
- wrapper data remains readable after save

### GT-03 GT Analytics

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Log at least two GT entries.
2. Open `/gt/analytics`.

Acceptance:

- score trend is visible
- section patterns are visible
- section time-loss patterns are visible
- GT-over-GT comparison is visible
- wrapper trend is visible
- repeated weak subjects are visible
- repeated recurring topics are visible
- empty states remain readable when data is sparse

### WEEK-01 Manual Weekly Summary

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/weekly`.
2. Generate a summary during the current week before Sunday end-of-day.
3. Open the generated weekly detail page.

Acceptance:

- manual generation succeeds at any time
- the summary covers only the current week through the current IST date
- it does not count future days or future logs
- the detail page is readable and complete

### WEEK-02 Weekly Summary Detail Contents

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open a generated weekly detail page.
2. Inspect every section.

Acceptance:

- schedule adherence counts and rate are visible
- traffic-light counts are visible
- morning revision counts and rate are visible
- revision overflow, catch-up, and restudy pressure are visible
- overrun count and labels are visible
- MCQ totals, accuracy, trend, wrong subjects, and cause codes are visible
- latest GT in the week is visible with score and AIR or percentile text
- backlog snapshot, schedule health, and subjects studied are visible

### WEEK-03 Sunday 23:30 Automation

Runs in:
- `LD`
- `LS`
- `DS`

Local setup:

- in `LD`, use exact IST time travel

Steps:

1. In `LD`, set simulated time to just before Sunday `23:30` IST and confirm no summary is auto-generated yet.
2. Advance to Sunday `23:30` IST and trigger weekly automation if needed.
3. In `LS` or `DS`, call the weekly cron route with the proper secret.
4. Repeat the same call once more.

Acceptance:

- automation starts only at or after Sunday `23:30` IST
- the correct week is summarized
- rerunning the same eligible week updates or no-ops cleanly instead of creating duplicates

### SETTINGS-01 Settings Content and Theme

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/settings`.
2. Inspect the settings sections.
3. Toggle theme.
4. Refresh.

Acceptance:

- Day 1 picker exists
- fixed exam date is visible as `2026-08-30`
- theme toggle exists and persists on refresh
- JSON export exists
- app version exists
- the schedule workbook link exists
- runtime label is visible

### SETTINGS-02 Export Uses Active Runtime State

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Make a few visible state changes:
   - complete one block
   - create one backlog item
   - set theme
2. Export JSON.
3. Inspect the downloaded JSON.

Acceptance:

- export downloads successfully
- export contains current user settings and state
- export reflects the active runtime store, not stale mock data

### PWA-01 Install Guidance Card

Runs in:
- `LP`
- `LS`
- `DS`

Steps:

1. Open `/settings`.
2. Inspect the install guidance card on:
   - Apple mobile Safari
   - Chromium Android or tablet
   - desktop Chromium without install prompt already accepted

Acceptance:

- installed standalone mode is acknowledged correctly
- Chromium prompt-capable environments surface an install action
- iPhone and iPad guidance references Share -> Add to Home Screen
- fallback menu-install guidance remains sensible on non-prompt browsers

### PWA-02 Real Installability

Runs in:
- `DS`

Steps:

1. Open the deployed app in Safari on iPhone or iPad.
2. Install through Add to Home Screen.
3. Open the installed app in standalone mode.
4. Open the deployed app in Chromium on Android or tablet.
5. Install through the prompt or browser menu.
6. Open the installed app in standalone mode.

Acceptance:

- install succeeds on both target platform families
- standalone mode launches without browser chrome
- icons appear production-ready
- orientation and status-bar theme color are appropriate

### PWA-03 Offline Fallback

Runs in:
- `LP`
- `DS`

Steps:

1. Load the app while online.
2. Turn off network.
3. Attempt a fresh navigation to another route.
4. Return online.
5. Reload.

Acceptance:

- offline navigation falls back to a quiet static page
- the offline page does not present stale mutable study state as editable truth
- reconnect is calm and recoverable
- writable state is trusted again only after reconnect and refresh

### LOAD-01 Loading, Empty, and Not-Found States

Runs in:
- `LD`
- `LP`
- `LS`
- `DS`

Steps:

1. Visit analytics pages with very little or no data.
2. Visit backlog with zero pending items.
3. Visit weekly with zero summaries.
4. Open an unknown route such as `/does-not-exist`.

Acceptance:

- loading states use calm placeholder panels instead of spinners
- empty states remain readable and neutral
- unknown routes provide a useful path back to Today or Schedule

### SYNC-01 Two-Session Realtime Sync

Runs in:
- `LS`
- `DS`

Steps:

1. Open the same account in two sessions.
2. In session A, change traffic light.
3. In session A, complete one block.
4. In session A, skip one block.
5. In session A, add one MCQ log.
6. In session A, add one GT log.
7. In session A, change theme in Settings.

Acceptance:

- session B reflects each change within `3.0s`
- there is no manual reload required for ordinary sync
- conflict behavior is stable and last-write-wins

### SYNC-02 Connectivity Badge

Runs in:
- `LS`
- `DS`

Steps:

1. Open a signed-in Supabase session.
2. Disconnect the network.
3. Observe the badge state.
4. Reconnect the network.
5. Observe recovery.

Acceptance:

- the only degraded states shown are:
   - `No connection`
   - `Sync reconnecting`
- the copy stays quiet and neutral
- reconnect recovers without forced logout

### SYNC-03 Cross-Device Quote Stability

Runs in:
- `LS`
- `DS`

Steps:

1. Open the same date in two sessions.
2. Confirm the quote matches in both sessions for Green.
3. Change to Yellow or Red in session A.
4. Confirm the tough-day quote matches in session B.
5. Return to Green on the same date.

Acceptance:

- both sessions show the same date/category quote
- same-day return to Green restores the original daily quote in both sessions
- celebration quote remains separate from the daily or tough-day line

### CRON-01 Midnight Automation and Idempotence

Runs in:
- `LS`
- `DS`

Steps:

1. Prepare a day with unfinished visible work.
2. Call `POST /api/cron/midnight` with `Authorization: Bearer <CRON_SECRET>`.
3. Inspect the resulting state.
4. Call the same endpoint again for the same eligible date.
5. Inspect the resulting state again.

Acceptance:

- unfinished visible blocks become missed
- visible study blocks enter backlog as expected
- `morning_revision` does not enter backlog
- the second call does not duplicate the same rollover work
- `automation_job_runs` shows a sane run record without duplicate effective work for the same eligible date

### CRON-02 Weekly Automation and Idempotence

Runs in:
- `LS`
- `DS`

Steps:

1. Ensure the app is at an eligible Sunday `23:30` IST weekly boundary or equivalent prepared state.
2. Call `POST /api/cron/weekly` with `Authorization: Bearer <CRON_SECRET>`.
3. Inspect weekly summaries.
4. Call the endpoint again.

Acceptance:

- one summary is produced for the correct week
- the second invocation does not create a duplicate week card
- the stored week is refreshed safely when regeneration is expected
- `automation_job_runs` shows a sane weekly run record

### CRON-03 Keep-Alive Route

Runs in:
- `LS`
- `DS`

Steps:

1. Call `GET /api/keep-alive` with `Authorization: Bearer <CRON_SECRET>`.

Acceptance:

- the route returns a clean lightweight success payload
- it does not modify user study state

### GUARD-01 Product Boundary Guard

Runs in:
- `LP`
- `LS`
- `DS`

Steps:

1. Use the app normally across Today, Backlog, MCQ, GT, Weekly, and Settings.
2. Watch for permission prompts, reminder surfaces, badge counts, or streak-like language.

Acceptance:

- no notification permission prompt appears
- no push or reminder surface appears
- no streaks, points, or gamified pressure appear
- no social or sharing workflow appears
- the app continues to behave like a quiet companion

## 8. Device Layout Pass

Run this after the core functional pass and again after deployment.

Routes to inspect:

- `/today`
- `/backlog`
- `/mcq`
- `/mcq/analytics`
- `/gt`
- `/gt/analytics`
- `/schedule`
- `/schedule/3`
- `/weekly`
- `/settings`

Phone acceptance:

- no clipped content at `375px` width
- no overlapping text
- no horizontal scroll
- primary actions remain thumb-reachable
- no unusably dense cards

Tablet acceptance:

- no awkward giant empty gutters
- content remains visually balanced
- actions still feel intentional rather than stretched

## 9. Recommended Execution Order

Run the suite in this order:

1. `PERF-01` through `PERF-03`
2. `AUTH-01`
3. `TODAY-01` through `TODAY-09`
4. `REV-01` through `REV-04`
5. `BACK-01` through `BACK-06`
6. `SHIFT-01` through `SHIFT-04`
7. `SCHEDULE-01` and `SCHEDULE-02`
8. `MCQ-01` through `MCQ-05`
9. `GT-01` through `GT-03`
10. `WEEK-01` through `WEEK-03`
11. `SETTINGS-01` and `SETTINGS-02`
12. `PWA-01` through `PWA-03`
13. `LOAD-01`
14. `SYNC-01` through `SYNC-03`
15. `CRON-01` through `CRON-03`
16. `GUARD-01`
17. Device layout pass

## 10. Failure Logging Template

For every failure, record:

- test case ID
- environment code
- browser and device
- exact URL
- exact date and time
- simulated time if used
- expected result
- actual result
- whether the failure reproduced on refresh
- screenshot or screen recording link
- console errors, network errors, and server logs if present

## 11. Sign-Off Template

Record sign-off only after the full suite completes:

- build identifier:
- environment:
- tester:
- date:
- verify/build status:
- failed cases:
- waived cases:
- notes:
- release decision:
