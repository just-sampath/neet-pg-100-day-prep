# Beside You - Product Requirements Document

## NEET PG 2026 Study Companion App

**Version:** 1.0
**Last Updated:** March 20, 2026
**Author:** Sampath
**Target Launch:** Before user's Day 1 (within 1-2 weeks)

---

## 1. Product Summary

**Beside You** is a mobile-first Progressive Web App that helps a NEET PG 2026 aspirant follow a pre-built 100-day study schedule, track daily progress block-by-block, handle backlogs intelligently, log MCQ performance, and analyze GT (Grand Test) results. The schedule (imported from a pre-built Excel file) is the single source of truth. The user maintains error logs and revision notes manually in physical notebooks; the app handles scheduling, tracking, backlog management, analytics, and motivation. The app is intentionally quiet: it sends no push notifications, no reminders, and no alerts about pending work, because the user has explicitly stated that proactive notifications about syllabus and schedule create anxiety rather than help.

**Primary User:** A single NEET PG aspirant who just completed internship, starting from near-zero recall, using Marrow as her sole preparation platform.

**Devices:** iPhone (phone) + Samsung Galaxy Tab S9 11-inch (tablet). Both must stay in sync.

**Duration of use:** ~100 days (prep window) + the days leading up to the exam on August 30, 2026.

**Easter Egg:** When the app name/logo on the home screen is tapped twice, a romantic message appears: something along the lines of "Even when I can't be beside you, I'll always support you like this." This should feel personal, warm, and subtle. Not a popup, more like a gentle reveal animation.

---

## 2. User Personas and Context

### The User (Aspirant)

- Post-intern MBBS graduate, baseline recall near zero
- Will study 10-14 hours/day for 100 days
- Home environment is stressful (family situations arise)
- Uses Marrow for all GTs, QBank, notes, and videos
- Maintains 3 physical notebooks: Master Error Log, Red Flag Rapid Revision Book, GT Review + Weekly Report Book
- Primary phone: iPhone
- Primary tablet: Samsung Galaxy Tab S9 (11-inch)
- Needs the app to be dead simple, zero learning curve, fast

### The Builder (Sampath)

- Sets up the app, hardcodes the schedule, provides the login credentials (email + password)
- Handles redeployment if schedule needs updating
- Available for bug fixes during the 100-day window

---

## 3. Authentication

### Requirements

