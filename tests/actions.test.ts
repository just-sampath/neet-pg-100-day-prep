import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import type { LocalStore } from "@/lib/domain/types";

let testStore: LocalStore;

function captureRuntimeEnv() {
  return {
    runtime: process.env.BESIDE_YOU_RUNTIME,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

function enableSupabaseRuntime() {
  process.env.BESIDE_YOU_RUNTIME = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
}

function restoreRuntimeEnv(snapshot: ReturnType<typeof captureRuntimeEnv>) {
  if (snapshot.runtime === undefined) {
    delete process.env.BESIDE_YOU_RUNTIME;
  } else {
    process.env.BESIDE_YOU_RUNTIME = snapshot.runtime;
  }

  if (snapshot.url === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = snapshot.url;
  }

  if (snapshot.anonKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = snapshot.anonKey;
  }
}

vi.mock("next/cache", () => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  requireCurrentUser: vi.fn(async () => ({ id: "test-user" })),
}));

vi.mock("@/lib/data/local-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/local-store")>("@/lib/data/local-store");

  return {
    ...actual,
    getEffectiveNow: vi.fn(() => new Date("2026-05-10T06:30:00.000Z")),
    mutateStore: vi.fn(async (updater: (store: LocalStore) => unknown) => updater(testStore)),
    mutateScheduleStore: vi.fn(async (updater: (store: LocalStore) => unknown) => updater(testStore)),
    mutateActivityStore: vi.fn(async (updater: (store: LocalStore) => unknown) => updater(testStore)),
  };
});

import { createEmptyUserState } from "@/lib/data/local-store";
import { rebalanceEarlyFinishSchedule, runEndOfDaySweep, pullTopicForward, completeBlockItems, getHomeData } from "@/lib/data/app-state";
import { buildExtensionDayRows, ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay, getBlockProgress, buildDailyRevisionPlan, getScheduleDays, invalidateRuntimeScheduleIndex } from "@/lib/domain/schedule";
import { acceptEarlyFinishAction, submitGtAction, submitMcqBulkAction, submitMcqItemAction, updateTopicAction, updateBlockAction } from "@/lib/server/actions";
import { refresh } from "next/cache";
import { buildAcceptEarlyFinishFormData, keepOnlyDayAssignments, setBlockActualEnd } from "./test-helpers/schedule-test-utils";
import { addDaysToDateOnly } from "@/lib/utils/date";

function getMaxRuntimeDayNumber(userState: LocalStore["userState"][string]) {
  return Math.max(...Object.values(userState.schedule.days).map((row) => row.dayNumber));
}

function appendTailExtensionDay(userState: LocalStore["userState"][string]) {
  const phaseThree = Object.values(userState.schedule.phaseConfig).find((phase) => phase.phaseNumber === 3);
  if (!phaseThree) {
    throw new Error("Missing phase 3 config");
  }

  const tailDayNumber = getMaxRuntimeDayNumber(userState);
  const tailDayRow = userState.schedule.days[String(tailDayNumber)];
  if (!tailDayRow) {
    throw new Error(`Missing tail day ${tailDayNumber}`);
  }

  const nextDayNumber = tailDayNumber + 1;
  const mappedDate = addDaysToDateOnly(tailDayRow.mappedDate, 1);
  const nowIso = "2026-05-10T06:30:00.000Z";
  const { dayRow, blockRows } = buildExtensionDayRows(
    nextDayNumber,
    phaseThree.phaseId,
    "phase_3",
    "Phase 3",
    mappedDate,
    nowIso,
  );

  userState.schedule.days[String(nextDayNumber)] = dayRow;
  for (const block of blockRows) {
    userState.schedule.blocks[`${block.dayNumber}:${block.blockKey}`] = block;
  }

  phaseThree.currentEndDay = nextDayNumber;
  phaseThree.extensionsUsed += 1;
  phaseThree.updatedAt = nowIso;
  invalidateRuntimeScheduleIndex(userState);
  return nextDayNumber;
}

