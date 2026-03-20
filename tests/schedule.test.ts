import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import {
  buildDailyRevisionPlan,
  buildRevisionInventory,
  createRevisionId,
  getAbsorptionSavings,
  getMappedDate,
  getVisibleBlockKeys,
  groupRevisionItemsForDisplay,
  reconcileRevisionCompletionsForSource,
} from "@/lib/domain/schedule";
import type { BlockKey, RevisionQueueItem, UserState } from "@/lib/domain/types";

function createConfiguredState() {
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  return userState;
}

function markCompleted(userState: UserState, dayNumber: number, blockKey: BlockKey, completedAt: string) {
  userState.blockProgress[`${dayNumber}:${blockKey}`] = {
    dayNumber,
    blockKey,
    status: "completed",
    actualStart: null,
    actualEnd: null,
    completedAt,
    sourceTag: null,
    note: null,
  };
}

function activeRevisionIdsForPlan(userState: UserState, targetDate: string) {
  const plan = buildDailyRevisionPlan(targetDate, userState, userState.settings);
  return {
    plan,
    ids: [
      ...plan.queue.map((item) => item.id),
      ...plan.overflow.map((item) => item.item.id),
      ...plan.catchUp.map((item) => item.id),
      ...plan.restudyFlags.map((item) => item.id),
    ],
  };
}

function createDisplayRevisionItem(
  overrides: Partial<RevisionQueueItem> & Pick<RevisionQueueItem, "id" | "revisionType">,
): RevisionQueueItem {
  return {
    id: overrides.id,
    sourceDay: overrides.sourceDay ?? 2,
    sourceBlockKey: overrides.sourceBlockKey ?? "block_a",
    sourceBlockLabel: overrides.sourceBlockLabel ?? "Block A",
    sourceTopicLabel: overrides.sourceTopicLabel ?? "Pathology FP-1",
    subject: overrides.subject ?? "Pathology",
    topic: overrides.topic ?? "General pathology review",
    revisionType: overrides.revisionType,
    scheduledDate: overrides.scheduledDate ?? "2026-05-04",
    sourceAnchorDate: overrides.sourceAnchorDate ?? "2026-05-01",
    anchorMode: overrides.anchorMode ?? "actual",
    assignedSlot: overrides.assignedSlot ?? "morning_revision",
    overdueBy: overrides.overdueBy ?? 0,
    status: overrides.status ?? "due",
  };
}

