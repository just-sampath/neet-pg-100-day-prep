/**
 * Midnight Repack Engine — Pure Algorithm
 *
 * Full forward schedule rebuild: collects ALL pending backlog items and ALL
 * uncompleted (pending) non-pinned future topic assignments, merges them into
 * one tier-priority-ordered queue, and redistributes across remaining phase
 * days filling Block A → Block B → Block C by capacity.
 *
 * This module contains ONLY pure functions with zero DB/store/side-effect
 * access. Input data in, assignment map out.
 */

import type { BlockKey, SubjectTier } from "@/lib/domain/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An item in the unified work queue ready for placement. */
export interface UnifiedQueueItem {
    sourceItemId: string;
    plannedMinutes: number;
    subjectTier: SubjectTier | null;
    /** For ordering: originalDay (backlog) or dayNumber (topic assignment). */
    dateKey: number;
    /** True if this item came from the pending backlog. */
    isFromBacklog: boolean;
    // Recovery tracking — preserved write-once from prior repacks
    existingIsRecovery: boolean;
    existingOriginalDayNumber: number | null;
    existingOriginalBlockKey: BlockKey | null;
    // Backlog origin — used when placing a backlog item for the first time
    backlogOriginalDay: number | null;
    backlogOriginalBlockKey: BlockKey | null;
}

/** A pinned topic that the repack must work around. */
export interface PinnedTopic {
    sourceItemId: string;
    dayNumber: number;
    blockKey: BlockKey;
    plannedMinutes: number;
    itemOrder: number;
}

/** Capacity of a single block after pinned deductions. */
export interface BlockCapacity {
    dayNumber: number;
    blockKey: BlockKey;
    durationMinutes: number;
    /** Ordered position in the day (lower = earlier block). */
    slotOrder: number;
}

/** A concrete topic-to-block assignment produced by the walk. */
export interface TopicPlacement {
    sourceItemId: string;
    dayNumber: number;
    blockKey: BlockKey;
    itemOrder: number;
    isRecovery: boolean;
    originalDayNumber: number | null;
    originalBlockKey: BlockKey | null;
}

