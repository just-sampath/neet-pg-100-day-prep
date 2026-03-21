import { describe, expect, it } from "vitest";

import { generateWeeklySummary } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import {
  buildMcqAccuracyBySubject,
  buildMcqBreakdownData,
  buildMcqDashboardSummary,
  buildMcqTrendData,
  getMcqRecentSources,
  getMcqRecentTopics,
  getMcqTopCauseCodes,
  getMcqTopWrongSubjects,
  normalizeStoredMcqBulkLog,
  normalizeStoredMcqItemLog,
  validateMcqBulkDraft,
  validateMcqItemDraft,
} from "@/lib/domain/mcq";

describe("mcq tracker and analytics", () => {
  it("validates bulk-entry math and canonical subject values", () => {
    expect(
      validateMcqBulkDraft(
        {
          entryDate: "2026-05-03",
          totalAttempted: "25",
          correct: "19",
          wrong: "6",
          subject: "medicine",
          source: " GT-07 ",
        },
        "2026-05-03",
      ),
    ).toEqual({
      ok: true,
      value: {
        entryDate: "2026-05-03",
        totalAttempted: 25,
        correct: 19,
        wrong: 6,
        subject: "Medicine",
        source: "GT-07",
      },
    });

    expect(
      validateMcqBulkDraft(
        {
          entryDate: "2026-05-03",
          totalAttempted: "25",
          correct: "19",
          wrong: "",
        },
        "2026-05-03",
      ),
    ).toEqual({
      ok: true,
      value: {
        entryDate: "2026-05-03",
        totalAttempted: 25,
        correct: 19,
        wrong: 6,
        subject: null,
        source: null,
      },
    });

    expect(
      validateMcqBulkDraft(
        {
          entryDate: "2026-05-03",
          totalAttempted: "25",
          correct: "20",
          wrong: "4",
        },
        "2026-05-03",
      ),
    ).toMatchObject({
      ok: false,
      error: "Correct and wrong must add up exactly to total attempted.",
    });
  });

  it("validates detailed entry vocab and filters unsupported chips", () => {
    expect(
      validateMcqItemDraft(
        {
          entryDate: "2026-05-03",
          mcqId: " GT-07-Q118 ",
          result: "wrong",
          subject: "pathology",
          topic: " Heme smear ",
          source: " GT-07 ",
          causeCode: "C",
          priority: "P1",
          correctRule: " Know the discriminator. ",
          whatFooledMe: " Chose the trap option. ",
          fixCodes: ["Q20", "bad", "AI"],
          tags: ["image", "nonsense", "protocol"],
        },
        "2026-05-03",
      ),
    ).toEqual({
      ok: true,
      value: {
        entryDate: "2026-05-03",
        mcqId: "GT-07-Q118",
        result: "wrong",
        subject: "Pathology",
        topic: "Heme smear",
        source: "GT-07",
        causeCode: "C",
        priority: "P1",
        correctRule: "Know the discriminator.",
        whatFooledMe: "Chose the trap option.",
        fixCodes: ["Q20", "AI"],
        tags: ["image", "protocol"],
      },
    });

    expect(
      validateMcqItemDraft(
        {
          mcqId: "GT-07-Q119",
          result: "wrong",
          causeCode: "Z",
        },
        "2026-05-03",
      ),
    ).toMatchObject({
      ok: false,
      error: "Cause code is not recognized.",
    });
  });

  it("normalizes legacy stored MCQ logs before analytics consume them", () => {
    expect(
      normalizeStoredMcqBulkLog({
        id: "bulk-1",
        entryDate: "2026-05-02",
        totalAttempted: 10,
        correct: 7,
        wrong: 3,
        subject: "medicine",
        source: " Module-1 ",
        createdAt: "2026-05-02T07:00:00.000Z",
      }),
    ).toMatchObject({
      subject: "Medicine",
      source: "Module-1",
    });

    expect(
      normalizeStoredMcqItemLog({
        id: "item-1",
        entryDate: "2026-05-02",
        mcqId: "GT-07-Q118",
        result: "Guessed Right" as never,
        subject: "pathology",
        topic: " smear ",
        source: " GT-07 ",
        causeCode: "c" as never,
        priority: "p2" as never,
        correctRule: " rule ",
        whatFooledMe: " clue ",
        fixCodes: ["q20", "bad", "ai"] as never,
        tags: ["Protocol", "other"] as never,
        createdAt: "2026-05-02T08:00:00.000Z",
      }),
    ).toMatchObject({
      result: "guessed_right",
      subject: "Pathology",
      topic: "smear",
      source: "GT-07",
      causeCode: "C",
      priority: "P2",
      fixCodes: ["Q20", "AI"],
      tags: ["protocol"],
    });
  });

  it("builds recent suggestions and analytics across bulk and one-by-one logs", () => {
    const userState = createEmptyUserState();

    userState.mcqBulkLogs["bulk-1"] = {
      id: "bulk-1",
      entryDate: "2026-05-02",
      totalAttempted: 20,
      correct: 14,
      wrong: 6,
      subject: "Medicine",
      source: "Module-MED-01",
      createdAt: "2026-05-02T08:00:00.000Z",
    };
    userState.mcqBulkLogs["bulk-2"] = {
      id: "bulk-2",
      entryDate: "2026-05-03",
      totalAttempted: 10,
      correct: 9,
      wrong: 1,
      subject: "Pathology",
      source: "GT-07",
      createdAt: "2026-05-03T08:00:00.000Z",
    };

    userState.mcqItemLogs["item-1"] = {
      id: "item-1",
      entryDate: "2026-05-02",
      mcqId: "GT-07-Q118",
      result: "right",
      subject: "Medicine",
      topic: "CVS murmurs",
      source: "GT-07",
      causeCode: null,
      priority: null,
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: [],
      createdAt: "2026-05-02T09:00:00.000Z",
    };
    userState.mcqItemLogs["item-2"] = {
      id: "item-2",
      entryDate: "2026-05-02",
      mcqId: "GT-07-Q119",
      result: "wrong",
      subject: "Medicine",
      topic: "CVS murmurs",
      source: "GT-07",
      causeCode: "C",
      priority: "P1",
      correctRule: null,
      whatFooledMe: null,
      fixCodes: ["Q20"],
      tags: ["protocol"],
      createdAt: "2026-05-02T09:10:00.000Z",
    };
    userState.mcqItemLogs["item-3"] = {
      id: "item-3",
      entryDate: "2026-05-03",
      mcqId: "GT-07-Q120",
      result: "guessed_right",
      subject: "Pathology",
      topic: "Heme smear",
      source: "GT-07",
      causeCode: null,
      priority: null,
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: ["image"],
      createdAt: "2026-05-03T09:00:00.000Z",
    };
    userState.mcqItemLogs["item-4"] = {
      id: "item-4",
      entryDate: "2026-05-03",
      mcqId: "MOD-SUR-03-Q17",
      result: "wrong",
      subject: "Surgery",
      topic: "Trauma",
      source: "Module-SUR-03",
      causeCode: "T",
      priority: null,
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: [],
      createdAt: "2026-05-03T09:15:00.000Z",
    };
    userState.mcqItemLogs["item-5"] = {
      id: "item-5",
      entryDate: "2026-05-03",
      mcqId: "MOD-MED-02-Q11",
      result: "wrong",
      subject: "Medicine",
      topic: "Shock",
      source: "Module-MED-02",
      causeCode: "C",
      priority: null,
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: [],
      createdAt: "2026-05-03T09:30:00.000Z",
    };

    expect(getMcqRecentTopics(Object.values(userState.mcqItemLogs), 3)).toEqual(["Shock", "Trauma", "Heme smear"]);
    expect(getMcqRecentSources(Object.values(userState.mcqBulkLogs), Object.values(userState.mcqItemLogs), 4)).toEqual([
      "Module-MED-02",
      "Module-SUR-03",
      "GT-07",
      "Module-MED-01",
    ]);

    expect(buildMcqDashboardSummary(userState)).toMatchObject({
      totalSolved: 35,
      totalCorrect: 25,
      totalWrong: 10,
      guessedRight: 1,
      detailedEntries: 5,
      accuracy: 71.4,
    });

    expect(buildMcqTrendData(userState)).toEqual([
      {
        label: "2026-05-02",
        attempted: 22,
        correct: 15,
        wrong: 7,
        guessedRight: 0,
        accuracy: 68.2,
      },
      {
        label: "2026-05-03",
        attempted: 13,
        correct: 10,
        wrong: 3,
        guessedRight: 1,
        accuracy: 76.9,
      },
    ]);

    expect(buildMcqBreakdownData(userState)).toEqual([
      { label: "Right", value: 24 },
      { label: "Guessed Right", value: 1 },
      { label: "Wrong", value: 10 },
    ]);

    expect(buildMcqAccuracyBySubject(userState)).toEqual([
      { subject: "Pathology", attempted: 11, correct: 10, accuracy: 90.9 },
      { subject: "Medicine", attempted: 23, correct: 15, accuracy: 65.2 },
      { subject: "Surgery", attempted: 1, correct: 0, accuracy: 0 },
    ]);

    expect(getMcqTopWrongSubjects(userState)).toEqual([
      { label: "Medicine", count: 2 },
      { label: "Surgery", count: 1 },
    ]);
    expect(getMcqTopCauseCodes(userState)).toEqual([
      { label: "C", count: 2 },
      { label: "T", count: 1 },
    ]);
  });

  it("feeds wrong-subject and cause-code insight into weekly summaries", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-04";

    userState.mcqBulkLogs["bulk-1"] = {
      id: "bulk-1",
      entryDate: "2026-05-04",
      totalAttempted: 20,
      correct: 14,
      wrong: 6,
      subject: "Medicine",
      source: "Module-MED-01",
      createdAt: "2026-05-04T08:00:00.000Z",
    };
    userState.mcqItemLogs["item-1"] = {
      id: "item-1",
      entryDate: "2026-05-05",
      mcqId: "GT-07-Q119",
      result: "wrong",
      subject: "Medicine",
      topic: "Shock",
      source: "GT-07",
      causeCode: "C",
      priority: "P1",
      correctRule: null,
      whatFooledMe: null,
      fixCodes: ["Q20"],
      tags: ["protocol"],
      createdAt: "2026-05-05T09:00:00.000Z",
    };
    userState.mcqItemLogs["item-2"] = {
      id: "item-2",
      entryDate: "2026-05-06",
      mcqId: "MOD-SUR-03-Q17",
      result: "wrong",
      subject: "Surgery",
      topic: "Trauma",
      source: "Module-SUR-03",
      causeCode: "T",
      priority: "P2",
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: [],
      createdAt: "2026-05-06T09:00:00.000Z",
    };
    userState.mcqItemLogs["item-3"] = {
      id: "item-3",
      entryDate: "2026-05-06",
      mcqId: "MOD-MED-02-Q11",
      result: "wrong",
      subject: "Medicine",
      topic: "CVS",
      source: "Module-MED-02",
      causeCode: "C",
      priority: null,
      correctRule: null,
      whatFooledMe: null,
      fixCodes: [],
      tags: [],
      createdAt: "2026-05-06T10:00:00.000Z",
    };

    const summary = generateWeeklySummary(userState, userState.settings, "2026-05-04");

    expect(summary.totalMcqsSolved).toBe(23);
    expect(summary.overallAccuracy).toBe(60.9);
    expect(summary.topWrongSubjects).toEqual([
      { label: "Medicine", count: 2 },
      { label: "Surgery", count: 1 },
    ]);
    expect(summary.topCauseCodes).toEqual([
      { label: "C", count: 2 },
      { label: "T", count: 1 },
    ]);
  });
});