describe("schedule engine", () => {
  it("uses the green layout for the full block set", () => {
    expect(getVisibleBlockKeys("green")).toEqual([
      "morning_revision",
      "block_a",
      "block_b",
      "consolidation",
      "mcq",
      "pyq_image",
      "night_recall",
    ]);
  });

  it("absorbs one day when the buffer is used", () => {
    expect(getAbsorptionSavings(83, { dayOneDate: "2026-05-01", theme: "dark", scheduleShiftDays: 1, shiftAppliedAt: null })).toBe(0);
    expect(getAbsorptionSavings(84, { dayOneDate: "2026-05-01", theme: "dark", scheduleShiftDays: 1, shiftAppliedAt: null })).toBe(1);
  });

  it("keeps mapped dates stable when the first shift is absorbed by the buffer", () => {
    const settings = {
      dayOneDate: "2026-05-01",
      theme: "dark" as const,
      scheduleShiftDays: 1,
      shiftAppliedAt: null,
    };
    expect(getMappedDate(84, settings)).toBe("2026-07-23");
  });

  it("falls back to planned mapped dates when an actual completion is not present", () => {
    const userState = createConfiguredState();
    const inventory = buildRevisionInventory(userState, userState.settings);
    const item = inventory.find((entry) => entry.id === createRevisionId(2, "block_a", "D+1"));

    expect(item).toMatchObject({
      sourceDay: 2,
      sourceBlockKey: "block_a",
      revisionType: "D+1",
      scheduledDate: "2026-05-03",
      anchorMode: "planned",
    });
  });

  it("moves future revision anchors when a source block is completed late", () => {
    const userState = createConfiguredState();
    markCompleted(userState, 2, "block_a", "2026-05-04T12:00:00.000Z");

    const inventory = buildRevisionInventory(userState, userState.settings);
    const item = inventory.find((entry) => entry.id === createRevisionId(2, "block_a", "D+1"));

    expect(item).toMatchObject({
      scheduledDate: "2026-05-05",
      anchorMode: "actual",
      sourceAnchorDate: "2026-05-04",
    });
  });

  it("surfaces overflow after five morning items and raises the three-day warning streak", () => {
    const userState = createConfiguredState();
    const plan = buildDailyRevisionPlan("2026-05-11", userState, userState.settings);

    expect(plan.queue).toHaveLength(5);
    expect(plan.overflow.length).toBeGreaterThan(0);
    expect(plan.morningMinutesPerItem).toBe(18);
    expect(plan.overflowStreakDays).toBeGreaterThanOrEqual(3);
    expect(plan.overflowSuggestion).toBeTruthy();
    expect(plan.overflow[0]?.assignedSlot).toBe("night_recall");
    expect(plan.overflow[1]?.assignedSlot).toBe("break_08_00");
    expect(plan.overflow[2]?.assignedSlot).toBe("break_10_45");
  });

  it("keeps 1-2 day misses in the main morning queue as overdue_1_2 items", () => {
    const userState = createConfiguredState();
    markCompleted(userState, 2, "block_a", "2026-05-01T12:00:00.000Z");

    const plan = buildDailyRevisionPlan("2026-05-03", userState, userState.settings);
    expect(plan.queue.find((item) => item.id === createRevisionId(2, "block_a", "D+1"))?.status).toBe("overdue_1_2");
  });

  it("moves 3-6 day misses into catch-up revision and 7+ day misses into restudy flags", () => {
    const userState = createConfiguredState();
    markCompleted(userState, 2, "block_a", "2026-05-01T12:00:00.000Z");

    const catchUpPlan = buildDailyRevisionPlan("2026-05-06", userState, userState.settings);
    expect(catchUpPlan.catchUp.map((item) => item.id)).toContain(createRevisionId(2, "block_a", "D+1"));
    expect(catchUpPlan.catchUp.find((item) => item.id === createRevisionId(2, "block_a", "D+1"))?.assignedSlot).toBe("consolidation");

    const restudyPlan = buildDailyRevisionPlan("2026-05-12", userState, userState.settings);
    expect(restudyPlan.restudyFlags.map((item) => item.id)).toContain(createRevisionId(2, "block_a", "D+1"));
    expect(restudyPlan.restudyFlags.find((item) => item.id === createRevisionId(2, "block_a", "D+1"))?.assignedSlot).toBe("next_revision_phase");
  });

  it("excludes explicitly completed revision items from later plans", () => {
    const userState = createConfiguredState();
    const revisionId = createRevisionId(2, "block_a", "D+1");
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceDay: 2,
      sourceBlockKey: "block_a",
      revisionType: "D+1",
      completedAt: "2026-05-03T12:00:00.000Z",
    };

    const { ids } = activeRevisionIdsForPlan(userState, "2026-05-03");
    expect(ids).not.toContain(revisionId);
  });

  it("recomputes revision placement cleanly after a retroactive completion edit", () => {
    const userState = createConfiguredState();
    const beforeRetroactiveEdit = activeRevisionIdsForPlan(userState, "2026-05-03");
    expect(beforeRetroactiveEdit.ids).toContain(createRevisionId(2, "block_a", "D+1"));

    markCompleted(userState, 2, "block_a", "2026-05-04T12:00:00.000Z");

    const originalPlannedDay = activeRevisionIdsForPlan(userState, "2026-05-03");
    const actualAnchorDay = activeRevisionIdsForPlan(userState, "2026-05-05");

    expect(originalPlannedDay.ids).not.toContain(createRevisionId(2, "block_a", "D+1"));
    expect(actualAnchorDay.ids).toContain(createRevisionId(2, "block_a", "D+1"));
  });

  it("drops revision checkoffs that become impossible after the source block is completed later", () => {
    const userState = createConfiguredState();
    const revisionId = createRevisionId(2, "block_a", "D+1");
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceDay: 2,
      sourceBlockKey: "block_a",
      revisionType: "D+1",
      completedAt: "2026-05-03T12:00:00.000Z",
    };

    reconcileRevisionCompletionsForSource(
      userState.revisionCompletions,
      2,
      "block_a",
      "2026-05-04T12:00:00.000Z",
    );

    expect(userState.revisionCompletions[revisionId]).toBeUndefined();
  });

  it("groups block-level revision items under the parent day topic for display", () => {
    const userState = createConfiguredState();
    markCompleted(userState, 2, "block_a", "2026-05-01T12:00:00.000Z");
    markCompleted(userState, 2, "block_b", "2026-05-01T13:00:00.000Z");

    const plan = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);
    const groups = groupRevisionItemsForDisplay(plan.queue);
    const pathologyGroup = groups.find((group) => group.sourceDay === 2);

    expect(pathologyGroup).toMatchObject({
      sourceTopicLabel: "Pathology FP-1",
      subject: "Pathology",
    });
    expect(pathologyGroup?.items).toHaveLength(2);
    expect(pathologyGroup?.items.map((item) => item.sourceBlockKey)).toEqual(["block_a", "block_b"]);
  });

  it("keeps revision types sorted inside grouped display sections", () => {
    const groups = groupRevisionItemsForDisplay([
      createDisplayRevisionItem({
        id: createRevisionId(2, "block_b", "D+1"),
        sourceBlockKey: "block_b",
        sourceBlockLabel: "Block B",
        topic: "Systemic pathology review",
        revisionType: "D+1",
      }),
      createDisplayRevisionItem({
        id: createRevisionId(2, "block_a", "D+3"),
        sourceBlockKey: "block_a",
        sourceBlockLabel: "Block A",
        topic: "Haematology review",
        revisionType: "D+3",
      }),
    ]);
    const pathologyGroup = groups.find((group) => group.sourceDay === 2);

    expect(pathologyGroup?.revisionTypes).toEqual(["D+1", "D+3"]);
  });
});