- AUTH-1: Login uses email + secret phrase (password). No signup flow. Sampath creates the credentials and provides them to the user.
- AUTH-2: After first successful login on a device, the session persists permanently on that device. She should never be asked to log in again on that device unless she explicitly logs out.
- AUTH-3: The same credentials work on both iPhone and Tab simultaneously. Both devices see the same data in real-time.
- AUTH-4: All data is linked to the authenticated user (even though there's currently only one user). This is for future extensibility.

---

## 4. Schedule Engine

### 4.1 Data Source

- SCHED-1: The 100-day study schedule is hardcoded into the app at build time, parsed from the provided Excel file (`NEET_PG_FINAL_SCHEDULE.xlsx`). There is no upload/import flow in the UI.
- SCHED-2: The workbook contains 4 sheets: `Daywise_Plan`, `WOR_Topic_Map`, `Subject_Tiering`, `Revision_Map`. `Daywise_Plan` is the primary schedule source; `WOR_Topic_Map` is the authoritative source for Phase 1 topic timings.
- SCHED-3: If the schedule ever needs updating, Sampath updates the source data and redeploys the app.

### 4.2 Schedule Structure Per Day

Each day in the schedule contains:

| Field | Description |
|-------|-------------|
| Day Number | `1` through `100` |
| Phase | one of the 3 macro phases |
| Primary Focus | workbook primary-focus text |
| Resource | workbook resource text |
| `06:30-07:45` | morning revision / revision-cluster block |
| `07:45-08:00` | break |
| `08:00-11:00` | Block A |
| `11:00-11:15` | break |
| `11:15-14:15` | Block B |
| `14:15-15:00` | meal |
| `15:00-17:45` | Block C |
| `17:45-18:00` | break |
| `18:00-20:00` | MCQ practice block |
| `20:00-20:30` | break / dinner |
| `20:30-22:15` | final review / overflow / GT review block |
| `22:15-22:45` | wrap-up log |
| GT context | derived from GT-tagged `Daywise_Plan` rows |
| Day metrics | workbook notes, source minutes, buffer minutes, and total study hours |

### 4.3 Study Blocks (Trackable)

There are **7 trackable study blocks** per day:

| Block | Time | Typical Content |
|-------|------|-----------------|
| Morning Revision | 06:30-07:45 | Live revision queue in Phase 1, workbook-guided revision cluster in later phases |
| Block A | 08:00-11:00 | Phase-dominant primary study / GT work |
| Block B | 11:15-14:15 | Phase-dominant primary study / GT work |
| Block C | 15:00-17:45 | Phase-dominant third study / repair / catch-up block |
| MCQ Practice | 18:00-20:00 | MCQ/QBank practice and explanation review |
| Final Review | 20:30-22:15 | overflow revision, GT review, or phase-specific final review work |
| Wrap-Up Log | 22:15-22:45 | wrong-notebook/log/register update and quiet shutdown |

Breaks and meal slots are displayed inline but are not trackable study work.

### 4.4 Date Mapping

- SCHED-4: On first setup, the user (or Sampath) picks the "Day 1" date. All 100 days are mapped forward from this date.
- SCHED-5: The exam date is fixed: **August 30, 2026**.
- SCHED-6: The hard boundary for schedule shifts is **August 20, 2026** (10 days before exam). No study block can be scheduled on or after this date. The final days (pre-exam calm, light recall, logistics) must remain untouched.

### 4.5 Morning Revision Queue (Dynamic Recalculation)

- SCHED-7: The workbook's morning guidance comes from `Revision_Map` and represents the **original plan**.
- SCHED-8: Once the app is in use, the morning revision queue must be **dynamically recalculated** based on when topics were actually completed, not when they were originally planned. Example: if "Pathology FP-1" was planned on Day 2 but she actually completed it on Day 4, the D+1 revision moves from Day 3 to Day 5, D+3 from Day 5 to Day 7, etc.
- SCHED-9: Each completed Phase 1 topic in `Block A`, `Block B`, or `Block C` generates revision entries at D+1, D+3, D+7, D+14, and D+28 from the actual completion date.
- SCHED-10: Morning revision items are shown as individual checkboxes with equal time divided across the `75`-minute morning block.
- SCHED-11: Maximum 5 items shown in the morning block. Overflow logic:
  - Items 6+ are distributed to: (a) the `Final Review` block (`20:30-22:15`), then (b) break micro-slots (`07:45-08:00`, `11:00-11:15`, `17:45-18:00`, `20:00-20:30`) as quick recall prompts.
  - If overflow persists for 3+ consecutive days, the app surfaces a suggestion: "Your revision queue is growing. Consider deferring low-priority items to next revision phase."
- SCHED-12: Overdue revision items (not completed on scheduled date):
  - 1-2 days overdue: added to next morning queue (still valuable)
  - 3-6 days overdue: bundled into a "catch-up revision" mini-block, suggested during `Block C` or `Final Review`
  - 7+ days overdue: flagged for full re-study during next revision phase, removed from daily queue

### 4.6 Phases

The schedule contains 3 macro phases:

1. Phase 1 - First pass (Days `1-63`)
2. Phase 2 - Revision 1 (Marrow + selective BTR) (Days `64-82`)
3. Phase 3 - Revision 2 / Compression (Days `83-100`)

The app shows the current phase name and a brief description on the Today View.

---

## 5. Today View (Home Screen)

The most important screen. She opens the app and immediately knows what to do today.

### Layout (top to bottom)

#### 5.1 Header

- TODAY-1: App name "Beside You" with logo. Tapping the name/logo twice triggers the Easter egg (romantic message with gentle animation, dismissible).
- TODAY-2: Day counter badge: "Day 34 / 100"
- TODAY-3: Current phase name and one-line description
- TODAY-4: Date displayed

#### 5.2 Motivational Quote

- TODAY-5: One quote shown per day, sourced from the uploaded quotes CSV. Positioned below the day counter. Calm, understated typography. Shows quote text and author.
- TODAY-6: Quote selection logic:
  - Normal (Green) days: randomly selected from the "daily" category
  - Yellow/Red days: randomly selected from the "tough_day" category
  - After completing all blocks for the day: a fresh "celebration" category quote appears as a completion moment
  - If she switches traffic light mid-day (e.g., Green to Yellow): a "tough_day" quote appears below/replacing the original daily quote. The transition should feel supportive, not jarring. If she switches back to Green, the original daily quote returns.
- TODAY-7: Quotes do not repeat until all quotes in a category have been shown.
- TODAY-8: Quotes CSV format: `quote`, `author`, `category` (values: daily, tough_day, celebration). Hardcoded into the app at build time, same as the schedule.

#### 5.3 Traffic Light Day Selector

- TODAY-9: Three-button toggle at top of the schedule section: **Green** / **Yellow** / **Red**. Defaults to Green each morning.
- TODAY-10: **Green day** - Full schedule shown. All 7 study blocks visible and trackable.
- TODAY-11: **Yellow day** - Schedule auto-reshapes:
  - Shown: `Morning Revision`, `Block A`, `Block B`, `MCQ Practice`, `Wrap-Up Log`
  - Hidden/Shifted: `Block C` and `Final Review` go to backlog
  - Visual indication that it's a reduced day, no guilt messaging
- TODAY-12: **Red day** - Salvage mode:
  - Shown: `Morning Revision`, `Block A`, `MCQ Practice`, `Wrap-Up Log`
  - Hidden/Shifted: `Block B`, `Block C`, and `Final Review` go to backlog
  - Message: "A salvage day, not a zero day."
- TODAY-13: Changing the traffic light at any point in the day immediately reshapes the visible blocks. Blocks already marked complete stay complete.

#### 5.4 Morning Revision Checklist

- TODAY-14: Displayed as the first section, before study blocks.
- TODAY-15: Each revision item is a separate checkbox with the topic name and the revision type (D+1, D+3, etc.).
- TODAY-16: Equal time allocation displayed per item (e.g., if 4 items, "~22 min each").
- TODAY-17: Items that overflow to night block or break slots are shown separately under a "Also review today" subsection with their assigned time slot.

#### 5.5 Study Block Cards

- TODAY-18: 7 cards, one per trackable block, in chronological order.
- TODAY-19: Each card shows: time slot, block description (from Excel), completion checkbox.
- TODAY-20: Break/meal slots shown as thin separators between blocks (not trackable, just visual context).
- TODAY-21: Completed blocks show a checkmark and subtle green tint.
- TODAY-22: Blocks hidden due to Yellow/Red day show as collapsed/grayed with "Rescheduled" label. No guilt language like "Missed" or "Failed."

#### 5.6 Block Time Editing

- TODAY-23: Each block's time slot is editable. She can tap the time and adjust start/end times.
- TODAY-24: Time edits only affect today. They don't propagate to future days.
- TODAY-25: **Sleep protection rule:** If a time edit would push any block past 23:00 or start any block before 06:30, the app shows a warning: "This would cut into sleep time. Move to backlog instead?" and offers to send the block to backlog.

#### 5.7 MCQ Quick Log

- TODAY-26: A dedicated section (or floating button) for logging MCQs. Details in Section 7.

#### 5.8 Backlog Indicator

- TODAY-27: If there are items in the backlog queue, a small badge/indicator is shown: "3 blocks in backlog". Tappable to open the backlog queue view.

#### 5.9 Completion Celebration

- TODAY-28: When all blocks for the day (based on the current traffic light level) are checked off, a brief celebratory moment: a "celebration" category quote fades in, maybe with a subtle confetti or glow animation. Not over-the-top. She earned it.

#### 5.10 Wind-Down Prompt

- TODAY-29: **At 21:45**, if there are still uncompleted visible blocks, the app shows a gentle in-app message: "It's getting late. Move remaining blocks to backlog and wind down?" with two options: "Yes, wrap up" (moves remaining work to backlog) or "I'm almost done" (dismisses once, then reappears at 22:00).
- TODAY-30: **At 22:15**, if the `Final Review` block is still pending, the app shows: "Time to rest. Do a quick 5-minute version, or skip tonight's final review?" with options: "Quick version" or "Skip and sleep". No nagging beyond the defined flow.
- TODAY-31: **At 22:45**, if the app is still open and any visible study blocks are uncompleted, the app quietly auto-moves the remaining work to backlog and shows: "Moved to backlog. Sleep well." This is the final safety net before the midnight cron.
- TODAY-32: The wind-down prompt is **not a notification.** It only appears if she has the app open at that time. If the app is closed, the midnight cron handles everything silently. The wind-down exists to help her, not to pressure her.
- TODAY-33: Wind-down times (`21:45` / `22:00` / `22:15` / `22:45`) are tied to the sleep protection boundary (`23:00` hard limit). If she ever edits a block to extend past `23:00` and the app warns her (TODAY-25), the wind-down still fires at these times regardless.

---

## 6. Schedule Shift and Backlog System

### 6.0 Design Principles

- BACK-0a: The backlog system exists to **reduce anxiety, not add to it.** It must feel like a calm recovery tool, not a guilt ledger.
- BACK-0b: The schedule is the single source of truth. The backlog system adjusts the schedule; it does not create a parallel tracking system that grows endlessly.
- BACK-0c: **Sleep is non-negotiable.** No backlog handling logic may suggest, auto-schedule, or allow any study activity before 06:30 or after 23:00. This is a hard boundary enforced at every level.
- BACK-0d: The key message displayed whenever backlog grows: "Completing 80% consistently beats attempting 100% and crashing."
- BACK-0e: Research basis: "Never miss twice" is the critical rule. Missing one day damages retention slightly. Missing two days in a row breaks habit momentum. The system is designed around this principle.

### 6.1 How Blocks Become "Missed"

- BACK-1: **Manual skip:** She can manually mark a block as "skipped" at any time during the day by tapping a skip button on the block card.
- BACK-2: **Auto-miss at midnight:** A server-side cron job runs at 00:00 IST. Any block for the day that is not marked complete or skipped is automatically marked as "missed."
- BACK-3: Both skipped and missed blocks go to the **Backlog Queue** unless the day's traffic light was Yellow/Red (in which case, the hidden blocks were already expected to not be done, see Section 6.7).

### 6.2 Scenario 1: Single Missed Block

- BACK-4: A single missed/skipped block goes to the Backlog Queue with metadata: original day, block type, topic/description, subject (parsed from primary focus), time slot.
- BACK-5: The app suggests the next compatible slot for each backlog item based on block type:
  - **Study blocks (`Block A` / `Block B` / `Block C`):** Suggest the next compatible same-phase same-subject study block. If that is not available, suggest the next compatible same-phase recovery slot.
  - **MCQ Practice blocks:** Suggest merging with the next same-phase `MCQ Practice` block.
  - **Final Review blocks:** Suggest the next same-phase `Final Review` block.
  - **Wrap-Up Log blocks:** Do not create backlog work; this block is not a recovery lane.
  - **Morning revision blocks:** Morning revision items that were not checked off are handled separately (see Section 4.5, SCHED-12). They do not go to the backlog queue; they re-enter the revision scheduling system.
- BACK-6: Suggestions are **just suggestions**. She can: accept (block moves to the suggested slot), dismiss (block stays in backlog for later), or manually reschedule to any future day/slot she chooses.
- BACK-7: **Sleep protection:** Backlog items cannot be auto-suggested into slots that would push any activity past 23:00 or start before 06:30. If the only available slot would violate this, the item stays in backlog with the message: "No compatible slot today without cutting into sleep. Keeping in backlog."

### 6.3 Scenario 2: Missed a Full Day (Yellow/Red Day)

This uses the traffic light classification system from the 100-day plan.

#### Green Day (default)

- BACK-8: Full 14-hour plan runs as scheduled. All 7 study blocks visible and trackable. No backlog impact.

#### Yellow Day

- BACK-9: When she sets Yellow, the day auto-reshapes to:
  - **Kept:** `Morning Revision`, `Block A`, `Block B`, `MCQ Practice`, `Wrap-Up Log`.
  - **Moved to backlog:** `Block C`, `Final Review`.
- BACK-10: The moved blocks are added to the backlog queue with a "yellow_day" tag so they can be distinguished from genuinely missed blocks.
- BACK-11: Visual: Hidden blocks are shown as collapsed/grayed with "Rescheduled" label. No guilt language like "Missed" or "Failed."

#### Red Day (major stress / health / family episode)

- BACK-12: When she sets Red, the day switches to **salvage mode**:
  - **Kept:** `Morning Revision`, `Block A`, `MCQ Practice`, `Wrap-Up Log`.
  - **Moved to backlog:** `Block B`, `Block C`, `Final Review`.
- BACK-13: The app displays the message: "A salvage day, not a zero day." This exact phrasing comes from the 100-day plan.
- BACK-14: The moved blocks are added to the backlog queue with a "red_day" tag.

#### Switching Traffic Light Mid-Day

- BACK-15: She can change the traffic light at any point during the day.
- BACK-16: Blocks already marked complete stay complete regardless of traffic light changes.
- BACK-17: If she switches from Red/Yellow back to Green: blocks that were moved to backlog due to the traffic light change are **restored** to today's view, as long as it's still the same day. They are removed from the backlog queue.
- BACK-18: If she switches from Green to Yellow/Red: blocks not yet completed that fall outside the Yellow/Red scope are moved to backlog.

### 6.4 Scenario 3: A Block Takes Longer Than Planned

- BACK-19: She can mark a block as "overrun" by editing the end time. Example: `Block A` was `08:00-11:00`, she changes it to end at `12:00`.
- BACK-20: If the overrun causes the next block to be pushed, the app asks: "Block B now starts at 12:00 instead of 11:00. Shorten Block B, or move the overflow to backlog?"
- BACK-21: The app tracks which subjects/blocks consistently overrun. This data surfaces in the weekly summary as: "Blocks that ran over this week: 3 (Medicine Block A x2, Pathology Block B x1)." This is analytics gold for adjusting the plan.
- BACK-22: **Sleep protection still applies.** If overrun cascading would push any block past `23:00`, the app forces the remaining blocks to backlog with the message: "Remaining blocks moved to backlog to protect sleep." The wind-down prompt (TODAY-29 through TODAY-33) also applies in overrun scenarios: even if blocks haven't technically cascaded past `23:00` yet, the `21:45` wind-down prompt still fires if uncompleted blocks exist.

### 6.5 Scenario 4: Schedule Shift (2+ Days Missed)

When she falls behind by 2 or more days, rather than accumulating a growing backlog queue (which becomes its own source of stress), the system offers to shift the entire schedule forward. This is the cleaner, more honest approach.

- BACK-23: If 2 or more days have at least 5/7 blocks missed/skipped, the app shows a non-intrusive banner: "You're X days behind. Would you like to adjust the schedule?" This is an offer, not a demand.
- BACK-24: **Shift preview flow (two-step, no surprises):**
  1. **Step 1 - Preview (dry run):** She taps "Adjust schedule." The app calculates and shows:
     - How many days the schedule would shift forward
     - How many buffer days are available to absorb the shift (e.g., Day 83 "Buffer / weakest 2 subjects rescue")
     - If buffer days cover it: "Clean shift. No content lost. Buffer days used: X."
     - If buffer days don't fully cover it: exactly which days from the Final Assault phase (Days 85-100) would be compressed or merged, listed clearly. Example: "Days 97 and 98 (Wrong notebook final pass 1 & 2) will be merged into a single day."
     - The hard boundary is always visible: "Schedule cannot extend past August 20, 2026."
  2. **Step 2 - Confirm:** She reviews the preview and either confirms ("Apply shift") or cancels ("Keep current schedule").
- BACK-25: **When a shift is applied:**
  - ALL downstream dates recalculate: study block dates, GT dates, morning revision queue entries, everything.
  - GT days shift proportionally. If GT-5 was on Day 66 and the schedule shifts by 2 days, GT-5 moves to Day 68.
  - Morning revision items recalculate based on new actual/expected completion dates.
  - The backlog queue is cleared of items that are now covered by the shifted schedule (since the days they belonged to have moved forward).
- BACK-26: **Hard boundary: August 20, 2026.** The schedule can never shift a study day onto or past this date. The last ~10 days before the exam (pre-exam calm, light recall, logistics, sleep normalization) are sacred and untouchable.
- BACK-27: Schedule shift is always an **explicit, manual action.** It never happens automatically. The app suggests it, she decides.
- BACK-28: **What gets compressed when buffers run out:** The Final Assault phase (Days 85-100) compresses from the end backward. Super-revision days can be merged (e.g., "Super-revision 6: OBG" and "Super-revision 7: Anat + Physio + ENT + Ophthal" become one combined day). The "Wrong notebook final pass" days can be merged into one. The "Emergency algorithm day" and "Direct repeats + volatile list" can be merged. The app proposes specific merges in the preview; she confirms.

### 6.6 Scenario 5: Overdue Revision Items

This is handled in the schedule engine (SCHED-12) but summarized here for completeness:

- BACK-29: **1-2 days overdue:** Added to the next morning's revision queue. Still highly valuable.
- BACK-30: **3-6 days overdue:** Bundled into a "catch-up revision" mini-block, suggested during `Block C` or `Final Review`.
- BACK-31: **7+ days overdue:** Flagged for full re-study during the next revision phase. Removed from the daily revision queue to prevent it from becoming a permanent guilt item.

### 6.7 Retroactive Completion

- BACK-32: She can navigate to any past day (via the Schedule Browser) and mark blocks as completed retroactively. Use case: she did the work but forgot to tick it in the app.
- BACK-33: When retroactively completing a block, she can set the actual completion date (defaults to the block's original scheduled date).
- BACK-34: Retroactively completing a block **removes it from the backlog queue** if it was there.
- BACK-35: Retroactive completion **updates the morning revision dynamic recalculation.** The revision schedule (D+1, D+3, D+7, D+14, D+28) is computed from the actual completion date she sets.

### 6.8 Backlog Queue View

- BACK-36: A dedicated, directly accessible view showing all pending backlog items.
- BACK-37: Each item shows:
  - Original day number and date
  - Block type (`Block A`, `Block B`, `Block C`, `MCQ Practice`, `Final Review`)
  - Topic/description (from the schedule)
  - Days in backlog (how long it's been pending)
  - Source tag: "missed", "skipped", "yellow_day", "red_day", "overrun_cascade"
  - Suggested reschedule slot (if available)
- BACK-38: Actions per item:
  - **Mark as completed** (with date picker: when did she actually do it?)
  - **Reschedule** to a specific future day/slot
  - **Dismiss** (accept that it won't be done, remove from queue)
- BACK-39: The queue is **fully editable.** She can remove items, reorder them, bulk-dismiss, or bulk-reschedule.
- BACK-40: The queue shows a summary at the top: "X items pending (Y from missed days, Z from yellow/red days)."
- BACK-41: **No guilt language anywhere in the backlog queue.** No "overdue," no "failed," no red warning colors. Neutral language: "pending," "rescheduled," "not yet done." The queue is a tool, not a punishment.

---

## 7. MCQ Tracker

### 7.1 Bulk Entry Mode

- MCQ-1: Single form with three fields: Total Attempted, Correct, Wrong.
- MCQ-2: Optional: Subject dropdown (for when she does a subject-specific module).
- MCQ-3: Optional: Source field (e.g., "CM-PSM-01", "Module-Pharma-ANS").
- MCQ-4: Date defaults to today but is editable (for retroactive logging).
- MCQ-5: One tap submit. Fast.

### 7.2 One-by-One Entry Mode

- MCQ-6: **Required fields:**
  - MCQ ID (text/number input)
  - Result: Right / Wrong / Guessed Right (three big tap buttons)
- MCQ-7: **Optional fields (collapsed by default, "Add details" expander):**
  - Subject (dropdown, 19 subjects from the schedule)
  - Topic (free text with autocomplete from previous entries)
  - Source (free text with recent suggestions: "GT-07", "Module-Pharma-ANS", etc.)
  - Cause Code (dropdown): R (Recall), C (Concept), A (Application), D (Discriminator), I (Interpretation), M (Management/Algorithm), V (Visual/Image), B (Biostats/Formula), T (Time/Panic), K (Careless Mark)
  - Priority (tap buttons): P1 (Must fix) / P2 (Important) / P3 (If repeats)
  - Correct Rule (free text, 1-2 lines)
  - What Fooled Me (free text, missed clue / why choice was wrong)
  - Fix Codes (multi-select chips): N (Notes repair), Q20 (20 focused MCQs), Q40M (40 mixed MCQs), A1 (Algorithm once), A3 (Algorithm 3 days), T2 (Compare table), I10 (Image drill 10), F5 (5 formula recalls), E (Self-explain), AI (AI quiz), G (GT behaviour fix)
  - Tags (multi-select chips): protocol, volatile, management, image, emergency, screening, staging
- MCQ-8: The "Add details" expander **remembers its last state** within a session. If she expanded it for the last entry, it stays expanded for the next.
- MCQ-9: After submitting a 1-by-1 entry, the form clears but keeps: Subject, Source, and the expander state. This speeds up batch entry from the same module.
- MCQ-10: Quick submit. MCQ ID + Result tap = done in 5 seconds for minimal entries.

### 7.3 MCQ Analytics

- MCQ-11: Trends over time: daily volume (bar chart), accuracy % (line chart), right vs wrong breakdown.
- MCQ-12: Accuracy by subject (when subject is tagged). Bar chart showing % correct per subject.
- MCQ-13: Top wrong subjects and cause codes (from tagged entries) surface in the weekly summary.
- MCQ-14: No running total target. Just data and trends.

---

## 8. GT Tracker

### 8.1 GT Schedule

- GT-1: The GT schedule is derived from GT-tagged rows in `Daywise_Plan`:
  - Day 66: GT-1
  - Day 72: GT-2
  - Day 78: GT-3
  - Day 82: GT-4
  - Day 86: GT-5
  - Day 90: GT-6
  - Day 93: GT-7
  - Day 95: 120Q half-simulation
  - Day 96: GT-8
- GT-2: GT days are highlighted in the schedule view. The Today View shows a special GT indicator on GT days.
- GT-3: GT schedule adjusts if the overall schedule shifts.

### 8.2 GT Log Form

- GT-4: **Score section:**
  - GT number (pre-filled based on schedule, editable)
  - Date (defaults to today)
  - Score (number)
  - Correct (number)
  - Wrong (number)
  - Unattempted (number)
  - AIR / Percentile (text, can be approximate)

- GT-5: **Attempt context:**
  - Device: Laptop / Mobile / Tablet (radio buttons)
  - Attempted live: Yes / No
  - Overall feeling: Calm / Rushed / Blank / Fatigued / Overthinking (single select, emoji-style buttons)

- GT-6: **Section-wise breakdown (5 expandable sections, one per exam section A-E):**
  Each section has:
  - Time felt enough? (Yes / No toggle)
  - Panic started? (Yes / No toggle)
  - Guessed too much? (Yes / No toggle)
  - Time lost on: Image / Lengthy clinical / Biostats / Algorithms (multi-select chips)

- GT-7: **GT Wrapper (post-GT reflection, 5 questions from the playbook):**
  1. What kinds of errors dominated this GT? (free text)
  2. Top 3 recurring topics? (free text, or tag-style input)
  3. Knowledge vs behaviour split? (slider: 0-100%, where 0% = all behaviour, 100% = all knowledge)
  4. Number of unsure-right (UR) questions? (number input)
  5. What will I change before the next GT? (free text)

### 8.3 GT Analytics

- GT-8: Score trend chart across all completed GTs (line chart).
- GT-9: Section-wise patterns: does panic consistently start in section C? Does time pressure hit in section E?
- GT-10: GT-over-GT comparison: show improvement or decline in key metrics.
- GT-11: Wrapper trend: are knowledge errors decreasing? Is behaviour improving?
- GT-12: Subject weakness tracking: which subjects repeatedly appear as "weakest" across GT wrappers.

---

## 9. Weekly Auto-Summary

### Generation

- WEEK-1: Auto-generated every Sunday at end of day, covering Monday-Sunday of that week.
- WEEK-2: Also triggerable manually at any time ("Generate summary now").

### Content

- WEEK-3: **Schedule adherence:**
  - Blocks completed vs planned (number and %)
  - Days by traffic light color: X Green, Y Yellow, Z Red
  - Morning revision completion rate (items completed / items scheduled)
  - Blocks that overran this week: count and which subjects/blocks (from BACK-21 tracking data)

- WEEK-4: **MCQ performance:**
  - Total MCQs solved this week
  - Overall accuracy %
  - Accuracy trend vs previous week (up/down arrow)
  - Top wrong subjects (from tagged entries, if available)
  - Top cause codes (from tagged entries, if available)

- WEEK-5: **GT data (if a GT was taken this week):**
  - GT number, score, AIR
  - Brief wrapper summary

- WEEK-6: **Schedule health:**
  - Status: "On track" / "X days behind" / "Y buffer days used"
  - Backlog count: X blocks pending

- WEEK-7: **Subjects studied this week** (derived from the schedule's Primary Focus column for completed days)

- WEEK-8: Summaries are stored and browsable. She can look back at any past week's summary.

---

## 10. Full Schedule Browser

- BROWSE-1: A calendar or list view showing all 100 days.
- BROWSE-2: Each day shows: day number, date, phase, primary focus, GT indicator if applicable.
- BROWSE-3: Days are color-coded by status: completed (green), today (blue), upcoming (gray), missed (amber/red).
- BROWSE-4: Tapping a day opens the full day detail: all blocks, descriptions, deliverables.
- BROWSE-5: **Past days are viewable AND editable** (for retroactive completion marking).
- BROWSE-6: **Future days are viewable but NOT editable** (she can see what's coming but can't tick or modify future days).
- BROWSE-7: Today is the default scroll/focus position when opening the browser.

---

## 11. Notification Philosophy

### Core Principle

- NOTIF-1: **The app sends zero proactive notifications.** No push notifications, no reminders, no "you're behind" alerts, no morning revision lists, no evening nudges. Nothing.
- NOTIF-2: The user has explicitly stated that notifications about syllabus and pending work trigger anxiety. The app must respect this completely.
- NOTIF-3: The app is a quiet companion. She opens it when she's ready. Everything she needs is there waiting for her. It does not chase her.

### What Replaces Notifications

- NOTIF-4: **The Today View is the notification.** When she opens the app, it immediately shows: what's due, what's done, what's pending. That is sufficient.
- NOTIF-5: **The motivational quote is the greeting.** Instead of a notification saying "5 blocks pending," she sees a calming quote and her day laid out clearly.
- NOTIF-6: **The completion celebration is the reward.** When she finishes all blocks, the celebration quote appears. This is positive reinforcement without pressure.
- NOTIF-7: **The weekly summary is self-service.** She can view it anytime in the app. It is not pushed to her.

### What We Explicitly Do NOT Build

- NOTIF-8: No PWA push notification setup
- NOTIF-9: No Telegram bot
- NOTIF-10: No email notifications
- NOTIF-11: No badge counts on the app icon
- NOTIF-12: No "you haven't opened the app today" re-engagement
- NOTIF-13: No notification permission prompts

### V2 Consideration

- NOTIF-14: If she later requests reminders, Telegram bot integration can be added as a V2 feature. The cron infrastructure (midnight auto-miss, weekly report generation) already exists server-side, so adding a Telegram delivery channel is a small incremental change. But it must be opt-in and requested by her, never imposed.

---

## 12. Motivational Quotes System

- QUOTE-1: Quotes are hardcoded at build time from a CSV file.
- QUOTE-2: CSV format: `quote`, `author`, `category`
- QUOTE-3: Categories: `daily`, `tough_day`, `celebration`
- QUOTE-4: One "daily" or "tough_day" quote shown per day on Today View (based on traffic light).
- QUOTE-5: One "celebration" quote shown when all blocks are completed for the day.
- QUOTE-6: Quotes do not repeat until all quotes in a category have been shown. Then the cycle resets.
- QUOTE-7: Quote display is calm, understated. Not a banner or popup. Just text with author attribution, sitting naturally in the layout.

---

## 13. Settings

- SET-1: **Day 1 date picker** - Set during first setup, editable later.
- SET-2: **Exam date** - Displayed as August 30, 2026. Not editable (hardcoded).
- SET-3: **Theme** - Dark / Light mode toggle. Dark mode is important for late-night study sessions.
- SET-4: **Export data** - Export all data as JSON file (for backup).
- SET-5: **About** - App version, brief description, link to the study plan documents.

---

## 14. Design Requirements

### 14.1 General Aesthetic

- DESIGN-1: Clean, calming, clinical. Not gamified. Not distracting. She's studying 14 hours a day; the app should feel like a quiet, competent assistant.
- DESIGN-2: No bright gamification colors. No confetti explosions (except the subtle completion moment). No streaks, no points, no badges.
- DESIGN-3: Dark mode as the likely primary mode (late-night study sessions).
- DESIGN-4: Typography: warm, readable. Nothing cold or sterile. The app is called "Beside You" for a reason.

### 14.2 Mobile-First

- DESIGN-5: Every screen must work perfectly on iPhone SE width (375px).
- DESIGN-6: Every screen must also look good on an 11-inch tablet (Samsung Tab S9).
- DESIGN-7: Touch targets must be minimum 44x44px (Apple HIG recommendation).
- DESIGN-8: Forms must be usable with one thumb on phone.

### 14.3 Performance

- DESIGN-9: Today View must load in under 1 second.
- DESIGN-10: Form submissions must feel instant (optimistic UI: show success immediately, sync in background).
- DESIGN-11: No loading spinners for routine interactions.

### 14.4 PWA Requirements

- DESIGN-12: Installable on iPhone home screen via Safari "Add to Home Screen".
- DESIGN-13: Installable on Samsung Tab via Chrome "Install app" prompt.
- DESIGN-14: App icon, splash screen, standalone mode (no browser chrome).
- DESIGN-15: Works in standalone mode on both devices.
- DESIGN-16: Dark navy theme color for status bar on both platforms.

---

## 15. Data Sync Requirements

- SYNC-1: All data syncs via Supabase in real-time. If she checks a block on her phone, it appears checked on her Tab within seconds.
- SYNC-2: No offline mode required. If she's offline, the app shows a "No connection" indicator but doesn't crash or lose state.
- SYNC-3: Conflict resolution: last write wins. Since she's the only user on two devices, conflicts are unlikely and this is sufficient.

---

## 16. Non-Functional Requirements

- NFR-1: **Cost:** Zero ongoing infrastructure cost. All services on free tiers (Supabase, Vercel).
- NFR-2: **Deployment:** Hosted on Vercel with auto-deploy from GitHub main branch.
- NFR-3: **Maintenance:** Sampath can push updates by committing to GitHub. Changes deploy automatically.
- NFR-4: **Data safety:** Supabase free tier includes daily backups. Export to JSON is available as manual backup.
- NFR-5: **Browser support:** Safari (iOS 16.4+), Chrome (Android/tablet). No other browsers need to be supported.
- NFR-6: **Accessibility:** Basic accessibility. All interactive elements focusable, sufficient color contrast, screen reader labels on buttons.

---

## 17. What We Are NOT Building

To keep scope tight, the following are explicitly excluded:

- NO-1: Rapid revision sheet (Notebook 2 handles this manually)
- NO-2: Standalone error logging screen (MCQ 1-by-1 mode covers this need)
- NO-3: Spaced repetition algorithm (the schedule + dynamic recalculation from actual completion dates handles this)
- NO-4: AI-powered features (no auto-summarization, no AI quizzing)
- NO-5: Social features (no sharing, no leaderboards, no peer comparison)
- NO-6: Offline mode (online-only is acceptable for this use case)
- NO-7: Any form of push notifications, reminders, or alerts (the user has explicitly stated these cause anxiety; the app is intentionally silent)
- NO-8: Telegram bot (deferred to V2, only if user requests it)
- NO-9: App Store / Play Store listing (PWA only)
- NO-10: Multiple schedule imports (schedule is hardcoded)
- NO-11: Marrow integration (no API connection to Marrow platform)

---

## 18. Reference Data

### 18.1 Subjects (19)

| Subject | Short Name | Tier |
|---------|-----------|------|
| Medicine | MED | 1 |
| Surgery | SUR | 1 |
| Obstetrics & Gynaecology | OBG | 1 |
| Pathology | PATH | 1 |
| Community Medicine (PSM) | PSM | 1 |
| Pharmacology | PHARMA | 1 |
| Microbiology | MICRO | 1 |
| Pediatrics | PEDS | 2 |
| Anatomy | ANAT | 2 |
| Physiology | PHYSIO | 2 |
| Biochemistry | BIOCHEM | 2 |
| ENT | ENT | 3 |
| Ophthalmology | OPTHAL | 3 |
| Forensic Medicine | FMT | 3 |
| Radiology | RAD | 3 |
| Anaesthesia | ANAES | 3 |
| Orthopaedics | ORTHO | 3 |
| Dermatology | DERM | 3 |
| Psychiatry | PSYCH | 3 |

### 18.2 Result Codes (MCQ)

| Code | Label | Description |
|------|-------|-------------|
| Right | Right | Answered correctly |
| Wrong | Wrong | Answered incorrectly |
| Guessed Right | Guessed Right | Correct but not confident |

### 18.3 Cause Codes (MCQ Optional)

| Code | Label | Description |
|------|-------|-------------|
| R | Recall | Seen before, could not retrieve |
| C | Concept | Did not understand mechanism |
| A | Application | Knew fact, failed clinical application |
| D | Discriminator | Stuck between two close options |
| I | Interpretation | Misread stem/qualifier/context |
| M | Management | Wrong sequence/protocol/next step |
| V | Visual | Image/ECG/histo/radiology miss |
| B | Biostats | Wrong test/formula/interpretation |
| T | Time/Panic | Good knowledge, bad pacing |
| K | Careless | Clicked wrong/changed without basis |

### 18.4 Priority Levels (MCQ Optional)

| Code | Label |
|------|-------|
| P1 | Must fix this week |
| P2 | Fix in next revision |
| P3 | Log only if repeats |

### 18.5 Fix Codes (MCQ Optional)

| Code | Label |
|------|-------|
| N | Notes repair |
| Q20 | 20 focused MCQs |
| Q40M | 40 mixed MCQs |
| A1 | Algorithm once |
| A3 | Algorithm 3 days |
| T2 | Compare table |
| I10 | Image drill 10 |
| F5 | 5 formula recalls |
| E | Self-explain |
| AI | AI quiz |
| G | GT behaviour fix |

### 18.6 Tags (MCQ Optional)

protocol, volatile, management, image, emergency, screening, staging

---

## 19. Glossary

| Term | Meaning |
|------|---------|
| GT | Grand Test (full-length mock exam on Marrow platform) |
| WoR | World of Revision (Marrow's revision video series) |
| BTR | Beyond the Revision (compression video series, used from Phase 3 onward) |
| PYQ | Previous Year Questions |
| MCQ | Multiple Choice Question |
| AIR | All India Rank |
| Marrow | Primary NEET PG preparation platform (videos, notes, QBank, GTs) |
| QBank | Question Bank on Marrow |
| FP | First Pass (e.g., "Pathology FP-1" = Pathology first pass day 1) |
| R1 | Revision 1 (e.g., "Pathology R1-1" = Pathology revision 1 day 1) |
| UR | Unsure Right (answered correctly but was not confident) |
| CRW | Changed Right to Wrong |
| TS | Time Sink |
| CE | Careless Error |
| D+1, D+3, D+7 | Spaced revision intervals (1, 3, 7 days after initial study) |
| Traffic Light | Day classification: Green (full), Yellow (reduced), Red (salvage) |

---

## 20. Success Criteria

The app is successful if:

1. She uses it daily for the full 100 days without abandoning it.
2. She never misses a spaced revision item unknowingly. When she opens the app, the Today View immediately shows what's due, what's overdue, and what's next. The morning revision queue is always accurate and current.
3. She can log her day's progress in under 2 minutes total interaction time.
4. GT data is captured consistently and trends are visible by GT-3 or GT-4.
5. She never feels guilty using the app. The traffic light system and backlog handling should reduce stress, not add to it.
6. The backlog system prevents the "I'm behind, it's all over" spiral by giving her a clear, calm recovery path.
