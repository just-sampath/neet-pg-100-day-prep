import { describe, expect, it } from "vitest";

import { completeBlockItems, completeTopicItem } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import {
  buildDailyRevisionPlan,
  buildRevisionInventory,
  createRevisionId,
  getBlockProgress,
  getPhaseStatus,
  getScheduleDay,
  groupRevisionItemsForDisplay,
  reconcileRevisionCompletionsForSource,
} from "@/lib/domain/schedule";
import type { RevisionQueueItem } from "@/lib/domain/types";

function getBlock(dayNumber: number, semanticBlockKey: string) {
  return getScheduleDay(dayNumber)!.blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!;
}

function getItem(dayNumber: number, semanticBlockKey: string, index = 0) {
  return getBlock(dayNumber, semanticBlockKey).items[index]!;
}

function createConfiguredState() {
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  return userState;
}

function createDisplayRevisionItem(
  overrides: Partial<RevisionQueueItem> & Pick<RevisionQueueItem, "id" | "sourceItemId" | "revisionType">,
): RevisionQueueItem {
  return {
    id: overrides.id,
    sourceItemId: overrides.sourceItemId,
    sourceDay: overrides.sourceDay ?? 2,
    sourceBlockKey: overrides.sourceBlockKey ?? getBlock(2, "study_block_1").timeSlotKey,
    sourceBlockLabel: overrides.sourceBlockLabel ?? "Study Block 1",
    sourceTopicLabel: overrides.sourceTopicLabel ?? "Introduction to Pathology Revision",
    subject: overrides.subject ?? "Pathology",
    topic: overrides.topic ?? "Introduction to Pathology Revision",
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
  it("derives partial block state automatically from item completion", () => {
    const userState = createConfiguredState();
    const studyBlock1 = getBlock(2, "study_block_1");
    const firstItem = studyBlock1.items[0]!;

    completeTopicItem(userState, 2, studyBlock1.timeSlotKey, firstItem.itemId, "2026-05-02T10:00:00.000Z");

    expect(getBlockProgress(userState, 2, studyBlock1.timeSlotKey)).toMatchObject({
      status: "partially_complete",
      completedItemCount: 1,
      totalItemCount: 2,
      unresolvedItemCount: 1,
    });
  });

  it("builds spaced revision only from completed first-pass core-study topics", () => {
    const userState = createConfiguredState();
    const day1Diagnostic = getItem(1, "diagnostic_block");
    const day2Topic = getItem(2, "study_block_1");
    const day42RevisionTopic = getItem(42, "revision_block_1");

    completeTopicItem(userState, 1, getBlock(1, "diagnostic_block").timeSlotKey, day1Diagnostic.itemId, "2026-05-01T09:00:00.000Z");
    completeTopicItem(userState, 2, getBlock(2, "study_block_1").timeSlotKey, day2Topic.itemId, "2026-05-01T12:00:00.000Z");
    completeTopicItem(userState, 42, getBlock(42, "revision_block_1").timeSlotKey, day42RevisionTopic.itemId, "2026-06-11T12:00:00.000Z");

    const inventory = buildRevisionInventory(userState, userState.settings);

    expect(inventory).toHaveLength(5);
    expect(inventory.every((item) => item.sourceItemId === day2Topic.itemId)).toBe(true);
    expect(inventory.find((item) => item.id === createRevisionId(day2Topic.itemId, "D+1"))).toMatchObject({
      scheduledDate: "2026-05-02",
      sourceAnchorDate: "2026-05-01",
      anchorMode: "actual",
    });
  });

  it("surfaces overflow after five morning items and routes later due work into overflow slots", () => {
    const userState = createConfiguredState();
    const sameCompletion = "2026-05-01T12:00:00.000Z";
    const items = [
      ...getBlock(2, "study_block_1").items,
      ...getBlock(2, "study_block_2").items,
      getItem(3, "study_block_1"),
    ];

    for (const item of items) {
      completeTopicItem(userState, item.itemId.startsWith("d003") ? 3 : 2, item.itemId.startsWith("d003") ? getBlock(3, "study_block_1").timeSlotKey : item.itemId.startsWith("d002-0815") ? getBlock(2, "study_block_1").timeSlotKey : getBlock(2, "study_block_2").timeSlotKey, item.itemId, sameCompletion);
    }

    const plan = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);

    expect(plan.queue).toHaveLength(5);
    expect(plan.overflow).toHaveLength(1);
    expect(plan.morningMinutesPerItem).toBe(18);
    expect(plan.overflow[0]?.assignedSlot).toBe("night_recall");
  });

  it("moves 3-6 day misses into catch-up and 7+ day misses into restudy flags", () => {
    const userState = createConfiguredState();
    const day2Topic = getItem(2, "study_block_1");

    completeTopicItem(userState, 2, getBlock(2, "study_block_1").timeSlotKey, day2Topic.itemId, "2026-05-01T12:00:00.000Z");

    const catchUpPlan = buildDailyRevisionPlan("2026-05-05", userState, userState.settings);
    expect(catchUpPlan.catchUp.find((item) => item.id === createRevisionId(day2Topic.itemId, "D+1"))).toMatchObject({
      assignedSlot: "consolidation",
      status: "overdue_3_6",
    });

    const restudyPlan = buildDailyRevisionPlan("2026-05-10", userState, userState.settings);
    expect(restudyPlan.restudyFlags.find((item) => item.id === createRevisionId(day2Topic.itemId, "D+1"))).toMatchObject({
      assignedSlot: "next_revision_phase",
      status: "overdue_7_plus",
    });
  });

  it("drops impossible revision checkoffs after a later source completion", () => {
    const userState = createConfiguredState();
    const day2Topic = getItem(2, "study_block_1");
    const revisionId = createRevisionId(day2Topic.itemId, "D+1");

    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId: day2Topic.itemId,
      sourceDay: 2,
      sourceBlockKey: getBlock(2, "study_block_1").timeSlotKey,
      revisionType: "D+1",
      completedAt: "2026-05-02T06:45:00.000Z",
    };

    reconcileRevisionCompletionsForSource(
      userState.revisionCompletions,
      day2Topic.itemId,
      "2026-05-03T12:00:00.000Z",
    );

    expect(userState.revisionCompletions[revisionId]).toBeUndefined();
  });

  it("groups revision display items by source topic and sorts revision types", () => {
    const sourceItemId = getItem(2, "study_block_1").itemId;
    const groups = groupRevisionItemsForDisplay([
      createDisplayRevisionItem({
        id: createRevisionId(sourceItemId, "D+3"),
        sourceItemId,
        revisionType: "D+3",
      }),
      createDisplayRevisionItem({
        id: createRevisionId(sourceItemId, "D+1"),
        sourceItemId,
        revisionType: "D+1",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      sourceItemId,
      revisionTypes: ["D+1", "D+3"],
    });
    expect(groups[0]?.items.map((item) => item.revisionType)).toEqual(["D+1", "D+3"]);
  });

  it("derives phase status from the semantic day content instead of block_a/block_b shortcuts", () => {
    const userState = createConfiguredState();
    const day1 = getScheduleDay(1)!;

    for (const block of day1.blocks.filter((entry) => entry.trackable)) {
      completeBlockItems(userState, 1, block.timeSlotKey, "2026-05-01T20:00:00.000Z");
    }

    expect(getPhaseStatus("orientation_baseline", userState, userState.settings)).toBe("completed");
    expect(getPhaseStatus("first_pass", userState, userState.settings)).toBe("pending");
  });
});
