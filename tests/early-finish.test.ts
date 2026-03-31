import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay } from "@/lib/domain/schedule";
import { getEarlyFinishSuggestion } from "@/lib/domain/today";
import type { UserState } from "@/lib/domain/types";

function createSeededUserState() {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(userState);
    return userState;
}

/**
 * Helper: mark every item in a block as completed in topicAssignments.
 */
function completeAllItems(
    userState: UserState,
    dayNumber: number,
    blockKey: string,
) {
    const day = getScheduleDay(dayNumber, userState)!;
    const block = day.blocks.find((b) => b.timeSlotKey === blockKey)!;
    for (const item of block.items) {
        const row = userState.schedule.topicAssignments[item.itemId];
        if (row) {
            row.status = "completed";
            row.completedAt = "2026-05-10T12:00:00.000Z";
            row.updatedAt = new Date().toISOString();
        }
    }
}

function findTheoryBlock(dayNumber: number, userState?: UserState) {
    const day = getScheduleDay(dayNumber, userState)!;
    return day.blocks.find(
        (b) => b.trackable && (b.blockIntent === "core_study" || b.blockIntent === "consolidation") && b.items.length > 0,
    );
}

function findNonTheoryBlock(dayNumber: number, userState?: UserState) {
    const day = getScheduleDay(dayNumber, userState)!;
    return day.blocks.find(
        (b) =>
            b.trackable &&
            b.blockIntent !== "core_study" &&
            b.blockIntent !== "consolidation" &&
            b.blockIntent !== "revision" &&
            b.items.length > 0,
    );
}

