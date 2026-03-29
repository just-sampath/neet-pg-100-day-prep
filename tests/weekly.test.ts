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
    completeBlockItems(userState, 3, getScheduleDay(3)!.blocks.find((block) => block.semanticBlockKey === "block_a")!.timeSlotKey, "2026-05-06T10:00:00.000Z");

    const day2BlockA = getScheduleDay(2)!.blocks.find((block) => block.semanticBlockKey === "block_a")!;
    const day2BlockATiming = getOrCreateProgress(userState, 2, day2BlockA.timeSlotKey);
    day2BlockATiming.actualStart = "08:00";
    day2BlockATiming.actualEnd = "11:20";

    const day2FirstTopic = day2BlockA.items[0]!;
    const day2RevisionId = createRevisionId(day2FirstTopic.itemId, "D+1");
    userState.revisionCompletions[day2RevisionId] = {
      revisionId: day2RevisionId,
      sourceItemId: day2FirstTopic.itemId,
      sourceDay: 2,
      sourceBlockKey: day2BlockA.timeSlotKey,
      revisionType: "D+1",
      completedAt: "2026-05-06T06:45:00.000Z",
    };

    moveBlockToBacklog(
      userState,
      2,
      getScheduleDay(2)!.blocks.find((block) => block.semanticBlockKey === "final_review")!.timeSlotKey,
      "missed",
      "missed",
      "Needs recovery.",
    );
    moveBlockToBacklog(
      userState,
      3,
      getScheduleDay(3)!.blocks.find((block) => block.semanticBlockKey === "mcq_practice")!.timeSlotKey,
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
      greenDays: 1,
      yellowDays: 1,
      redDays: 1,
      totalMcqsSolved: 21,
      gtNumber: "GT-0",
      gtScore: 410,
      gtWrapperSummary: "Review trauma images.",
    });
    expect(summary.blocksCompleted).toBeLessThan(summary.blocksPlanned);
    expect(summary.morningRevisionCompleted).toBe(0);
    expect(summary.backlogCount).toBeGreaterThan(0);
    expect(summary.backlogSummary.totalPending).toBe(summary.backlogCount);
    expect(summary.subjectsStudied).toContain("Pathology");
    expect(summary.topWrongSubjects).toEqual([{ label: "Pathology", count: 1 }]);
    expect(summary.topCauseCodes).toEqual([{ label: "C", count: 1 }]);
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
      source: "GT-1",
      createdAt: "2026-05-09T08:00:00.000Z",
    };

    const refreshed = upsertWeeklySummary(userState, userState.settings, "2026-05-04", "2026-05-10");
    expect(Object.keys(userState.weeklySummaries)).toHaveLength(1);
    expect(refreshed.id).toBe(partial.id);
    expect(refreshed.isPartialWeek).toBe(false);
    expect(refreshed.totalMcqsSolved).toBe(30);
  });
});
