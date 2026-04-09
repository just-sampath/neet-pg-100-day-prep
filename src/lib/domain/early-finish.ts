import { computeBlockCapacities, walkAndAssign } from "@/lib/domain/repack";
import { buildDailyRevisionPlan, getDayState, getScheduleDays, getVisibleBlockKeys } from "@/lib/domain/schedule";
import type { BlockKey, RuntimeReferenceData, ScheduleTopicAssignmentRow, UserState } from "@/lib/domain/types";

const EARLY_FINISH_ELIGIBLE_BLOCKS = new Set(["block_a", "block_b", "block_c"]);

type RebalanceSlot = {
    dayNumber: number;
    blockKey: BlockKey;
    durationMinutes: number;
    slotOrder: number;
};

export interface EarlyFinishRebalancePlan {
    placements: Array<{
        sourceItemId: string;
        dayNumber: number;
        blockKey: BlockKey;
        itemOrder: number;
        isRecovery: boolean;
        originalDayNumber: number | null;
        originalBlockKey: BlockKey | null;
    }>;
    slotKeys: string[];
    fixedRowIdsBySlot: Map<string, string[]>;
}

export interface EarlyFinishTailTrimPlan {
    trimDayNumbers: number[];
    trimBlockRows: Array<{
        dayNumber: number;
        blockKey: BlockKey;
    }>;
    newTailDayNumber: number | null;
    trimmedExtensionDayCount: number;
}

function slotKey(dayNumber: number, blockKey: BlockKey) {
    return `${dayNumber}:${blockKey}`;
}

function getEligibleSlots(
    userState: UserState,
    targetDayNumber: number,
    targetBlockKey: BlockKey,
    referenceData?: RuntimeReferenceData,
) {
    const slots: RebalanceSlot[] = [];

    for (const day of getScheduleDays(userState, referenceData)) {
        if (day.dayNumber < targetDayNumber) {
            continue;
        }

        const visibleBlocks = new Set(getVisibleBlockKeys(getDayState(userState, day.dayNumber).trafficLight, day));
        const eligibleBlocks = day.blocks.filter(
            (block) =>
                block.trackable &&
                visibleBlocks.has(block.timeSlotKey) &&
                EARLY_FINISH_ELIGIBLE_BLOCKS.has(block.semanticBlockKey),
        );

        const startIndex = day.dayNumber === targetDayNumber
            ? eligibleBlocks.findIndex((block) => block.timeSlotKey === targetBlockKey)
            : 0;

        if (day.dayNumber === targetDayNumber && startIndex < 0) {
            return null;
        }

        for (const block of eligibleBlocks.slice(Math.max(0, startIndex))) {
            const blockRow = userState.schedule.blocks[slotKey(day.dayNumber, block.timeSlotKey)];
            if (!blockRow) {
                continue;
            }

            slots.push({
                dayNumber: day.dayNumber,
                blockKey: block.timeSlotKey,
                durationMinutes: blockRow.durationMinutes,
                slotOrder: blockRow.slotOrder,
            });
        }
    }

    return slots;
}

function sortRowsByOrder(rows: ScheduleTopicAssignmentRow[]) {
    return [...rows].sort((left, right) => left.itemOrder - right.itemOrder || left.sourceItemId.localeCompare(right.sourceItemId));
}

export function buildEarlyFinishRebalancePlan(
    userState: UserState,
    sourceItemId: string,
    targetDayNumber: number,
    targetBlockKey: BlockKey,
    remainingMinutes: number,
    referenceData?: RuntimeReferenceData,
): EarlyFinishRebalancePlan | null {
    if (remainingMinutes <= 0) {
        return null;
    }

    const sourceRow = userState.schedule.topicAssignments[sourceItemId];
    if (!sourceRow || sourceRow.status !== "pending") {
        return null;
    }

    const slots = getEligibleSlots(userState, targetDayNumber, targetBlockKey, referenceData);
    if (!slots || slots.length === 0) {
        return null;
    }

    const slotKeys = new Set(slots.map((slot) => slotKey(slot.dayNumber, slot.blockKey)));
    const rowsBySlot = new Map<string, ScheduleTopicAssignmentRow[]>();

    for (const row of Object.values(userState.schedule.topicAssignments)) {
        const key = slotKey(row.dayNumber, row.blockKey);
        if (!slotKeys.has(key)) {
            continue;
        }

        const slotRows = rowsBySlot.get(key) ?? [];
        slotRows.push(row);
        rowsBySlot.set(key, slotRows);
    }

    const fixedRowIdsBySlot = new Map<string, string[]>();
    const queue = [
        {
            sourceItemId: sourceRow.sourceItemId,
            plannedMinutes: sourceRow.plannedMinutes,
            subjectTier: null,
            dateKey: sourceRow.dayNumber,
            isFromBacklog: false,
            existingIsRecovery: sourceRow.isRecovery,
            existingOriginalDayNumber: sourceRow.originalDayNumber,
            existingOriginalBlockKey: sourceRow.originalBlockKey,
            backlogOriginalDay: null,
            backlogOriginalBlockKey: null,
        },
    ];

    for (const slot of slots) {
        const key = slotKey(slot.dayNumber, slot.blockKey);
        const slotRows = sortRowsByOrder(rowsBySlot.get(key) ?? []);
        fixedRowIdsBySlot.set(
            key,
            slotRows.filter((row) => row.status !== "pending").map((row) => row.sourceItemId),
        );

        for (const row of slotRows) {
            if (row.status !== "pending" || row.sourceItemId === sourceItemId) {
                continue;
            }

            queue.push({
                sourceItemId: row.sourceItemId,
                plannedMinutes: row.plannedMinutes,
                subjectTier: null,
                dateKey: row.dayNumber,
                isFromBacklog: false,
                existingIsRecovery: row.isRecovery,
                existingOriginalDayNumber: row.originalDayNumber,
                existingOriginalBlockKey: row.originalBlockKey,
                backlogOriginalDay: null,
                backlogOriginalBlockKey: null,
            });
        }
    }

    const rawCapacities = slots.map((slot) => {
        const key = slotKey(slot.dayNumber, slot.blockKey);
        const slotRows = sortRowsByOrder(rowsBySlot.get(key) ?? []);
        const fixedMinutes = key === slotKey(targetDayNumber, targetBlockKey)
            ? 0
            : slotRows
                .filter((row) => row.status !== "pending")
                .reduce((sum, row) => sum + row.plannedMinutes, 0);

        return {
            dayNumber: slot.dayNumber,
            blockKey: slot.blockKey,
            durationMinutes: key === slotKey(targetDayNumber, targetBlockKey)
                ? remainingMinutes
                : Math.max(0, slot.durationMinutes - fixedMinutes),
            slotOrder: slot.slotOrder,
        };
    });

    const { placed, unplaced } = walkAndAssign(queue, computeBlockCapacities(rawCapacities));
    if (unplaced.length > 0) {
        return null;
    }

    return {
        placements: placed,
        slotKeys: slots.map((slot) => slotKey(slot.dayNumber, slot.blockKey)),
        fixedRowIdsBySlot,
    };
}

