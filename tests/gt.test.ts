import { describe, expect, it } from "vitest";

import { generateWeeklySummary } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import {
  buildGtComparisonSummary,
  buildGtDashboardSummary,
  buildGtScoreTrend,
  buildGtSectionPatterns,
  buildGtSectionTimeLostSummary,
  buildGtWeaknessPatterns,
  buildGtWrapperTrend,
  emptyGtSectionBreakdown,
  getMappedGtSchedule,
  getSuggestedGtPlanItem,
  normalizeStoredGtLog,
  validateGtDraft,
} from "@/lib/domain/gt";

describe("gt tracker and analytics", () => {
  it("validates GT form fields, attempt context, section structure, and weakest-subject tags", () => {
    expect(
      validateGtDraft(
        {
          gtNumber: " GT-5 ",
          gtDate: "2026-07-05",
          dayNumber: "66",
          score: "123",
          correct: "118",
          wrong: "62",
          unattempted: "20",
          airPercentile: " AIR 6.4k / 98.7% ",
          device: "tablet",
          attemptedLive: "yes",
          overallFeeling: "overthinking",
          errorTypes: " Changed too many answers late. ",
          recurringTopics: "CVS, trauma\nsepsis, endocrinology",
          weakestSubjects: ["medicine", "Surgery", "invalid"],
          knowledgeVsBehaviour: "62",
          unsureRightCount: "14",
          changeBeforeNextGt: " Stop changing marked answers without evidence. ",
          sectionA: {
            timeEnough: "yes",
            panicStarted: "no",
            guessedTooMuch: "no",
            timeLostOn: ["image", "biostats"],
          },
          sectionB: {
            timeEnough: "no",
            panicStarted: "yes",
            guessedTooMuch: "yes",
            timeLostOn: ["lengthy_clinical", "bad"],
          },
          sectionC: {},
          sectionD: {},
          sectionE: {},
        },
        "2026-07-05",
      ),
    ).toEqual({
      ok: true,
      value: {
        gtNumber: "GT-5",
        gtDate: "2026-07-05",
        dayNumber: 66,
        score: 123,
        correct: 118,
        wrong: 62,
        unattempted: 20,
        airPercentile: "AIR 6.4k / 98.7%",
        device: "tablet",
        attemptedLive: true,
        overallFeeling: "overthinking",
        errorTypes: "Changed too many answers late.",
        recurringTopics: "CVS, trauma, sepsis",
        weakestSubjects: ["Medicine", "Surgery"],
        knowledgeVsBehaviour: 62,
        unsureRightCount: 14,
        changeBeforeNextGt: "Stop changing marked answers without evidence.",
        sectionA: {
          timeEnough: true,
          panicStarted: false,
          guessedTooMuch: false,
          timeLostOn: ["image", "biostats"],
        },
        sectionB: {
          timeEnough: false,
          panicStarted: true,
          guessedTooMuch: true,
          timeLostOn: ["lengthy_clinical"],
        },
        sectionC: {
          timeEnough: null,
          panicStarted: null,
          guessedTooMuch: null,
          timeLostOn: [],
        },
        sectionD: {
          timeEnough: null,
          panicStarted: null,
          guessedTooMuch: null,
          timeLostOn: [],
        },
        sectionE: {
          timeEnough: null,
          panicStarted: null,
          guessedTooMuch: null,
          timeLostOn: [],
        },
      },
    });

    expect(
      validateGtDraft(
        {
          gtNumber: "GT-5",
          knowledgeVsBehaviour: "120",
        },
        "2026-07-05",
      ),
    ).toMatchObject({
      ok: false,
      error: "Knowledge vs behaviour must stay between 0 and 100.",
    });
  });

  it("normalizes stored GT logs and keeps shifted GT schedule context aligned", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-1",
        anchorDayNumber: 66,
        shiftDays: 1,
        appliedAt: "2026-07-01T00:00:00.000Z",
        missedDays: [66, 67],
        bufferDayUsed: 84,
        compressedPairs: [],
      },
    ];

    expect(
      normalizeStoredGtLog({
        id: "gt-1",
        gtNumber: " GT-5 ",
        gtDate: "2026-07-05",
        dayNumber: 66,
        score: 123,
        correct: 118,
        wrong: 62,
        unattempted: 20,
        airPercentile: " 98.7% ",
        device: "TABLET" as never,
        attemptedLive: true,
        overallFeeling: "Overthinking" as never,
        sectionA: {
          timeEnough: false,
          panicStarted: true,
          guessedTooMuch: false,
          timeLostOn: ["Image", "Algorithms"] as never,
        },
        sectionB: emptyGtSectionBreakdown(),
        sectionC: emptyGtSectionBreakdown(),
        sectionD: emptyGtSectionBreakdown(),
        sectionE: emptyGtSectionBreakdown(),
        errorTypes: "  late panic ",
        recurringTopics: " sepsis, cvs ",
        weakestSubjects: ["medicine", "invalid"] as never,
        knowledgeVsBehaviour: 62,
        unsureRightCount: 14,
        changeBeforeNextGt: "  slow down ",
        createdAt: "2026-07-05T10:00:00.000Z",
      }),
    ).toMatchObject({
      gtNumber: "GT-5",
      airPercentile: "98.7%",
      device: "tablet",
      overallFeeling: "overthinking",
      sectionA: {
        timeLostOn: ["image", "algorithms"],
      },
      recurringTopics: "sepsis, cvs",
      weakestSubjects: ["Medicine"],
      changeBeforeNextGt: "slow down",
    });

    const mappedSchedule = getMappedGtSchedule(userState.settings, "2026-07-06");
    expect(mappedSchedule.find((item) => item.dayNumber === 66)).toMatchObject({
      label: "GT-1",
      mappedDate: "2026-07-06",
      isToday: true,
    });
    expect(mappedSchedule.find((item) => item.dayNumber === 95)?.label).toBe("120Q half-simulation");
    expect(getSuggestedGtPlanItem(userState.settings, "2026-07-06")?.dayNumber).toBe(66);
  });

  it("builds GT analytics for score trend, section patterns, comparison, wrapper trend, and weakness repetition", () => {
    const logs = [
      normalizeStoredGtLog({
        id: "gt-1",
        gtNumber: "GT-1",
        gtDate: "2026-06-10",
        dayNumber: 66,
        score: 410,
        correct: 128,
        wrong: 52,
        unattempted: 20,
        airPercentile: "96.1",
        device: "laptop",
        attemptedLive: true,
        overallFeeling: "rushed",
        sectionA: { timeEnough: true, panicStarted: false, guessedTooMuch: false, timeLostOn: ["image"] },
        sectionB: { timeEnough: false, panicStarted: true, guessedTooMuch: true, timeLostOn: ["lengthy_clinical"] },
        sectionC: { timeEnough: false, panicStarted: true, guessedTooMuch: false, timeLostOn: ["algorithms"] },
        sectionD: { timeEnough: true, panicStarted: false, guessedTooMuch: false, timeLostOn: [] },
        sectionE: { timeEnough: false, panicStarted: true, guessedTooMuch: true, timeLostOn: ["biostats"] },
        errorTypes: "Panic and late guessing.",
        recurringTopics: "Sepsis, Trauma",
        weakestSubjects: ["Medicine", "Surgery"],
        knowledgeVsBehaviour: 58,
        unsureRightCount: 11,
        changeBeforeNextGt: "Slow the first pass.",
        createdAt: "2026-06-10T10:00:00.000Z",
      }),
      normalizeStoredGtLog({
        id: "gt-2",
        gtNumber: "GT-2",
        gtDate: "2026-06-17",
        dayNumber: 72,
        score: 452,
        correct: 138,
        wrong: 42,
        unattempted: 20,
        airPercentile: "97.4",
        device: "tablet",
        attemptedLive: false,
        overallFeeling: "calm",
        sectionA: { timeEnough: true, panicStarted: false, guessedTooMuch: false, timeLostOn: [] },
        sectionB: { timeEnough: true, panicStarted: false, guessedTooMuch: false, timeLostOn: ["lengthy_clinical"] },
        sectionC: { timeEnough: false, panicStarted: true, guessedTooMuch: false, timeLostOn: ["algorithms"] },
        sectionD: { timeEnough: true, panicStarted: false, guessedTooMuch: false, timeLostOn: [] },
        sectionE: { timeEnough: false, panicStarted: true, guessedTooMuch: false, timeLostOn: ["biostats"] },
        errorTypes: "Section C still slips.",
        recurringTopics: "Trauma, Shock",
        weakestSubjects: ["Surgery", "Medicine"],
        knowledgeVsBehaviour: 66,
        unsureRightCount: 8,
        changeBeforeNextGt: "Trust first instinct when calm.",
        createdAt: "2026-06-17T10:00:00.000Z",
      }),
    ];

    expect(buildGtDashboardSummary(logs)).toMatchObject({
      totalLogs: 2,
      latestGt: "GT-2",
      latestScore: 452,
      latestAir: "97.4",
      avgKnowledge: 62,
    });

    expect(buildGtScoreTrend(logs)).toEqual([
      { label: "GT-1", score: 410, accuracy: 71.1, air: 96.1 },
      { label: "GT-2", score: 452, accuracy: 76.7, air: 97.4 },
    ]);

    expect(buildGtSectionPatterns(logs)).toEqual([
      { section: "A", notEnoughTime: 0, panic: 0, guessedTooMuch: 0 },
      { section: "B", notEnoughTime: 1, panic: 1, guessedTooMuch: 1 },
      { section: "C", notEnoughTime: 2, panic: 2, guessedTooMuch: 0 },
      { section: "D", notEnoughTime: 0, panic: 0, guessedTooMuch: 0 },
      { section: "E", notEnoughTime: 2, panic: 2, guessedTooMuch: 1 },
    ]);

    expect(buildGtSectionTimeLostSummary(logs).find((entry) => entry.section === "C")).toEqual({
      section: "C",
      reasons: [{ code: "algorithms", label: "Algorithms", count: 2 }],
    });

    expect(buildGtComparisonSummary(logs)).toMatchObject({
      latestLabel: "GT-2",
      previousLabel: "GT-1",
      scoreDelta: 42,
      correctDelta: 10,
      wrongDelta: -10,
      unattemptedDelta: 0,
      airDelta: 1.3,
      airMetricKind: "percentile",
    });

    expect(buildGtWrapperTrend(logs)).toEqual([
      { label: "GT-1", knowledge: 58, behaviour: 42, unsureRight: 11 },
      { label: "GT-2", knowledge: 66, behaviour: 34, unsureRight: 8 },
    ]);

    expect(buildGtWeaknessPatterns(logs)).toEqual({
      subjects: [
        { label: "Medicine", count: 2 },
        { label: "Surgery", count: 2 },
      ],
      topics: [
        { label: "Trauma", count: 2 },
        { label: "Sepsis", count: 1 },
        { label: "Shock", count: 1 },
      ],
    });
  });

  it("treats AIR and percentile changes with the correct comparison direction metadata", () => {
    const comparison = buildGtComparisonSummary([
      normalizeStoredGtLog({
        id: "gt-air-1",
        gtNumber: "GT-7",
        gtDate: "2026-07-01",
        dayNumber: 93,
        score: 498,
        correct: 149,
        wrong: 31,
        unattempted: 20,
        airPercentile: "AIR 6400",
        device: null,
        attemptedLive: null,
        overallFeeling: null,
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
        changeBeforeNextGt: null,
        createdAt: "2026-07-01T10:00:00.000Z",
      }),
      normalizeStoredGtLog({
        id: "gt-air-2",
        gtNumber: "GT-8",
        gtDate: "2026-07-08",
        dayNumber: 96,
        score: 515,
        correct: 154,
        wrong: 26,
        unattempted: 20,
        airPercentile: "AIR 5900",
        device: null,
        attemptedLive: null,
        overallFeeling: null,
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
        changeBeforeNextGt: null,
        createdAt: "2026-07-08T10:00:00.000Z",
      }),
    ]);

    expect(comparison).toMatchObject({
      airDelta: -500,
      airMetricKind: "air",
    });
  });

  it("keeps the weekly summary GT payload aligned to the latest GT in the week", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    userState.gtLogs["gt-1"] = normalizeStoredGtLog({
      id: "gt-1",
      gtNumber: "GT-1",
      gtDate: "2026-07-06",
      dayNumber: 66,
      score: 410,
      correct: 128,
      wrong: 52,
      unattempted: 20,
      airPercentile: "96.1",
      device: "laptop",
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
      knowledgeVsBehaviour: 58,
      unsureRightCount: 11,
      changeBeforeNextGt: "Slow the first pass.",
      createdAt: "2026-07-06T10:00:00.000Z",
    });
    userState.gtLogs["gt-2"] = normalizeStoredGtLog({
      id: "gt-2",
      gtNumber: "GT-2",
      gtDate: "2026-07-08",
      dayNumber: 72,
      score: 452,
      correct: 138,
      wrong: 42,
      unattempted: 20,
      airPercentile: "97.4",
      device: "tablet",
      attemptedLive: false,
      overallFeeling: "calm",
      sectionA: emptyGtSectionBreakdown(),
      sectionB: emptyGtSectionBreakdown(),
      sectionC: emptyGtSectionBreakdown(),
      sectionD: emptyGtSectionBreakdown(),
      sectionE: emptyGtSectionBreakdown(),
      errorTypes: null,
      recurringTopics: null,
      weakestSubjects: [],
      knowledgeVsBehaviour: 66,
      unsureRightCount: 8,
      changeBeforeNextGt: "Trust first instinct when calm.",
      createdAt: "2026-07-08T10:00:00.000Z",
    });

    const summary = generateWeeklySummary(userState, userState.settings, "2026-07-06");

    expect(summary.gtNumber).toBe("GT-2");
    expect(summary.gtScore).toBe(452);
    expect(summary.gtAir).toBe("97.4");
    expect(summary.gtWrapperSummary).toBe("Trust first instinct when calm.");
  });
});
