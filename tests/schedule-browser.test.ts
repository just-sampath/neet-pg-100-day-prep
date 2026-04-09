import { describe, expect, it } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import { applyAutomationsWithMode, applyTrafficLightToDay, completeBlockItems, completeRevisionSession, getDayDetailData, getHomeData, getScheduleListData, detectLegacyScheduleLayout, migrateToCanonicalLayout, moveVisibleBlocksToBacklog } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { applyScheduleMappingsFromSettings, buildExtensionDayRows, ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getBlockProgress, getDayCompletionState, getOriginalPlannedDate, getScheduleDay, getScheduleDayEditState, buildDailyRevisionPlan } from "@/lib/domain/schedule";
import type { BacklogItem, LocalStore, UserState } from "@/lib/domain/types";
import { addDaysToDateOnly } from "@/lib/utils/date";

function createStore(userState?: UserState, simulatedNowIso = "2026-05-03T06:30:00.000Z"): LocalStore {
  return {
    version: 2,
    users: {
      "local-user": {
        id: "local-user",
        email: "aspirant@beside-you.local",
        password: "beside-you-2026",
        displayName: "Aspirant",
      },
    },
    sessions: {},
    userState: {
      "local-user": userState ?? createEmptyUserState(),
    },
    referenceData: getStaticReferenceData(),
    dev: {
      simulatedNowIso,
    },
  };
}

function insertExtensionDayAfter(userState: UserState, insertionPoint: number, now = "2026-07-03T00:00:00.000Z") {
  ensureUserScheduleSeeded(userState);

  const newDays = {} as typeof userState.schedule.days;
  for (const [key, day] of Object.entries(userState.schedule.days)) {
    if (day.dayNumber > insertionPoint) {
      day.dayNumber += 1;
      day.mappedDate = addDaysToDateOnly(day.mappedDate, 1);
      day.updatedAt = now;
      newDays[String(day.dayNumber)] = day;
    } else {
      newDays[key] = day;
    }
  }
  userState.schedule.days = newDays;

  const newBlocks = {} as typeof userState.schedule.blocks;
  for (const block of Object.values(userState.schedule.blocks)) {
    if (block.dayNumber > insertionPoint) {
      block.dayNumber += 1;
      block.updatedAt = now;
    }
    newBlocks[`${block.dayNumber}:${block.blockKey}`] = block;
  }
  userState.schedule.blocks = newBlocks;

  for (const topic of Object.values(userState.schedule.topicAssignments)) {
    if (topic.dayNumber > insertionPoint) {
      topic.dayNumber += 1;
      topic.updatedAt = now;
    }

    if (topic.originalDayNumber && topic.originalDayNumber > insertionPoint) {
      topic.originalDayNumber += 1;
    }
  }

  for (const phase of Object.values(userState.schedule.phaseConfig)) {
    if (phase.currentStartDay > insertionPoint) {
      phase.currentStartDay += 1;
      phase.updatedAt = now;
    }
    if (phase.currentEndDay > insertionPoint) {
      phase.currentEndDay += 1;
      phase.updatedAt = now;
    }
  }

  const extMappedDate = addDaysToDateOnly(userState.schedule.days[String(insertionPoint)]!.mappedDate, 1);
  const { dayRow, blockRows } = buildExtensionDayRows(
    insertionPoint + 1,
    "phase_1",
    "phase_1",
    "Phase 1",
    extMappedDate,
    now,
  );

  userState.schedule.days[String(insertionPoint + 1)] = dayRow;
  for (const block of blockRows) {
    userState.schedule.blocks[`${block.dayNumber}:${block.blockKey}`] = block;
  }

  userState.schedule.phaseConfig["1"]!.currentEndDay = insertionPoint + 1;
  userState.schedule.phaseConfig["1"]!.extensionsUsed = 1;
  userState.schedule.phaseConfig["1"]!.updatedAt = now;

  userState.schedule = structuredClone(userState.schedule);
  applyScheduleMappingsFromSettings(userState.schedule, userState.settings, now);
}

