import { describe, expect, it } from "vitest";

import { completeBlockItems, completeRevisionSession, completeTopicItem } from "@/lib/data/app-state";
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
    sourceDay: overrides.sourceDay ?? 1,
    sourceBlockKey: overrides.sourceBlockKey ?? getBlock(1, "block_a").timeSlotKey,
    sourceBlockLabel: overrides.sourceBlockLabel ?? "Block A",
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
    const blockA = getBlock(1, "block_a");
    const firstItem = blockA.items[0]!;

    completeTopicItem(userState, 1, blockA.timeSlotKey, firstItem.itemId, "2026-05-01T10:00:00.000Z");

    expect(getBlockProgress(userState, 1, blockA.timeSlotKey)).toMatchObject({
      status: "partially_complete",
      completedItemCount: 1,
      totalItemCount: 2,
      unresolvedItemCount: 1,
    });
  });

  it("builds spaced revision only from completed Phase 1 revision-eligible topics", () => {
    const userState = createConfiguredState();
    const phase1Topic = getItem(1, "block_a");
    const phase2Task = getItem(64, "block_a");

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, phase1Topic.itemId, "2026-05-01T12:00:00.000Z");
    completeTopicItem(userState, 64, getBlock(64, "block_a").timeSlotKey, phase2Task.itemId, "2026-07-03T12:00:00.000Z");

    const inventory = buildRevisionInventory(userState, userState.settings);

    expect(inventory).toHaveLength(5);
    expect(inventory.every((item) => item.sourceItemId === phase1Topic.itemId)).toBe(true);
    expect(inventory.find((item) => item.id === createRevisionId(phase1Topic.itemId, "D+1"))).toMatchObject({
      scheduledDate: "2026-05-02",
      sourceAnchorDate: "2026-05-01",
      anchorMode: "actual",
    });
  });

  it("caps the morning lane at five topic sessions and routes later sessions into overflow", () => {
    const userState = createConfiguredState();
    const sameCompletion = "2026-05-01T12:00:00.000Z";
    const items = [
      ...getBlock(1, "block_a").items,
      ...getBlock(1, "block_b").items,
      ...getBlock(1, "block_c").items,
      getItem(2, "block_a"),
      getItem(2, "block_b"),
    ];

    for (const item of items) {
      const source = item.itemId.startsWith("d002") ? 2 : 1;
      const blockKey = item.itemId.startsWith("d002-0800")
        ? getBlock(2, "block_a").timeSlotKey
        : item.itemId.startsWith("d002-1115")
          ? getBlock(2, "block_b").timeSlotKey
          : item.itemId.startsWith("d001-0800")
            ? getBlock(1, "block_a").timeSlotKey
            : item.itemId.startsWith("d001-1115")
              ? getBlock(1, "block_b").timeSlotKey
              : getBlock(1, "block_c").timeSlotKey;
      completeTopicItem(userState, source, blockKey, item.itemId, sameCompletion);
    }

    const plan = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);

    expect(plan.queueSessions).toHaveLength(5);
    expect(plan.overflowSessions).toHaveLength(1);
    expect(plan.queue).toHaveLength(5);
    expect(plan.overflow).toHaveLength(1);
    expect(plan.morningMinutesPerSession).toBe(15);
    expect(plan.phaseMode).toBe("session_primary");
    expect(plan.blockStatusMode).toBe("revision_sessions");
    expect(plan.overflowSessions[0]?.assignedSlot).toBe("final_review");
  });

  it("does not pull overflow sessions back into the morning lane after one session is completed", () => {
    const userState = createConfiguredState();
    const sameCompletion = "2026-05-01T12:00:00.000Z";
    const items = [
      ...getBlock(1, "block_a").items,
      ...getBlock(1, "block_b").items,
      ...getBlock(1, "block_c").items,
      getItem(2, "block_a"),
      getItem(2, "block_b"),
    ];

    for (const item of items) {
      const source = item.itemId.startsWith("d002") ? 2 : 1;
      const blockKey = item.itemId.startsWith("d002-0800")
        ? getBlock(2, "block_a").timeSlotKey
        : item.itemId.startsWith("d002-1115")
          ? getBlock(2, "block_b").timeSlotKey
          : item.itemId.startsWith("d001-0800")
            ? getBlock(1, "block_a").timeSlotKey
            : item.itemId.startsWith("d001-1115")
              ? getBlock(1, "block_b").timeSlotKey
              : getBlock(1, "block_c").timeSlotKey;
      completeTopicItem(userState, source, blockKey, item.itemId, sameCompletion);
    }

    const before = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);
    const firstSession = before.queueSessions[0]!;

    completeRevisionSession(
      userState,
      firstSession.sourceItemId,
      firstSession.sourceDay,
      firstSession.sourceBlockKey,
      firstSession.revisionIds,
      "2026-05-02T07:00:00.000Z",
    );

    const after = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);

    expect(after.queueSessions).toHaveLength(4);
    expect(after.overflowSessions).toHaveLength(1);
    expect(after.morningSessionPlanned).toBe(5);
    expect(after.morningSessionCompleted).toBe(1);
    expect(after.morningSessionRemaining).toBe(4);
  });

  it("moves 3-6 day misses into catch-up and 7+ day misses into restudy flags", () => {
    const userState = createConfiguredState();
    const topic = getItem(1, "block_a");

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, topic.itemId, "2026-05-01T12:00:00.000Z");

    const catchUpPlan = buildDailyRevisionPlan("2026-05-05", userState, userState.settings);
    expect(catchUpPlan.catchUp.find((item) => item.id === createRevisionId(topic.itemId, "D+1"))).toMatchObject({
      assignedSlot: "block_c",
      status: "overdue_3_6",
    });

    const restudyPlan = buildDailyRevisionPlan("2026-05-10", userState, userState.settings);
    expect(restudyPlan.restudyFlags.find((item) => item.id === createRevisionId(topic.itemId, "D+1"))).toMatchObject({
      assignedSlot: "next_revision_phase",
      status: "overdue_7_plus",
    });
  });

  it("drops impossible revision checkoffs after a later source completion", () => {
    const userState = createConfiguredState();
    const topic = getItem(1, "block_a");
    const revisionId = createRevisionId(topic.itemId, "D+1");

    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId: topic.itemId,
      sourceDay: 1,
      sourceBlockKey: getBlock(1, "block_a").timeSlotKey,
      revisionType: "D+1",
      completedAt: "2026-05-02T06:45:00.000Z",
    };

    reconcileRevisionCompletionsForSource(userState.revisionCompletions, topic.itemId, "2026-05-03T12:00:00.000Z");

    expect(userState.revisionCompletions[revisionId]).toBeUndefined();
  });

  it("groups revision display items by source topic and sorts revision types", () => {
    const sourceItemId = getItem(1, "block_a").itemId;
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

  it("derives Phase 1 morning block progress from revision sessions instead of workbook refs", () => {
    const userState = createConfiguredState();
    const firstTopic = getItem(1, "block_a", 0);
    const secondTopic = getItem(1, "block_a", 1);
    const morningBlockKey = getBlock(2, "morning_revision").timeSlotKey;

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, firstTopic.itemId, "2026-05-01T12:00:00.000Z");
    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, secondTopic.itemId, "2026-05-01T12:00:00.000Z");

    expect(getBlockProgress(userState, 2, morningBlockKey)).toMatchObject({
      status: "pending",
      completedItemCount: 0,
      totalItemCount: 2,
      unresolvedItemCount: 2,
    });

    completeRevisionSession(
      userState,
      firstTopic.itemId,
      1,
      getBlock(1, "block_a").timeSlotKey,
      [createRevisionId(firstTopic.itemId, "D+1")],
      "2026-05-02T07:00:00.000Z",
    );

    expect(getBlockProgress(userState, 2, morningBlockKey)).toMatchObject({
      status: "partially_complete",
      completedItemCount: 1,
      totalItemCount: 2,
      unresolvedItemCount: 1,
    });

    completeRevisionSession(
      userState,
      secondTopic.itemId,
      1,
      getBlock(1, "block_a").timeSlotKey,
      [createRevisionId(secondTopic.itemId, "D+1")],
      "2026-05-02T07:10:00.000Z",
    );

    expect(getBlockProgress(userState, 2, morningBlockKey)).toMatchObject({
      status: "completed",
      completedItemCount: 2,
      totalItemCount: 2,
      unresolvedItemCount: 0,
    });
  });

  it("keeps later phases on workbook-driven morning status even when live revision exists", () => {
    const userState = createConfiguredState();
    const topic = getItem(1, "block_a");

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, topic.itemId, "2026-05-01T12:00:00.000Z");

    const revisionPhasePlan = buildDailyRevisionPlan("2026-07-03", userState, userState.settings);

    expect(revisionPhasePlan.phaseMode).toBe("workbook_blend");
    expect(revisionPhasePlan.blockStatusMode).toBe("workbook_block");
  });

  it("derives phase status from the macro phases instead of legacy phase buckets", () => {
    const userState = createConfiguredState();

    for (let dayNumber = 1; dayNumber <= 63; dayNumber += 1) {
      const day = getScheduleDay(dayNumber)!;
      for (const block of day.blocks.filter((entry) => entry.trackable)) {
        completeBlockItems(userState, dayNumber, block.timeSlotKey, "2026-06-30T20:00:00.000Z");
      }
    }

    expect(getPhaseStatus("phase_1", userState, userState.settings)).toBe("completed");
    expect(getPhaseStatus("phase_2", userState, userState.settings)).toBe("pending");
  });
});
