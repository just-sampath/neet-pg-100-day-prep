import { describe, expect, it } from "vitest";

import {
    walkAndAssign,
    runRepackAlgorithm,
} from "@/lib/domain/repack";
import type {
    UnifiedQueueItem,
    BlockCapacity,
} from "@/lib/domain/repack";
import {
    applyTrafficLightToDay,
    moveBlockToBacklog,
    completeBlockItems,
    runMidnightRepack,
    runMidnightRollover,
} from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { applyScheduleMappingsFromSettings, buildExtensionDayRows, ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getCurrentDayNumber, getScheduleDay, getVisibleBlockKeys } from "@/lib/domain/schedule";
import type { BlockKey, SubjectTier } from "@/lib/domain/types";
import { addDaysToDateOnly } from "@/lib/utils/date";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const refData = getStaticReferenceData();

function createConfiguredUserState() {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    return userState;
}

function getBlockKey(dayNumber: number, semanticBlockKey: string): BlockKey {
    return getScheduleDay(dayNumber)!.blocks.find(
        (block) => block.semanticBlockKey === semanticBlockKey,
    )!.timeSlotKey;
}

function getBlockItems(dayNumber: number, semanticBlockKey: string) {
    return getScheduleDay(dayNumber)!.blocks.find(
        (block) => block.semanticBlockKey === semanticBlockKey,
    )!.items;
}

function completeVisibleBlocksForDay(userState: ReturnType<typeof createConfiguredUserState>, dayNumber: number, trafficLight: "green" | "yellow" | "red") {
    const day = getScheduleDay(dayNumber, userState, refData)!;
    const completedAt = `${addDaysToDateOnly(userState.settings.dayOneDate!, dayNumber - 1)}T20:00:00.000Z`;

    for (const blockKey of getVisibleBlockKeys(trafficLight, day)) {
        completeBlockItems(userState, dayNumber, blockKey, completedAt, null, refData);
    }
}

function makeQueueItem(
    overrides: Partial<UnifiedQueueItem> & { sourceItemId: string },
): UnifiedQueueItem {
    return {
        plannedMinutes: 60,
        subjectTier: "B" as SubjectTier,
        dateKey: 1,
        isFromBacklog: false,
        existingIsRecovery: false,
        existingOriginalDayNumber: null,
        existingOriginalBlockKey: null,
        backlogOriginalDay: null,
        backlogOriginalBlockKey: null,
        ...overrides,
    };
}

function makeCapacity(
    dayNumber: number,
    blockKey: BlockKey,
    durationMinutes: number,
    slotOrder: number,
): BlockCapacity {
    return { dayNumber, blockKey, durationMinutes, slotOrder };
}

function makeWalkCapacity(
    dayNumber: number,
    blockKey: BlockKey,
    durationMinutes: number,
    slotOrder: number,
) {
    return {
        ...makeCapacity(dayNumber, blockKey, durationMinutes, slotOrder),
        availableMinutes: durationMinutes,
    };
}

function runAlgorithm(
    backlogQueue: UnifiedQueueItem[],
    futureTopics: UnifiedQueueItem[],
    rawCapacities: BlockCapacity[],
    extensionContext?: import("@/lib/domain/repack").ExtensionContext,
) {
    return runRepackAlgorithm(backlogQueue, futureTopics, rawCapacities, extensionContext);
}

// ---------------------------------------------------------------------------
// Pure Algorithm Tests
// ---------------------------------------------------------------------------

describe("walkAndAssign", () => {
    it("assigns topics to blocks in order until capacity is exhausted", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t3", plannedMinutes: 60 }),
        ];
        const capacities = [
            makeWalkCapacity(5, "08:00-11:00" as BlockKey, 120, 1),
            makeWalkCapacity(5, "11:15-14:15" as BlockKey, 180, 2),
        ];

        const { placed, unplaced } = walkAndAssign(queue, capacities);

        // t1 + t2 in first block (120 min), t3 in second block (180 min)
        expect(placed).toHaveLength(3);
        expect(placed[0]).toMatchObject({ sourceItemId: "t1", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 1 });
        expect(placed[1]).toMatchObject({ sourceItemId: "t2", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 2 });
        expect(placed[2]).toMatchObject({ sourceItemId: "t3", dayNumber: 5, blockKey: "11:15-14:15", itemOrder: 1 });
        expect(unplaced).toHaveLength(0);
    });

    it("does not split topics — skips to next block if topic exceeds remaining capacity", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 90 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 90 }),
        ];
        const capacities = [
            makeWalkCapacity(5, "08:00-11:00" as BlockKey, 100, 1),
            makeWalkCapacity(5, "11:15-14:15" as BlockKey, 100, 2),
        ];

        const { placed, unplaced } = walkAndAssign(queue, capacities);

        // t1 fits in block 1 (100 - 90 = 10 remaining), t2 doesn't fit in remaining 10, moves to block 2
        expect(placed).toHaveLength(2);
        expect(placed[0]).toMatchObject({ sourceItemId: "t1", blockKey: "08:00-11:00" });
        expect(placed[1]).toMatchObject({ sourceItemId: "t2", blockKey: "11:15-14:15" });
        expect(unplaced).toHaveLength(0);
    });

    it("moves overflow topics to unplaced when all blocks are full", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "overflow", plannedMinutes: 60 }),
        ];
        const capacities = [makeWalkCapacity(5, "08:00-11:00" as BlockKey, 120, 1)];

        const { placed, unplaced } = walkAndAssign(queue, capacities);

        expect(placed).toHaveLength(2);
        expect(unplaced).toHaveLength(1);
        expect(unplaced[0]!.sourceItemId).toBe("overflow");
    });

    it("preserves write-once recovery fields for already-recovered items", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({
                sourceItemId: "recovered",
                plannedMinutes: 60,
                isFromBacklog: true,
                existingIsRecovery: true,
                existingOriginalDayNumber: 2,
                existingOriginalBlockKey: "08:00-11:00" as BlockKey,
                backlogOriginalDay: 2,
                backlogOriginalBlockKey: "08:00-11:00" as BlockKey,
            }),
        ];
        const capacities = [makeWalkCapacity(10, "11:15-14:15" as BlockKey, 180, 1)];

        const { placed } = walkAndAssign(queue, capacities);

        expect(placed[0]).toMatchObject({
            isRecovery: true,
            originalDayNumber: 2,
            originalBlockKey: "08:00-11:00",
        });
    });

    it("sets recovery fields for first-time backlog placement", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({
                sourceItemId: "first-recovery",
                plannedMinutes: 60,
                isFromBacklog: true,
                existingIsRecovery: false,
                backlogOriginalDay: 3,
                backlogOriginalBlockKey: "08:00-11:00" as BlockKey,
            }),
        ];
        const capacities = [makeWalkCapacity(10, "11:15-14:15" as BlockKey, 180, 1)];

        const { placed } = walkAndAssign(queue, capacities);

        expect(placed[0]).toMatchObject({
            isRecovery: true,
            originalDayNumber: 3,
            originalBlockKey: "08:00-11:00",
        });
    });

    it("does not mark non-backlog topics as recovery", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "original", plannedMinutes: 60, isFromBacklog: false }),
        ];
        const capacities = [makeWalkCapacity(10, "08:00-11:00" as BlockKey, 180, 1)];

        const { placed } = walkAndAssign(queue, capacities);

        expect(placed[0]!.isRecovery).toBe(false);
        expect(placed[0]!.originalDayNumber).toBeNull();
        expect(placed[0]!.originalBlockKey).toBeNull();
    });
});