describe("schedule browser and retroactive editing", () => {
  it("keeps the original planned date stable even when mapped dates shift", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-1",
        anchorDayNumber: 1,
        shiftDays: 1,
        appliedAt: "2026-05-10T00:00:00.000Z",
        missedDays: [8, 9],
        bufferDayUsed: 84,
        compressedPairs: [],
      },
    ];

    expect(getOriginalPlannedDate(10, userState.settings)).toBe("2026-05-10");
  });

  it("distinguishes past, today, future, and hidden shift days for editing", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    expect(getScheduleDayEditState(2, userState.settings, "2026-05-03")).toMatchObject({
      relation: "past",
      canRetroactivelyComplete: true,
      canAdjustToday: false,
      isReadOnly: false,
    });

    expect(getScheduleDayEditState(3, userState.settings, "2026-05-03")).toMatchObject({
      relation: "today",
      canRetroactivelyComplete: false,
      canAdjustToday: true,
      isReadOnly: false,
    });

    expect(getScheduleDayEditState(4, userState.settings, "2026-05-03")).toMatchObject({
      relation: "future",
      canRetroactivelyComplete: false,
      canAdjustToday: false,
      isReadOnly: true,
    });

    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-2",
        anchorDayNumber: 1,
        shiftDays: 1,
        appliedAt: "2026-07-20T00:00:00.000Z",
        missedDays: [70, 71],
        bufferDayUsed: 84,
        compressedPairs: [],
      },
    ];

    expect(getScheduleDayEditState(84, userState.settings, "2026-07-23")).toMatchObject({
      isShiftHidden: true,
      isReadOnly: true,
    });
  });

  it("marks today distinctly in the browser list and keeps missed past days visible", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    const days = getScheduleListData(createStore(userState), "local-user");

    expect(days.find((day) => day.dayNumber === 3)).toMatchObject({
      today: true,
      status: "today",
    });
    expect(days.find((day) => day.dayNumber === 2)).toMatchObject({
      status: "missed",
    });
  }, 15_000);

  it("shortens the browser list directly from runtime schedule days after tail trimming", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(userState);

    const tailDayNumber = Math.max(...Object.values(userState.schedule.days).map((row) => row.dayNumber));
    const targetDayNumber = tailDayNumber - 1;
    delete userState.schedule.days[String(tailDayNumber)];
    for (const [key, row] of Object.entries(userState.schedule.blocks)) {
      if (row.dayNumber === tailDayNumber) {
        delete userState.schedule.blocks[key];
      }
    }
    for (const [key, row] of Object.entries(userState.schedule.topicAssignments)) {
      if (row.dayNumber === tailDayNumber) {
        delete userState.schedule.topicAssignments[key];
      }
    }
    for (const phase of Object.values(userState.schedule.phaseConfig)) {
      if (phase.currentEndDay === tailDayNumber) {
        phase.currentEndDay = targetDayNumber;
      }
    }

    expect(Math.max(...Object.values(userState.schedule.days).map((row) => row.dayNumber))).toBe(targetDayNumber);

    const days = getScheduleListData(createStore(userState, "2026-05-10T06:30:00.000Z"), "local-user");

    expect(days.at(-1)?.runtimeDayNumber).toBe(targetDayNumber);
    expect(days.find((day) => day.runtimeDayNumber === tailDayNumber)).toBeUndefined();
  });

  it("exposes retroactive completion only on past day detail views and returns semantic block items", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-3",
        anchorDayNumber: 90,
        shiftDays: 1,
        appliedAt: "2026-08-10T00:00:00.000Z",
        missedDays: [90, 91],
        bufferDayUsed: null,
        compressedPairs: [[95, 96]],
      },
    ];

    const store = createStore(userState);
    const pastDetail = getDayDetailData(store, "local-user", 2);
    const futureDetail = getDayDetailData(store, "local-user", 5);
    const hiddenShiftDetail = getDayDetailData(createStore(userState, "2026-08-15T06:30:00.000Z"), "local-user", 96);

    expect(pastDetail?.editState).toMatchObject({
      relation: "past",
      canRetroactivelyComplete: true,
    });
    expect(pastDetail?.blocks[0]).toMatchObject({
      displayLabel: "Morning Revision",
    });
    expect(pastDetail?.blocks[0]?.items.length).toBeGreaterThan(0);

    expect(futureDetail?.editState).toMatchObject({
      relation: "future",
      isReadOnly: true,
    });
    expect(hiddenShiftDetail?.hiddenShiftLabel).toBe("merged by shift compression");
    expect(hiddenShiftDetail?.editState.isReadOnly).toBe(true);
  }, 15_000);

  it("does not surface phase_closed runtime assignments in day detail blocks", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const runtimeDay = getScheduleDay(2, userState)!;
    const block = runtimeDay.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const item = block.items[0]!;
    const assignment = userState.schedule.topicAssignments[item.itemId]!;

    assignment.status = "missed";
    assignment.sourceTag = "phase_closed";
    assignment.updatedAt = "2026-05-02T23:59:00.000Z";

    const detail = getDayDetailData(createStore(userState), "local-user", 2);
    const detailBlock = detail?.blocks.find((entry) => entry.timeSlotKey === block.timeSlotKey);

    expect(detailBlock?.items.some((entry) => entry.itemId === item.itemId)).toBe(false);
  });

  it("marks a past completed day as completed when the browser completion state is true", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const store = createStore(userState, "2026-05-03T06:30:00.000Z");
    const day1 = getScheduleDay(1, userState, store.referenceData)!;

    for (const block of day1.blocks.filter((entry) => entry.trackable)) {
      completeBlockItems(userState, 1, block.timeSlotKey, "2026-05-01T20:00:00.000Z", null, store.referenceData);
    }

    userState.processedDates.midnightDates.push("2026-05-02");
    userState.processedDates.repackDates.push("2026-05-03");

    const days = getScheduleListData(store, "local-user");

    expect(days.find((day) => day.dayNumber === 1)).toMatchObject({
      completed: true,
      status: "completed",
    });
  });

  it("includes mid-phase extension days (dayNumber <= 100) in the browser list", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);
    userState.processedDates.repackDates.push("2026-07-04");

    const days = getScheduleListData(createStore(userState, "2026-07-04T06:30:00.000Z"), "local-user");
    const extensionDay = days.find((day) => day.dayNumber === 64 && day.originalPlannedDate === null);

    expect(days).toHaveLength(101);
    expect(extensionDay).toBeDefined();
    expect(extensionDay).toMatchObject({
      dayNumber: 64,
      runtimeDayNumber: 64,
      originalPlannedDate: null,
    });
  });

  it("appends literal Day 101+ extension rows to the browser list", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 100);
    userState.processedDates.repackDates.push("2026-08-09");

    const days = getScheduleListData(createStore(userState, "2026-08-09T06:30:00.000Z"), "local-user");
    const day101 = days.find((day) => day.dayNumber === 101);

    expect(days).toHaveLength(101);
    expect(days.at(-1)?.dayNumber).toBe(101);
    expect(day101).toMatchObject({
      dayNumber: 101,
      runtimeDayNumber: 101,
      mappedDate: "2026-08-09",
      originalPlannedDate: null,
      today: true,
      status: "today",
    });
  });

  it("resolves schedule day detail by planned day number after extension insertion", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    const originalDay64 = getScheduleDay(64)!;
    insertExtensionDayAfter(userState, 63);
    userState.processedDates.repackDates.push("2026-05-03");

    // With runtime-row-first resolution, /schedule/64 hits the extension day (runtime 64)
    const detail64 = getDayDetailData(createStore(userState, "2026-05-03T06:30:00.000Z"), "local-user", 64);
    expect(detail64).toBeDefined();
    expect(detail64!.runtimeDayNumber).toBe(64);
    // The extension day at runtime 64 has isExtensionDay=true
    expect(userState.schedule.days["64"]!.isExtensionDay).toBe(true);

    // To access the original workbook Day 64 (now at runtime 65), use /schedule/65
    const detail65 = getDayDetailData(createStore(userState, "2026-05-03T06:30:00.000Z"), "local-user", 65);
    expect(detail65).toBeDefined();
    expect(detail65!.runtimeDayNumber).toBe(65);
    expect(detail65!.displayDayNumber).toBe(64);
    expect(detail65!.day.primaryFocusRaw).toBe(originalDay64.primaryFocusRaw);
  });

  it("keeps the today label on the planned day number after extension insertion", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);
    userState.processedDates.repackDates.push("2026-07-04");

    const home = getHomeData(createStore(userState, "2026-07-04T06:30:00.000Z"), "local-user");

    expect(home.dayCountLabel).toBe("Day 64");
  });
});