function hasEligibleDequeAssignments(
    userState: UserState,
    dayNumber: number,
    referenceData?: RuntimeReferenceData,
) {
    const day = getScheduleDays(userState, referenceData).find((entry) => entry.dayNumber === dayNumber);
    if (!day) {
        return false;
    }

    const visibleBlocks = new Set(getVisibleBlockKeys(getDayState(userState, day.dayNumber).trafficLight, day));
    const eligibleBlockKeys = new Set(
        day.blocks
            .filter(
                (block) =>
                    block.trackable &&
                    visibleBlocks.has(block.timeSlotKey) &&
                    EARLY_FINISH_ELIGIBLE_BLOCKS.has(block.semanticBlockKey),
            )
            .map((block) => block.timeSlotKey),
    );

    if (eligibleBlockKeys.size === 0) {
        return false;
    }

    return Object.values(userState.schedule.topicAssignments).some(
        (row) => row.dayNumber === dayNumber && eligibleBlockKeys.has(row.blockKey),
    );
}

function hasSurfacedRevisionWork(
    userState: UserState,
    dayNumber: number,
    referenceData?: RuntimeReferenceData,
) {
    const dayRow = userState.schedule.days[String(dayNumber)];
    if (!dayRow || !userState.settings.dayOneDate) {
        return false;
    }

    const revisionPlan = buildDailyRevisionPlan(dayRow.mappedDate, userState, userState.settings, referenceData);
    return (
        revisionPlan.morningSessionPlanned > 0 ||
        revisionPlan.queueSessions.length > 0 ||
        revisionPlan.overflowSessions.length > 0 ||
        revisionPlan.catchUpSessions.length > 0 ||
        revisionPlan.restudySessions.length > 0
    );
}

export function buildEarlyFinishTailTrimPlan(
    userState: UserState,
    referenceData?: RuntimeReferenceData,
): EarlyFinishTailTrimPlan | null {
    const dayRows = Object.values(userState.schedule.days).toSorted((left, right) => left.dayNumber - right.dayNumber);
    if (dayRows.length === 0) {
        return null;
    }

    const trimDayNumbers: number[] = [];
    let trimmedExtensionDayCount = 0;

    for (let index = dayRows.length - 1; index >= 0; index -= 1) {
        const dayRow = dayRows[index]!;
        if (
            hasEligibleDequeAssignments(userState, dayRow.dayNumber, referenceData) ||
            hasSurfacedRevisionWork(userState, dayRow.dayNumber, referenceData)
        ) {
            break;
        }

        trimDayNumbers.push(dayRow.dayNumber);
        if (dayRow.isExtensionDay) {
            trimmedExtensionDayCount += 1;
        }
    }

    if (trimDayNumbers.length === 0) {
        return null;
    }

    const trimDaySet = new Set(trimDayNumbers);
    const remainingDays = dayRows.filter((row) => !trimDaySet.has(row.dayNumber));
    const trimBlockRows = Object.values(userState.schedule.blocks)
        .filter((row) => trimDaySet.has(row.dayNumber))
        .map((row) => ({
            dayNumber: row.dayNumber,
            blockKey: row.blockKey,
        }));

    return {
        trimDayNumbers: trimDayNumbers.toSorted((left, right) => left - right),
        trimBlockRows,
        newTailDayNumber: remainingDays.at(-1)?.dayNumber ?? null,
        trimmedExtensionDayCount,
    };
}