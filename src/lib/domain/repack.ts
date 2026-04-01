/**
 * Midnight Repack Engine — Pure Algorithm
 *
 * Insertion + push rebuild: pending backlog items are placed at the front of
 * the placement queue, then the remaining pending original topics follow in
 * their existing workbook order. The walk redistributes that queue across the
 * remaining phase days by filling Block A → Block B → Block C by capacity.
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

/** Capacity of a single block available to the repack walk. */
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
    /** Backlog items that could not be placed and are terminally closed. */
    phaseClosedBacklogSourceItemIds: string[];
    /** Original topic assignments that could not be placed and are terminally closed. */
    phaseClosedTopicSourceItemIds: string[];
    /** Number of extension days consumed (0 if no extension needed). */
    extensionDaysUsed: number;
    stats: {
        placed: number;
        extensionDaysCreated: number;
        phaseClosed: number;
    };
}

/** Context needed for phase extension when overflow occurs. */
export interface ExtensionContext {
    /** How many more extension days the current phase is allowed. */
    remainingBudget: number;
    /** The current phase's last day_number (pre-extension). */
    phaseEndDay: number;
    /** The mapped_date of the phase's last original day. */
    phaseEndMappedDate: string;
    /** The absolute latest allowed mapped_date for any schedule day. */
    hardStopDate: string;
    /** Phase number (1, 2, or 3). */
    phaseNumber: number;
    /**
     * Template block capacities for one extension day (Block A, B, C).
     * dayNumber in these entries is a placeholder (0) — the algorithm
     * replaces it with the actual extension day number during the loop.
     */
    extensionDayBlockCapacities: BlockCapacity[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Step 5: Build Placement Queue
// ---------------------------------------------------------------------------

/**
 * Build the placement queue as insertion + push:
 * - pending backlog items first (already sorted by backlog priority)
 * - pending original topics next (already ordered by current workbook position)
 */
function buildPlacementQueue(
    backlogItems: UnifiedQueueItem[],
    futureTopics: UnifiedQueueItem[],
): UnifiedQueueItem[] {
    return [...backlogItems, ...futureTopics];
}

// ---------------------------------------------------------------------------
// Step 6: Compute Block Capacities
// ---------------------------------------------------------------------------

/**
 * Returns the full available minutes for each repackable block.
 *
 * The corrected insertion model no longer deducts pinned topics or offsets
 * item ordering inside the repack walk.
 */
export function computeBlockCapacities(
    rawCapacities: BlockCapacity[],
): Array<BlockCapacity & { availableMinutes: number }> {
    return rawCapacities.map((cap) => ({
        ...cap,
        availableMinutes: Math.max(0, cap.durationMinutes),
    }));
}

// ---------------------------------------------------------------------------
// Step 7: Walk Forward and Assign
// ---------------------------------------------------------------------------

/**
 * Pointer-based distribution: for each block (ordered day ASC, slot ASC),
 * fit as many topics as possible from the placement queue.
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
        let orderCounter = 1;

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
// Helpers — date arithmetic (pure, no side effects)
// ---------------------------------------------------------------------------

/**
 * Add N calendar days to an ISO date string (YYYY-MM-DD).
 * Lightweight pure version — only handles date-only strings.
 */
function addDaysIso(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Step 8: Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full repack algorithm: merge → compute capacities → walk →
 * extension loop (if context provided) → classify phase_closed.
 *
 * Pure function. No side effects.
 */
export function runRepackAlgorithm(
    backlogQueue: UnifiedQueueItem[],
    futureTopics: UnifiedQueueItem[],
    rawCapacities: BlockCapacity[],
    extensionContext?: ExtensionContext,
): RepackOutput {
    const placementQueue = buildPlacementQueue(backlogQueue, futureTopics);
    const capacities = computeBlockCapacities(rawCapacities);
    const { placed, unplaced } = walkAndAssign(placementQueue, capacities);

    const allPlaced = [...placed];
    let remaining = unplaced;
    let extensionDaysUsed = 0;

    // --- Extension loop ---
    if (remaining.length > 0 && extensionContext) {
        let budgetLeft = extensionContext.remainingBudget;

        while (remaining.length > 0 && budgetLeft > 0) {
            // Compute the next extension day's mapped_date
            const nextMappedDate = addDaysIso(
                extensionContext.phaseEndMappedDate,
                extensionDaysUsed + 1,
            );

            // Hard stop check: mapped_date must be on or before the hard stop
            if (nextMappedDate > extensionContext.hardStopDate) {
                break;
            }

            // The new extension day's number (post-renumber position)
            const extDayNumber = extensionContext.phaseEndDay + extensionDaysUsed + 1;

            // Build capacities for this extension day from the template
            const extRawCapacities: BlockCapacity[] = extensionContext.extensionDayBlockCapacities.map(
                (cap) => ({ ...cap, dayNumber: extDayNumber }),
            );

            // Walk the remaining items over the extension day's blocks
            const extCapacities = computeBlockCapacities(extRawCapacities);
            const extResult = walkAndAssign(remaining, extCapacities);

            allPlaced.push(...extResult.placed);
            remaining = extResult.unplaced;
            extensionDaysUsed++;
            budgetLeft--;
        }
    }

    // --- Classify remaining unplaced items as phase_closed ---
    const phaseClosedBacklogSourceItemIds: string[] = [];
    const phaseClosedTopicSourceItemIds: string[] = [];
    for (const item of remaining) {
        if (item.isFromBacklog) {
            phaseClosedBacklogSourceItemIds.push(item.sourceItemId);
        } else {
            phaseClosedTopicSourceItemIds.push(item.sourceItemId);
        }
    }

    return {
        placements: allPlaced,
        phaseClosedBacklogSourceItemIds,
        phaseClosedTopicSourceItemIds,
        extensionDaysUsed,
        stats: {
            placed: allPlaced.length,
            extensionDaysCreated: extensionDaysUsed,
            phaseClosed: phaseClosedBacklogSourceItemIds.length + phaseClosedTopicSourceItemIds.length,
        },
    };
}
