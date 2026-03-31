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
import { pullTopicForward } from "@/lib/data/app-state";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay, buildDailyRevisionPlan } from "@/lib/domain/schedule";
import { updateTopicAction } from "@/lib/server/actions";

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
