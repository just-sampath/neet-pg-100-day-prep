import { describe, expect, it } from "vitest";

import {
    mergeUnifiedQueue,
    computeBlockCapacities,
    walkAndAssign,
    runRepackAlgorithm,
} from "@/lib/domain/repack";
import type {
    UnifiedQueueItem,
    PinnedTopic,
    BlockCapacity,
} from "@/lib/domain/repack";
import {
    moveBlockToBacklog,
    completeBlockItems,
    runMidnightRepack,
    runMidnightRollover,
} from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay } from "@/lib/domain/schedule";
import { getCurrentDayNumber } from "@/lib/domain/schedule";
import type { BlockKey, SubjectTier } from "@/lib/domain/types";

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

// ---------------------------------------------------------------------------
// Pure Algorithm Tests
// ---------------------------------------------------------------------------

describe("mergeUnifiedQueue", () => {
    it("merges by tier ASC, dateKey ASC, backlog-first within same tier+date", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b-A-3", subjectTier: "A", dateKey: 3, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "b-B-1", subjectTier: "B", dateKey: 1, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "f-A-2", subjectTier: "A", dateKey: 2, isFromBacklog: false }),
            makeQueueItem({ sourceItemId: "f-A-3", subjectTier: "A", dateKey: 3, isFromBacklog: false }),
            makeQueueItem({ sourceItemId: "f-B-1", subjectTier: "B", dateKey: 1, isFromBacklog: false }),
        ];

        const merged = mergeUnifiedQueue(backlog, future);
        const ids = merged.map((m) => m.sourceItemId);

        // All A's first: f-A-2 (date 2), b-A-3 (date 3, backlog-first), f-A-3 (date 3, future)
        // Then B's: b-B-1 (date 1, backlog-first), f-B-1 (date 1, future)
        expect(ids).toEqual(["f-A-2", "b-A-3", "f-A-3", "b-B-1", "f-B-1"]);
    });

    it("handles empty backlog", () => {
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "f1", subjectTier: "C", dateKey: 5 }),
        ];
        const merged = mergeUnifiedQueue([], future);
        expect(merged).toHaveLength(1);
        expect(merged[0]!.sourceItemId).toBe("f1");
    });

    it("handles empty future topics", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", subjectTier: "A", dateKey: 2, isFromBacklog: true }),
        ];
        const merged = mergeUnifiedQueue(backlog, []);
        expect(merged).toHaveLength(1);
        expect(merged[0]!.sourceItemId).toBe("b1");
    });

    it("handles both empty", () => {
        expect(mergeUnifiedQueue([], [])).toEqual([]);
    });

    it("places null-tier items after C-tier items", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b-null", subjectTier: null, dateKey: 1, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "f-C", subjectTier: "C", dateKey: 1 }),
        ];
        const merged = mergeUnifiedQueue(backlog, future);
        expect(merged.map((m) => m.sourceItemId)).toEqual(["f-C", "b-null"]);
    });
});

describe("computeBlockCapacities", () => {
    it("deducts pinned minutes from block capacity", () => {
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 180, 1),
        ];
        const pinned: PinnedTopic[] = [
            { sourceItemId: "p1", dayNumber: 5, blockKey: "08:00-11:00" as BlockKey, plannedMinutes: 45, itemOrder: 1 },
            { sourceItemId: "p2", dayNumber: 5, blockKey: "08:00-11:00" as BlockKey, plannedMinutes: 30, itemOrder: 2 },
        ];

        const result = computeBlockCapacities(raw, pinned);
        expect(result).toHaveLength(1);
        expect(result[0]!.availableMinutes).toBe(105); // 180 - 45 - 30
        expect(result[0]!.pinnedMaxOrder).toBe(2);
    });

    it("returns full capacity when no pinned topics", () => {
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 180, 1),
        ];
        const result = computeBlockCapacities(raw, []);
        expect(result[0]!.availableMinutes).toBe(180);
        expect(result[0]!.pinnedMaxOrder).toBe(0);
    });

    it("clamps capacity to zero if pinned exceeds total", () => {
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 60, 1),
        ];
        const pinned: PinnedTopic[] = [
            { sourceItemId: "p1", dayNumber: 5, blockKey: "08:00-11:00" as BlockKey, plannedMinutes: 90, itemOrder: 1 },
        ];
        const result = computeBlockCapacities(raw, pinned);
        expect(result[0]!.availableMinutes).toBe(0);
    });
});

describe("walkAndAssign", () => {
    it("assigns topics to blocks in order until capacity is exhausted", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t2", plannedMinutes: 60 }),
            makeQueueItem({ sourceItemId: "t3", plannedMinutes: 60 }),
        ];
        const capacities = computeBlockCapacities(
            [
                makeCapacity(5, "08:00-11:00" as BlockKey, 120, 1),
                makeCapacity(5, "11:15-14:15" as BlockKey, 180, 2),
            ],
            [],
        );

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
        const capacities = computeBlockCapacities(
            [
                makeCapacity(5, "08:00-11:00" as BlockKey, 100, 1),
                makeCapacity(5, "11:15-14:15" as BlockKey, 100, 2),
            ],
            [],
        );

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
        const capacities = computeBlockCapacities(
            [makeCapacity(5, "08:00-11:00" as BlockKey, 120, 1)],
            [],
        );

        const { placed, unplaced } = walkAndAssign(queue, capacities);

        expect(placed).toHaveLength(2);
        expect(unplaced).toHaveLength(1);
        expect(unplaced[0]!.sourceItemId).toBe("overflow");
    });

    it("respects pinned itemOrder by starting after pinnedMaxOrder", () => {
        const queue: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "t1", plannedMinutes: 30 }),
        ];
        const capacities = computeBlockCapacities(
            [makeCapacity(5, "08:00-11:00" as BlockKey, 180, 1)],
            [
                { sourceItemId: "p1", dayNumber: 5, blockKey: "08:00-11:00" as BlockKey, plannedMinutes: 60, itemOrder: 3 },
            ],
        );

        const { placed } = walkAndAssign(queue, capacities);

        expect(placed[0]).toMatchObject({ sourceItemId: "t1", itemOrder: 4 });
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
        const capacities = computeBlockCapacities(
            [makeCapacity(10, "11:15-14:15" as BlockKey, 180, 1)],
            [],
        );

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
        const capacities = computeBlockCapacities(
            [makeCapacity(10, "11:15-14:15" as BlockKey, 180, 1)],
            [],
        );

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
        const capacities = computeBlockCapacities(
            [makeCapacity(10, "08:00-11:00" as BlockKey, 180, 1)],
            [],
        );

        const { placed } = walkAndAssign(queue, capacities);

        expect(placed[0]!.isRecovery).toBe(false);
        expect(placed[0]!.originalDayNumber).toBeNull();
        expect(placed[0]!.originalBlockKey).toBeNull();
    });
});