describe("server actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T06:30:00.000Z"));

    testStore = {
      version: 2,
      users: {
        "test-user": {
          id: "test-user",
          email: "aspirant@beside-you.local",
          password: "beside-you-2026",
          displayName: "Aspirant",
        },
      },
      sessions: {},
      userState: {
        "test-user": createEmptyUserState(),
      },
      referenceData: getStaticReferenceData(),
      dev: {
        simulatedNowIso: "2026-05-10T06:30:00.000Z",
      },
    };

    testStore.userState["test-user"].settings.dayOneDate = "2026-05-10";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("saves subject-tagged bulk MCQ entries in Supabase mode", async () => {
    const env = captureRuntimeEnv();
    enableSupabaseRuntime();

    try {
      const formData = new FormData();
      formData.set("entryDate", "2026-05-10");
      formData.set("totalAttempted", "20");
      formData.set("correct", "15");
      formData.set("wrong", "5");
      formData.set("subject", "medicine");
      formData.set("source", " GT-07 ");

      await expect(submitMcqBulkAction(formData)).resolves.toEqual({ ok: true });

      const logs = Object.values(testStore.userState["test-user"].mcqBulkLogs);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        entryDate: "2026-05-10",
        totalAttempted: 20,
        correct: 15,
        wrong: 5,
        subject: "Medicine",
        source: "GT-07",
      });
    } finally {
      restoreRuntimeEnv(env);
    }
  });

  it("saves detailed MCQ entries with canonical subject tags in Supabase mode", async () => {
    const env = captureRuntimeEnv();
    enableSupabaseRuntime();

    try {
      const formData = new FormData();
      formData.set("entryDate", "2026-05-10");
      formData.set("mcqId", " GT-07-Q118 ");
      formData.set("result", "wrong");
      formData.set("subject", "pathology");
      formData.set("topic", " Heme smear ");
      formData.set("source", " GT-07 ");
      formData.set("causeCode", "C");
      formData.set("priority", "P1");
      formData.append("fixCodes", "Q20");
      formData.append("fixCodes", "AI");
      formData.append("tags", "image");
      formData.append("tags", "protocol");

      await expect(submitMcqItemAction(formData)).resolves.toEqual({ ok: true });

      const logs = Object.values(testStore.userState["test-user"].mcqItemLogs);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        entryDate: "2026-05-10",
        mcqId: "GT-07-Q118",
        result: "wrong",
        subject: "Pathology",
        topic: "Heme smear",
        source: "GT-07",
        causeCode: "C",
        priority: "P1",
        fixCodes: ["Q20", "AI"],
        tags: ["image", "protocol"],
      });
    } finally {
      restoreRuntimeEnv(env);
    }
  });

  it("saves GT weakest-subject tags in Supabase mode", async () => {
    const env = captureRuntimeEnv();
    enableSupabaseRuntime();

    try {
      const formData = new FormData();
      formData.set("gtNumber", "GT-5");
      formData.set("gtDate", "2026-05-10");
      formData.append("weakestSubjects", "medicine");
      formData.append("weakestSubjects", "Surgery");

      await expect(submitGtAction(formData)).resolves.toEqual({ ok: true });

      const logs = Object.values(testStore.userState["test-user"].gtLogs);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        gtNumber: "GT-5",
        gtDate: "2026-05-10",
        weakestSubjects: ["Medicine", "Surgery"],
      });
    } finally {
      restoreRuntimeEnv(env);
    }
  });

  it("anchors Today topic completion to the effective app date when no completionDate is submitted", async () => {
    const block = getScheduleDay(1)!.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const item = block.items[0]!;
    const formData = new FormData();
    formData.set("dayNumber", "1");
    formData.set("blockKey", block.timeSlotKey);
    formData.set("itemId", item.itemId);
    formData.set("intent", "complete");

    await updateTopicAction(formData);

    const userState = testStore.userState["test-user"];
    const sameDayPlan = buildDailyRevisionPlan("2026-05-10", userState, userState.settings);
    const nextDayPlan = buildDailyRevisionPlan("2026-05-11", userState, userState.settings);

    expect(sameDayPlan.queueSessions).toHaveLength(0);
    expect(nextDayPlan.queueSessions[0]?.sourceItemId).toBe(item.itemId);
  });

  it.each(["mcq_practice", "final_review", "wrap_up_log"])(
    "completes %s block and all its topic items via updateBlockAction",
    async (semanticKey) => {
      ensureUserScheduleSeeded(testStore.userState["test-user"]);
      const userState = testStore.userState["test-user"];
      const day = getScheduleDay(1, userState, testStore.referenceData)!;
      const block = day.blocks.find((b) => b.semanticBlockKey === semanticKey)!;
      expect(block).toBeDefined();
      expect(block.items.length).toBeGreaterThan(0);

      // Verify items exist in topicAssignments before completion
      for (const item of block.items) {
        const row = userState.schedule.topicAssignments[item.itemId];
        expect(row).toBeDefined();
        expect(row.status).toBe("pending");
      }

      const formData = new FormData();
      formData.set("dayNumber", "1");
      formData.set("blockKey", block.timeSlotKey);
      formData.set("intent", "complete");

      await updateBlockAction(formData);

      // All topic items should be completed
      for (const item of block.items) {
        const row = testStore.userState["test-user"].schedule.topicAssignments[item.itemId];
        expect(row.status).toBe("completed");
        expect(row.completedAt).toBeTruthy();
      }

      // Block progress should show "completed"
      const progress = getBlockProgress(testStore.userState["test-user"], 1, block.timeSlotKey, testStore.referenceData);
      expect(progress.status).toBe("completed");
    },
  );

  it.each(["mcq_practice", "final_review", "wrap_up_log"])(
    "completes only the selected topic item in %s via updateTopicAction Mark Done",
    async (semanticKey) => {
      ensureUserScheduleSeeded(testStore.userState["test-user"]);
      const userState = testStore.userState["test-user"];
      const day = getScheduleDay(1, userState, testStore.referenceData)!;
      const block = day.blocks.find((b) => b.semanticBlockKey === semanticKey)!;
      const item = block.items[0]!;
      const siblingItems = block.items.slice(1);

      const formData = new FormData();
      formData.set("dayNumber", "1");
      formData.set("blockKey", block.timeSlotKey);
      formData.set("itemId", item.itemId);
      formData.set("intent", "complete");

      await updateTopicAction(formData);

      const row = testStore.userState["test-user"].schedule.topicAssignments[item.itemId];
      expect(row.status).toBe("completed");
      expect(row.completedAt).toBeTruthy();

      for (const sibling of siblingItems) {
        const siblingRow = testStore.userState["test-user"].schedule.topicAssignments[sibling.itemId];
        expect(siblingRow.status).toBe("pending");
        expect(siblingRow.completedAt).toBeNull();
      }

      const progress = getBlockProgress(testStore.userState["test-user"], 1, block.timeSlotKey, testStore.referenceData);
      expect(progress.completedItemCount).toBe(1);
      if (siblingItems.length > 0) {
        expect(progress.status).toBe("partially_complete");
        expect(progress.unresolvedItemCount).toBe(siblingItems.length);
      } else {
        expect(progress.status).toBe("completed");
        expect(progress.unresolvedItemCount).toBe(0);
      }
    },
  );

  it.each(["mcq_practice", "wrap_up_log"])(
    "repairs displaced %s assignments before Mark Done so sibling topics stay pending",
    async (semanticKey) => {
      ensureUserScheduleSeeded(testStore.userState["test-user"]);
      const userState = testStore.userState["test-user"];
      const day = getScheduleDay(1, userState, testStore.referenceData)!;
      const block = day.blocks.find((entry) => entry.semanticBlockKey === semanticKey)!;
      const targetDay = getScheduleDay(2, userState, testStore.referenceData)!;
      const targetBlock = targetDay.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
      const sourceItem = block.items[0]!;
      const siblingItems = block.items.slice(1);

      expect(siblingItems.length).toBeGreaterThan(0);

      for (const [index, movedItem] of block.items.entries()) {
        const row = userState.schedule.topicAssignments[movedItem.itemId]!;
        row.dayNumber = targetDay.dayNumber;
        row.blockKey = targetBlock.timeSlotKey;
        row.itemOrder = 90 + index;
        row.status = "pending";
        row.completedAt = null;
      }
      invalidateRuntimeScheduleIndex(userState);

      const formData = new FormData();
      formData.set("dayNumber", "1");
      formData.set("blockKey", block.timeSlotKey);
      formData.set("itemId", sourceItem.itemId);
      formData.set("intent", "complete");

      await updateTopicAction(formData);

      const completedRow = testStore.userState["test-user"].schedule.topicAssignments[sourceItem.itemId];
      expect(completedRow.dayNumber).toBe(1);
      expect(completedRow.blockKey).toBe(block.timeSlotKey);
      expect(completedRow.status).toBe("completed");

      for (const sibling of siblingItems) {
        const siblingRow = testStore.userState["test-user"].schedule.topicAssignments[sibling.itemId];
        expect(siblingRow.dayNumber).toBe(1);
        expect(siblingRow.blockKey).toBe(block.timeSlotKey);
        expect(siblingRow.status).toBe("pending");
      }

      const refreshedBlock = getScheduleDay(1, testStore.userState["test-user"], testStore.referenceData)!
        .blocks.find((entry) => entry.semanticBlockKey === semanticKey)!;
      expect(refreshedBlock.items).toHaveLength(block.items.length);

      const progress = getBlockProgress(testStore.userState["test-user"], 1, block.timeSlotKey, testStore.referenceData);
      expect(progress.status).toBe("partially_complete");
      expect(progress.completedItemCount).toBe(1);
      expect(progress.unresolvedItemCount).toBe(siblingItems.length);
    },
  );

  it.each(["mcq_practice", "final_review", "wrap_up_log"])(
    "repairs displaced %s assignments before Complete Block",
    async (semanticKey) => {
      ensureUserScheduleSeeded(testStore.userState["test-user"]);
      const userState = testStore.userState["test-user"];
      const day = getScheduleDay(1, userState, testStore.referenceData)!;
      const block = day.blocks.find((entry) => entry.semanticBlockKey === semanticKey)!;
      const targetDay = getScheduleDay(2, userState, testStore.referenceData)!;
      const targetBlock = targetDay.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;

      for (const [index, movedItem] of block.items.entries()) {
        const row = userState.schedule.topicAssignments[movedItem.itemId]!;
        row.dayNumber = targetDay.dayNumber;
        row.blockKey = targetBlock.timeSlotKey;
        row.itemOrder = 120 + index;
        row.status = "pending";
        row.completedAt = null;
      }
      invalidateRuntimeScheduleIndex(userState);

      const formData = new FormData();
      formData.set("dayNumber", "1");
      formData.set("blockKey", block.timeSlotKey);
      formData.set("intent", "complete");

      await updateBlockAction(formData);

      for (const item of block.items) {
        const row = testStore.userState["test-user"].schedule.topicAssignments[item.itemId];
        expect(row.dayNumber).toBe(1);
        expect(row.blockKey).toBe(block.timeSlotKey);
        expect(row.status).toBe("completed");
        expect(row.completedAt).toBeTruthy();
      }

      const refreshedBlock = getScheduleDay(1, testStore.userState["test-user"], testStore.referenceData)!
        .blocks.find((entry) => entry.semanticBlockKey === semanticKey)!;
      expect(refreshedBlock.items).toHaveLength(block.items.length);

      const progress = getBlockProgress(testStore.userState["test-user"], 1, block.timeSlotKey, testStore.referenceData);
      expect(progress.status).toBe("completed");
      expect(progress.unresolvedItemCount).toBe(0);
    },
  );

  it("keeps Day 1 core-study items in workbook order on the first Today load", () => {
    ensureUserScheduleSeeded(testStore.userState["test-user"]);

    getHomeData(testStore, "test-user");

    const userState = testStore.userState["test-user"];
    const day = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const blockC = day.blocks.find((entry) => entry.semanticBlockKey === "block_c")!;

    expect(blockA.items.map((item) => item.itemId)).toEqual(["d001-0800-01", "d001-0800-02"]);
    expect(blockB.items.map((item) => item.itemId)).toEqual(["d001-1115-01"]);
    expect(blockC.items.map((item) => item.itemId)).toEqual(["d001-1500-01"]);
  });

  it("completes only Day 1 Block A items after the first Today load", async () => {
    ensureUserScheduleSeeded(testStore.userState["test-user"]);

    getHomeData(testStore, "test-user");

    const userState = testStore.userState["test-user"];
    const day = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const formData = new FormData();
    formData.set("dayNumber", "1");
    formData.set("blockKey", blockA.timeSlotKey);
    formData.set("intent", "complete");

    await updateBlockAction(formData);

    expect(userState.schedule.topicAssignments["d001-0800-01"]?.status).toBe("completed");
    expect(userState.schedule.topicAssignments["d001-0800-02"]?.status).toBe("completed");
    expect(userState.schedule.topicAssignments["d001-1115-01"]?.status).toBe("pending");

    expect(getBlockProgress(userState, 1, blockA.timeSlotKey, testStore.referenceData)).toMatchObject({
      status: "completed",
      completedItemCount: 2,
    });
    expect(getBlockProgress(userState, 1, blockB.timeSlotKey, testStore.referenceData)).toMatchObject({
      status: "pending",
      completedItemCount: 0,
    });
  });

  it("refreshes the current view after block updates", async () => {
    ensureUserScheduleSeeded(testStore.userState["test-user"]);
    const userState = testStore.userState["test-user"];
    const day = getScheduleDay(1, userState, testStore.referenceData)!;
    const block = day.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const formData = new FormData();
    formData.set("dayNumber", "1");
    formData.set("blockKey", block.timeSlotKey);
    formData.set("intent", "skip");

    await updateBlockAction(formData);

    expect(refresh).toHaveBeenCalled();
  });

  it("treats a runtime block with no resident assignments as empty instead of cloning template topics", () => {
    ensureUserScheduleSeeded(testStore.userState["test-user"]);
    const userState = testStore.userState["test-user"];
    const day2 = getScheduleDay(2, userState, testStore.referenceData)!;
    const blockB = day2.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const day3 = getScheduleDay(3, userState, testStore.referenceData)!;
    const destinationBlock = day3.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;

    for (const [index, item] of blockB.items.entries()) {
      const row = userState.schedule.topicAssignments[item.itemId]!;
      row.dayNumber = day3.dayNumber;
      row.blockKey = destinationBlock.timeSlotKey;
      row.itemOrder = 50 + index;
      row.status = "pending";
      row.completedAt = null;
    }
    invalidateRuntimeScheduleIndex(userState);

    const refreshedDay2 = getScheduleDay(2, userState, testStore.referenceData)!;
    const refreshedBlockB = refreshedDay2.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;

    expect(refreshedBlockB.items).toHaveLength(0);
    expect(getBlockProgress(userState, 2, refreshedBlockB.timeSlotKey, testStore.referenceData)).toMatchObject({
      totalItemCount: 0,
      unresolvedItemCount: 0,
    });
  });
});