describe("automation catch-up for schedule browser", () => {
  it("midnight rollover + repack catch-up runs regardless of runtime mode", () => {
    // Simulate: Day 1 was set, a red day pushed blocks to backlog on Day 2,
    // and now it's Day 3 — but processedDates shows no midnight/repack for Day 2.
    // applyAutomationsWithMode("full_mutation") should catch up automatically.
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();

    // Mark Day 1 as Red to move blocks to backlog
    applyTrafficLightToDay(userState, 1, "red", undefined, refData);

    // Record that Day 1 repack ran
    userState.processedDates.repackDates.push("2026-05-01");

    // Open the app on Day 3 (Day 2 was missed by cron)
    const store = createStore(userState, "2026-05-03T06:30:00.000Z");

    // Run full_mutation automations — should catch up Day 2 midnight + repack
    applyAutomationsWithMode(store, "local-user", "full_mutation");

    // Verify catch-up ran: midnightDates should include Day 1 (processed for Day 2 midnight)
    expect(userState.processedDates.midnightDates).toContain("2026-05-01");
    // Repack should have run for Day 2
    expect(userState.processedDates.repackDates).toContain("2026-05-02");
    // Also Day 3 automations should have fired
    expect(userState.processedDates.repackDates).toContain("2026-05-03");
  });

  it("catch-up is idempotent — double run produces no additional state changes", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();
    applyTrafficLightToDay(userState, 1, "red", undefined, refData);
    userState.processedDates.repackDates.push("2026-05-01");

    const store = createStore(userState, "2026-05-03T06:30:00.000Z");

    // First run
    applyAutomationsWithMode(store, "local-user", "full_mutation");
    const midnightAfterFirst = [...userState.processedDates.midnightDates];
    const repackAfterFirst = [...userState.processedDates.repackDates];
    const scheduleRowCountAfterFirst = Object.keys(userState.schedule.days).length;
    const backlogCountAfterFirst = Object.keys(userState.backlogItems).length;
    const assignmentCountAfterFirst = Object.keys(userState.schedule.topicAssignments).length;

    // Second run — rollover + repack should not re-execute
    applyAutomationsWithMode(store, "local-user", "full_mutation");
    expect(userState.processedDates.midnightDates).toEqual(midnightAfterFirst);
    expect(userState.processedDates.repackDates).toEqual(repackAfterFirst);
    expect(Object.keys(userState.schedule.days).length).toBe(scheduleRowCountAfterFirst);
    expect(Object.keys(userState.backlogItems).length).toBe(backlogCountAfterFirst);
    expect(Object.keys(userState.schedule.topicAssignments).length).toBe(assignmentCountAfterFirst);
  });

  it("read_guarded mode skips automations entirely", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    userState.processedDates.repackDates.push("2026-05-01");
    const store = createStore(userState, "2026-05-03T06:30:00.000Z");

    // read_guarded should not run any automation
    applyAutomationsWithMode(store, "local-user", "read_guarded");
    expect(userState.processedDates.midnightDates).toHaveLength(0);
    expect(userState.processedDates.repackDates).toEqual(["2026-05-01"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 0 — Failing tests for schedule browser + repack bugs
// ---------------------------------------------------------------------------

describe("schedule browser bug fixes", () => {
  const refData = getStaticReferenceData();

  // Test 1: Completed days shown as "Missed" when schedule_blocks are missing
  // RC-1: Without schedule_blocks, morning_revision blocks with zero planned
  // revisions can't detect NO_DUE_MORNING_REVISION_NOTE → status stays "pending"
  // → every past day shows "Missed" even if all study blocks are completed.
  it("marks completed past days as 'completed' even without explicit schedule_blocks (browser-scoped simulation)", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    // Complete all trackable blocks for Day 1
    const day1 = getScheduleDay(1, userState, refData)!;
    for (const block of day1.blocks.filter((b) => b.trackable)) {
      completeBlockItems(userState, 1, block.timeSlotKey, "2026-05-01T20:00:00.000Z", null, refData);
    }

    // Simulate browser-scoped: remove schedule_blocks to reproduce the bug
    const blocksBackup = { ...userState.schedule.blocks };
    userState.schedule.blocks = {};

    // Without blocks, getDayCompletionState should still work (via the fix)
    const dayState = { dayNumber: 1, trafficLight: "green" as const, updatedAt: "" };
    const day1AfterRemove = getScheduleDay(1, userState, refData)!;
    const completed = getDayCompletionState(day1AfterRemove, userState, dayState.trafficLight, refData);

    // After the fix, completed should be true since all items are completed
    // Before the fix, this fails because missing blocks → timing.note is null
    // → morning_revision with 0 planned items stays "pending"
    expect(completed).toBe(true);

    // Restore blocks for cleanup
    userState.schedule.blocks = blocksBackup;
  });

  // Test 3: Days 98-100 showing "Completed" when user is on Day 5
  // RC-3: After extension day insertion at Day 63, days 98-100 get renumbered
  // to runtime 100-102. Reference lookups use runtime dayNumber, hitting wrong
  // workbook templates. Future days get bogus completion status.
  it("does not mark future days 98-100 as completed after extension day insertion", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);
    userState.processedDates.repackDates.push("2026-05-05");

    // User is on Day 5 — simulate that date
    const store = createStore(userState, "2026-05-05T06:30:00.000Z");
    const days = getScheduleListData(store, "local-user");

    // Days originally at 98, 99, 100 (now runtime 99, 100, 101) should show "upcoming"
    for (const displayDay of [98, 99, 100]) {
      const dayEntry = days.find((d) => d.dayNumber === displayDay);
      expect(dayEntry).toBeDefined();
      expect(dayEntry!.status).toBe("upcoming");
      expect(dayEntry!.completed).toBe(false);
    }
  }, 15_000);

  // Test 4a: Route collision (post-migration canonical layout)
  // After migration to canonical layout, extension days are at 101+, so
  // /schedule/64 must resolve to workbook Day 64, /schedule/101 to extension day.
  it("resolves getDayDetailData correctly for workbook and extension days in canonical layout", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    // Insert extension day at position 101 (canonical — after Day 100)
    const extMappedDate = addDaysToDateOnly(
      userState.schedule.days["100"]!.mappedDate,
      1,
    );
    const { dayRow, blockRows } = buildExtensionDayRows(
      101, "phase_3", "phase_3", "Phase 3", extMappedDate,
    );
    userState.schedule.days["101"] = dayRow;
    for (const block of blockRows) {
      userState.schedule.blocks[`101:${block.blockKey}`] = block;
    }
    userState.processedDates.repackDates.push("2026-05-01");

    const store = createStore(userState, "2026-08-10T06:30:00.000Z");

    // /schedule/64 should resolve to workbook Day 64
    const detail64 = getDayDetailData(store, "local-user", 64);
    expect(detail64).toBeDefined();
    expect(detail64!.displayDayNumber).toBe(64);
    expect(detail64!.runtimeDayNumber).toBe(64);
    expect(detail64!.day.primaryFocusRaw).toBeTruthy();

    // /schedule/101 should resolve to the extension day
    const detail101 = getDayDetailData(store, "local-user", 101);
    expect(detail101).toBeDefined();
    expect(detail101!.runtimeDayNumber).toBe(101);
  }, 15_000);

  // Test 4b: Route collision (pre-migration legacy layout)
  // Extension day at runtime 64, original Day 64 at runtime 65.
  // getDayDetailData(64) should resolve to runtime row 64 (the extension day),
  // NOT the shifted workbook Day 64.
  it("resolves getDayDetailData to runtime row first in legacy layout (extension day at 64)", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);
    userState.processedDates.repackDates.push("2026-07-04");

    const store = createStore(userState, "2026-07-04T06:30:00.000Z");

    // /schedule/64 — the URL dayNumber matches the extension day's runtime position
    const detail64 = getDayDetailData(store, "local-user", 64);
    expect(detail64).toBeDefined();
    // In legacy layout, runtime 64 is the extension day
    // Runtime row should win: extension day at runtime 64
    expect(detail64!.runtimeDayNumber).toBe(64);
    // The extension day has isExtensionDay = true in the day row
    expect(userState.schedule.days["64"]!.isExtensionDay).toBe(true);
  });

  // Test 5: isExtensionDay false completion
  // Extension days should NOT be implicitly "completed" just because they're extension days.
  // Empty future extension day = "upcoming", empty past extension day = "missed".
  it("does not mark empty extension days as implicitly completed", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    // Insert extension day at 101 (canonical position, no items assigned)
    const extMappedDate = addDaysToDateOnly(
      userState.schedule.days["100"]!.mappedDate,
      1,
    );
    const { dayRow, blockRows } = buildExtensionDayRows(
      101, "phase_3", "phase_3", "Phase 3", extMappedDate,
    );
    userState.schedule.days["101"] = dayRow;
    for (const block of blockRows) {
      userState.schedule.blocks[`101:${block.blockKey}`] = block;
    }
    userState.processedDates.repackDates.push("2026-05-01");

    // Future extension day (today is Day 5) — should NOT be completed
    const extDay = getScheduleDay(101, userState, refData)!;
    const completedFuture = getDayCompletionState(extDay, userState, "green", refData);
    expect(completedFuture).toBe(false);

    // Past extension day (simulate being past by setting today far ahead)
    // An empty past extension day should also not be "completed"
    const storePast = createStore(userState, "2026-08-20T06:30:00.000Z");
    const daysPast = getScheduleListData(storePast, "local-user");
    const extDayInList = daysPast.find(
      (d) => d.runtimeDayNumber === 101 && d.originalPlannedDate === null,
    );
    expect(extDayInList).toBeDefined();
    // Empty past extension day should be "missed", not "completed"
    expect(extDayInList!.status).not.toBe("completed");
  }, 15_000);

  // Test for legacy layout detection and migration
  it("detects legacy schedule layout where dayNumber !== originalDayNumber", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);

    // After insertExtensionDayAfter, days 64-100 have been shifted to 65-101
    // Day 65 has originalDayNumber 64, etc. — this is a legacy layout
    expect(detectLegacyScheduleLayout(userState)).toBe(true);
  });

  it("migrates legacy layout to canonical positions", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);

    // Should be detected as legacy
    expect(detectLegacyScheduleLayout(userState)).toBe(true);

    // Migrate
    migrateToCanonicalLayout(userState);

    // After migration: no longer legacy
    expect(detectLegacyScheduleLayout(userState)).toBe(false);

    // Workbook days 1-100 should be at dayNumber 1-100
    for (let i = 1; i <= 100; i++) {
      const day = userState.schedule.days[String(i)];
      expect(day).toBeDefined();
      expect(day!.isExtensionDay).toBe(false);
      expect(day!.originalDayNumber).toBe(i);
    }

    // Extension day should be at 101
    const ext = userState.schedule.days["101"];
    expect(ext).toBeDefined();
    expect(ext!.isExtensionDay).toBe(true);

    // Migration is idempotent
    migrateToCanonicalLayout(userState);
    expect(detectLegacyScheduleLayout(userState)).toBe(false);
  });

  it("treats non-extension rows with missing originalDayNumber as legacy and repairs them", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    insertExtensionDayAfter(userState, 63);

    const shiftedWorkbookRow = userState.schedule.days["65"]!;
    expect(shiftedWorkbookRow.isExtensionDay).toBe(false);
    expect(shiftedWorkbookRow.originalDayNumber).toBe(64);

    // Simulate legacy/corrupted Supabase row: non-extension day missing originalDayNumber.
    shiftedWorkbookRow.originalDayNumber = null;
    expect(detectLegacyScheduleLayout(userState)).toBe(true);

    migrateToCanonicalLayout(userState);

    expect(detectLegacyScheduleLayout(userState)).toBe(false);
    expect(userState.schedule.days["64"]?.isExtensionDay).toBe(false);
    expect(userState.schedule.days["64"]?.originalDayNumber).toBe(64);
    expect(userState.schedule.days["101"]?.isExtensionDay).toBe(true);
  });

  it("preserves shifted mapped dates for workbook days when migrating to canonical layout", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-legacy-migration",
        anchorDayNumber: 1,
        shiftDays: 1,
        appliedAt: "2026-07-10T00:00:00.000Z",
        missedDays: [40, 41],
        bufferDayUsed: null,
        compressedPairs: [],
      },
    ];

    insertExtensionDayAfter(userState, 63);
    const expectedMappedDate = addDaysToDateOnly(userState.settings.dayOneDate!, 64);

    migrateToCanonicalLayout(userState);

    expect(detectLegacyScheduleLayout(userState)).toBe(false);
    expect(userState.schedule.days["64"]?.mappedDate).toBe(expectedMappedDate);
  });
});

