import { describe, expect, it } from "vitest";

import {
  completeBlockItems,
  generateWeeklySummary,
  getOrCreateProgress,
  moveBlockToBacklog,
  runWeeklySummaryAutomation,
  upsertWeeklySummary,
} from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { emptyGtSectionBreakdown } from "@/lib/domain/gt";
import { createRevisionId, getScheduleDay, getVisibleBlockKeys } from "@/lib/domain/schedule";
import type { TrafficLight, UserState } from "@/lib/domain/types";

function setTrafficLight(userState: UserState, dayNumber: number, trafficLight: TrafficLight) {
  userState.dayStates[String(dayNumber)] = {
    dayNumber,
    trafficLight,
    updatedAt: `2026-05-${String(dayNumber + 3).padStart(2, "0")}T08:00:00.000Z`,
  };
}

function completeVisibleBlocks(userState: UserState, dayNumber: number, trafficLight: TrafficLight, completedAt: string) {
  const day = getScheduleDay(dayNumber)!;
  for (const blockKey of getVisibleBlockKeys(trafficLight, day)) {
    completeBlockItems(userState, dayNumber, blockKey, completedAt);
  }
}

describe("weekly summary and review", () => {
  it("builds a partial weekly snapshot through today instead of counting future days", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-04";

    setTrafficLight(userState, 2, "yellow");
    setTrafficLight(userState, 3, "red");

    completeVisibleBlocks(userState, 1, "green", "2026-05-04T12:00:00.000Z");
    completeVisibleBlocks(userState, 2, "yellow", "2026-05-05T12:00:00.000Z");
    completeBlockItems(userState, 3, getScheduleDay(3)!.blocks.find((block) => block.semanticBlockKey === "study_block_1")!.timeSlotKey, "2026-05-06T10:00:00.000Z");

    const day2StudyBlock1 = getScheduleDay(2)!.blocks.find((block) => block.semanticBlockKey === "study_block_1")!;
    const day2StudyBlock1Timing = getOrCreateProgress(userState, 2, day2StudyBlock1.timeSlotKey);
    day2StudyBlock1Timing.actualStart = "08:15";
    day2StudyBlock1Timing.actualEnd = "11:05";

    const day2FirstTopic = day2StudyBlock1.items[0]!;
    const day2RevisionId = createRevisionId(day2FirstTopic.itemId, "D+1");
    userState.revisionCompletions[day2RevisionId] = {
      revisionId: day2RevisionId,
      sourceItemId: day2FirstTopic.itemId,
      sourceDay: 2,
      sourceBlockKey: day2StudyBlock1.timeSlotKey,
      revisionType: "D+1",
      completedAt: "2026-05-06T06:45:00.000Z",
    };

    moveBlockToBacklog(
      userState,
      2,
      getScheduleDay(2)!.blocks.find((block) => block.semanticBlockKey === "consolidation_block")!.timeSlotKey,
      "missed",
      "missed",
      "Needs recovery.",
    );
    moveBlockToBacklog(
      userState,
      3,
      getScheduleDay(3)!.blocks.find((block) => block.semanticBlockKey === "mcq_block")!.timeSlotKey,
      "overrun_cascade",
      "rescheduled",
      "Reduced after an overrun.",
    );

    userState.mcqBulkLogs["bulk-1"] = {
      id: "bulk-1",
      entryDate: "2026-05-05",
      totalAttempted: 20,
      correct: 14,
      wrong: 6,
      subject: "Pathology",
      source: "Module-PATH-01",
      createdAt: "2026-05-05T08:00:00.000Z",
    };
    userState.mcqItemLogs["item-1"] = {
      id: "item-1",
      entryDate: "2026-05-06",
      mcqId: "PATH-01-Q14",
      result: "wrong",
      subject: "Pathology",
      topic: "Heme smear",
      source: "Module-PATH-01",
      causeCode: "C",
      priority: "P1",
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: [],
      createdAt: "2026-05-06T09:00:00.000Z",
    };
    userState.mcqBulkLogs["bulk-outside-week"] = {
      id: "bulk-outside-week",
      entryDate: "2026-05-08",
      totalAttempted: 50,
      correct: 40,
      wrong: 10,
      subject: "Medicine",
      source: "GT-1",
      createdAt: "2026-05-08T08:00:00.000Z",
    };
    userState.gtLogs["gt-in-week"] = {
      id: "gt-in-week",
      gtNumber: "GT-0",
      gtDate: "2026-05-06",
      dayNumber: 3,
      score: 410,
      correct: 128,
      wrong: 52,
      unattempted: 20,
      airPercentile: "AIR 7k",
      device: "tablet",
      attemptedLive: true,
      overallFeeling: "rushed",
      sectionA: emptyGtSectionBreakdown(),
      sectionB: emptyGtSectionBreakdown(),
      sectionC: emptyGtSectionBreakdown(),
      sectionD: emptyGtSectionBreakdown(),
      sectionE: emptyGtSectionBreakdown(),
      errorTypes: null,
      recurringTopics: null,
      weakestSubjects: [],
      knowledgeVsBehaviour: null,
      unsureRightCount: null,
      changeBeforeNextGt: "Review trauma images.",
      createdAt: "2026-05-06T08:00:00.000Z",
    };

    const summary = generateWeeklySummary(userState, userState.settings, "2026-05-04", {
      throughDate: "2026-05-06",
    });

    expect(summary).toMatchObject({
      weekStartDate: "2026-05-04",
      weekEndDate: "2026-05-10",
      coveredThroughDate: "2026-05-06",
      isPartialWeek: true,
      blocksPlanned: 15,
      blocksCompleted: 13,
      blocksCompletedRate: 86.7,
      greenDays: 1,
      yellowDays: 1,
      redDays: 1,
      morningRevisionPlanned: 5,
      morningRevisionCompleted: 1,
      totalMcqsSolved: 21,
      overallAccuracy: 66.7,
      gtNumber: "GT-0",
      backlogCount: 4,
      backlogSummary: {
        totalPending: 4,
        fromMissed: 2,
        fromYellowRed: 0,
        fromOverrun: 2,
      },
      overrunBlockCount: 1,
      topWrongSubjects: [{ label: "Pathology", count: 1 }],
      topCauseCodes: [{ label: "C", count: 1 }],
    });

    expect(summary.subjectsStudied).toContain("Pathology");
    expect(summary.overrunBlocks[0]?.label).toContain("Pathology");
  });

  it("waits until Sunday 23:30 IST before auto-generating the weekly summary", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-04";

    const beforeCutoff = runWeeklySummaryAutomation(userState, userState.settings, "2026-05-10T23:29:00+05:30");
    expect(beforeCutoff).toEqual({
      generated: false,
      weekStart: "2026-05-04",
      summaryId: null,
    });
    expect(Object.keys(userState.weeklySummaries)).toHaveLength(0);

    const atCutoff = runWeeklySummaryAutomation(userState, userState.settings, "2026-05-10T23:30:00+05:30");
    expect(atCutoff.generated).toBe(true);
    expect(atCutoff.weekStart).toBe("2026-05-04");
    expect(atCutoff.summaryId).not.toBeNull();
    expect(Object.keys(userState.weeklySummaries)).toHaveLength(1);
    expect(userState.processedDates.weeklySummaryDates).toEqual(["2026-05-04"]);
  });

  it("upserts the same stored week instead of creating duplicates on regeneration", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-04";

    userState.mcqBulkLogs["bulk-midweek"] = {
      id: "bulk-midweek",
      entryDate: "2026-05-06",
      totalAttempted: 10,
      correct: 8,
      wrong: 2,
      subject: "Pathology",
      source: "Module-PATH-01",
      createdAt: "2026-05-06T08:00:00.000Z",
    };

    const partial = upsertWeeklySummary(userState, userState.settings, "2026-05-04", "2026-05-06");
    expect(Object.keys(userState.weeklySummaries)).toHaveLength(1);
    expect(partial.isPartialWeek).toBe(true);

    userState.mcqBulkLogs["bulk-final"] = {
      id: "bulk-final",
      entryDate: "2026-05-09",
      totalAttempted: 20,
      correct: 15,
      wrong: 5,
      subject: "Medicine",
      source: "Module-MED-01",
      createdAt: "2026-05-09T08:00:00.000Z",
    };

    const final = upsertWeeklySummary(userState, userState.settings, "2026-05-04", "2026-05-10");

    expect(final.id).toBe(partial.id);
    expect(final.isPartialWeek).toBe(false);
    expect(final.coveredThroughDate).toBe("2026-05-10");
    expect(final.totalMcqsSolved).toBe(30);
    expect(Object.keys(userState.weeklySummaries)).toHaveLength(1);
  });

  it("upgrades an in-progress manual snapshot to the final Sunday summary instead of skipping it", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-04";

    const partial = upsertWeeklySummary(userState, userState.settings, "2026-05-04", "2026-05-06");
    const result = runWeeklySummaryAutomation(userState, userState.settings, "2026-05-10T23:30:00+05:30");

    expect(result.generated).toBe(true);
    expect(result.summaryId).toBe(partial.id);
    expect(userState.weeklySummaries[partial.id]).toMatchObject({
      id: partial.id,
      isPartialWeek: false,
      coveredThroughDate: "2026-05-10",
    });
  });
});