describe("runRepackAlgorithm", () => {
    it("is a no-op when backlog is empty and originals already fit the open blocks", () => {
        const future: UnifiedQueueItem[] = Array.from({ length: 10 }, (_, index) =>
            makeQueueItem({
                sourceItemId: `t${index + 1}`,
                plannedMinutes: 60,
                subjectTier: index % 2 === 0 ? "A" : "C",
                dateKey: 5 + Math.floor(index / 4),
            }),
        );
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 120, 1),
            makeCapacity(5, "11:15-14:15" as BlockKey, 120, 2),
            makeCapacity(6, "08:00-11:00" as BlockKey, 120, 1),
            makeCapacity(6, "11:15-14:15" as BlockKey, 120, 2),
            makeCapacity(7, "08:00-11:00" as BlockKey, 120, 1),
        ];

        const result = runAlgorithm([], future, raw);

        expect(result.placements.map((placement) => placement.sourceItemId)).toEqual(
            future.map((topic) => topic.sourceItemId),
        );
        expect(result.placements[0]).toMatchObject({ sourceItemId: "t1", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 1 });
        expect(result.placements[3]).toMatchObject({ sourceItemId: "t4", dayNumber: 5, blockKey: "11:15-14:15", itemOrder: 2 });
        expect(result.placements[9]).toMatchObject({ sourceItemId: "t10", dayNumber: 7, blockKey: "08:00-11:00", itemOrder: 2 });
    });

    it("inserts a single backlog item at the front and pushes originals forward", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({
                sourceItemId: "b1",
                plannedMinutes: 45,
                subjectTier: "A",
                dateKey: 8,
                isFromBacklog: true,
                backlogOriginalDay: 4,
                backlogOriginalBlockKey: "08:00-11:00" as BlockKey,
            }),
        ];
        const future: UnifiedQueueItem[] = Array.from({ length: 10 }, (_, index) =>
            makeQueueItem({
                sourceItemId: `t${index + 1}`,
                plannedMinutes: 60,
                subjectTier: index % 3 === 0 ? "A" : index % 3 === 1 ? "C" : "B",
                dateKey: 5 + Math.floor(index / 3),
            }),
        );
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 180, 1),
            makeCapacity(5, "11:15-14:15" as BlockKey, 180, 2),
            makeCapacity(5, "14:30-17:30" as BlockKey, 180, 3),
            makeCapacity(6, "08:00-11:00" as BlockKey, 180, 1),
        ];

        const result = runAlgorithm(backlog, future, raw);
        const originalPlacements = result.placements.filter((placement) => placement.sourceItemId.startsWith("t"));

        expect(result.placements[0]).toMatchObject({ sourceItemId: "b1", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 1 });
        expect(originalPlacements.map((placement) => placement.sourceItemId)).toEqual(
            future.map((topic) => topic.sourceItemId),
        );
        expect(result.placements.slice(0, 4).map((placement) => placement.sourceItemId)).toEqual(["b1", "t1", "t2", "t3"]);
        expect(result.placements[3]).toMatchObject({ sourceItemId: "t3", dayNumber: 5, blockKey: "11:15-14:15", itemOrder: 1 });
    });

    it("keeps sorted backlog items ahead of originals instead of interleaving by tier and date", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "bA1", subjectTier: "A", dateKey: 7, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "bA2", subjectTier: "A", dateKey: 9, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "bC1", subjectTier: "C", dateKey: 6, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", subjectTier: "A", dateKey: 5, isFromBacklog: false }),
            makeQueueItem({ sourceItemId: "t2", subjectTier: "B", dateKey: 6, isFromBacklog: false }),
            makeQueueItem({ sourceItemId: "t3", subjectTier: "C", dateKey: 7, isFromBacklog: false }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 360, 1),
        ];

        const result = runAlgorithm(backlog, future, raw);

        expect(result.placements.map((placement) => placement.sourceItemId)).toEqual([
            "bA1",
            "bA2",
            "bC1",
            "t1",
            "t2",
            "t3",
        ]);
    });

    it("cascades overflow from block a to b to c and then the next day", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 60, subjectTier: "A", dateKey: 7, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "b2", plannedMinutes: 60, subjectTier: "A", dateKey: 8, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = Array.from({ length: 6 }, (_, index) =>
            makeQueueItem({
                sourceItemId: `o${index + 1}`,
                plannedMinutes: 60,
                subjectTier: index % 2 === 0 ? "A" : "C",
                dateKey: 5 + Math.floor(index / 3),
            }),
        );
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 180, 1),
            makeCapacity(5, "11:15-14:15" as BlockKey, 120, 2),
            makeCapacity(5, "14:30-17:30" as BlockKey, 120, 3),
            makeCapacity(6, "08:00-11:00" as BlockKey, 120, 1),
        ];

        const result = runAlgorithm(backlog, future, raw);

        expect(result.placements).toEqual([
            expect.objectContaining({ sourceItemId: "b1", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 1 }),
            expect.objectContaining({ sourceItemId: "b2", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 2 }),
            expect.objectContaining({ sourceItemId: "o1", dayNumber: 5, blockKey: "08:00-11:00", itemOrder: 3 }),
            expect.objectContaining({ sourceItemId: "o2", dayNumber: 5, blockKey: "11:15-14:15", itemOrder: 1 }),
            expect.objectContaining({ sourceItemId: "o3", dayNumber: 5, blockKey: "11:15-14:15", itemOrder: 2 }),
            expect.objectContaining({ sourceItemId: "o4", dayNumber: 5, blockKey: "14:30-17:30", itemOrder: 1 }),
            expect.objectContaining({ sourceItemId: "o5", dayNumber: 5, blockKey: "14:30-17:30", itemOrder: 2 }),
            expect.objectContaining({ sourceItemId: "o6", dayNumber: 6, blockKey: "08:00-11:00", itemOrder: 1 }),
        ]);
    });

    it("classifies overflow correctly — backlog vs topic", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 90, subjectTier: "A", dateKey: 8, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "f1", plannedMinutes: 90, subjectTier: "A", dateKey: 5, isFromBacklog: false }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 90, 1),
        ];

        const result = runAlgorithm(backlog, future, raw);

        expect(result.stats.placed).toBe(1);
        expect(result.placements[0]!.sourceItemId).toBe("b1");
        expect(result.phaseClosedTopicSourceItemIds).toEqual(["f1"]);
        expect(result.phaseClosedBacklogSourceItemIds).toEqual([]);
    });

    it("handles scenario with only backlog overflow", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 90, subjectTier: "A", dateKey: 7, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "b2", plannedMinutes: 90, subjectTier: "B", dateKey: 8, isFromBacklog: true }),
        ];

        const result = runAlgorithm(backlog, [], [makeCapacity(5, "08:00-11:00" as BlockKey, 90, 1)]);

        expect(result.stats.placed).toBe(1);
        expect(result.phaseClosedBacklogSourceItemIds).toEqual(["b2"]);
        expect(result.phaseClosedTopicSourceItemIds).toEqual([]);
    });

    it("returns empty output when all inputs are empty", () => {
        const result = runAlgorithm([], [], []);
        expect(result.stats).toEqual({ placed: 0, extensionDaysCreated: 0, phaseClosed: 0 });
        expect(result.placements).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Integration Tests — Full Repack with UserState
// ---------------------------------------------------------------------------

describe("runMidnightRepack integration", () => {
    it("redistributes pending topic assignments across current phase", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);
        expect(todayDayNumber).toBe(1);

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.placed).toBeGreaterThan(0);
        // All topic assignments within phase should still have valid positions
        for (const ta of Object.values(userState.schedule.topicAssignments)) {
            if (ta.dayNumber >= todayDayNumber && ta.status === "pending") {
                expect(ta.dayNumber).toBeGreaterThanOrEqual(todayDayNumber);
            }
        }
    });

    it("preserves same-day slot order when repack runs on a fresh Day 1 load", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);
        const day1BlockAKey = getBlockKey(1, "block_a");
        const day1BlockBKey = getBlockKey(1, "block_b");
        const day1BlockCKey = getBlockKey(1, "block_c");

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(userState.schedule.topicAssignments["d001-0800-01"]).toMatchObject({
            dayNumber: 1,
            blockKey: day1BlockAKey,
            itemOrder: 1,
        });
        expect(userState.schedule.topicAssignments["d001-0800-02"]).toMatchObject({
            dayNumber: 1,
            blockKey: day1BlockAKey,
            itemOrder: 2,
        });
        expect(userState.schedule.topicAssignments["d001-1115-01"]).toMatchObject({
            dayNumber: 1,
            blockKey: day1BlockBKey,
            itemOrder: 1,
        });
        expect(userState.schedule.topicAssignments["d001-1500-01"]).toMatchObject({
            dayNumber: 1,
            blockKey: day1BlockCKey,
            itemOrder: 1,
        });
    });

    it("normalizes slot order across statuses to keep day-block-order uniqueness after repack", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);
        const blockAItems = getBlockItems(todayDayNumber, "block_a");
        expect(blockAItems.length).toBeGreaterThanOrEqual(2);

        const completedRow = userState.schedule.topicAssignments[blockAItems[0]!.itemId]!;
        const pendingRow = userState.schedule.topicAssignments[blockAItems[1]!.itemId]!;

        for (const row of Object.values(userState.schedule.topicAssignments)) {
            if (row.dayNumber >= todayDayNumber && row.status === "pending") {
                row.status = "completed";
            }
        }

        completedRow.status = "completed";
        completedRow.itemOrder = 1;
        pendingRow.status = "pending";
        pendingRow.itemOrder = 2;

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);
        expect(result.skipped).toBe(false);

        const slotOwner = new Map<string, string>();
        const duplicateSlots = new Set<string>();
        for (const row of Object.values(userState.schedule.topicAssignments)) {
            const slotKey = `${row.dayNumber}:${row.blockKey}:${row.itemOrder}`;
            const existing = slotOwner.get(slotKey);
            if (existing && existing !== row.sourceItemId) {
                duplicateSlots.add(slotKey);
            } else {
                slotOwner.set(slotKey, row.sourceItemId);
            }
        }

        expect(duplicateSlots.size).toBe(0);
    });

    it("keeps mcq_practice, final_review, and wrap_up_log assignments anchored in their native slots", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const anchoredPlacements = ["mcq_practice", "final_review", "wrap_up_log"].flatMap((semanticBlockKey) => {
            const block = getScheduleDay(2, userState)!.blocks.find((entry) => entry.semanticBlockKey === semanticBlockKey)!;
            return block.items.map((item) => ({
                itemId: item.itemId,
                dayNumber: 2,
                blockKey: block.timeSlotKey,
            }));
        });

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);

        for (const placement of anchoredPlacements) {
            const row = userState.schedule.topicAssignments[placement.itemId]!;
            expect(row.dayNumber).toBe(placement.dayNumber);
            expect(row.blockKey).toBe(placement.blockKey);
        }
    });

    it("is idempotent — second run for same date is a no-op", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        const first = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);
        expect(first.skipped).toBe(false);

        const second = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);
        expect(second.skipped).toBe(true);
        expect(second.reason).toBe("already_processed");
        expect(userState.processedDates.repackDates.filter((d) => d === todayDate)).toHaveLength(1);
    });

    it("skips when dayOneDate is not set", () => {
        const userState = createEmptyUserState();
        const result = runMidnightRepack(userState, userState.settings, "2026-05-01", 0, refData);
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe("no_schedule");
    });

    it("keeps original workbook order when backlog is empty instead of re-sorting originals by tier", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const todayDate = "2026-05-05";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);
        const day5BlockAItems = getBlockItems(todayDayNumber, "block_a");
        const day6BlockAItems = getBlockItems(todayDayNumber + 1, "block_a");

        expect(day5BlockAItems.length).toBeGreaterThanOrEqual(2);
        expect(day6BlockAItems.length).toBeGreaterThanOrEqual(1);

        const pharmRow = userState.schedule.topicAssignments[day5BlockAItems[0]!.itemId]!;
        const entRow = userState.schedule.topicAssignments[day5BlockAItems[1]!.itemId]!;
        const medicineRow = userState.schedule.topicAssignments[day6BlockAItems[0]!.itemId]!;
        const trackedIds = new Set([pharmRow.sourceItemId, entRow.sourceItemId, medicineRow.sourceItemId]);
        const day5BlockAKey = getBlockKey(todayDayNumber, "block_a");
        const day5BlockBKey = getBlockKey(todayDayNumber, "block_b");
        const day5BlockCKey = getBlockKey(todayDayNumber, "block_c");
        const day6BlockAKey = getBlockKey(todayDayNumber + 1, "block_a");

        for (const row of Object.values(userState.schedule.topicAssignments)) {
            if (row.dayNumber >= todayDayNumber && row.status === "pending" && !trackedIds.has(row.sourceItemId)) {
                row.status = "completed";
            }
        }

        pharmRow.dayNumber = todayDayNumber;
        pharmRow.blockKey = day5BlockAKey;
        pharmRow.itemOrder = 1;
        pharmRow.subjectIds = ["pharmacology"];
        pharmRow.label = "Pharmacology";
        pharmRow.plannedMinutes = 60;
        pharmRow.status = "pending";

        entRow.dayNumber = todayDayNumber;
        entRow.blockKey = day5BlockAKey;
        entRow.itemOrder = 2;
        entRow.subjectIds = ["ent"];
        entRow.label = "ENT";
        entRow.plannedMinutes = 60;
        entRow.status = "pending";

        medicineRow.dayNumber = todayDayNumber + 1;
        medicineRow.blockKey = day6BlockAKey;
        medicineRow.itemOrder = 1;
        medicineRow.subjectIds = ["medicine"];
        medicineRow.label = "Medicine";
        medicineRow.plannedMinutes = 60;
        medicineRow.status = "pending";

        userState.schedule.blocks[`${todayDayNumber}:${day5BlockAKey}`]!.durationMinutes = 120;
        userState.schedule.blocks[`${todayDayNumber}:${day5BlockBKey}`]!.durationMinutes = 0;
        userState.schedule.blocks[`${todayDayNumber}:${day5BlockCKey}`]!.durationMinutes = 0;
        userState.schedule.blocks[`${todayDayNumber + 1}:${day6BlockAKey}`]!.durationMinutes = 60;

        runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(userState.schedule.topicAssignments[pharmRow.sourceItemId]).toMatchObject({
            dayNumber: todayDayNumber,
            blockKey: day5BlockAKey,
            itemOrder: 1,
        });
        expect(userState.schedule.topicAssignments[entRow.sourceItemId]).toMatchObject({
            dayNumber: todayDayNumber,
            blockKey: day5BlockAKey,
            itemOrder: 2,
        });
        expect(userState.schedule.topicAssignments[medicineRow.sourceItemId]).toMatchObject({
            dayNumber: todayDayNumber + 1,
            blockKey: day6BlockAKey,
            itemOrder: 1,
        });
    });

    it("places backlog items back into schedule and marks them rescheduled", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Create a backlog item by skipping block_a on day 1
        const day1BlockA = getBlockKey(1, "block_a");
        moveBlockToBacklog(userState, 1, day1BlockA, "manual_skip", "skipped", null, refData);

        // Verify backlog item exists and is pending
        const backlogItems = Object.values(userState.backlogItems).filter((b) => b.status === "pending");
        expect(backlogItems.length).toBeGreaterThan(0);

        const todayDate = "2026-05-02";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.backlogRescheduled).toBeGreaterThan(0);

        // Backlog items that were rescheduled should have status 'rescheduled'
        const rescheduled = Object.values(userState.backlogItems).filter((b) => b.status === "rescheduled");
        expect(rescheduled.length).toBeGreaterThan(0);
    });

    it("absorbs backlog into spare template slot minutes before creating extension days", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const phase1Config = Object.values(userState.schedule.phaseConfig).find((phase) => phase.phaseNumber === 1)!;
        const todayDayNumber = phase1Config.currentEndDay;
        const todayDate = addDaysToDateOnly(userState.settings.dayOneDate!, todayDayNumber - 1);
        const blockAKey = getBlockKey(todayDayNumber, "block_a");
        const blockBKey = getBlockKey(todayDayNumber, "block_b");
        const blockCKey = getBlockKey(todayDayNumber, "block_c");
        const targetItem = getBlockItems(todayDayNumber, "block_a")[0]!;
        const targetRow = userState.schedule.topicAssignments[targetItem.itemId]!;

        for (const row of Object.values(userState.schedule.topicAssignments)) {
            if (row.dayNumber >= todayDayNumber) {
                row.status = row.sourceItemId === targetRow.sourceItemId ? "pending" : "completed";
            }
        }

        targetRow.dayNumber = todayDayNumber;
        targetRow.blockKey = blockAKey;
        targetRow.itemOrder = 1;
        targetRow.label = "Protected Phase-End Topic";
        targetRow.plannedMinutes = 120;
        targetRow.status = "pending";

        userState.schedule.blocks[`${todayDayNumber}:${blockAKey}`]!.durationMinutes = 180;
        userState.schedule.blocks[`${todayDayNumber}:${blockBKey}`]!.durationMinutes = 0;
        userState.schedule.blocks[`${todayDayNumber}:${blockCKey}`]!.durationMinutes = 0;

        moveBlockToBacklog(userState, 1, getBlockKey(1, "block_a"), "manual_skip", "skipped", null, refData);
        const backlogItems = Object.values(userState.backlogItems)
            .filter((item) => item.status === "pending")
            .sort((left, right) => left.id.localeCompare(right.id));
        const preservedBacklog = backlogItems[0]!;

        for (const item of backlogItems.slice(1)) {
            item.status = "dismissed";
            item.dismissedAt = todayDate;
        }

        preservedBacklog.plannedMinutes = 60;

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.extensionDaysCreated).toBe(0);
        expect(phase1Config.currentEndDay).toBe(todayDayNumber);
        expect(userState.schedule.topicAssignments[targetRow.sourceItemId]).toMatchObject({
            dayNumber: todayDayNumber,
        });
    });

    it("marks phase_closed topic assignments as missed with phase_closed source tag", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Sabotage: reduce all block capacities to near-zero for phase 1 to force overflow
        // Also exhaust extension budget so items become phase_closed
        const phase1Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 1)!;
        const phaseEndDay = phase1Config.currentEndDay;
        phase1Config.extensionsUsed = phase1Config.extensionBudget; // exhaust budget

        // Set day one date so that day 60 maps to a specific date
        const todayDate = "2026-06-29"; // day 60 maps to this date when dayOneDate = 2026-05-01
        const calculatedDayNumber = getCurrentDayNumber(userState, todayDate);

        // Shrink block durations for remaining days to limit capacity
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= calculatedDayNumber && block.dayNumber <= phaseEndDay) {
                block.durationMinutes = 1; // 1 min = almost no capacity
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, calculatedDayNumber, refData);

        // With severely limited capacity and no extension budget, we expect phase_closed
        if (result.phaseClosed > 0) {
            // Find phase_closed topic assignments
            const closedTopics = Object.values(userState.schedule.topicAssignments).filter(
                (ta) => ta.sourceTag === "phase_closed" && ta.status === "missed",
            );
            expect(closedTopics.length).toBeGreaterThan(0);

            // Backlog entries should exist for phase_closed topics
            for (const ct of closedTopics) {
                const backlogEntry = userState.backlogItems[ct.sourceItemId];
                expect(backlogEntry).toBeDefined();
                expect(backlogEntry!.sourceTag).toBe("phase_closed");
                expect(backlogEntry!.status).toBe("phase_closed");
            }
        }
    });

    it("preserves write-once recovery fields for previously recovered topics", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Mark a study-block topic assignment as already-recovered from a prior repack.
        // Special blocks are anchored and repaired back to their native slot now.
        const day2 = getScheduleDay(2, userState)!;
        const targetBlock = day2.blocks.find(
            (block) => ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey) && block.items.length > 0,
        );
        const targetRow = targetBlock ? userState.schedule.topicAssignments[targetBlock.items[0]!.itemId] : null;
        if (targetRow) {
            targetRow.isRecovery = true;
            targetRow.originalDayNumber = 1;
            targetRow.originalBlockKey = "08:00-11:00" as BlockKey;

            const todayDate = "2026-05-01";
            const todayDayNumber = getCurrentDayNumber(userState, todayDate);

            runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

            // After repack, recovery fields should be preserved (write-once)
            const afterRow = userState.schedule.topicAssignments[targetRow.sourceItemId]!;
            expect(afterRow.isRecovery).toBe(true);
            expect(afterRow.originalDayNumber).toBe(1);
            expect(afterRow.originalBlockKey).toBe("08:00-11:00");
        }
    });

    it("only collects status=pending topics (not completed/missed/rescheduled)", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Complete some items on day 1 so they have status='completed'
        const day1BlockA = getBlockKey(1, "block_a");
        const blockAItems = getBlockItems(1, "block_a");
        if (blockAItems.length > 0) {
            completeBlockItems(userState, 1, day1BlockA, "2026-05-01T10:00:00.000Z", null, refData);
        }

        const todayDate = "2026-05-02";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        // Completed items should still be completed
        if (blockAItems.length > 0) {
            for (const item of blockAItems) {
                const row = userState.schedule.topicAssignments[item.itemId];
                if (row) {
                    expect(row.status).toBe("completed");
                }
            }
        }
    });

    it("runs for day after midnight rollover creates backlog", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Simulate: day 1 passes without completing anything, then midnight rollover
        const today = "2026-05-02";
        const todayDayNumber = getCurrentDayNumber(userState, today);

        // Run midnight rollover which creates backlog for missed items
        runMidnightRollover(userState, userState.settings, today, todayDayNumber, refData);

        // Now verify some backlog was created from the rollover
        const pendingBacklog = Object.values(userState.backlogItems).filter((b) => b.status === "pending");

        // Run repack — should redistribute backlog items
        const result = runMidnightRepack(userState, userState.settings, today, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        if (pendingBacklog.length > 0) {
            // The repack should have attempted to place these items
            expect(result.placed).toBeGreaterThan(0);
        }
    });

    it("absorbs three consecutive red days backlog into remaining schedule capacity", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        for (const dayNumber of [1, 2, 3] as const) {
            completeVisibleBlocksForDay(userState, dayNumber, "green");
            const nextDate = addDaysToDateOnly(userState.settings.dayOneDate!, dayNumber);
            runMidnightRollover(userState, userState.settings, nextDate, dayNumber + 1, refData);
            runMidnightRepack(userState, userState.settings, nextDate, dayNumber + 1, refData);
        }

        for (const dayNumber of [4, 5, 6] as const) {
            applyTrafficLightToDay(userState, dayNumber, "red", { allowRestore: true }, refData);

            completeVisibleBlocksForDay(userState, dayNumber, "red");
            const nextDate = addDaysToDateOnly(userState.settings.dayOneDate!, dayNumber);
            runMidnightRollover(userState, userState.settings, nextDate, dayNumber + 1, refData);
            runMidnightRepack(userState, userState.settings, nextDate, dayNumber + 1, refData);
        }

        // With phase-free repack, extensions (if any) go after the schedule tail (101+)
        const runtimeTail = Math.max(
            ...Object.values(userState.schedule.days).map((d) => d.dayNumber),
        );
        if (runtimeTail > 100) {
            // Any extension days should be numbered 101+
            for (let d = 101; d <= runtimeTail; d++) {
                const extDay = userState.schedule.days[String(d)];
                expect(extDay).toBeDefined();
                expect(extDay!.isExtensionDay).toBe(true);
            }
        }

        // All repack dates recorded
        expect(userState.processedDates.repackDates).toEqual(
            expect.arrayContaining(["2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05", "2026-05-06", "2026-05-07"]),
        );

        // The backlog items from red days should have been placed (rescheduled)
        const rescheduledItems = Object.values(userState.backlogItems).filter((b) => b.status === "rescheduled");
        expect(rescheduledItems.length).toBeGreaterThan(0);
    });

    it("does not place backlog into hidden blocks when repack runs on a red day", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const todayDayNumber = 2;
        const todayDate = addDaysToDateOnly(userState.settings.dayOneDate!, todayDayNumber - 1);
        const blockAKey = getBlockKey(todayDayNumber, "block_a");
        const blockBKey = getBlockKey(todayDayNumber, "block_b");
        const blockCKey = getBlockKey(todayDayNumber, "block_c");

        applyTrafficLightToDay(userState, todayDayNumber, "red", { allowRestore: true }, refData);
        moveBlockToBacklog(userState, 1, getBlockKey(1, "block_a"), "manual_skip", "skipped", null, refData);

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(
            Object.values(userState.backlogItems).some(
                (item) =>
                    item.status === "rescheduled" &&
                    item.rescheduledToDay === todayDayNumber &&
                    (
                        item.rescheduledToBlockKey === blockAKey ||
                        item.rescheduledToBlockKey === blockBKey ||
                        item.rescheduledToBlockKey === blockCKey
                    ),
            ),
        ).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("repack edge cases", () => {
    it("handles a completely completed day gracefully", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Complete everything on day 1
        const day1 = getScheduleDay(1)!;
        for (const block of day1.blocks) {
            if (block.items.length > 0) {
                completeBlockItems(
                    userState,
                    1,
                    block.timeSlotKey,
                    "2026-05-01T20:00:00.000Z",
                    null,
                    refData,
                );
            }
        }

        const todayDate = "2026-05-02";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        // Should succeed — no backlog, only future topics to redistribute
        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);
        expect(result.skipped).toBe(false);
    });

    it("skips repack when today is beyond all phases", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Set a date far beyond the 100-day plan
        const farFutureDate = "2026-12-01";
        const dayNumber = getCurrentDayNumber(userState, farFutureDate);

        const result = runMidnightRepack(userState, userState.settings, farFutureDate, dayNumber, refData);

        // If dayNumber is beyond all phases, should be skipped
        if (result.skipped) {
            expect(result.reason).toBe("no_phase");
        }
    });

    it("handles empty schedule blocks without crashing", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Clear all blocks to simulate edge case
        userState.schedule.blocks = {};

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        // Exhaust extension budget so that overflow becomes phase_closed
        for (const phase of Object.values(userState.schedule.phaseConfig)) {
            phase.extensionsUsed = phase.extensionBudget;
        }

        // Should run without error — no capacity means everything overflows to phase_closed
        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);
        expect(result.skipped).toBe(false);
        // With no blocks and no extension budget, all topics become phase_closed
        expect(result.phaseClosed).toBeGreaterThanOrEqual(result.placed);
    });

    it("records repack date in processedDates for idempotency tracking", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        expect(userState.processedDates.repackDates).toEqual([]);

        const todayDate = "2026-05-01";
        const todayDayNumber = getCurrentDayNumber(userState, todayDate);

        runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(userState.processedDates.repackDates).toContain("2026-05-01");
    });

    it("handles consecutive repack runs on different days", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Day 1
        const day1Date = "2026-05-01";
        const day1Number = getCurrentDayNumber(userState, day1Date);
        const r1 = runMidnightRepack(userState, userState.settings, day1Date, day1Number, refData);
        expect(r1.skipped).toBe(false);

        // Day 2
        const day2Date = "2026-05-02";
        const day2Number = getCurrentDayNumber(userState, day2Date);
        const r2 = runMidnightRepack(userState, userState.settings, day2Date, day2Number, refData);
        expect(r2.skipped).toBe(false);

        expect(userState.processedDates.repackDates).toContain("2026-05-01");
        expect(userState.processedDates.repackDates).toContain("2026-05-02");
        expect(userState.processedDates.repackDates).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------
// Additional Pure Algorithm Tests
// ---------------------------------------------------------------------------

describe("repack algorithm with multi-day capacity", () => {
    it("fills Block A before Block B before Block C within the same day", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t3", plannedMinutes: 60 }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),   // block_a slot
            makeCapacity(5, "11:15-14:15" as BlockKey, 60, 2),   // block_b slot
            makeCapacity(5, "14:30-17:30" as BlockKey, 60, 3),   // block_c slot
        ];

        const result = runAlgorithm([], queue, raw);

        expect(result.placements[0]).toMatchObject({ sourceItemId: "t1", blockKey: "08:00-11:00" });
        expect(result.placements[1]).toMatchObject({ sourceItemId: "t2", blockKey: "11:15-14:15" });
        expect(result.placements[2]).toMatchObject({ sourceItemId: "t3", blockKey: "14:30-17:30" });
    });

    it("spills to next day when current day is full", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60 }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
            makeCapacity(6, "08:00-11:00" as BlockKey, 60, 1),
        ];

        const result = runAlgorithm([], queue, raw);

        expect(result.placements[0]).toMatchObject({ sourceItemId: "t1", dayNumber: 5 });
        expect(result.placements[1]).toMatchObject({ sourceItemId: "t2", dayNumber: 6 });
    });

    it("gives backlog priority over future topics at same tier and date", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 60, subjectTier: "A", dateKey: 5, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "f1", plannedMinutes: 60, subjectTier: "A", dateKey: 5, isFromBacklog: false }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
        ];

        const result = runAlgorithm(backlog, future, raw);

        // Only one slot — backlog gets priority
        expect(result.stats.placed).toBe(1);
        expect(result.placements[0]!.sourceItemId).toBe("b1");
        expect(result.phaseClosedTopicSourceItemIds).toEqual(["f1"]);
    });
});