describe("schedule browser multi-day completion regression", () => {
  it("marks completed days 1 through 4 as completed when all blocks and revision sessions are done", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();

    // Use IST daytime timestamps so toDateOnlyInTimeZone resolves to the same calendar date.
    // "T12:00:00Z" = 17:30 IST, safe within the same IST date.
    function completeDay(dayNumber: number, completedAt: string) {
      const day = getScheduleDay(dayNumber, userState, refData)!;
      for (const block of day.blocks.filter((b) => b.trackable)) {
        completeBlockItems(userState, dayNumber, block.timeSlotKey, completedAt, null, refData);
      }

      // Complete morning revision sessions in rounds (selectMorningQueueItems
      // caps items per budget; after completing a batch, re-selection may surface more).
      const mappedDate = addDaysToDateOnly(userState.settings.dayOneDate!, dayNumber - 1);
      for (let round = 0; round < 5; round++) {
        const plan = buildDailyRevisionPlan(mappedDate, userState, userState.settings, refData);
        if (plan.queueSessions.length === 0) break;
        for (const session of plan.queueSessions) {
          completeRevisionSession(
            userState,
            session.sourceItemId,
            session.sourceDay,
            session.sourceBlockKey,
            session.revisionIds,
            completedAt,
            { targetDate: mappedDate },
            refData,
          );
        }
      }
    }

    completeDay(1, "2026-05-01T12:00:00.000Z");
    completeDay(2, "2026-05-02T12:00:00.000Z");
    completeDay(3, "2026-05-03T12:00:00.000Z");
    completeDay(4, "2026-05-04T12:00:00.000Z");

    userState.processedDates.midnightDates.push("2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05");
    userState.processedDates.repackDates.push("2026-05-06");

    const store = createStore(userState, "2026-05-06T06:30:00.000Z");
    const days = getScheduleListData(store, "local-user");

    for (const dayNum of [1, 2, 3, 4]) {
      const entry = days.find((d) => d.dayNumber === dayNum);
      expect(entry, `Day ${dayNum} should exist`).toBeDefined();
      expect(entry!.status, `Day ${dayNum} should be completed, not ${entry!.status}`).toBe("completed");
      expect(entry!.completed, `Day ${dayNum} completed flag`).toBe(true);
    }
  }, 15_000);

  it("treats completed morning revision sessions as completed even when native morning items were marked missed", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();

    function completeNonMorningBlocks(dayNumber: number, completedAt: string) {
      const day = getScheduleDay(dayNumber, userState, refData)!;
      for (const block of day.blocks.filter((entry) => entry.trackable && entry.semanticBlockKey !== "morning_revision")) {
        completeBlockItems(userState, dayNumber, block.timeSlotKey, completedAt, null, refData);
      }
    }

    completeNonMorningBlocks(1, "2026-05-01T12:00:00.000Z");
    completeNonMorningBlocks(2, "2026-05-02T12:00:00.000Z");

    const day2Date = addDaysToDateOnly(userState.settings.dayOneDate!, 1);
    const day2Plan = buildDailyRevisionPlan(day2Date, userState, userState.settings, refData);
    expect(day2Plan.morningSessionPlanned).toBeGreaterThan(0);

    for (const session of day2Plan.queueSessions) {
      completeRevisionSession(
        userState,
        session.sourceItemId,
        session.sourceDay,
        session.sourceBlockKey,
        session.revisionIds,
        "2026-05-02T06:45:00.000Z",
        { targetDate: day2Date },
        refData,
      );
    }

    const day2 = getScheduleDay(2, userState, refData)!;
    const morningBlock = day2.blocks.find((block) => block.semanticBlockKey === "morning_revision")!;

    for (const item of morningBlock.items) {
      const assignment = userState.schedule.topicAssignments[item.itemId]!;
      assignment.status = "missed";
      assignment.sourceTag = "end_of_day_sweep";
      assignment.completedAt = null;
      assignment.updatedAt = "2026-05-02T23:59:00.000Z";
    }

    const morningProgress = getBlockProgress(userState, 2, morningBlock.timeSlotKey, refData);
    expect(morningProgress.status).toBe("completed");
    expect(getDayCompletionState(day2, userState, "green", refData)).toBe(true);

    userState.processedDates.midnightDates.push("2026-05-02");
    userState.processedDates.repackDates.push("2026-05-03");

    const rows = getScheduleListData(createStore(userState, "2026-05-03T06:30:00.000Z"), "local-user");
    expect(rows.find((row) => row.dayNumber === 2)).toMatchObject({
      completed: true,
      status: "completed",
    });
  }, 15_000);

  it("does not mark morning revision items missed during rollover when revision sessions are already completed", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();

    function completeNonMorningBlocks(dayNumber: number, completedAt: string) {
      const day = getScheduleDay(dayNumber, userState, refData)!;
      for (const block of day.blocks.filter((entry) => entry.trackable && entry.semanticBlockKey !== "morning_revision")) {
        completeBlockItems(userState, dayNumber, block.timeSlotKey, completedAt, null, refData);
      }
    }

    completeNonMorningBlocks(1, "2026-05-01T12:00:00.000Z");
    completeNonMorningBlocks(2, "2026-05-02T12:00:00.000Z");

    const day2Date = addDaysToDateOnly(userState.settings.dayOneDate!, 1);
    const day2Plan = buildDailyRevisionPlan(day2Date, userState, userState.settings, refData);
    expect(day2Plan.morningSessionPlanned).toBeGreaterThan(0);

    for (const session of day2Plan.queueSessions) {
      completeRevisionSession(
        userState,
        session.sourceItemId,
        session.sourceDay,
        session.sourceBlockKey,
        session.revisionIds,
        "2026-05-02T06:45:00.000Z",
        { targetDate: day2Date },
        refData,
      );
    }

    const day2 = getScheduleDay(2, userState, refData)!;
    const morningBlock = day2.blocks.find((block) => block.semanticBlockKey === "morning_revision")!;

    const result = moveVisibleBlocksToBacklog(
      userState,
      2,
      "green",
      { hasCompletedRevisionAnchors: true },
      refData,
    );

    expect(result.movedBlockCount).toBe(0);
    for (const item of morningBlock.items) {
      expect(userState.schedule.topicAssignments[item.itemId]?.status).not.toBe("missed");
    }
  }, 15_000);

  it("shows day as missed when morning revision sessions are NOT completed", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();

    // Complete Day 1 fully (no revision due on Day 1)
    const day1 = getScheduleDay(1, userState, refData)!;
    for (const block of day1.blocks.filter((b) => b.trackable)) {
      completeBlockItems(userState, 1, block.timeSlotKey, "2026-05-01T12:00:00.000Z", null, refData);
    }

    // Complete Day 3 native items only — NO revision sessions
    const day3 = getScheduleDay(3, userState, refData)!;
    for (const block of day3.blocks.filter((b) => b.trackable)) {
      completeBlockItems(userState, 3, block.timeSlotKey, "2026-05-03T12:00:00.000Z", null, refData);
    }

    userState.processedDates.midnightDates.push("2026-05-02", "2026-05-03", "2026-05-04");
    userState.processedDates.repackDates.push("2026-05-05");

    const store = createStore(userState, "2026-05-05T06:30:00.000Z");
    const days = getScheduleListData(store, "local-user");

    // Day 1: completed (no morning revision due)
    expect(days.find((d) => d.dayNumber === 1)).toMatchObject({
      completed: true,
      status: "completed",
    });

    // Day 3: morning revision sessions from Day 1 are due but not completed → missed
    const mappedDate3 = addDaysToDateOnly(userState.settings.dayOneDate!, 2);
    const plan3 = buildDailyRevisionPlan(mappedDate3, userState, userState.settings, refData);
    if (plan3.morningSessionPlanned > 0) {
      expect(days.find((d) => d.dayNumber === 3)).toMatchObject({
        completed: false,
        status: "missed",
      });
    }
  }, 15_000);

  it("includes assigned backlog recovery in day completion status", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);

    const refData = getStaticReferenceData();
    const day1 = getScheduleDay(1, userState, refData)!;
    const blockAKey = day1.blocks.find((block) => block.semanticBlockKey === "block_a")!.timeSlotKey;
    for (const block of day1.blocks.filter((b) => b.trackable)) {
      completeBlockItems(userState, 1, block.timeSlotKey, "2026-05-01T12:00:00.000Z", null, refData);
    }

    const store = createStore(userState, "2026-05-02T06:30:00.000Z");
    const before = getScheduleListData(store, "local-user");
    expect(before.find((d) => d.dayNumber === 1)?.status).toBe("completed");

    const backlogItem: BacklogItem = {
      id: "assigned-recovery-day1",
      sourceItemId: "assigned-recovery-day1",
      originalDay: 1,
      originalBlockKey: blockAKey,
      originalStart: null,
      originalEnd: null,
      priorityOrder: 1,
      topicDescription: "Recovery slot",
      subject: "General",
      subjectIds: [],
      subjectTier: null,
      plannedMinutes: 30,
      sourceTag: "traffic_light",
      recoveryLane: "core_recovery",
      phaseFence: "current_phase_preferred",
      phase: 1,
      manualSortOverride: null,
      status: "rescheduled",
      suggestedDay: null,
      suggestedBlockKey: null,
      suggestedNote: null,
      rescheduledToDay: 1,
      rescheduledToBlockKey: blockAKey,
      createdAt: "2026-05-01T12:10:00.000Z",
      updatedAt: "2026-05-01T12:10:00.000Z",
      completedAt: null,
      dismissedAt: null,
    };
    userState.backlogItems[backlogItem.id] = backlogItem;

    const withAssignedRecovery = getScheduleListData(store, "local-user");
    expect(withAssignedRecovery.find((d) => d.dayNumber === 1)?.status).toBe("missed");

    userState.backlogItems[backlogItem.id]!.status = "completed";
    userState.backlogItems[backlogItem.id]!.completedAt = "2026-05-01T12:20:00.000Z";
    userState.backlogItems[backlogItem.id]!.updatedAt = "2026-05-01T12:20:00.000Z";

    const afterCompletion = getScheduleListData(store, "local-user");
    expect(afterCompletion.find((d) => d.dayNumber === 1)?.status).toBe("completed");
  });
});
