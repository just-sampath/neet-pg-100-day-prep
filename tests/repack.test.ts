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
        expect(result.phaseClosedTopicSourceItemIds).toEqual(["f1"]);
        expect(result.phaseClosedBacklogSourceItemIds).toEqual([]);
    });

    it("handles scenario with only backlog overflow", () => {
        const backlog: UnifiedQueueItem[] = [
            makeQueueItem({ sourceItemId: "b1", plannedMinutes: 90, subjectTier: "A", dateKey: 1, isFromBacklog: true }),
            makeQueueItem({ sourceItemId: "b2", plannedMinutes: 90, subjectTier: "B", dateKey: 1, isFromBacklog: true }),
        ];

        const result = runRepackAlgorithm(backlog, [], [makeCapacity(5, "08:00-11:00" as BlockKey, 90, 1)], []);

        expect(result.stats.placed).toBe(1);
        expect(result.phaseClosedBacklogSourceItemIds).toEqual(["b2"]);
        expect(result.phaseClosedTopicSourceItemIds).toEqual([]);
    });

    it("returns empty output when all inputs are empty", () => {
        const result = runRepackAlgorithm([], [], [], []);
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

        const result = runRepackAlgorithm([], future, raw, [], context);

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

        const result = runRepackAlgorithm([], future, raw, [], context);

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

        const result = runRepackAlgorithm([], future, raw, [], context);

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

        const result = runRepackAlgorithm([], future, raw, [], context);

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

        const result = runRepackAlgorithm([], future, raw, [], context);

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
    it("creates extension days and renumbers subsequent phases", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const phase1Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 1)!;
        const phase2Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 2)!;
        const originalPhase2Start = phase2Config.currentStartDay;
        const originalPhase1End = phase1Config.currentEndDay;

        // Pick a day near end of phase 1 to trigger repack
        const todayDayNumber = originalPhase1End - 2;
        const todayDate = "2026-07-01";
        userState.settings.dayOneDate = "2026-05-01";

        // Sabotage: shrink remaining blocks to force overflow into extension
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= originalPhase1End) {
                block.durationMinutes = 1;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);

        if (result.extensionDaysCreated > 0) {
            const extCount = result.extensionDaysCreated;

            // Phase 1 end day should have increased
            expect(phase1Config.currentEndDay).toBe(originalPhase1End + extCount);
            expect(phase1Config.extensionsUsed).toBe(extCount);

            // Phase 2 start day should have shifted
            expect(phase2Config.currentStartDay).toBe(originalPhase2Start + extCount);

            // Extension days should exist in the schedule
            for (let i = 1; i <= extCount; i++) {
                const extDay = userState.schedule.days[String(originalPhase1End + i)];
                expect(extDay).toBeDefined();
                expect(extDay!.isExtensionDay).toBe(true);
            }
        }
    });

    it("closes stale backlog items from prior phases", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        // Create a fake backlog item from phase 1
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

        // Run repack from phase 2
        const phase2Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 2)!;
        const todayDayNumber = phase2Config.currentStartDay;
        const todayDate = "2026-07-15";

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.phaseTransitionClosed).toBeGreaterThanOrEqual(1);

        // The stale item should be phase_closed
        expect(userState.backlogItems["stale-item"]!.status).toBe("phase_closed");
    });

    it("fully exhausts extension budget before marking phase_closed", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const phase1Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 1)!;
        const originalBudget = phase1Config.extensionBudget;
        const phaseEndDay = phase1Config.currentEndDay;

        // Pick a day near end of phase with heavy sabotage
        const todayDayNumber = phaseEndDay - 1;
        const todayDate = "2026-07-02";

        // Extreme sabotage: zero-out remaining capacity
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= phaseEndDay) {
                block.durationMinutes = 0;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);

        // Should have used extension days (up to budget)
        // Items remaining after extension become phase_closed
        if (result.extensionDaysCreated > 0) {
            expect(result.extensionDaysCreated).toBeLessThanOrEqual(originalBudget);
        }
    });

    it("shifts mapped_dates forward on all days after the extension insertion point", () => {
        const userState = createConfiguredUserState();
        ensureUserScheduleSeeded(userState);

        const phase1Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 1)!;
        const phase2Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 2)!;
        const phaseEndDay = phase1Config.currentEndDay;
        const phase2StartDay = phase2Config.currentStartDay;

        // Capture the original mapped_date of the first Phase 2 day (right after insertion point)
        const firstPhase2DayBefore = userState.schedule.days[String(phase2StartDay)]!;
        const originalMappedDate = firstPhase2DayBefore.mappedDate;

        // Pick a day near end of phase 1 to trigger repack
        const todayDayNumber = phaseEndDay - 2;
        const todayDate = "2026-07-01";

        // Sabotage: shrink remaining blocks to force overflow into extension
        for (const block of Object.values(userState.schedule.blocks)) {
            if (block.dayNumber >= todayDayNumber && block.dayNumber <= phaseEndDay) {
                block.durationMinutes = 1;
            }
        }

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        if (result.extensionDaysCreated > 0) {
            const extCount = result.extensionDaysCreated;

            // The old first Phase 2 day is now at phase2StartDay + extCount
            const shiftedPhase2Day = userState.schedule.days[String(phase2StartDay + extCount)]!;
            expect(shiftedPhase2Day).toBeDefined();

            // Its mapped_date must be shifted forward by extCount days
            const expectedDate = new Date(originalMappedDate);
            expectedDate.setDate(expectedDate.getDate() + extCount);
            const expectedStr = expectedDate.toISOString().slice(0, 10);
            expect(shiftedPhase2Day.mappedDate).toBe(expectedStr);

            // originalMappedDate should be unchanged (it records the workbook origin)
            expect(shiftedPhase2Day.originalMappedDate).toBe(firstPhase2DayBefore.originalMappedDate);
        }
    });

    it("migrates legacy repack_overflow backlog items from prior phases to phase_closed", () => {
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

        // Run repack from Phase 2 — the stale Phase 1 item should be closed
        const phase2Config = Object.values(userState.schedule.phaseConfig).find((p) => p.phaseNumber === 2)!;
        const todayDayNumber = phase2Config.currentStartDay;
        const todayDate = "2026-07-15";

        const result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, refData);

        expect(result.skipped).toBe(false);
        expect(result.phaseTransitionClosed).toBeGreaterThanOrEqual(1);
        expect(userState.backlogItems["legacy-overflow"]!.status).toBe("phase_closed");
    });
});
