import { describe, expect, it } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import { applyAutomationsWithMode, applyTrafficLightToDay, completeBlockItems, getDayDetailData, getHomeData, getScheduleListData } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { applyScheduleMappingsFromSettings, buildExtensionDayRows, ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getOriginalPlannedDate, getScheduleDay, getScheduleDayEditState } from "@/lib/domain/schedule";
import type { LocalStore, UserState } from "@/lib/domain/types";
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

    const detail = getDayDetailData(createStore(userState, "2026-05-03T06:30:00.000Z"), "local-user", 64);

    expect(detail).toMatchObject({
      runtimeDayNumber: 65,
      displayDayNumber: 64,
      mappedDate: addDaysToDateOnly("2026-07-03", 1),
      originalPlannedDate: "2026-07-03",
    });
    expect(detail?.day.primaryFocusRaw).toBe(originalDay64.primaryFocusRaw);
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