/** Full output of the repack algorithm. */
export interface RepackOutput {
    placements: TopicPlacement[];
    /** Backlog items that could not be placed (remain pending in backlog). */
    overflowBacklogSourceItemIds: string[];
    /** Original topic assignments that could not be placed (create new backlog). */
    overflowTopicSourceItemIds: string[];
    stats: {
        placed: number;
        overflowBacklog: number;
        overflowTopics: number;
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

function tierRank(tier: SubjectTier | null): number {
    if (!tier) return 3;
    return TIER_RANK[tier] ?? 3;
}

// ---------------------------------------------------------------------------
// Step 5: Merge Unified Queue
// ---------------------------------------------------------------------------

/**
 * Two-pointer merge of pre-sorted backlog items and pre-sorted future topics.
 *
 * Sort key: tier ASC → dateKey ASC → backlog-first within same tier+date.
 *
 * Both inputs MUST already be sorted by (tier ASC, dateKey ASC).
 */
export function mergeUnifiedQueue(
    backlogItems: UnifiedQueueItem[],
    futureTopics: UnifiedQueueItem[],
): UnifiedQueueItem[] {
    const merged: UnifiedQueueItem[] = [];
    let bi = 0;
    let fi = 0;

    while (bi < backlogItems.length && fi < futureTopics.length) {
        const b = backlogItems[bi]!;
        const f = futureTopics[fi]!;

        const bTier = tierRank(b.subjectTier);
        const fTier = tierRank(f.subjectTier);

        if (bTier < fTier) {
            merged.push(b);
            bi++;
        } else if (bTier > fTier) {
            merged.push(f);
            fi++;
        } else {
            // Same tier — compare dateKey
            if (b.dateKey < f.dateKey) {
                merged.push(b);
                bi++;
            } else if (b.dateKey > f.dateKey) {
                merged.push(f);
                fi++;
            } else {
                // Same tier AND same date — backlog first
                merged.push(b);
                bi++;
            }
        }
    }

    while (bi < backlogItems.length) {
        merged.push(backlogItems[bi]!);
        bi++;
    }
    while (fi < futureTopics.length) {
        merged.push(futureTopics[fi]!);
        fi++;
    }

    return merged;
}

// ---------------------------------------------------------------------------
// Step 6: Compute Block Capacities
// ---------------------------------------------------------------------------

/**
 * Given raw block capacities and pinned topic positions, returns the
 * available minutes per block after pinned deductions, plus the highest
 * pinned itemOrder per block so the walk can start numbering after it.
 */
export function computeBlockCapacities(
    rawCapacities: BlockCapacity[],
    pinnedTopics: PinnedTopic[],
): Array<BlockCapacity & { availableMinutes: number; pinnedMaxOrder: number }> {
    // Build a lookup: "dayNumber:blockKey" → total pinned minutes + max order
    const pinnedByBlock = new Map<string, { minutes: number; maxOrder: number }>();
    for (const p of pinnedTopics) {
        const key = `${p.dayNumber}:${p.blockKey}`;
        const existing = pinnedByBlock.get(key);
        if (existing) {
            existing.minutes += p.plannedMinutes;
            existing.maxOrder = Math.max(existing.maxOrder, p.itemOrder);
        } else {
            pinnedByBlock.set(key, { minutes: p.plannedMinutes, maxOrder: p.itemOrder });
        }
    }

    return rawCapacities.map((cap) => {
        const key = `${cap.dayNumber}:${cap.blockKey}`;
        const pinned = pinnedByBlock.get(key);
        const deducted = pinned ? pinned.minutes : 0;
        const maxOrder = pinned ? pinned.maxOrder : 0;
        return {
            ...cap,
            availableMinutes: Math.max(0, cap.durationMinutes - deducted),
            pinnedMaxOrder: maxOrder,
        };
    });
}

// ---------------------------------------------------------------------------
// Step 7: Walk Forward and Assign
// ---------------------------------------------------------------------------

/**
 * Pointer-based distribution: for each block (ordered day ASC, slot ASC),
 * fit as many topics as possible from the unified queue.
 *
 * Topics are NEVER split: if the next topic doesn't fit in the remaining
 * capacity, move to the next block. Wasted minutes are expected.
 *
 * Returns placed topics and the remaining unplaced topics.
 */
export function walkAndAssign(
    queue: UnifiedQueueItem[],
    capacities: ReturnType<typeof computeBlockCapacities>,
): { placed: TopicPlacement[]; unplaced: UnifiedQueueItem[] } {
    const placed: TopicPlacement[] = [];
    let pointer = 0;

    for (const block of capacities) {
        let remaining = block.availableMinutes;
        let orderCounter = block.pinnedMaxOrder + 1;

        while (pointer < queue.length && remaining > 0) {
            const topic = queue[pointer]!;

            if (topic.plannedMinutes <= remaining) {
                // Determine recovery fields — write-once: preserve existing if set
                let isRecovery: boolean;
                let originalDayNumber: number | null;
                let originalBlockKey: BlockKey | null;

                if (topic.existingIsRecovery) {
                    // Already marked as recovery from a prior repack — preserve
                    isRecovery = true;
                    originalDayNumber = topic.existingOriginalDayNumber;
                    originalBlockKey = topic.existingOriginalBlockKey;
                } else if (topic.isFromBacklog) {
                    // First-time recovery from backlog
                    isRecovery = true;
                    originalDayNumber = topic.backlogOriginalDay;
                    originalBlockKey = topic.backlogOriginalBlockKey;
                } else {
                    // Original topic, not recovery
                    isRecovery = false;
                    originalDayNumber = null;
                    originalBlockKey = null;
                }

                placed.push({
                    sourceItemId: topic.sourceItemId,
                    dayNumber: block.dayNumber,
                    blockKey: block.blockKey,
                    itemOrder: orderCounter,
                    isRecovery,
                    originalDayNumber,
                    originalBlockKey,
                });
                remaining -= topic.plannedMinutes;
                orderCounter++;
                pointer++;
            } else {
                // Topic doesn't fit in remaining space — move to next block
                break;
            }
        }
    }

    const unplaced = queue.slice(pointer);
    return { placed, unplaced };
}

// ---------------------------------------------------------------------------
// Step 8: Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full repack algorithm: merge → compute capacities → walk → classify overflow.
 *
 * Pure function. No side effects.
 */
export function runRepackAlgorithm(
    backlogQueue: UnifiedQueueItem[],
    futureTopics: UnifiedQueueItem[],
    rawCapacities: BlockCapacity[],
    pinnedTopics: PinnedTopic[],
): RepackOutput {
    const unified = mergeUnifiedQueue(backlogQueue, futureTopics);
    const capacities = computeBlockCapacities(rawCapacities, pinnedTopics);
    const { placed, unplaced } = walkAndAssign(unified, capacities);

    // Classify unplaced items
    const overflowBacklogSourceItemIds: string[] = [];
    const overflowTopicSourceItemIds: string[] = [];
    for (const item of unplaced) {
        if (item.isFromBacklog) {
            overflowBacklogSourceItemIds.push(item.sourceItemId);
        } else {
            overflowTopicSourceItemIds.push(item.sourceItemId);
        }
    }

    return {
        placements: placed,
        overflowBacklogSourceItemIds,
        overflowTopicSourceItemIds,
        stats: {
            placed: placed.length,
            overflowBacklog: overflowBacklogSourceItemIds.length,
            overflowTopics: overflowTopicSourceItemIds.length,
        },
    };
}
