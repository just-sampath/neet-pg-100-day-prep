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
    completedAt: overrides.completedAt ?? null,
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

  it("does not surface a newly completed topic before its first due date", () => {
    const userState = createConfiguredState();
    const topic = getItem(1, "block_a");

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, topic.itemId, "2026-05-01T12:00:00.000Z");

    const sameDayPlan = buildDailyRevisionPlan("2026-05-01", userState, userState.settings);

    expect(sameDayPlan.queueSessions).toHaveLength(0);
    expect(sameDayPlan.overflowSessions).toHaveLength(0);
    expect(sameDayPlan.catchUpSessions).toHaveLength(0);
    expect(sameDayPlan.restudySessions).toHaveLength(0);
  });

  it("fills the 75-minute queue with native revision durations and pushes the rest into secondary revision", () => {
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

    expect(plan.queueSessions).toHaveLength(3);
    expect(plan.queueSessions.map((session) => session.allocatedMinutes)).toEqual([25, 25, 25]);
    expect(plan.overflowSessions).toHaveLength(3);
    expect(plan.overflowSessions.map((session) => session.allocatedMinutes)).toEqual([25, 25, 25]);
    expect(plan.queue).toHaveLength(3);
    expect(plan.overflow).toHaveLength(3);
    expect(plan.morningAllocatedMinutes).toBe(75);
    expect(plan.phaseMode).toBe("session_primary");
    expect(plan.blockStatusMode).toBe("revision_sessions");
    expect(plan.overflowSessions[0]?.lane).toBe("also_review_today");
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

    expect(after.queueSessions).toHaveLength(2);
    expect(after.overflowSessions).toHaveLength(3);
    expect(after.morningSessionPlanned).toBe(3);
    expect(after.morningSessionCompleted).toBe(1);
    expect(after.morningSessionRemaining).toBe(2);
  });

  it("keeps due and 1-2 day overdue topics visible across consecutive days", () => {
    const userState = createConfiguredState();
    const items = [
      ...getBlock(1, "block_a").items,
      ...getBlock(1, "block_b").items,
      ...getBlock(1, "block_c").items,
    ];

    for (const item of items) {
      const blockKey = item.itemId.startsWith("d001-0800")
        ? getBlock(1, "block_a").timeSlotKey
        : item.itemId.startsWith("d001-1115")
          ? getBlock(1, "block_b").timeSlotKey
          : getBlock(1, "block_c").timeSlotKey;
      completeTopicItem(userState, 1, blockKey, item.itemId, "2026-05-01T12:00:00.000Z");
    }

    const day2 = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);
    expect(day2.queueSessions).toHaveLength(3);
    expect(day2.overflowSessions).toHaveLength(1);
    expect(day2.queueSessions.concat(day2.overflowSessions)).toHaveLength(4);
    expect(day2.queueSessions.concat(day2.overflowSessions).every((session) => session.revisionTypes.join(",") === "D+1")).toBe(true);

    const day3 = buildDailyRevisionPlan("2026-05-03", userState, userState.settings);
    expect(day3.queueSessions).toHaveLength(3);
    expect(day3.overflowSessions).toHaveLength(1);
    expect(day3.catchUpSessions).toHaveLength(0);
    expect(day3.queueSessions.concat(day3.overflowSessions)).toHaveLength(4);
    expect(day3.queueSessions.concat(day3.overflowSessions).every((session) => session.revisionTypes.join(",") === "D+1")).toBe(true);

    const day4 = buildDailyRevisionPlan("2026-05-04", userState, userState.settings);
    // Slot-based selection picks one D+1, one D+3 (same topic → merged session), and
    // a second D+1 filling the D+7 fallback slot. Remaining items go to overflow.
    expect(day4.queueSessions).toHaveLength(2);
    expect(day4.queueSessions[0]).toMatchObject({ revisionTypes: ["D+1", "D+3"], allocatedMinutes: 40 });
    expect(day4.queueSessions[1]).toMatchObject({ revisionTypes: ["D+1"], allocatedMinutes: 25 });
    expect(day4.overflowSessions).toHaveLength(3);
    expect(day4.catchUpSessions).toHaveLength(0);
    expect(day4.queueSessions.concat(day4.overflowSessions)).toHaveLength(5);
  });

  it("does not let completed prior-day revisions consume the next day's FIFO queue", () => {
    const userState = createConfiguredState();
    const day1Items = [
      getItem(1, "block_a", 0),
      getItem(1, "block_a", 1),
      getItem(1, "block_b", 0),
    ];
    const day2Items = [
      getItem(2, "block_a", 0),
      getItem(2, "block_b", 0),
    ];

    for (const item of day1Items) {
      const blockKey = item.itemId.startsWith("d001-0800")
        ? getBlock(1, "block_a").timeSlotKey
        : getBlock(1, "block_b").timeSlotKey;
      completeTopicItem(userState, 1, blockKey, item.itemId, "2026-05-01T12:00:00.000Z");
    }

    for (const item of day2Items) {
      const blockKey = item.itemId.startsWith("d002-0800")
        ? getBlock(2, "block_a").timeSlotKey
        : getBlock(2, "block_b").timeSlotKey;
      completeTopicItem(userState, 2, blockKey, item.itemId, "2026-05-02T12:00:00.000Z");
    }

    const day2Plan = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);
    expect(day2Plan.queueSessions).toHaveLength(3);

    completeRevisionSession(
      userState,
      day2Plan.queueSessions[0]!.sourceItemId,
      day2Plan.queueSessions[0]!.sourceDay,
      day2Plan.queueSessions[0]!.sourceBlockKey,
      day2Plan.queueSessions[0]!.revisionIds,
      "2026-05-02T07:00:00.000Z",
    );
    completeRevisionSession(
      userState,
      day2Plan.queueSessions[1]!.sourceItemId,
      day2Plan.queueSessions[1]!.sourceDay,
      day2Plan.queueSessions[1]!.sourceBlockKey,
      day2Plan.queueSessions[1]!.revisionIds,
      "2026-05-02T07:05:00.000Z",
    );

    const day3Plan = buildDailyRevisionPlan("2026-05-03", userState, userState.settings);

    expect(day3Plan.queueSessions).toHaveLength(3);
    expect(day3Plan.queueSessions.map((session) => session.sourceDay)).toEqual([1, 2, 2]);
    expect(day3Plan.queueSessions.every((session) => session.revisionTypes.join(",") === "D+1")).toBe(true);
  });

  it("keeps a mixed-due topic inside one morning card instead of duplicating it in recovery", () => {
    const userState = createConfiguredState();
    const topic = getItem(1, "block_a");

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, topic.itemId, "2026-05-01T12:00:00.000Z");

    const plan = buildDailyRevisionPlan("2026-05-05", userState, userState.settings);

    expect(plan.queueSessions).toHaveLength(1);
    expect(plan.queueSessions[0]).toMatchObject({
      sourceItemId: topic.itemId,
      revisionTypes: ["D+1", "D+3"],
      allocatedMinutes: 40,
    });
    expect(plan.catchUpSessions).toHaveLength(0);
    expect(plan.restudySessions).toHaveLength(0);
  });

  it("routes crowded overdue topics into recovery and restudy secondary queues", () => {
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

    const catchUpPlan = buildDailyRevisionPlan("2026-05-05", userState, userState.settings);
    expect(catchUpPlan.catchUpSessions.length).toBeGreaterThan(0);
    expect(catchUpPlan.catchUpSessions.every((session) => session.lane === "revision_recovery")).toBe(true);

    const restudyPlan = buildDailyRevisionPlan("2026-05-10", userState, userState.settings);
    expect(restudyPlan.restudySessions.length).toBeGreaterThan(0);
    expect(restudyPlan.restudySessions.every((session) => session.lane === "needs_restudy")).toBe(true);
  });

  it("prefers one item per revision type before filling duplicates", () => {
    const userState = createConfiguredState();

    // Complete topics spread across several days so different revision types
    // become due on the same target date.
    // Day 1 completed 2026-05-01 → D+1 due 2026-05-02
    const topicA = getItem(1, "block_a", 0);
    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, topicA.itemId, "2026-05-01T12:00:00.000Z");

    // Day 3 completed 2026-05-03 → D+3 due 2026-05-06
    const topicB = getItem(3, "block_a", 0);
    completeTopicItem(userState, 3, getBlock(3, "block_a").timeSlotKey, topicB.itemId, "2026-05-03T12:00:00.000Z");

    // Day 2 completed 2026-05-02 → D+7 due 2026-05-09; also D+1 due 2026-05-03
    const topicC = getItem(2, "block_a", 0);
    completeTopicItem(userState, 2, getBlock(2, "block_a").timeSlotKey, topicC.itemId, "2026-05-02T12:00:00.000Z");

    // On 2026-05-09 topicA has D+7 due (2026-05-08 +1 overdue), topicC has D+7 due (exact),
    // topicA also has D+3 (due 2026-05-04, 5 overdue), topicB has D+3 (due 2026-05-06, 3 overdue).
    // The slot-based picker should take one D+1-type item first (if any),
    // then one D+3 item, then one D+7 item, etc., before doubling up.
    const plan = buildDailyRevisionPlan("2026-05-09", userState, userState.settings);

    // Collect all revision types present across queue sessions
    const queueTypes = plan.queueSessions.flatMap((session) => session.revisionTypes);
    // D+3 and D+7 should both appear (slot-based pick), not crowded out by one type
    expect(queueTypes).toContain("D+3");
    expect(queueTypes).toContain("D+7");
    expect(plan.morningAllocatedMinutes).toBeLessThanOrEqual(75);
  });

  it("caps the morning queue at 75 minutes when only one revision type exists", () => {
    const userState = createConfiguredState();
    const sameCompletion = "2026-05-01T12:00:00.000Z";
    const items = [
      ...getBlock(1, "block_a").items,
      ...getBlock(1, "block_b").items,
      ...getBlock(1, "block_c").items,
      getItem(2, "block_a"),
      getItem(2, "block_b"),
      getItem(3, "block_a"),
    ];

    for (const item of items) {
      const day = item.itemId.startsWith("d003") ? 3 : item.itemId.startsWith("d002") ? 2 : 1;
      const blockKey = item.itemId.startsWith("d003-0800")
        ? getBlock(3, "block_a").timeSlotKey
        : item.itemId.startsWith("d002-0800")
          ? getBlock(2, "block_a").timeSlotKey
          : item.itemId.startsWith("d002-1115")
            ? getBlock(2, "block_b").timeSlotKey
            : item.itemId.startsWith("d001-0800")
              ? getBlock(1, "block_a").timeSlotKey
              : item.itemId.startsWith("d001-1115")
                ? getBlock(1, "block_b").timeSlotKey
                : getBlock(1, "block_c").timeSlotKey;
      completeTopicItem(userState, day, blockKey, item.itemId, sameCompletion);
    }

    // Next day: all items generate D+1 (25 min each). Only 3 fit in 75 min.
    const plan = buildDailyRevisionPlan("2026-05-02", userState, userState.settings);
    expect(plan.morningAllocatedMinutes).toBe(75);
    expect(plan.queueSessions.length).toBeLessThanOrEqual(3);
    expect(plan.overflowSessions.length).toBeGreaterThan(0);
  });

  it("never introduces new queue sessions after completing a revision session", () => {
    const userState = createConfiguredState();

    // Complete topics across multiple days to generate mixed revision types.
    // Day 1 completed 2026-05-01 → D+1 due 2026-05-02, D+3 due 2026-05-04
    const day1Items = [
      ...getBlock(1, "block_a").items,
      ...getBlock(1, "block_b").items,
      ...getBlock(1, "block_c").items,
    ];
    for (const item of day1Items) {
      const blockKey = item.itemId.startsWith("d001-0800")
        ? getBlock(1, "block_a").timeSlotKey
        : item.itemId.startsWith("d001-1115")
          ? getBlock(1, "block_b").timeSlotKey
          : getBlock(1, "block_c").timeSlotKey;
      completeTopicItem(userState, 1, blockKey, item.itemId, "2026-05-01T12:00:00.000Z");
    }

    // Day 2 completed 2026-05-02 → D+1 due 2026-05-03, D+3 due 2026-05-05
    const day2Items = [getItem(2, "block_a"), getItem(2, "block_b")];
    for (const item of day2Items) {
      const blockKey = item.itemId.startsWith("d002-0800")
        ? getBlock(2, "block_a").timeSlotKey
        : getBlock(2, "block_b").timeSlotKey;
      completeTopicItem(userState, 2, blockKey, item.itemId, "2026-05-02T12:00:00.000Z");
    }

    // Day 4 (2026-05-04): Day 1 items have D+3 due, Day 2 items have D+1 overdue by 1.
    // This is a mixed-type day with both D+1 and D+3 items due.
    const before = buildDailyRevisionPlan("2026-05-04", userState, userState.settings);
    const beforeQueueIds = new Set(before.queueSessions.map((session) => session.sourceItemId));
    const beforeOverflowIds = new Set(before.overflowSessions.map((session) => session.sourceItemId));

    // Complete each queue session one at a time and verify: no NEW sourceItemIds appear, overflow never shrinks.
    for (const session of before.queueSessions) {
      completeRevisionSession(
        userState,
        session.sourceItemId,
        session.sourceDay,
        session.sourceBlockKey,
        session.revisionIds,
        "2026-05-04T07:00:00.000Z",
      );

      const after = buildDailyRevisionPlan("2026-05-04", userState, userState.settings);

      // No session in the pending queue should have a sourceItemId that was NOT in the original queue or overflow:
      for (const afterSession of after.queueSessions) {
        expect(
          beforeQueueIds.has(afterSession.sourceItemId),
          `Queue session ${afterSession.sourceItemId} was not in the original queue`,
        ).toBe(true);
      }

      // Overflow should never shrink (items should not move from overflow to queue):
      expect(after.overflowSessions.length).toBeGreaterThanOrEqual(before.overflowSessions.length);
      for (const afterOverflow of after.overflowSessions) {
        expect(
          beforeQueueIds.has(afterOverflow.sourceItemId) || beforeOverflowIds.has(afterOverflow.sourceItemId),
          `Overflow session ${afterOverflow.sourceItemId} appeared from nowhere`,
        ).toBe(true);
      }
    }
  });

  it("persists morning queue selection and reuses it across subsequent builds", () => {
    const userState = createConfiguredState();

    // Complete topics on Day 1 to create revision items.
    const day1Items = [
      ...getBlock(1, "block_a").items,
      ...getBlock(1, "block_b").items,
      ...getBlock(1, "block_c").items,
    ];
    for (const item of day1Items) {
      const blockKey = item.itemId.startsWith("d001-0800")
        ? getBlock(1, "block_a").timeSlotKey
        : item.itemId.startsWith("d001-1115")
          ? getBlock(1, "block_b").timeSlotKey
          : getBlock(1, "block_c").timeSlotKey;
      completeTopicItem(userState, 1, blockKey, item.itemId, "2026-05-01T12:00:00.000Z");
    }

    const targetDate = "2026-05-02";
    expect(userState.morningRevisionSelections[targetDate]).toBeUndefined();

    // First build computes and locks the selection.
    const first = buildDailyRevisionPlan(targetDate, userState, userState.settings);
    expect(userState.morningRevisionSelections[targetDate]).toBeDefined();
    expect(userState.morningRevisionSelections[targetDate]!.length).toBeGreaterThan(0);
    const lockedIds = [...userState.morningRevisionSelections[targetDate]!];

    // Second build (simulating another device with the same persisted state) uses the locked selection.
    const second = buildDailyRevisionPlan(targetDate, userState, userState.settings);
    const secondQueueIds = second.queueSessions.flatMap((s) => s.revisionIds);
    const firstQueueIds = first.queueSessions.flatMap((s) => s.revisionIds);
    expect(secondQueueIds).toEqual(firstQueueIds);

    // Locked selection in userState should be unchanged.
    expect(userState.morningRevisionSelections[targetDate]).toEqual(lockedIds);
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

  it("keeps the dynamic morning queue active even on later mapped phases", () => {
    const userState = createConfiguredState();
    const topic = getItem(1, "block_a");

    completeTopicItem(userState, 1, getBlock(1, "block_a").timeSlotKey, topic.itemId, "2026-05-01T12:00:00.000Z");

    const revisionPhasePlan = buildDailyRevisionPlan("2026-07-03", userState, userState.settings);

    expect(revisionPhasePlan.phaseMode).toBe("session_primary");
    expect(revisionPhasePlan.blockStatusMode).toBe("revision_sessions");
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