describe("pullTopicForward", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T06:30:00.000Z"));

    testStore = {
      version: 2,
      users: {
        "test-user": {
          id: "test-user",
          email: "aspirant@beside-you.local",
          password: "beside-you-2026",
          displayName: "Aspirant",
        },
      },
      sessions: {},
      userState: {
        "test-user": createEmptyUserState(),
      },
      referenceData: getStaticReferenceData(),
      dev: {
        simulatedNowIso: "2026-05-10T06:30:00.000Z",
      },
    };

    testStore.userState["test-user"].settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(testStore.userState["test-user"]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("moves a pending topic to the target block with a new itemOrder", () => {
    const userState = testStore.userState["test-user"];
    const day2 = getScheduleDay(2, userState)!;
    const blockB = day2.blocks.find((b) => b.semanticBlockKey === "block_b");
    const blockA = day2.blocks.find((b) => b.semanticBlockKey === "block_a");
    if (!blockB || !blockA || blockB.items.length === 0) return;

    const sourceItem = blockB.items[0];
    const targetBlockKey = blockA.timeSlotKey;

    pullTopicForward(userState, sourceItem.itemId, 2, targetBlockKey);

    const moved = userState.schedule.topicAssignments[sourceItem.itemId];
    expect(moved.dayNumber).toBe(2);
    expect(moved.blockKey).toBe(targetBlockKey);
    expect(moved.itemOrder).toBeGreaterThan(0);
  });

  it("does nothing when the topic is already completed", () => {
    const userState = testStore.userState["test-user"];
    const day2 = getScheduleDay(2, userState)!;
    const blockB = day2.blocks.find((b) => b.semanticBlockKey === "block_b");
    const blockA = day2.blocks.find((b) => b.semanticBlockKey === "block_a");
    if (!blockB || !blockA || blockB.items.length === 0) return;

    const sourceItem = blockB.items[0];
    const row = userState.schedule.topicAssignments[sourceItem.itemId];
    row.status = "completed";
    row.completedAt = "2026-05-11T12:00:00.000Z";

    pullTopicForward(userState, sourceItem.itemId, 2, blockA.timeSlotKey);

    // Should remain in original block
    expect(row.blockKey).toBe(blockB.timeSlotKey);
    expect(row.status).toBe("completed");
  });

  it("re-indexes source block items after pulling a topic out", () => {
    const userState = testStore.userState["test-user"];
    const day2 = getScheduleDay(2, userState)!;
    const blockB = day2.blocks.find((b) => b.semanticBlockKey === "block_b" && b.items.length >= 2);
    const blockA = day2.blocks.find((b) => b.semanticBlockKey === "block_a");
    if (!blockB || !blockA || blockB.items.length < 2) return;

    // Pull first item to block_a
    pullTopicForward(userState, blockB.items[0].itemId, 2, blockA.timeSlotKey);

    // Remaining items in block_b should be re-indexed starting from 0
    const remaining = Object.values(userState.schedule.topicAssignments)
      .filter((r) => r.dayNumber === 2 && r.blockKey === blockB.timeSlotKey)
      .sort((a, b) => a.itemOrder - b.itemOrder);

    for (let i = 0; i < remaining.length; i++) {
      expect(remaining[i].itemOrder).toBe(i);
    }
  });

  it("moves a topic from tomorrow to today and updates its dayNumber", () => {
    const userState = testStore.userState["test-user"];
    const day2 = getScheduleDay(2, userState)!;
    const day3 = getScheduleDay(3, userState)!;
    const targetBlock = day2.blocks.find((b) => b.semanticBlockKey === "block_a");
    const sourceBlock = day3.blocks.find(
      (b) => b.trackable && b.items.length > 0 && b.semanticBlockKey !== "morning_revision",
    );
    if (!targetBlock || !sourceBlock) return;

    const sourceItem = sourceBlock.items[0];
    const row = userState.schedule.topicAssignments[sourceItem.itemId];
    expect(row.dayNumber).toBe(3);
    expect(row.blockKey).toBe(sourceBlock.timeSlotKey);

    pullTopicForward(userState, sourceItem.itemId, 2, targetBlock.timeSlotKey);

    // The topicAssignment record now points to day 2 — this is what the
    // repack engine reads, so a future day-3 repack will not re-place it.
    expect(row.dayNumber).toBe(2);
    expect(row.blockKey).toBe(targetBlock.timeSlotKey);
    expect(row.status).toBe("pending");
  });
});

