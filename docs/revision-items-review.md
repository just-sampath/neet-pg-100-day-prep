# Revision Items Review

## What it is

Revision items are the app's spaced-repetition retrieval tasks.

In the current system:

- a revision item is created only from a schedule item where `revisionEligible === true`
- in the current generated schedule data, revision-eligible items are the core-study topic items from the First Pass portion of the plan; static morning reference items and later revision-phase reference blocks do not generate new revision entries
- each completed eligible topic creates 5 future revision items:
  - `D+1`
  - `D+3`
  - `D+7`
  - `D+14`
  - `D+28`
- each revision item is tied to:
  - `sourceItemId`
  - `sourceDay`
  - `sourceBlockKey`
  - `revisionType`
  - `scheduledDate`

The live revision engine is built in `src/lib/domain/schedule.ts`.

## Why is it needed

The workbook is a fixed 100-day plan, but real study is not fixed. Revision items exist so the app can:

- derive revision from what was actually completed, not only what was planned
- keep recall tied to the user's real completion date
- avoid creating spaced repetition from non-study work such as:
  - Day 1 setup
  - diagnostic tests
  - GT attempt/analysis
  - logistics/calm-day blocks
- surface retrieval pressure in a structured way instead of making the user remember everything manually

This is the right idea for a NEET PG companion. The problem is not that revision exists. The problem is how it is currently surfaced and routed.

## How do we currently handle it?

### Revision source creation

Current logic:

- `buildRevisionInventory()` scans all schedule items
- only items with `revisionEligible === true` are considered
- only completed items create revision inventory entries
- each completed eligible topic creates `D+1`, `D+3`, `D+7`, `D+14`, and `D+28`
- anchor date is always the actual topic completion date

This means the app is already correctly avoiding spaced repetition for:

- Day 1 setup and diagnostic
- GT days
- Revision 1 / Revision 2 study blocks
- Final Assault blocks
- Pre-exam blocks

### Today-page routing

Current routing:

- unresolved revision items due on or before today are loaded
- `0-2` days overdue:
  - stay in the main revision lane
  - first 5 go to `Morning Revision`
  - extras go to `Also Review Today`
- `3-6` days overdue:
  - go to `Catch-Up Revision`
  - assigned conceptually to `consolidation` / `pyq_image`
- `7+` days overdue:
  - go to `Re-Study Flags`
  - assigned conceptually to `next revision phase`

This is implemented in `src/lib/domain/schedule.ts` and shown on Today in `src/app/(app)/today/page.tsx`.

### Time budgeting

Current rule:

- the system treats the `06:30-08:00` block as 90 minutes
- it divides that time equally across up to 5 queued revision items
- formula:
  - `floor(90 / min(itemCount, 5))`

So the current labels become:

- `1 item` -> `~90 min each`
- `3 items` -> `~30 min each`
- `4 items` -> `~22 min each`
- `5 items` -> `~18 min each`

### Completion behavior

There are currently 2 separate systems:

1. The left revision panel
- this is the real live revision queue
- checking these items uses `completeRevisionAction()`
- this writes to `revisionCompletions`

2. The right `06:30-08:00` timeline block
- this is still the static workbook block for that day
- completing items here uses `updateTopicAction()` / `updateBlockAction()`
- this changes block/topic progress, not the live revision queue itself

This is the most important current inconsistency.

## Drawbacks of current implementation

### 1. Two Morning Revision systems exist at once

This is the biggest confirmed UX inconsistency.

- the left panel is live-derived revision state
- the right timeline block is still rendered from the mapped schedule block for that day
- they are not the same thing
- checking off the left queue does not truly complete the right Morning Revision block
- completing the right Morning Revision block does not truly complete the left revision queue

This creates avoidable user confusion and split completion semantics.

### 2. Phase transitions in the workbook are not reflected correctly in the live revision UX

The JSON data correctly reflects that the morning block changes by phase:

- Day 1: `Setup Block`
- First Pass: `Morning Revision`
- GT days: `Warm-Up`
- Revision 1 / Revision 2: phase-specific mixed morning revision lists
- Final Assault: sweeps / compression / wrong-notebook / calm recall
- Pre-exam day: light recall / logistics / calm

But the live revision panel on Today is still driven by the same derived spaced-revision plan every day, regardless of phase.

That means:

- GT days still show generic Morning Revision pressure on the left
- Revision 1 / Revision 2 still show the generic spaced-revision panel on the left
- Final Assault / Pre-exam still show `Catch-Up Revision` and `Re-Study Flags` under the Morning Revision section

So the data is phase-aware, but the current live revision experience is only partially phase-aware.

### 3. Topic-level generation can still create too much morning fragmentation