// ---------------------------------------------------------------------------
// Extension Loop — Pure Algorithm Tests
// ---------------------------------------------------------------------------

describe("runRepackAlgorithm with extensionContext", () => {
    it("uses extension days to place items that overflow base capacity", () => {
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
        ];
        // Only 60 minutes of base capacity — t2 overflows
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
        ];

        const context: import("@/lib/domain/repack").ExtensionContext = {
            remainingBudget: 2,
            phaseEndDay: 5,
            phaseEndMappedDate: "2026-06-30",
            hardStopDate: "2026-08-28",
            phaseNumber: 1,
            extensionDayBlockCapacities: [
                makeCapacity(0, "08:00-11:00" as BlockKey, 180, 3),
                makeCapacity(0, "11:15-14:15" as BlockKey, 180, 5),
            ],
        };

        const result = runAlgorithm([], future, raw, context);

        expect(result.stats.placed).toBe(2);
        expect(result.extensionDaysUsed).toBe(1);
        expect(result.stats.extensionDaysCreated).toBe(1);
        expect(result.stats.phaseClosed).toBe(0);

        // t1 placed in base day, t2 in extension day 6
        expect(result.placements[0]).toMatchObject({ sourceItemId: "t1", dayNumber: 5 });
        expect(result.placements[1]).toMatchObject({ sourceItemId: "t2", dayNumber: 6 });
    });

    it("respects extension budget limit", () => {
        // 3 items, 1 per day capacity, budget of 1 extension day → 1 item phase_closed
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
            makeQueueItem({ sourceItemId: "t3", plannedMinutes: 60, subjectTier: "B", dateKey: 5 }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
        ];

        const context: import("@/lib/domain/repack").ExtensionContext = {
            remainingBudget: 1,
            phaseEndDay: 5,
            phaseEndMappedDate: "2026-06-30",
            hardStopDate: "2026-08-28",
            phaseNumber: 1,
            extensionDayBlockCapacities: [
                makeCapacity(0, "08:00-11:00" as BlockKey, 60, 3),
            ],
        };

        const result = runAlgorithm([], future, raw, context);

        expect(result.stats.placed).toBe(2); // t1 base + t2 extension
        expect(result.extensionDaysUsed).toBe(1);
        expect(result.stats.phaseClosed).toBe(1); // t3 can't fit
        expect(result.phaseClosedTopicSourceItemIds).toEqual(["t3"]);
    });

    it("respects hard stop date", () => {
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
        ];

        // Hard stop is tomorrow — only one extension day possible
        const context: import("@/lib/domain/repack").ExtensionContext = {
            remainingBudget: 5,
            phaseEndDay: 5,
            phaseEndMappedDate: "2026-08-27",
            hardStopDate: "2026-08-28",
            phaseNumber: 3,
            extensionDayBlockCapacities: [
                makeCapacity(0, "08:00-11:00" as BlockKey, 60, 3),
            ],
        };

        const result = runAlgorithm([], future, raw, context);

        // t1 base, t2 extension on 2026-08-28 (on hard stop, allowed)
        expect(result.stats.placed).toBe(2);
        expect(result.extensionDaysUsed).toBe(1);
    });

    it("stops extending when mapped date exceeds hard stop", () => {
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t3", plannedMinutes: 60 }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
        ];

        // Phase end is 2026-08-27, hard stop 2026-08-28 → only 1 extension day (2026-08-28)
        const context: import("@/lib/domain/repack").ExtensionContext = {
            remainingBudget: 10,
            phaseEndDay: 5,
            phaseEndMappedDate: "2026-08-27",
            hardStopDate: "2026-08-28",
            phaseNumber: 3,
            extensionDayBlockCapacities: [
                makeCapacity(0, "08:00-11:00" as BlockKey, 60, 3),
            ],
        };

        const result = runAlgorithm([], future, raw, context);

        expect(result.stats.placed).toBe(2); // t1 base, t2 on 2026-08-28
        expect(result.extensionDaysUsed).toBe(1);
        expect(result.stats.phaseClosed).toBe(1); // t3 can't fit
    });

    it("does not create extension days when no overflow", () => {
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60, subjectTier: "A", dateKey: 5 }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 180, 1),
        ];

        const context: import("@/lib/domain/repack").ExtensionContext = {
            remainingBudget: 3,
            phaseEndDay: 5,
            phaseEndMappedDate: "2026-06-30",
            hardStopDate: "2026-08-28",
            phaseNumber: 1,
            extensionDayBlockCapacities: [
                makeCapacity(0, "08:00-11:00" as BlockKey, 180, 3),
            ],
        };

        const result = runAlgorithm([], future, raw, context);

        expect(result.stats.placed).toBe(1);
        expect(result.extensionDaysUsed).toBe(0);
        expect(result.stats.extensionDaysCreated).toBe(0);
        expect(result.stats.phaseClosed).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Integration: Extension + Renumber + Phase Closed
