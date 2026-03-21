import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import { generateWeeklySummary, getOrCreateProgress, runWeeklySummaryAutomation, upsertWeeklySummary } from "@/lib/data/app-state";
import { createRevisionId, getScheduleDay, getVisibleBlockKeys } from "@/lib/domain/schedule";
import type { BlockKey, TrafficLight, UserState } from "@/lib/domain/types";

function setTrafficLight(userState: UserState, dayNumber: number, trafficLight: TrafficLight) {
  userState.dayStates[String(dayNumber)] = {
    dayNumber,
    trafficLight,
    updatedAt: `${String(2026)}-05-${String(dayNumber + 3).padStart(2, "0")}T08:00:00.000Z`,
  };
}

function completeBlock(userState: UserState, dayNumber: number, blockKey: BlockKey, completedAt: string, actualEnd?: string) {
  const day = getScheduleDay(dayNumber);
  const slot = day?.slots.find((entry) => entry.key === blockKey);
  const progress = getOrCreateProgress(userState, dayNumber, blockKey);
  progress.status = "completed";
  progress.completedAt = completedAt;
  progress.actualStart = slot?.start ?? null;
  progress.actualEnd = actualEnd ?? slot?.end ?? null;
}

describe("weekly summary and review", () => {
  it("builds a partial weekly snapshot through today instead of counting future days", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-04";

    setTrafficLight(userState, 2, "yellow");
    setTrafficLight(userState, 3, "red");

    for (const blockKey of getVisibleBlockKeys("green")) {
      completeBlock(userState, 1, blockKey, "2026-05-04T12:00:00.000Z");
    }
    for (const blockKey of getVisibleBlockKeys("yellow")) {
      completeBlock(userState, 2, blockKey, "2026-05-05T12:00:00.000Z", blockKey === "block_a" ? "11:05" : undefined);
    }
    completeBlock(userState, 3, "block_a", "2026-05-06T10:00:00.000Z");

    userState.revisionCompletions[createRevisionId(1, "block_a", "D+1")] = {
      revisionId: createRevisionId(1, "block_a", "D+1"),
      sourceDay: 1,
      sourceBlockKey: "block_a",
      revisionType: "D+1",
      completedAt: "2026-05-05T06:45:00.000Z",
    };

    userState.backlogItems["pending-missed"] = {
      id: "pending-missed",
      originalDay: 2,
      originalBlockKey: "consolidation",
      originalStart: "14:15",
      originalEnd: "16:45",
      priorityOrder: 1,
      topicDescription: "Pathology consolidation",
      subject: "Pathology",
      sourceTag: "missed",
      status: "pending",
      suggestedDay: null,
      suggestedBlockKey: null,
      suggestedNote: null,
      rescheduledToDay: null,
      rescheduledToBlockKey: null,
      createdAt: "2026-05-05T18:00:00.000Z",
      completedAt: null,
      dismissedAt: null,
    };
    userState.backlogItems["pending-overrun"] = {
      id: "pending-overrun",
      originalDay: 3,
      originalBlockKey: "mcq",
      originalStart: "17:00",
      originalEnd: "19:30",
      priorityOrder: 2,
      topicDescription: "Reduced MCQ block",
      subject: "Pathology",
      sourceTag: "overrun_cascade",
      status: "pending",
      suggestedDay: null,
      suggestedBlockKey: null,
      suggestedNote: null,
      rescheduledToDay: null,
      rescheduledToBlockKey: null,
      createdAt: "2026-05-06T19:00:00.000Z",
      completedAt: null,
      dismissedAt: null,
    };

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
    userState.gtLogs["gt-outside-cutoff"] = {
      id: "gt-outside-cutoff",
      gtNumber: "GT-1",
      gtDate: "2026-05-10",
      dayNumber: 7,
      score: 410,
      correct: 128,
      wrong: 52,
      unattempted: 20,
      airPercentile: "AIR 7k",
      device: "tablet",
      attemptedLive: true,
      overallFeeling: "rushed",
      sectionA: { timeEnough: null, panicStarted: null, guessedTooMuch: null, timeLostOn: [] },
      sectionB: { timeEnough: null, panicStarted: null, guessedTooMuch: null, timeLostOn: [] },
      sectionC: { timeEnough: null, panicStarted: null, guessedTooMuch: null, timeLostOn: [] },
      sectionD: { timeEnough: null, panicStarted: null, guessedTooMuch: null, timeLostOn: [] },
      sectionE: { timeEnough: null, panicStarted: null, guessedTooMuch: null, timeLostOn: [] },
      errorTypes: null,
      recurringTopics: null,
      weakestSubjects: [],
      knowledgeVsBehaviour: null,
      unsureRightCount: null,
      changeBeforeNextGt: "Review trauma images.",
      createdAt: "2026-05-10T08:00:00.000Z",
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
      totalMcqsSolved: 21,
      overallAccuracy: 66.7,
      gtNumber: null,
      backlogCount: 2,
      backlogSummary: {
        totalPending: 2,
        fromMissed: 1,
        fromYellowRed: 0,
        fromOverrun: 1,
      },
      overrunBlockCount: 1,
      topWrongSubjects: [{ label: "Pathology", count: 1 }],
      topCauseCodes: [{ label: "C", count: 1 }],
    });

    expect(summary.subjectsStudied).toContain("Pathology");
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