The shift from block-level to topic-level tracking is correct, but the underlying revision inventory is still very fine-grained.

Example:

- Day 2 First Pass creates:
  - 2 revision-eligible topics in `Study Block 1`
  - 3 revision-eligible topics in `Study Block 2`
- if all 5 topics are completed, the next day can already have 5 `D+1` revision items

The UI already groups multiple due intervals for the same source topic into one card, but the system still schedules and completes each interval separately. That is why the app can still end up showing `~18 min each` or `~22 min each`.

This is technically consistent with the current rules, but it is probably not the right NEET-PG retrieval shape.

### 4. Catch-Up Revision and Re-Study Flags are reclassification buckets, not real reschedules

Current behavior:

- `Catch-Up Revision` means a revision item is `3-6` days overdue
- `Re-Study Flags` means a revision item is `7+` days overdue

But these are mostly derived placement buckets:

- they are not persisted future tasks in the same way backlog items are
- they are not cleanly placed into a concrete later-day plan
- they read like tasks, but behave more like warning categories

So the user sees pressure, but not a fully closed-loop plan.

### 5. The section hierarchy on Today is easy to misread

Today currently shows:

- `Morning Revision`
- `Also Review Today`
- `Catch-Up Revision`
- `Re-Study Flags`

all under the same left-side revision area.

This implies they are one morning-work surface, but they are not:

- `Morning Revision` is current due work
- `Also Review Today` is overflow
- `Catch-Up Revision` is overdue spill
- `Re-Study Flags` is stale spill for later phase recovery

The UI grouping is therefore misleading even where the underlying logic is intentional.

### 6. The current system is not NEET-PG-specific enough once items become overdue

The current prioritization is mostly:

- sort by scheduled date
- then revision priority
- then bucket by overdue age

It does not reprioritize by:

- subject strategy
- weakest subject pressure
- GT-derived weakness
- phase boundary
- compression-phase rules
- Final Assault calm-down constraints

So it is age-bucketed, not intelligently reprioritized for the actual plan.

## Improvements Scope

### Feature

#### 1. Single source of truth for Morning Revision

- the `06:30-08:00` block on the right should render the same live revision queue used on the left
- or the left panel should become the only Morning Revision surface
- there should not be a static morning block and a separate live morning queue at the same time

#### 2. Phase-aware revision display

- First Pass can show the live spaced-revision queue prominently
- GT days should show GT warm-up / GT-specific morning behavior, not generic revision pressure
- Revision 1 / Revision 2 should reflect the workbook's phase-specific morning revision block
- Final Assault and Pre-exam should not present generic `Catch-Up Revision` / `Re-Study Flags` under Morning Revision

#### 3. Deeper grouping than the current per-interval completion model

- keep one source topic as the visible card
- represent multiple pending intervals for that topic more compactly, for example as chips or a grouped checklist
- allow one revision session to clear the intervals that were actually covered, instead of forcing one submission per interval

This would reduce the number of tiny queue rows without losing revision fidelity.

#### 4. Better time budgeting for morning revision

- replace the current `up to 5 items` split with a time-first rule
- use a more realistic minimum time per topic group
- likely `25-30 min` per topic group instead of allowing `18 min` steady-state loads

#### 5. Convert overdue buckets into actual planned behavior

- `Catch-Up Revision` should become a real later-today or same-phase recovery plan
- `Re-Study Flags` should become a true next-compatible-phase recovery queue
- they should not remain half-task, half-warning buckets

#### 6. Stronger NEET-PG-specific reprioritization

- use `Subject_Strategy` to influence revision recovery priority
- use GT outputs to bring weak-domain repair into the recovery logic
- protect Final Assault and Pre-exam calm-down behavior from generic overdue spill

#### 7. Clearer terminology on Today

- separate:
  - `Due This Morning`
  - `Revision Overflow Today`
  - `Revision Recovery`
  - `Needs Re-Study`
- stop presenting all of them as one Morning Revision surface

#### 8. Completion semantics must be unified

- checking off revision on Today must update the real revision queue
- block completion for the morning slot must respect the same revision truth
- no action should silently update only one of the two systems

## Current Verdict

The current implementation is only partially correct.

What is already good:

- revision generation is correctly restricted to completed eligible source topics from the generated schedule
- non-study blocks are not blindly generating spaced repetition
- actual completion anchors are respected

What is not good enough:

- Today has two competing Morning Revision surfaces
- phase changes in the workbook are not properly reflected in the live revision experience
- overdue routing is more of a warning taxonomy than a true recovery plan
- topic-level generation is creating too much micro-fragmentation in the morning queue

This area needs redesign before the backlog/recovery system can feel coherent end-to-end.