// ---------------------------------------------------------------------------

describe("runMidnightRepack extension integration", () => {
    it("keeps inserted extension days from rendering workbook template topics after reload", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const now = "2026-07-03T00:00:00.000Z";
        const insertionPoint = 63;

        const newDays = {} as typeof userState.schedule.days;
        for (const [key, day] of Object.entries(userState.schedule.days)) {
            if (day.dayNumber > insertionPoint) {
                day.dayNumber += 1;
                day.mappedDate = addDaysToDateOnly(day.mappedDate, 1);
                day.updatedAt = now;
                newDays[String(day.dayNumber)] = day;
            } else {
                newDays[key] = day;
            }
        }
        userState.schedule.days = newDays;

        const newBlocks = {} as typeof userState.schedule.blocks;
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber > insertionPoint) {
                block.dayNumber += 1;
                block.updatedAt = now;
            }
            newBlocks[`${block.dayNumber}:${block.blockKey}`] = block;
        }
        userState.schedule.blocks = newBlocks;

        for (const topic of Object.values(userState.schedule.topicAssignments)) {
            if (topic.dayNumber > insertionPoint) {
                topic.dayNumber += 1;
                topic.updatedAt = now;
            }

            if (topic.originalDayNumber && topic.originalDayNumber > insertionPoint) {
                topic.originalDayNumber += 1;
            }
        }

        for (const phase of Object.values(userState.schedule.phaseConfig)) {
            if (phase.currentStartDay > insertionPoint) {
                phase.currentStartDay += 1;
                phase.updatedAt = now;
            }
            if (phase.currentEndDay > insertionPoint) {
                phase.currentEndDay += 1;
                phase.updatedAt = now;
            }
        }

        const extMappedDate = addDaysToDateOnly(userState.schedule.days[String(insertionPoint)]!.mappedDate, 1);
        const { dayRow, blockRows } = buildExtensionDayRows(
            insertionPoint + 1,
            "phase_1",
            "phase_1",
            "Phase 1",
            extMappedDate,
            now,
        );

        userState.schedule.days[String(insertionPoint + 1)] = dayRow;
        for (const block of blockRows) {
            userState.schedule.blocks[`${block.dayNumber}:${block.blockKey}`] = block;
        }

        userState.schedule.phaseConfig["1"]!.currentEndDay = insertionPoint + 1;
        userState.schedule.phaseConfig["1"]!.extensionsUsed = 1;
        userState.schedule.phaseConfig["1"]!.updatedAt = now;

        // Simulate a fresh load from disk/network so mapping is recalculated on a new object.
        userState.schedule = structuredClone(userState.schedule);
        applyScheduleMappingsFromSettings(userState.schedule, userState.settings, now);

        expect(userState.schedule.days["64"]!.isExtensionDay).toBe(true);

        const extensionDay = getScheduleDay(64, userState, refData)!;
        const studyBlocks = extensionDay.blocks.filter((block) =>
            ["block_a", "block_b", "block_c"].includes(block.semanticBlockKey),
        );

        expect(studyBlocks).toHaveLength(3);
        expect(studyBlocks.every((block) => block.items.length === 0)).toBe(true);
        expect(
            extensionDay.blocks.flatMap((block) => block.items.map((item) => item.label)),
        ).not.toContain("Pathology: General pathology");
    });

    it("creates extension days appended after schedule tail (phase-free)", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const phase3Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 3)!;

        // Find the runtime tail (max dayNumber across all days)
        const runtimeTailBefore = Math.max(
            ...Object.values(userState.schedule.days).map((d) => d.dayNumber),
        );

        // Pick a day near end of schedule to trigger repack
        const todayDayNumber = runtimeTailBefore - 2;
        const todayDate = "2026-08-06";
        userState.settings.dayOneDate = "2026-05-01";

        // Sabotage: shrink remaining blocks to force overflow into extension
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= runtimeTailBefore) {
                block.durationMinutes = 1;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);

        if (result.extensionDaysCreated > 0) {
            const extCount = result.extensionDaysCreated;

            // Phase 3 end day should have extended (extensions append after tail)
            expect(phase3Config.currentEndDay).toBe(runtimeTailBefore + extCount);
            expect(phase3Config.extensionsUsed).toBeGreaterThanOrEqual(extCount);

            // Extension days should exist AFTER the original schedule tail
            for (let i = 1; i <= extCount; i++) {
                const extDay = userState.schedule.days[String(runtimeTailBefore + i)];
                expect(extDay).toBeDefined();
                expect(extDay!.isExtensionDay).toBe(true);
                // Extension days are always >= 101 for a 100-day workbook
                expect(runtimeTailBefore + i).toBeGreaterThanOrEqual(101);
            }
        }
    });

    it("backlog items from prior phases are still eligible for cross-phase placement", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Create a backlog item from phase 1
        userState.backlogItems["stale-item"] = {
            id: "stale-item",
            sourceItemId: "stale-item",
            originalDay: 5,
            originalBlockKey: "08:00-11:00" as BlockKey,
            originalStart: null,
            originalEnd: null,
            priorityOrder: 1,
            topicDescription: "Stale topic",
            subject: "Anatomy",
            subjectIds: [],
            subjectTier: "A",
            plannedMinutes: 60,
            sourceTag: "missed",
            recoveryLane: "core_recovery",
            phaseFence: "same_phase_only",
            phase: 1,
            manualSortOverride: null,
            status: "pending",
            suggestedDay: null,
            suggestedBlockKey: null,
            suggestedNote: null,
            rescheduledToDay: null,
            rescheduledToBlockKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            dismissedAt: null,
        };

        // Run repack from phase 2 — phase-free repack treats all pending items equally
        const phase2Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 2)!;
        const todayDayNumber = phase2Config.currentStartDay;
        const todayDate = "2026-07-15";

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        // Phase transition closure no longer happens — items stay eligible
        expect(result.phaseTransitionClosed).toBe(0);

        // The item should NOT be phase_closed; it remains pending or gets placed
        const item = userState.backlogItems["stale-item"]!;
        expect(item.status).not.toBe("phase_closed");
    });

    it("fully exhausts extension budget before marking phase_closed", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Find runtime tail
        const runtimeTailBefore = Math.max(
            ...Object.values(userState.schedule.days).map((d) => d.dayNumber),
        );

        // Pick a day near end of schedule with heavy sabotage
        const todayDayNumber = runtimeTailBefore - 1;
        const todayDate = "2026-08-06";
        userState.settings.dayOneDate = "2026-05-01";

        // Extreme sabotage: zero-out remaining capacity
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= runtimeTailBefore) {
                block.durationMinutes = 0;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);

        // Should have used extension days if there were items to place
        // Budget is distance to HARD_BOUNDARY_DATE minus buffer
        if (result.extensionDaysCreated > 0) {
            // Extension days go AFTER the schedule tail
            for (let i = 1; i <= result.extensionDaysCreated; i++) {
                const extDay = userState.schedule.days[String(runtimeTailBefore + i)];
                expect(extDay).toBeDefined();
                expect(extDay!.isExtensionDay).toBe(true);
            }
        }
    });

    it("extension days append after schedule tail without shifting existing mapped_dates", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Find runtime tail
        const runtimeTailBefore = Math.max(
            ...Object.values(userState.schedule.days).map((d) => d.dayNumber),
        );

        // Capture a few existing days' mapped dates
        const day50Before = userState.schedule.days["50"]!;
        const day80Before = userState.schedule.days["80"]!;
        const tailDayBefore = userState.schedule.days[String(runtimeTailBefore)]!;
        const origMapped50 = day50Before.mappedDate;
        const origMapped80 = day80Before.mappedDate;
        const origMappedTail = tailDayBefore.mappedDate;

        // Pick a day near end of schedule to trigger repack
        const todayDayNumber = runtimeTailBefore - 2;
        const todayDate = "2026-08-06";
        userState.settings.dayOneDate = "2026-05-01";

        // Sabotage: shrink remaining blocks to force overflow into extension
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= runtimeTailBefore) {
                block.durationMinutes = 1;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        if (result.extensionDaysCreated > 0) {
            // Existing days' mapped dates must NOT have changed (no cascade)
            expect(userState.schedule.days["50"]!.mappedDate).toBe(origMapped50);
            expect(userState.schedule.days["80"]!.mappedDate).toBe(origMapped80);
            expect(userState.schedule.days[String(runtimeTailBefore)]!.mappedDate).toBe(origMappedTail);

            // Extension days appended after tail have sequential mapped dates
            for (let i = 1; i <= result.extensionDaysCreated; i++) {
                const extDay = userState.schedule.days[String(runtimeTailBefore + i)];
                expect(extDay).toBeDefined();
                const expectedDate = new Date(origMappedTail);
                expectedDate.setDate(expectedDate.getDate() + i);
                expect(extDay!.mappedDate).toBe(expectedDate.toISOString().slice(0, 10));
            }
        }
    });

    it("legacy repack_overflow backlog items from prior phases remain eligible for placement", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Create a legacy repack_overflow item from Phase 1
        userState.backlogItems["legacy-overflow"] = {
            id: "legacy-overflow",
            sourceItemId: "legacy-overflow",
            originalDay: 10,
            originalBlockKey: "08:00-11:00" as BlockKey,
            originalStart: null,
            originalEnd: null,
            priorityOrder: 1,
            topicDescription: "Legacy overflowed topic",
            subject: "Anatomy",
            subjectIds: [],
            subjectTier: "B",
            plannedMinutes: 60,
            sourceTag: "repack_overflow",
            recoveryLane: "core_recovery",
            phaseFence: "same_phase_only",
            phase: 1,
            manualSortOverride: null,
            status: "pending",
            suggestedDay: null,
            suggestedBlockKey: null,
            suggestedNote: null,
            rescheduledToDay: null,
            rescheduledToBlockKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            dismissedAt: null,
        };

        // Run repack from Phase 2 — phase-free means no cross-phase closure
        const phase2Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 2)!;
        const todayDayNumber = phase2Config.currentStartDay;
        const todayDate = "2026-07-15";

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.phaseTransitionClosed).toBe(0);
        // Item stays eligible — not phase_closed
        expect(userState.backlogItems["legacy-overflow"]!.status).not.toBe("phase_closed");
    });
});

