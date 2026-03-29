import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