describe("completeBlockItems after pullTopicForward", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T06:30:00.000Z"));

    testStore = {
      version: 2,
      users: {
        "test-user": {
          id: "test-user",
          email: "aspirant@beside-you.local",
          password: "beside-you-2026",
          displayName: "Aspirant",
        },
      },
      sessions: {},
      userState: {
        "test-user": createEmptyUserState(),
      },
      referenceData: getStaticReferenceData(),
      dev: {
        simulatedNowIso: "2026-05-10T06:30:00.000Z",
      },
    };

    testStore.userState["test-user"].settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(testStore.userState["test-user"]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not throw when completing a block that had an item pulled away", () => {
    const userState = testStore.userState["test-user"];
    const day2 = getScheduleDay(2, userState)!;
    const blockB = day2.blocks.find((b) => b.semanticBlockKey === "block_b" && b.items.length >= 2);
    const blockA = day2.blocks.find((b) => b.semanticBlockKey === "block_a");
    if (!blockB || !blockA || blockB.items.length < 2) return;

    const pulledItem = blockB.items[0];
    const remainingIds = blockB.items.slice(1).map((i) => i.itemId);

    // Pull the first item from block_b to block_a
    pullTopicForward(userState, pulledItem.itemId, 2, blockA.timeSlotKey);

    // Completing block_b should NOT throw — the pulled item is skipped
    expect(() => {
      completeBlockItems(userState, 2, blockB.timeSlotKey, "2026-05-11T12:00:00.000Z");
    }).not.toThrow();

    // The pulled item must remain at block_a, still pending
    const pulledRow = userState.schedule.topicAssignments[pulledItem.itemId];
    expect(pulledRow.blockKey).toBe(blockA.timeSlotKey);
    expect(pulledRow.status).toBe("pending");

    // The remaining items in block_b must be completed
    for (const id of remainingIds) {
      expect(userState.schedule.topicAssignments[id].status).toBe("completed");
    }
  });
});

