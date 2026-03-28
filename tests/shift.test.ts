import { describe, expect, it } from "vitest";

import { applyScheduleShiftToUserState, moveBlockToBacklog } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import {
  createRevisionId,
  getCurrentDayNumber,
  getMappedDate,
  getPreviousVisibleDayNumber,
  getScheduleDay,
  getScheduleHealth,
  getShiftPreview,
  isCompressedHiddenDay,
} from "@/lib/domain/schedule";
import type { BlockKey, UserState } from "@/lib/domain/types";

function createConfiguredState() {
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  return userState;
}

function getVisibleStudyKeys(dayNumber: number) {
  return getScheduleDay(dayNumber)!.blocks
    .filter((block) => block.trackable)
    .slice(0, 5)
    .map((block) => block.timeSlotKey);
}

function markHeavilyMissed(userState: UserState, dayNumber: number) {
  for (const blockKey of getVisibleStudyKeys(dayNumber)) {
    moveBlockToBacklog(userState, dayNumber, blockKey as BlockKey, "missed", "missed", "Missed for shift detection.");
  }
}

describe("schedule shift mechanism", () => {
  it("suggests a shift only when two heavily missed/rescheduled days exist in the last seven visible days", () => {
    const userState = createConfiguredState();
    markHeavilyMissed(userState, 32);
    markHeavilyMissed(userState, 38);
    markHeavilyMissed(userState, 39);

    const health = getScheduleHealth(userState, userState.settings, 40);

    expect(health).toEqual({
      missedDays: [38, 39],
      anchorDayNumber: 38,
      suggestShift: true,
    });
  });

  it("builds a preview from the earliest missed day and uses Day 84 before compression pairs", () => {
    const userState = createConfiguredState();
    const preview = getShiftPreview(userState.settings, [38, 39]);

    expect(preview).toMatchObject({
      anchorDayNumber: 38,
      shiftDays: 2,
      bufferDaysAvailable: 1,
      bufferDaysUsed: 1,
      isCleanShift: false,
      compressedPairs: [[95, 96]],
      hardBoundaryExceeded: false,
    });
    expect(preview?.mergedDays[0]).toMatchObject({
      originalDays: [95, 96],
    });
  });

  it("applies a shift from the missed anchor day, clears covered recovery, and resets unresolved progress", () => {
    const userState = createConfiguredState();
    const originalSettings = structuredClone(userState.settings);
    const day38Block = getScheduleDay(38)!.blocks.find((block) => block.semanticBlockKey === "block_a")!;

    userState.dayStates["38"] = {
      dayNumber: 38,
      trafficLight: "red",
      updatedAt: "2026-06-07T10:00:00.000Z",
    };

    moveBlockToBacklog(userState, 38, day38Block.timeSlotKey, "missed", "missed", "Needs recovery.");
    moveBlockToBacklog(
      userState,
      37,
      getScheduleDay(37)!.blocks.find((block) => block.semanticBlockKey === "block_a")!.timeSlotKey,
      "missed",
      "missed",
      "Older recovery stays.",
    );

    const sourceItem = day38Block.items[0]!;
    const revisionId = createRevisionId(sourceItem.itemId, "D+1");
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId: sourceItem.itemId,
      sourceDay: 38,
      sourceBlockKey: day38Block.timeSlotKey,
      revisionType: "D+1",
      completedAt: "2026-06-09T12:00:00.000Z",
    };

    const preview = getShiftPreview(userState.settings, [38, 39]);
    expect(preview).toBeTruthy();

    const applied = applyScheduleShiftToUserState(userState, preview!, "2026-06-09T18:00:00.000Z");
    expect(applied).toBe(true);
    expect(userState.settings.scheduleShiftDays).toBe(2);
    expect(userState.settings.shiftEvents).toHaveLength(1);
    expect(userState.settings.shiftEvents[0]?.compressedPairs).toEqual(preview?.compressedPairs);
    expect(getMappedDate(100, userState.settings)).toBe(preview?.day100);
    expect(userState.dayStates["38"]?.trafficLight).toBe("green");
    expect(userState.topicProgress[sourceItem.itemId]).toBeUndefined();
    expect(userState.revisionCompletions[revisionId]).toBeUndefined();

    const coveredRecovery = Object.values(userState.backlogItems).find((item) => item.originalDay === 38);
    const olderRecovery = Object.values(userState.backlogItems).find((item) => item.originalDay === 37);

    expect(coveredRecovery?.status).toBe("dismissed");
    expect(olderRecovery?.status).toBe("pending");
    expect(getMappedDate(37, userState.settings)).toBe(getMappedDate(37, originalSettings));
    expect(getMappedDate(38, userState.settings)).toBe(getMappedDate(40, originalSettings));
    expect(getMappedDate(66, userState.settings)).toBe(getMappedDate(68, originalSettings));
  });

  it("marks Day 84 and the consumed compression hidden while keeping Day 99 and Day 100 intact", () => {
    const userState = createConfiguredState();
    const preview = getShiftPreview(userState.settings, [38, 39]);

    applyScheduleShiftToUserState(userState, preview!, "2026-06-09T18:00:00.000Z");

    expect(isCompressedHiddenDay(84, userState.settings)).toBe(true);
    expect(isCompressedHiddenDay(96, userState.settings)).toBe(true);
    expect(isCompressedHiddenDay(99, userState.settings)).toBe(false);
    expect(isCompressedHiddenDay(100, userState.settings)).toBe(false);
    expect(getPreviousVisibleDayNumber(85, userState.settings)).toBe(83);
  });

  it("moves the lived current day back to the shifted anchor instead of keeping the old numeric day", () => {
    const userState = createConfiguredState();
    const originalDay40 = getMappedDate(40, userState.settings)!;
    const preview = getShiftPreview(userState.settings, [38, 39]);

    applyScheduleShiftToUserState(userState, preview!, "2026-06-09T18:00:00.000Z");

    expect(getCurrentDayNumber(userState.settings, originalDay40)).toBe(38);
  });

  it("uses only future-available recoveries on later repeated shifts", () => {
    const userState = createConfiguredState();
    const originalSettings = structuredClone(userState.settings);
    const firstPreview = getShiftPreview(userState.settings, [38, 39]);
    applyScheduleShiftToUserState(userState, firstPreview!, "2026-06-09T18:00:00.000Z");

    const secondPreview = getShiftPreview(userState.settings, [90, 91]);

    expect(secondPreview).toMatchObject({
      anchorDayNumber: 90,
      shiftDays: 2,
      bufferDaysAvailable: 0,
      compressedPairs: [
        [97, 98],
        [91, 92],
      ],
    });

    applyScheduleShiftToUserState(userState, secondPreview!, "2026-07-31T18:00:00.000Z");

    expect(userState.settings.shiftEvents).toHaveLength(2);
    expect(isCompressedHiddenDay(92, userState.settings)).toBe(true);
    expect(isCompressedHiddenDay(98, userState.settings)).toBe(true);
    expect(getMappedDate(90, userState.settings)).toBe(getMappedDate(93, originalSettings));
  });

  it("flags previews that would push the schedule past the August 20 hard boundary", () => {
    const userState = createConfiguredState();
    userState.settings.dayOneDate = "2026-05-15";

    const preview = getShiftPreview(userState.settings, [38, 39]);

    expect(preview?.hardBoundaryExceeded).toBe(true);
    expect(applyScheduleShiftToUserState(userState, preview!, "2026-06-09T18:00:00.000Z")).toBe(false);
  });
});