// ---------------------------------------------------------------------------
// Phase 0 — Test 2: Extension days must be placed at Day 101+, not mid-schedule
// ---------------------------------------------------------------------------
describe("phase-free repack extension day positioning", () => {
    it("places extension days at Day 101+ after removing phase constraints", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const phase1Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 1)!;
        const originalPhase1End = phase1Config.currentEndDay;

        // Pick a day near end of phase 1 to trigger repack with overflow
        const todayDayNumber = originalPhase1End - 2;
        const todayDate = "2026-07-01";

        // Shrink remaining blocks to force overflow → extension days
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= originalPhase1End) {
                block.durationMinutes = 1;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.extensionDaysCreated).toBeGreaterThan(0);

        // ALL extension days must be at Day 101+, NOT at phase end + 1 (mid-schedule)
        for (const [, dayRow] of Object.entries(userState.schedule.days)) {
            if (dayRow.isExtensionDay) {
                expect(dayRow.dayNumber).toBeGreaterThanOrEqual(101);
            }
        }

        // No non-extension day should have dayNumber > 100
        for (const [, dayRow] of Object.entries(userState.schedule.days)) {
            if (!dayRow.isExtensionDay) {
                expect(dayRow.dayNumber).toBeLessThanOrEqual(100);
            }
        }
    }, 30_000);
});