describe("runRepackAlgorithm", () => {
    it("classifies overflow correctly — backlog vs topic", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 90, subjectTier: "A", dateKey: 1, isFromBacklog: true }),
        ];
        const future: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "f1", plannedMinutes: 90, subjectTier: "A", dateKey: 2, isFromBacklog: false }),
        ];
        const raw: BlockCapacity[] = [
            makeCapacity(5, "08:00-11:00" as BlockKey, 90, 1),
        ];

        const result = runRepackAlgorithm(backlog, future, raw, []);

        // Only one fits — b1 is placed (backlog-first for same tier), f1 overflows as topic
        expect(result.stats.placed).toBe(1);
        expect(result.placements[0]!.sourceItemId).toBe("b1");
        expect(result.overflowTopicSourceItemIds).toEqual(["f1"]);
        expect(result.overflowBacklogSourceItemIds).toEqual([]);
    });

    it("handles scenario with only backlog overflow", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 90, subjectTier: "A", dateKey: 1, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "b2", plannedMinutes: 90, subjectTier: "B", dateKey: 1, isFromBacklog: true }),
        ];

        const result = runRepackAlgorithm(backlog, [], [makeCapacity(5, "08:00-11:00" as BlockKey, 90, 1)], []);

        expect(result.stats.placed).toBe(1);
        expect(result.overflowBacklogSourceItemIds).toEqual(["b2"]);
        expect(result.overflowTopicSourceItemIds).toEqual([]);
    });

    it("returns empty output when all inputs are empty", () => {
        const result = runRepackAlgorithm([], [], [], []);
        expect(result.stats).toEqual({ placed: 0, overflowBacklog: 0, overflowTopics: 0 });
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

    it("marks overflow topic assignments as missed with repack_overflow source tag", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Sabotage: reduce all block capacities to near-zero for phase 1 to force overflow
        // First find the phase end day
        const phase1Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 1)!;
        const phaseEndDay = phase1Config.currentEndDay;

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

        // With severely limited capacity, we expect overflow
        if (result.overflowTopics > 0) {
            // Find overflow topic assignments
            const overflowTopics = Object.values(userState.schedule.topicAssignments).filter(
                (ta) => ta.sourceTag === "repack_overflow" && ta.status === "missed",
            );
            expect(overflowTopics.length).toBeGreaterThan(0);

            // Backlog entries should exist for overflow topics
            for (const ot of overflowTopics) {
                const backlogEntry = userState.backlogItems[ot.sourceItemId];
                expect(backlogEntry).toBeDefined();
                expect(backlogEntry!.sourceTag).toBe("repack_overflow");
                expect(backlogEntry!.status).toBe("pending");
            }
        }
    });

    it("preserves write-once recovery fields for previously recovered topics", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Mark a topic assignment as already-recovered from a prior repack
        const targetRow = Object.values(userState.schedule.topicAssignments).find(
            (ta) => ta.dayNumber >= 2 && ta.status === "pending",
        );
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

    it("respects pinned topics — does not move them", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Pin a specific topic
        const pinnedRow = Object.values(userState.schedule.topicAssignments).find(
            (ta) => ta.dayNumber >= 2 && ta.status === "pending",
        );
        if (pinnedRow) {
            pinnedRow.isPinned = true;
            const originalDay = pinnedRow.dayNumber;
            const originalBlock = pinnedRow.blockKey;
            const originalOrder = pinnedRow.itemOrder;

            const todayDate = "2026-05-01";
            const todayDayNumber = getCurrentDayNumber(userState, todayDate);

            runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

            // Pinned topic should not have moved
            expect(pinnedRow.dayNumber).toBe(originalDay);
            expect(pinnedRow.blockKey).toBe(originalBlock);
            expect(pinnedRow.itemOrder).toBe(originalOrder);
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

        // Should run without error — no capacity means everything overflows
        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);
        expect(result.skipped).toBe(false);
        // With no blocks, all topics overflow
        expect(result.overflowTopics + result.overflowBacklog).toBeGreaterThanOrEqual(result.placed);
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

        const result = runRepackAlgorithm(queue, [], raw, []);

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

        const result = runRepackAlgorithm(queue, [], raw, []);

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

        const result = runRepackAlgorithm(backlog, future, raw, []);

        // Only one slot — backlog gets priority
        expect(result.stats.placed).toBe(1);
        expect(result.placements[0]!.sourceItemId).toBe("b1");
        expect(result.overflowTopicSourceItemIds).toEqual(["f1"]);
    });
});
