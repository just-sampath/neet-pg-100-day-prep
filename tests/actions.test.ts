import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import type { LocalStore } from "@/lib/domain/types";

let testStore: LocalStore;

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
  };
});

import { createEmptyUserState } from "@/lib/data/local-store";
import { pullTopicForward, completeBlockItems } from "@/lib/data/app-state";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay, getBlockProgress, buildDailyRevisionPlan, invalidateRuntimeScheduleIndex } from "@/lib/domain/schedule";
import { updateTopicAction, updateBlockAction } from "@/lib/server/actions";

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