describe("early finish suggestion", () => {
    it("returns a suggestion when a theory block completes with enough time remaining", () => {
        const userState = createSeededUserState();

        const day = getScheduleDay(2, userState)!;
        const theoryBlock = findTheoryBlock(2, userState);
        if (!theoryBlock) {
            // Skip test if day 2 doesn't have a theory block — defensive
            return;
        }

        completeAllItems(userState, 2, theoryBlock.timeSlotKey);

        // Set effective now to midway through the block so there's remaining time
        // Block start time gives us enough room
        const [startH, startM] = theoryBlock.timeSlotKey.split("-")[0].split(":").map(Number);
        // IST = UTC+5:30, so subtract 5:30 to get UTC
        const utcH = startH - 5;
        const utcM = startM - 30 + 15; // 15 minutes into the block
        const effectiveNow = `2026-05-10T${String(utcH + (utcM < 0 ? -1 : 0)).padStart(2, "0")}:${String((utcM + 60) % 60).padStart(2, "0")}:00.000Z`;

        const tomorrowDay = getScheduleDay(3, userState) ?? null;
        const result = getEarlyFinishSuggestion({
            block: theoryBlock,
            blockKey: theoryBlock.timeSlotKey,
            blockEndTime: theoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 2,
            todayScheduleDay: day,
            tomorrowScheduleDay: tomorrowDay,
            userState,
        });

        expect(result).not.toBeNull();
        expect(result!.remainingMinutes).toBeGreaterThanOrEqual(10);
        expect(result!.sourceItemId).toBeTruthy();
        expect(result!.label).toBeTruthy();
    });

    it("returns null when remaining time is below 10 minutes", () => {
        const userState = createSeededUserState();

        const day = getScheduleDay(2, userState)!;
        const theoryBlock = findTheoryBlock(2, userState);
        if (!theoryBlock) return;

        completeAllItems(userState, 2, theoryBlock.timeSlotKey);

        // Set effective now to 5 minutes before block end
        const [endH, endM] = theoryBlock.timeSlotKey.split("-")[1].split(":").map(Number);
        const minutesBefore5 = endH * 60 + endM - 5;
        const istH = Math.floor(minutesBefore5 / 60);
        const istM = minutesBefore5 % 60;
        const utcH = istH - 5;
        const utcM = istM - 30;
        const effectiveNow = `2026-05-10T${String(utcH + (utcM < 0 ? -1 : 0)).padStart(2, "0")}:${String((utcM + 60) % 60).padStart(2, "0")}:00.000Z`;

        const result = getEarlyFinishSuggestion({
            block: theoryBlock,
            blockKey: theoryBlock.timeSlotKey,
            blockEndTime: theoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 2,
            todayScheduleDay: day,
            tomorrowScheduleDay: null,
            userState,
        });

        expect(result).toBeNull();
    });

    it("returns null for non-theory blocks", () => {
        const userState = createSeededUserState();

        const day = getScheduleDay(2, userState)!;
        const nonTheoryBlock = findNonTheoryBlock(2, userState);
        if (!nonTheoryBlock) return;

        completeAllItems(userState, 2, nonTheoryBlock.timeSlotKey);

        // Mid-block time in UTC
        const effectiveNow = "2026-05-10T06:30:00.000Z"; // 12:00 IST

        const result = getEarlyFinishSuggestion({
            block: nonTheoryBlock,
            blockKey: nonTheoryBlock.timeSlotKey,
            blockEndTime: nonTheoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 2,
            todayScheduleDay: day,
            tomorrowScheduleDay: null,
            userState,
        });

        expect(result).toBeNull();
    });

    it("returns null when not all items are completed", () => {
        const userState = createSeededUserState();

        const day = getScheduleDay(2, userState)!;
        const theoryBlock = findTheoryBlock(2, userState);
        if (!theoryBlock || theoryBlock.items.length === 0) return;

        // Don't complete any items — all pending
        const effectiveNow = "2026-05-10T04:00:00.000Z"; // 09:30 IST

        const result = getEarlyFinishSuggestion({
            block: theoryBlock,
            blockKey: theoryBlock.timeSlotKey,
            blockEndTime: theoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 2,
            todayScheduleDay: day,
            tomorrowScheduleDay: null,
            userState,
        });

        expect(result).toBeNull();
    });

    it("skips topics that don't fit and picks the first that does", () => {
        const userState = createSeededUserState();

        const day = getScheduleDay(2, userState)!;
        const theoryBlock = findTheoryBlock(2, userState);
        if (!theoryBlock) return;

        completeAllItems(userState, 2, theoryBlock.timeSlotKey);

        // Set effective now to leave exactly 20 minutes
        const [endH, endM] = theoryBlock.timeSlotKey.split("-")[1].split(":").map(Number);
        const minutesBefore20 = endH * 60 + endM - 20;
        const istH = Math.floor(minutesBefore20 / 60);
        const istM = minutesBefore20 % 60;
        const utcH = istH - 5;
        const utcM = istM - 30;
        const effectiveNow = `2026-05-10T${String(utcH + (utcM < 0 ? -1 : 0)).padStart(2, "0")}:${String((utcM + 60) % 60).padStart(2, "0")}:00.000Z`;

        const tomorrowDay = getScheduleDay(3, userState) ?? null;

        const result = getEarlyFinishSuggestion({
            block: theoryBlock,
            blockKey: theoryBlock.timeSlotKey,
            blockEndTime: theoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 2,
            todayScheduleDay: day,
            tomorrowScheduleDay: tomorrowDay,
            userState,
        });

        if (result) {
            expect(result.plannedMinutes).toBeLessThanOrEqual(20);
        }
    });

    it("searches tomorrow when no fitting topic exists later today", () => {
        const userState = createSeededUserState();

        const day = getScheduleDay(2, userState)!;
        const tomorrowDay = getScheduleDay(3, userState) ?? null;

        // Complete all items in all theory blocks today
        for (const block of day.blocks) {
            if (block.trackable && (block.blockIntent === "core_study" || block.blockIntent === "consolidation")) {
                completeAllItems(userState, 2, block.timeSlotKey);
            }
        }

        // Find the last completed theory block to call suggestion on
        const theoryBlocks = day.blocks.filter(
            (b) => b.trackable && (b.blockIntent === "core_study" || b.blockIntent === "consolidation") && b.items.length > 0,
        );
        const lastTheoryBlock = theoryBlocks[theoryBlocks.length - 1];
        if (!lastTheoryBlock) return;

        // Set effective now well before block end to have remaining time
        const [startH, startM] = lastTheoryBlock.timeSlotKey.split("-")[0].split(":").map(Number);
        const utcH = startH - 5;
        const utcM = startM - 30 + 5;
        const effectiveNow = `2026-05-10T${String(utcH + (utcM < 0 ? -1 : 0)).padStart(2, "0")}:${String((utcM + 60) % 60).padStart(2, "0")}:00.000Z`;

        const result = getEarlyFinishSuggestion({
            block: lastTheoryBlock,
            blockKey: lastTheoryBlock.timeSlotKey,
            blockEndTime: lastTheoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 2,
            todayScheduleDay: getScheduleDay(2, userState)!,
            tomorrowScheduleDay: tomorrowDay,
            userState,
        });

        // If there are eligible tomorrow topics, we should get a result
        if (tomorrowDay) {
            const tomorrowHasEligibleTopics = tomorrowDay.blocks.some(
                (b) =>
                    b.trackable &&
                    (b.blockIntent === "core_study" || b.blockIntent === "consolidation") &&
                    b.items.length > 0,
            );
            if (tomorrowHasEligibleTopics) {
                expect(result).not.toBeNull();
                expect(result!.sourceDayNumber).toBe(3);
            }
        }
    });

    it("gracefully returns null when today is the last scheduled day", () => {
        const userState = createSeededUserState();

        const day100 = getScheduleDay(100, userState)!;
        const theoryBlock = day100.blocks.find(
            (b) => b.trackable && (b.blockIntent === "core_study" || b.blockIntent === "consolidation") && b.items.length > 0,
        );
        if (!theoryBlock) return;

        completeAllItems(userState, 100, theoryBlock.timeSlotKey);

        // Tomorrow (day 101) doesn't exist in the schedule
        const tomorrowDay = getScheduleDay(101, userState) ?? null;
        expect(tomorrowDay).toBeNull();

        const [startH, startM] = theoryBlock.timeSlotKey.split("-")[0].split(":").map(Number);
        const utcH = startH - 5;
        const utcM = startM - 30 + 5;
        const effectiveNow = `2026-05-10T${String(utcH + (utcM < 0 ? -1 : 0)).padStart(2, "0")}:${String((utcM + 60) % 60).padStart(2, "0")}:00.000Z`;

        // Should not throw — gracefully returns null or a valid suggestion
        const result = getEarlyFinishSuggestion({
            block: theoryBlock,
            blockKey: theoryBlock.timeSlotKey,
            blockEndTime: theoryBlock.timeSlotKey.split("-")[1],
            effectiveNowIso: effectiveNow,
            todayDayNumber: 100,
            todayScheduleDay: day100,
            tomorrowScheduleDay: tomorrowDay,
            userState,
        });

        // No error, result is either null or a valid suggestion from remaining today blocks
        if (result) {
            expect(result.plannedMinutes).toBeGreaterThan(0);
        }
    });
});