describe("acceptEarlyFinishAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T06:30:00.000Z"));

    testStore = {
      version: 2,
      users: {
        "test-user": {
          id: "test-user",
          email: "aspirant@beside-you.local",
          password: "beside-you-2026",
          displayName: "Aspirant",
        },
      },
      sessions: {},
      userState: {
        "test-user": createEmptyUserState(),
      },
      referenceData: getStaticReferenceData(),
      dev: {
        simulatedNowIso: "2026-05-10T06:30:00.000Z",
      },
    };

    testStore.userState["test-user"].settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(testStore.userState["test-user"]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("rebalances downstream Day 1 blocks instead of leaving the source block empty", async () => {
    const userState = testStore.userState["test-user"];
    const day1 = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day1.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day1.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;

    completeBlockItems(userState, 1, blockA.timeSlotKey, "2026-05-10T09:00:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, 1, blockA.timeSlotKey, "09:00");

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(blockB.items[0]!.itemId, 1, blockA.timeSlotKey));

    const refreshedDay1 = getScheduleDay(1, userState, testStore.referenceData)!;
    const refreshedBlockA = refreshedDay1.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const refreshedBlockB = refreshedDay1.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const refreshedBlockC = refreshedDay1.blocks.find((entry) => entry.semanticBlockKey === "block_c")!;

    expect(refreshedBlockA.items.map((item) => item.itemId)).toEqual(["d001-0800-01", "d001-0800-02", "d001-1115-01"]);
    expect(refreshedBlockB.items.map((item) => item.itemId)).toEqual(["d001-1500-01"]);
    expect(refreshedBlockC.items.map((item) => item.itemId)).toEqual(["d002-0800-01"]);
  });

  it("keeps completed target topics ahead of the pulled topic after rebalancing", async () => {
    const userState = testStore.userState["test-user"];
    const day1 = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day1.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day1.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;

    completeBlockItems(userState, 1, blockA.timeSlotKey, "2026-05-10T09:00:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, 1, blockA.timeSlotKey, "09:00");

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(blockB.items[0]!.itemId, 1, blockA.timeSlotKey));

    const targetRows = Object.values(userState.schedule.topicAssignments)
      .filter((row) => row.dayNumber === 1 && row.blockKey === blockA.timeSlotKey)
      .sort((left, right) => left.itemOrder - right.itemOrder);

    expect(targetRows.map((row) => row.sourceItemId)).toEqual(["d001-0800-01", "d001-0800-02", "d001-1115-01"]);
    expect(targetRows.slice(0, 2).map((row) => row.status)).toEqual(["completed", "completed"]);
    expect(targetRows[2]?.status).toBe("pending");
  });

  it("treats stale accepts as a no-op when the source row is no longer pending", async () => {
    const userState = testStore.userState["test-user"];
    const day1 = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day1.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day1.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const sourceRow = userState.schedule.topicAssignments[blockB.items[0]!.itemId]!;

    completeBlockItems(userState, 1, blockA.timeSlotKey, "2026-05-10T09:00:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, 1, blockA.timeSlotKey, "09:00");
    sourceRow.status = "completed";
    sourceRow.completedAt = "2026-05-10T10:00:00.000Z";

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(sourceRow.sourceItemId, 1, blockA.timeSlotKey));

    expect(sourceRow.dayNumber).toBe(1);
    expect(sourceRow.blockKey).toBe(blockB.timeSlotKey);
    expect(sourceRow.status).toBe("completed");
    expect(getScheduleDay(1, userState, testStore.referenceData)!
      .blocks.find((entry) => entry.semanticBlockKey === "block_a")!
      .items.map((item) => item.itemId)).toEqual(["d001-0800-01", "d001-0800-02"]);
  });

  it("treats stale accepts as a no-op when the target block no longer has enough time", async () => {
    const userState = testStore.userState["test-user"];
    const day1 = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day1.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day1.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const sourceRow = userState.schedule.topicAssignments[blockB.items[0]!.itemId]!;

    completeBlockItems(userState, 1, blockA.timeSlotKey, "2026-05-10T10:55:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, 1, blockA.timeSlotKey, "10:55");

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(sourceRow.sourceItemId, 1, blockA.timeSlotKey));

    expect(sourceRow.dayNumber).toBe(1);
    expect(sourceRow.blockKey).toBe(blockB.timeSlotKey);
    expect(getScheduleDay(1, userState, testStore.referenceData)!
      .blocks.find((entry) => entry.semanticBlockKey === "block_a")!
      .items.map((item) => item.itemId)).toEqual(["d001-0800-01", "d001-0800-02"]);
  });

  it("cascades across day boundaries when a tomorrow topic is pulled forward", async () => {
    const userState = testStore.userState["test-user"];
    const dayPair = getScheduleDays(userState, testStore.referenceData).find((day) => {
      const tomorrow = getScheduleDay(day.dayNumber + 1, userState, testStore.referenceData);
      if (!tomorrow) {
        return false;
      }

      const eligibleToday = day.blocks.filter((block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0);
      const eligibleTomorrow = tomorrow.blocks.filter((block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0);

      return eligibleToday.length > 0 && eligibleTomorrow.length >= 2 && eligibleTomorrow[0]?.items.length === 1;
    });

    if (!dayPair) {
      return;
    }

    const tomorrow = getScheduleDay(dayPair.dayNumber + 1, userState, testStore.referenceData)!;
    const todayEligible = dayPair.blocks.filter((block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0);
    const tomorrowEligible = tomorrow.blocks.filter((block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0);
    const targetBlock = todayEligible[todayEligible.length - 1]!;
    const sourceBlock = tomorrowEligible[0]!;
    const sourceItemId = sourceBlock.items[0]!.itemId;

    completeBlockItems(userState, dayPair.dayNumber, targetBlock.timeSlotKey, "2026-05-10T09:00:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, dayPair.dayNumber, targetBlock.timeSlotKey, "09:00");

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(sourceItemId, dayPair.dayNumber, targetBlock.timeSlotKey));

    const refreshedTomorrow = getScheduleDay(dayPair.dayNumber + 1, userState, testStore.referenceData)!;
    const refreshedSourceBlock = refreshedTomorrow.blocks.find((block) => block.timeSlotKey === sourceBlock.timeSlotKey)!;

    expect(refreshedSourceBlock.items.map((item) => item.itemId)).not.toContain(sourceItemId);
    expect(refreshedSourceBlock.items.length).toBeGreaterThan(0);
  });

  it("trims an empty trailing runtime day immediately after a successful rebalance", async () => {
    const userState = testStore.userState["test-user"];
    const tailDayNumber = getMaxRuntimeDayNumber(userState);
    const targetDayNumber = tailDayNumber - 1;
    const targetDay = getScheduleDay(targetDayNumber, userState, testStore.referenceData)!;
    const tailDay = getScheduleDay(tailDayNumber, userState, testStore.referenceData)!;
    const targetEligibleBlocks = targetDay.blocks.filter(
      (block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0,
    );
    const tailEligibleBlocks = tailDay.blocks.filter(
      (block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0,
    );

    const targetBlock = targetEligibleBlocks[targetEligibleBlocks.length - 1]!;
    const sourceBlock = tailEligibleBlocks[0]!;
    const sourceItemId = sourceBlock.items[0]!.itemId;

    keepOnlyDayAssignments(userState, tailDayNumber, new Set([sourceItemId]));

    completeBlockItems(userState, targetDayNumber, targetBlock.timeSlotKey, "2026-05-10T09:00:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, targetDayNumber, targetBlock.timeSlotKey, "09:00");

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(sourceItemId, targetDayNumber, targetBlock.timeSlotKey));

    expect(userState.schedule.days[String(tailDayNumber)]).toBeUndefined();
    expect(Object.values(userState.schedule.blocks).some((row) => row.dayNumber === tailDayNumber)).toBe(false);
    expect(Object.values(userState.schedule.topicAssignments).some((row) => row.dayNumber === tailDayNumber)).toBe(false);
    expect(getMaxRuntimeDayNumber(userState)).toBe(targetDayNumber);
    expect(Math.max(...Object.values(userState.schedule.phaseConfig).map((phase) => phase.currentEndDay))).toBe(targetDayNumber);
  });

  it("treats a moved topic as ordinary pending work when later automations run", async () => {
    const userState = testStore.userState["test-user"];
    const day1 = getScheduleDay(1, userState, testStore.referenceData)!;
    const blockA = day1.blocks.find((entry) => entry.semanticBlockKey === "block_a")!;
    const blockB = day1.blocks.find((entry) => entry.semanticBlockKey === "block_b")!;
    const sourceItemId = blockB.items[0]!.itemId;

    completeBlockItems(userState, 1, blockA.timeSlotKey, "2026-05-10T09:00:00.000Z", null, testStore.referenceData);
    setBlockActualEnd(userState, 1, blockA.timeSlotKey, "09:00");

    await acceptEarlyFinishAction(buildAcceptEarlyFinishFormData(sourceItemId, 1, blockA.timeSlotKey));

    expect(userState.schedule.topicAssignments[sourceItemId]?.status).toBe("pending");

    runEndOfDaySweep(userState, userState.settings, "2026-05-10", 1, 23 * 60 + 30, testStore.referenceData);

    expect(userState.schedule.topicAssignments[sourceItemId]?.status).toBe("missed");
    expect(userState.backlogItems[sourceItemId]).toMatchObject({
      sourceTag: "end_of_day_sweep",
      status: "pending",
    });
  });

  it("reduces extensionsUsed when trimming an empty trailing extension day", async () => {
    const userState = testStore.userState["test-user"];
    const extensionDayNumber = appendTailExtensionDay(userState);
    const day100 = getScheduleDay(extensionDayNumber - 1, userState, testStore.referenceData)!;
    const extensionDay = getScheduleDay(extensionDayNumber, userState, testStore.referenceData)!;
    const targetBlock = day100.blocks.filter(
      (block) => block.trackable && ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0,
    ).at(-1)!;
    const extensionBlockA = extensionDay.blocks.find((block) => block.semanticBlockKey === "block_a")!;
    const sourceItemId = day100.blocks.find((block) => block.semanticBlockKey === "block_a")!.items[0]!.itemId;
    const sourceRow = userState.schedule.topicAssignments[sourceItemId]!;

    for (const item of targetBlock.items) {
      delete userState.schedule.topicAssignments[item.itemId];
    }
    sourceRow.dayNumber = extensionDayNumber;
    sourceRow.blockKey = extensionBlockA.timeSlotKey;
    sourceRow.itemOrder = 1;
    sourceRow.updatedAt = "2026-05-10T06:45:00.000Z";
    invalidateRuntimeScheduleIndex(userState);

    expect(rebalanceEarlyFinishSchedule(
      userState,
      sourceItemId,
      extensionDayNumber - 1,
      targetBlock.timeSlotKey,
      180,
      testStore.referenceData,
    )).toBe(true);

    expect(userState.schedule.days[String(extensionDayNumber)]).toBeUndefined();
    const phaseThree = Object.values(userState.schedule.phaseConfig).find((phase) => phase.phaseNumber === 3)!;
    expect(phaseThree.currentEndDay).toBe(extensionDayNumber - 1);
    expect(phaseThree.extensionsUsed).toBe(0);
  });
});

describe("block completion with missing topicAssignments (corrupted store recovery)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T06:30:00.000Z"));

    testStore = {
      version: 2,
      users: {
        "test-user": {
          id: "test-user",
          email: "aspirant@beside-you.local",
          password: "beside-you-2026",
          displayName: "Aspirant",
        },
      },
      sessions: {},
      userState: {
        "test-user": createEmptyUserState(),
      },
      referenceData: getStaticReferenceData(),
      dev: {
        simulatedNowIso: "2026-05-01T06:30:00.000Z",
      },
    };
    const userState = testStore.userState["test-user"];
    userState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(userState);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it.each(["mcq_practice", "final_review", "wrap_up_log"])(
    "completeBlockItems recovers missing assignments for %s",
    (semanticKey) => {
      const userState = testStore.userState["test-user"];
      const day = getScheduleDay(1, userState)!;
      const block = day.blocks.find((b) => b.semanticBlockKey === semanticKey);
      if (!block || block.items.length === 0) return;

      // Simulate corrupted store: delete all topicAssignments for this block's items
      for (const item of block.items) {
        delete userState.schedule.topicAssignments[item.itemId];
      }

      // Should NOT throw — lazy creation recovers missing assignments
      expect(() => {
        completeBlockItems(userState, 1, block.timeSlotKey, "2026-05-01T12:00:00.000Z");
      }).not.toThrow();

      // All items should now be completed with lazily created assignment rows
      for (const item of block.items) {
        const row = userState.schedule.topicAssignments[item.itemId];
        expect(row).toBeDefined();
        expect(row.status).toBe("completed");
        expect(row.completedAt).toBe("2026-05-01T12:00:00.000Z");
      }

      const progress = getBlockProgress(userState, 1, block.timeSlotKey);
      expect(progress.status).toBe("completed");
    },
  );

  it("ensureUserScheduleSeeded repairs missing assignments on load", () => {
    const userState = testStore.userState["test-user"];
    const day = getScheduleDay(1, userState)!;
    const allItemIds = day.blocks.flatMap((b) => b.items.map((i) => i.itemId));

    // Delete half the assignments to simulate partial corruption
    const deletedIds = allItemIds.filter((_, i) => i % 2 === 0);
    for (const id of deletedIds) {
      delete userState.schedule.topicAssignments[id];
    }

    // Re-seeding should repair without full reseed (seed version matches)
    ensureUserScheduleSeeded(userState);

    // All assignments should be restored
    for (const id of deletedIds) {
      const row = userState.schedule.topicAssignments[id];
      expect(row).toBeDefined();
      expect(row.status).toBe("pending");
    }
  });
});
