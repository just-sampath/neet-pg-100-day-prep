import { describe, expect, it } from "vitest";

import { completeBlockItems, getRevisionQueuePageData } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getScheduleDay } from "@/lib/domain/schedule";
import type { BlockKey, LocalStore, UserState } from "@/lib/domain/types";

function createStore(userState?: UserState, simulatedNowIso = "2026-05-02T06:30:00.000Z"): LocalStore {
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
    dev: {
      simulatedNowIso,
    },
  };
}

function getBlockKey(dayNumber: number, semanticBlockKey: string): BlockKey {
  return getScheduleDay(dayNumber)!.blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!.timeSlotKey;
}

describe("revision queue page data", () => {
  it("exposes active queue sessions separately from waiting sessions", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    const completionIso = "2026-05-01T10:00:00.000Z";
    completeBlockItems(userState, 1, getBlockKey(1, "block_a"), completionIso);
    completeBlockItems(userState, 1, getBlockKey(1, "block_b"), completionIso);
    completeBlockItems(userState, 1, getBlockKey(1, "block_c"), completionIso);

    const data = getRevisionQueuePageData(createStore(userState), "local-user");
    const queueSessions = data.revisionPlan?.queueSessions ?? [];

    expect(queueSessions.length).toBeGreaterThan(0);
    expect(data.waitingSessions.length).toBeGreaterThan(0);
    expect(data.waitingSessions.every((session) => session.lane !== "due_this_morning")).toBe(true);

    const queuedIds = new Set(queueSessions.map((session) => session.id));
    expect(data.waitingSessions.every((session) => !queuedIds.has(session.id))).toBe(true);
    expect(data.revision.dueTodayCount).toBeGreaterThan(0);
  });

  it("returns an empty queue when no revision checkpoints are due", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    const data = getRevisionQueuePageData(createStore(userState), "local-user");

    expect(data.revisionPlan?.queueSessions ?? []).toHaveLength(0);
    expect(data.waitingSessions).toHaveLength(0);
    expect(data.revision.totalPending).toBe(0);
  });
});
