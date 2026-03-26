import { describe, expect, it } from "vitest";

import {
  getBacklogQueueItems,
  refreshBacklogSuggestions,
} from "@/lib/domain/backlog-queue";
import { previewOverrunCascade } from "@/lib/domain/backlog";
import {
  applyOverrunCascadeBacklog,
  applyOverrunCascadeShift,
  applyTrafficLightToDay,
  completeBlockItems,
  getOrCreateProgress,
  moveBlockToBacklog,
  moveVisibleBlocksToBacklog,
  runMidnightRollover,
} from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getBlockProgress, getScheduleDay, getVisibleBlockKeys } from "@/lib/domain/schedule";
import type { BlockKey } from "@/lib/domain/types";

function getBlockKey(dayNumber: number, semanticBlockKey: string): BlockKey {
  return getScheduleDay(dayNumber)!.blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!.timeSlotKey;
}

function getBlockItems(dayNumber: number, blockKey: BlockKey) {
  return getScheduleDay(dayNumber)!.blocks.find((block) => block.timeSlotKey === blockKey)!.items;
}

describe("backlog creation and traffic-light handling", () => {
  it("uses the phase-aware JSON traffic-light policy for first-pass days", () => {
    const day2 = getScheduleDay(2)!;

    expect(getVisibleBlockKeys("yellow", day2)).toEqual([
      "06:30-08:00",
      "08:15-10:45",
      "11:00-13:30",
      "17:00-19:30",
      "22:00-23:00",
    ]);

    expect(getVisibleBlockKeys("red", day2)).toEqual([
      "06:30-08:00",
      "08:15-10:45",
      "17:00-19:30",
    ]);
  });

  it("moves only unresolved hidden work into recovery on a yellow day and preserves completed hidden blocks", () => {
    const userState = createEmptyUserState();
    const consolidationKey = getBlockKey(2, "consolidation_block");
    const pyqKey = getBlockKey(2, "pyq_image_block");

    completeBlockItems(userState, 2, consolidationKey, "2026-05-02T12:00:00.000Z");
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    const backlogBlocks = Object.values(userState.backlogItems).map((item) => item.originalBlockKey);
    expect(new Set(backlogBlocks)).toEqual(new Set([pyqKey]));
    expect(backlogBlocks).toHaveLength(getBlockItems(2, pyqKey).length);

    expect(getBlockProgress(userState, 2, consolidationKey).status).toBe("completed");
    expect(getBlockProgress(userState, 2, pyqKey).status).toBe("rescheduled");
  });

  it("restores same-day red-to-yellow work, including non-backlog blocks like night recall", () => {
    const userState = createEmptyUserState();
    const studyBlock2Key = getBlockKey(2, "study_block_2");
    const nightRecallKey = getBlockKey(2, "night_recall");
    const consolidationKey = getBlockKey(2, "consolidation_block");
    const pyqKey = getBlockKey(2, "pyq_image_block");

    applyTrafficLightToDay(userState, 2, "red", { allowRestore: true });
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    expect(getBlockProgress(userState, 2, studyBlock2Key).status).toBe("pending");
    expect(getBlockProgress(userState, 2, nightRecallKey).status).toBe("pending");
    expect(getBlockItems(2, nightRecallKey).every((item) => userState.topicProgress[item.itemId]?.sourceTag == null)).toBe(true);

    const restoredBacklog = Object.values(userState.backlogItems).filter((item) => item.originalBlockKey === studyBlock2Key);
    expect(restoredBacklog.every((item) => item.status === "dismissed")).toBe(true);

    const stillHiddenBacklog = Object.values(userState.backlogItems).filter(
      (item) => item.originalBlockKey === consolidationKey || item.originalBlockKey === pyqKey,
    );
    expect(stillHiddenBacklog.every((item) => item.status === "pending")).toBe(true);
  });

  it("does not restore hidden work when green is applied without same-day restore", () => {
    const userState = createEmptyUserState();
    const consolidationKey = getBlockKey(2, "consolidation_block");
    const pyqKey = getBlockKey(2, "pyq_image_block");

    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });
    applyTrafficLightToDay(userState, 2, "green", { allowRestore: false });

    const backlogItems = Object.values(userState.backlogItems);
    expect(backlogItems.every((item) => item.status === "pending")).toBe(true);
    expect(getBlockProgress(userState, 2, consolidationKey).status).toBe("rescheduled");
    expect(getBlockProgress(userState, 2, pyqKey).status).toBe("rescheduled");
  });

  it("creates manual-skip recovery for study blocks but keeps morning revision out of the backlog queue", () => {
    const userState = createEmptyUserState();
    const morningRevisionKey = getBlockKey(2, "morning_revision");
    const studyBlock1Key = getBlockKey(2, "study_block_1");

    moveBlockToBacklog(userState, 2, studyBlock1Key, "skipped", "skipped", "User chose to skip.");
    moveBlockToBacklog(userState, 2, morningRevisionKey, "skipped", "skipped", "Handled by revision system.");

    const backlogItems = Object.values(userState.backlogItems);
    expect(backlogItems).toHaveLength(getBlockItems(2, studyBlock1Key).length);
    expect(backlogItems.every((item) => item.originalBlockKey === studyBlock1Key)).toBe(true);
    expect(getBlockProgress(userState, 2, morningRevisionKey).status).toBe("skipped");
  });

  it("moves only visible reschedulable study work during wind-down and keeps morning revision and night recall out of backlog", () => {
    const userState = createEmptyUserState();
    const morningRevisionKey = getBlockKey(2, "morning_revision");
    const nightRecallKey = getBlockKey(2, "night_recall");

    moveVisibleBlocksToBacklog(userState, 2, "green", {
      excludeNightRecall: true,
      note: "Moved to recovery by wind-down prompt.",
    });

    const queuedBlockKeys = new Set(Object.values(userState.backlogItems).map((item) => item.originalBlockKey));
    expect(queuedBlockKeys).toEqual(
      new Set([
        getBlockKey(2, "study_block_1"),
        getBlockKey(2, "study_block_2"),
        getBlockKey(2, "consolidation_block"),
        getBlockKey(2, "mcq_block"),
        getBlockKey(2, "pyq_image_block"),
      ]),
    );
    expect(getBlockProgress(userState, 2, morningRevisionKey).status).toBe("missed");
    expect(getBlockProgress(userState, 2, nightRecallKey).status).toBe("pending");
  });

  it("marks midnight misses correctly and keeps non-backlog blocks out of the recovery queue", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    const morningRevisionKey = getBlockKey(2, "morning_revision");
    const nightRecallKey = getBlockKey(2, "night_recall");

    const result = runMidnightRollover(userState, userState.settings, "2026-05-03", 3);

    expect(result.missedBlocks).toBe(7);
    expect(result.backlogCreated).toBe(11);
    expect(getBlockProgress(userState, 2, morningRevisionKey).status).toBe("missed");
    expect(getBlockProgress(userState, 2, nightRecallKey).status).toBe("missed");
    expect(Object.values(userState.backlogItems).every((item) => item.originalBlockKey !== morningRevisionKey)).toBe(true);
    expect(Object.values(userState.backlogItems).every((item) => item.originalBlockKey !== nightRecallKey)).toBe(true);
  });

  it("previews and persists a downstream overrun cascade instead of shifting only one adjacent block", () => {
    expect(
      previewOverrunCascade({
        editedBlockKey: "study-a",
        newEndTime: "09:30",
        slots: [
          {
            key: "study-a",
            label: "Study A",
            start: "08:00",
            end: "09:00",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            visible: true,
            reschedulable: true,
          },
          {
            key: "study-b",
            label: "Study B",
            start: "09:00",
            end: "10:00",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            visible: true,
            reschedulable: true,
          },
          {
            key: "study-c",
            label: "Study C",
            start: "10:00",
            end: "11:00",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            visible: true,
            reschedulable: true,
          },
        ],
      }),
    ).toMatchObject({
      kind: "decision",
      affectedBlockKey: "study-b",
      shiftedStart: "09:30",
      shiftedEnd: "10:30",
      shiftedBlocks: [
        {
          key: "study-b",
          shiftedStart: "09:30",
          shiftedEnd: "10:30",
        },
        {
          key: "study-c",
          shiftedStart: "10:30",
          shiftedEnd: "11:30",
        },
      ],
    });

    const userState = createEmptyUserState();
    const studyBlock1Key = getBlockKey(2, "study_block_1");
    const studyBlock2Key = getBlockKey(2, "study_block_2");
    const consolidationKey = getBlockKey(2, "consolidation_block");

    const result = applyOverrunCascadeShift(userState, 2, studyBlock1Key, "12:00");

    expect(result.preview).toMatchObject({
      kind: "decision",
      affectedBlockKey: studyBlock2Key,
    });
    expect(getOrCreateProgress(userState, 2, studyBlock2Key)).toMatchObject({
      actualStart: "12:00",
      actualEnd: "14:30",
    });
    expect(getOrCreateProgress(userState, 2, consolidationKey)).toMatchObject({
      actualStart: "14:30",
      actualEnd: "17:00",
    });
  });

  it("forces the affected tail into recovery when an overrun would breach the 23:00 boundary", () => {
    const userState = createEmptyUserState();
    const mcqKey = getBlockKey(2, "mcq_block");
    const pyqKey = getBlockKey(2, "pyq_image_block");

    const result = applyOverrunCascadeBacklog(userState, 2, mcqKey, "22:00", "Moved to protect sleep.");

    expect(result.preview).toMatchObject({
      kind: "force_to_backlog",
      affectedBlockKeys: [pyqKey],
    });
    expect(getBlockProgress(userState, 2, pyqKey).status).toBe("rescheduled");
  });

  it("keeps recovery suggestions inside the same phase for first-pass topic backlog", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    const studyBlock1Key = getBlockKey(2, "study_block_1");

    moveBlockToBacklog(userState, 2, studyBlock1Key, "missed", "missed", "Carry this forward.");
    refreshBacklogSuggestions(userState, userState.settings, 2);

    const queueItems = getBacklogQueueItems(userState, userState.settings, "2026-05-02", "all", "priority");
    expect(queueItems.length).toBeGreaterThan(0);
    expect(queueItems.every((item) => item.suggestedDay !== null)).toBe(true);
    expect(
      queueItems.every(
        (item) =>
          item.suggestedDay !== null &&
          getScheduleDay(item.suggestedDay)!.phaseId === getScheduleDay(item.originalDay)!.phaseId,
      ),
    ).toBe(true);
  });
});
