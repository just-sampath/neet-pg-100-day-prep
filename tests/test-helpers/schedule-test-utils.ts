import { invalidateRuntimeScheduleIndex } from "@/lib/domain/schedule";
import type { UserState } from "@/lib/domain/types";

export function setBlockActualEnd(
    userState: UserState,
    dayNumber: number,
    blockKey: string,
    actualEnd: string,
    timingUpdatedAt = "2026-05-10T12:00:00.000Z",
) {
    const row = userState.schedule.blocks[`${dayNumber}:${blockKey}`];
    if (!row) {
        throw new Error(`Missing schedule block row for ${dayNumber}:${blockKey}`);
    }

    row.actualEnd = actualEnd;
    row.timingUpdatedAt = timingUpdatedAt;
}

export function buildAcceptEarlyFinishFormData(sourceItemId: string, targetDayNumber: number, targetBlockKey: string) {
    const formData = new FormData();
    formData.set("sourceItemId", sourceItemId);
    formData.set("targetDayNumber", String(targetDayNumber));
    formData.set("targetBlockKey", targetBlockKey);
    return formData;
}

export function keepOnlyDayAssignments(userState: UserState, dayNumber: number, keepItemIds: Set<string>) {
    for (const [key, row] of Object.entries(userState.schedule.topicAssignments)) {
        if (row.dayNumber === dayNumber && !keepItemIds.has(key)) {
            delete userState.schedule.topicAssignments[key];
        }
    }

    invalidateRuntimeScheduleIndex(userState);
}

export function truncateScheduleToDay(userState: UserState, maxDayNumber: number) {
    for (const [key, row] of Object.entries(userState.schedule.days)) {
        if (row.dayNumber > maxDayNumber) {
            delete userState.schedule.days[key];
        }
    }

    for (const [key, row] of Object.entries(userState.schedule.blocks)) {
        if (row.dayNumber > maxDayNumber) {
            delete userState.schedule.blocks[key];
        }
    }

    for (const [key, row] of Object.entries(userState.schedule.topicAssignments)) {
        if (row.dayNumber > maxDayNumber) {
            delete userState.schedule.topicAssignments[key];
        }
    }

    for (const phase of Object.values(userState.schedule.phaseConfig)) {
        if (phase.currentEndDay > maxDayNumber) {
            phase.currentEndDay = Math.max(phase.currentStartDay - 1, maxDayNumber);
        }
    }

    invalidateRuntimeScheduleIndex(userState);
}
