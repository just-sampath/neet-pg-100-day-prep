import { describe, expect, it } from "vitest";

import {
  completeAssignedRecoveryForTarget,
  dismissBacklogScope,
  getBacklogQueueItems,
  getScheduledRecoveryForDay,
  isValidBacklogRescheduleTarget,
  moveBacklogItemPriority,
  refreshBacklogSuggestions,
  rescheduleBacklogScopeToSuggestions,
} from "@/lib/domain/backlog-queue";
import {
  applyOverrunCascadeBacklog,
  applyTrafficLightToDay,
  getOrCreateProgress,
  moveBlockToBacklog,
  moveVisibleBlocksToBacklog,
  runMidnightRollover,
} from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { previewOverrunCascade } from "@/lib/domain/backlog";
import { getSubjectFromPrimaryFocus, getVisibleBlockKeys } from "@/lib/domain/schedule";
import { scheduleData } from "@/lib/generated/schedule-data";

describe("backlog creation and traffic-light handling", () => {
  it("uses the exact yellow and red visible block sets from the PRD", () => {
    expect(getVisibleBlockKeys("yellow")).toEqual([
      "morning_revision",
      "block_a",
      "block_b",
      "mcq",
      "night_recall",
    ]);

    expect(getVisibleBlockKeys("red")).toEqual([
      "morning_revision",
      "block_a",
      "mcq",
    ]);
  });

  it("moves only pending hidden blocks into backlog on a yellow day and keeps completed work intact", () => {
    const userState = createEmptyUserState();
    const completed = getOrCreateProgress(userState, 2, "consolidation");
    completed.status = "completed";
    completed.completedAt = "2026-05-02T12:00:00.000Z";

    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    const pendingBacklogBlocks = Object.values(userState.backlogItems).map((item) => item.originalBlockKey).sort();
    expect(pendingBacklogBlocks).toEqual(["pyq_image"]);
    expect(getOrCreateProgress(userState, 2, "pyq_image")).toMatchObject({
      status: "rescheduled",
      sourceTag: "yellow_day",
    });
    expect(getOrCreateProgress(userState, 2, "consolidation")).toMatchObject({
      status: "completed",
    });
  });

  it("restores only the blocks that become visible again when moving from red to yellow on the same day", () => {
    const userState = createEmptyUserState();

    applyTrafficLightToDay(userState, 2, "red", { allowRestore: true });
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    const backlogByBlock = Object.values(userState.backlogItems).reduce<Record<string, string>>((acc, item) => {
      acc[item.originalBlockKey] = item.status;
      return acc;
    }, {});

    expect(backlogByBlock.consolidation).toBe("pending");
    expect(backlogByBlock.pyq_image).toBe("pending");
    expect(backlogByBlock.block_b).toBe("dismissed");
    expect(backlogByBlock.night_recall).toBe("dismissed");

    expect(getOrCreateProgress(userState, 2, "block_b")).toMatchObject({
      status: "pending",
      sourceTag: null,
    });
    expect(getOrCreateProgress(userState, 2, "night_recall")).toMatchObject({
      status: "pending",
      sourceTag: null,
    });
  });

  it("does not restore yellow or red backlog when green is selected on a different day", () => {
    const userState = createEmptyUserState();

    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });
    applyTrafficLightToDay(userState, 2, "green", { allowRestore: false });

    const backlogItems = Object.values(userState.backlogItems);
    expect(backlogItems).toHaveLength(2);
    expect(backlogItems.every((item) => item.status === "pending")).toBe(true);
    expect(getOrCreateProgress(userState, 2, "consolidation").status).toBe("rescheduled");
    expect(getOrCreateProgress(userState, 2, "pyq_image").status).toBe("rescheduled");
  });

  it("creates manual-skip backlog metadata for study blocks but keeps morning revision out of the queue", () => {
    const userState = createEmptyUserState();

    moveBlockToBacklog(userState, 2, "block_a", "skipped", "skipped", "User chose to skip.");
    moveBlockToBacklog(userState, 2, "morning_revision", "skipped", "skipped", "Handled by revision system.");

    const items = Object.values(userState.backlogItems);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      originalBlockKey: "block_a",
      sourceTag: "skipped",
      originalStart: "08:15",
      originalEnd: "10:45",
    });
    expect(getOrCreateProgress(userState, 2, "morning_revision")).toMatchObject({
      status: "skipped",
      sourceTag: "skipped",
    });
  });

  it("moves the right visible blocks during wind-down while keeping morning revision out of backlog", () => {
    const userState = createEmptyUserState();

    moveVisibleBlocksToBacklog(userState, 2, "green", {
      excludeNightRecall: true,
      note: "Moved to backlog by wind-down prompt.",
    });

    const backlogBlocks = Object.values(userState.backlogItems).map((item) => item.originalBlockKey).sort();
    expect(backlogBlocks).toEqual(["block_a", "block_b", "consolidation", "mcq", "pyq_image"]);
    expect(getOrCreateProgress(userState, 2, "night_recall").status).toBe("pending");
    expect(getOrCreateProgress(userState, 2, "morning_revision").status).toBe("pending");
  });

  it("marks midnight misses correctly and keeps morning revision out of the backlog queue", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    const result = runMidnightRollover(userState, userState.settings, "2026-05-03", 3);

    expect(result.missedBlocks).toBe(7);
    expect(result.backlogCreated).toBe(6);
    expect(getOrCreateProgress(userState, 2, "morning_revision")).toMatchObject({
      status: "missed",
      sourceTag: "missed",
    });
    expect(Object.values(userState.backlogItems).every((item) => item.originalBlockKey !== "morning_revision")).toBe(true);
  });

  it("previews the next affected block when a saved end time overruns into it", () => {
    const slots = [
      {
        key: "morning_revision" as const,
        label: "Morning Revision",
        start: "06:30",
        end: "08:00",
        status: "pending" as const,
        actualStart: null,
        actualEnd: null,
      },
      {
        key: "block_a" as const,
        label: "Block A",
        start: "08:15",
        end: "10:45",
        status: "pending" as const,
        actualStart: null,
        actualEnd: null,
      },
      {
        key: "block_b" as const,
        label: "Block B",
        start: "11:00",
        end: "13:30",
        status: "pending" as const,
        actualStart: null,
        actualEnd: null,
      },
    ];

    expect(
      previewOverrunCascade({
        editedBlockKey: "block_a",
        newEndTime: "12:00",
        trafficLight: "green",
        slots,
      }),
    ).toMatchObject({
      kind: "decision",
      affectedBlockKey: "block_b",
      shiftedStart: "12:00",
    });
  });

  it("creates overrun-cascade backlog entries with the correct metadata", () => {
    const userState = createEmptyUserState();

    const result = applyOverrunCascadeBacklog(userState, 2, "block_a", "12:00", "Moved after overrun.");
    const backlogItem = Object.values(userState.backlogItems).at(0);

    expect(result.preview).toMatchObject({
      kind: "decision",
      affectedBlockKey: "block_b",
    });
    expect(backlogItem).toMatchObject({
      originalBlockKey: "block_b",
      sourceTag: "overrun_cascade",
      originalStart: "11:00",
      originalEnd: "13:30",
    });
    expect(getOrCreateProgress(userState, 2, "block_b")).toMatchObject({
      status: "rescheduled",
      sourceTag: "overrun_cascade",
    });
  });

  it("forces the affected tail into backlog when an overrun would push the day past 23:00", () => {
    const userState = createEmptyUserState();

    const result = applyOverrunCascadeBacklog(userState, 2, "pyq_image", "22:15", "Moved to protect sleep.");

    expect(result.preview).toMatchObject({
      kind: "force_to_backlog",
      affectedBlockKeys: ["night_recall"],
    });
    expect(getOrCreateProgress(userState, 2, "night_recall")).toMatchObject({
      status: "rescheduled",
      sourceTag: "overrun_cascade",
    });
  });

  it("prefers same-subject consolidation when suggesting a recovery slot for content blocks", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Carry this forward.");
    refreshBacklogSuggestions(userState, userState.settings, 2);

    const item = Object.values(userState.backlogItems).at(0)!;
    expect(item).toMatchObject({
      suggestedDay: 3,
      suggestedBlockKey: "consolidation",
    });
    expect(item.suggestedNote).toContain("Pathology");
  });

  it("falls back to the next available consolidation slot when the same-subject consolidation slot is occupied", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Original content block.");
    moveBlockToBacklog(userState, 4, "consolidation", "missed", "missed", "Occupies Day 5 consolidation.");

    const items = Object.values(userState.backlogItems);
    const occupying = items.find((item) => item.originalDay === 4)!;
    occupying.status = "rescheduled";
    occupying.rescheduledToDay = 3;
    occupying.rescheduledToBlockKey = "consolidation";

    refreshBacklogSuggestions(userState, userState.settings, 2);

    const contentItem = items.find((item) => item.originalDay === 2)!;
    expect(contentItem).toMatchObject({
      suggestedDay: 4,
      suggestedBlockKey: "consolidation",
    });
    expect(contentItem.suggestedNote).toContain("Pathology consolidation on Day 4");
  });

  it("falls back to the next same-subject focus block when consolidation paths are unavailable", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Original content block.");

    const pathologyDays = scheduleData.days
      .filter((day) => day.dayNumber > 2 && getSubjectFromPrimaryFocus(day.primaryFocus) === "Pathology")
      .map((day) => day.dayNumber);

    for (const dayNumber of pathologyDays) {
      applyTrafficLightToDay(userState, dayNumber, "yellow", { allowRestore: false });
    }

    refreshBacklogSuggestions(userState, userState.settings, 2);

    const contentItem = Object.values(userState.backlogItems).find((item) => item.originalDay === 2)!;
    expect(contentItem).toMatchObject({
      suggestedDay: 3,
      suggestedBlockKey: "block_a",
    });
    expect(contentItem.suggestedNote).toContain("focus day");
  });

  it("skips occupied recovery slots and keeps MCQ suggestions believable", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "mcq", "missed", "missed", "Missed MCQs.");
    moveBlockToBacklog(userState, 3, "mcq", "missed", "missed", "Occupies Day 4 MCQ.");

    const items = Object.values(userState.backlogItems);
    const occupying = items.find((item) => item.originalDay === 3)!;
    occupying.status = "rescheduled";
    occupying.rescheduledToDay = 3;
    occupying.rescheduledToBlockKey = "mcq";

    refreshBacklogSuggestions(userState, userState.settings, 2);

    const mcqItem = items.find((item) => item.originalDay === 2)!;
    expect(mcqItem).toMatchObject({
      suggestedDay: 4,
      suggestedBlockKey: "mcq",
    });
  });

  it("falls back to the next weekend PYQ slot when the next day's slot is occupied", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 6, "pyq_image", "missed", "missed", "Needs another PYQ slot.");
    moveBlockToBacklog(userState, 8, "pyq_image", "missed", "missed", "Occupies the next day slot.");

    const items = Object.values(userState.backlogItems);
    const occupying = items.find((item) => item.originalDay === 8)!;
    occupying.status = "rescheduled";
    occupying.rescheduledToDay = 7;
    occupying.rescheduledToBlockKey = "pyq_image";

    refreshBacklogSuggestions(userState, userState.settings, 6);

    const pyqItem = items.find((item) => item.originalDay === 6)!;
    expect(pyqItem).toMatchObject({
      suggestedDay: 9,
      suggestedBlockKey: "pyq_image",
    });
    expect(pyqItem.suggestedNote).toContain("weekend");
  });

  it("falls back to the next same-subject afternoon for consolidation blocks when tomorrow is unavailable", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "consolidation", "missed", "missed", "Carry the consolidation forward.");
    moveBlockToBacklog(userState, 4, "consolidation", "missed", "missed", "Occupies Day 3 consolidation.");

    const items = Object.values(userState.backlogItems);
    const occupying = items.find((item) => item.originalDay === 4)!;
    occupying.status = "rescheduled";
    occupying.rescheduledToDay = 3;
    occupying.rescheduledToBlockKey = "consolidation";

    refreshBacklogSuggestions(userState, userState.settings, 2);

    const consolidationItem = items.find((item) => item.originalDay === 2)!;
    expect(consolidationItem).toMatchObject({
      suggestedDay: 4,
      suggestedBlockKey: "consolidation",
    });
    expect(consolidationItem.suggestedNote).toContain("Pathology afternoon consolidation");
  });

  it("keeps an item in backlog when no future slot exists before the hard boundary", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 100, "night_recall", "missed", "missed", "No future day remains.");
    refreshBacklogSuggestions(userState, userState.settings, 100);

    const item = Object.values(userState.backlogItems).at(0)!;
    expect(item.suggestedDay).toBeNull();
    expect(item.suggestedBlockKey).toBeNull();
    expect(item.suggestedNote).toContain("August 20 boundary");
  });

  it("refuses reschedule targets that are hidden by the future day's traffic light", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "consolidation", "missed", "missed", "Needs a future slot.");
    applyTrafficLightToDay(userState, 4, "yellow", { allowRestore: false });

    expect(isValidBacklogRescheduleTarget(userState, userState.settings, 2, 4, "consolidation")).toBe(false);
    expect(isValidBacklogRescheduleTarget(userState, userState.settings, 2, 4, "mcq")).toBe(true);
  });

  it("supports priority reordering and exposes queue age in the view model", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "First item.");
    moveBlockToBacklog(userState, 3, "mcq", "missed", "missed", "Second item.");

    const [first, second] = Object.values(userState.backlogItems);
    first!.createdAt = "2026-05-02T12:00:00.000Z";
    second!.createdAt = "2026-05-03T12:00:00.000Z";

    expect(moveBacklogItemPriority(userState, second!.id, "up")).toBe(true);

    const view = getBacklogQueueItems(userState, userState.settings, "2026-05-05", "pending", "priority");
    expect(view.map((item) => item.id)).toEqual([second!.id, first!.id]);
    expect(view.map((item) => item.daysInBacklog)).toEqual([2, 3]);
  });

  it("bulk-dismisses or bulk-reschedules suggestions by scope", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Content backlog.");
    moveBlockToBacklog(userState, 2, "block_b", "yellow_day", "rescheduled", "Yellow day carry.");
    moveBlockToBacklog(userState, 2, "mcq", "missed", "missed", "MCQ backlog.");

    const yellowItem = Object.values(userState.backlogItems).find((item) => item.sourceTag === "yellow_day")!;
    dismissBacklogScope(userState, "yellow_red");
    expect(yellowItem.status).toBe("dismissed");

    const accepted = rescheduleBacklogScopeToSuggestions(userState, userState.settings, 2, "missed_skipped");
    expect(accepted).toBe(2);

    const acceptedItems = Object.values(userState.backlogItems).filter((item) => item.status === "rescheduled");
    expect(acceptedItems.every((item) => item.rescheduledToDay && item.rescheduledToBlockKey)).toBe(true);
  });

  it("surfaces rescheduled backlog items on the day they were assigned to", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Carry to later.");
    const item = Object.values(userState.backlogItems).at(0)!;
    item.status = "rescheduled";
    item.rescheduledToDay = 3;
    item.rescheduledToBlockKey = "consolidation";
    item.createdAt = "2026-05-02T12:00:00.000Z";

    const scheduled = getScheduledRecoveryForDay(userState, userState.settings, 3, "2026-05-05");
    expect(scheduled).toEqual([
      expect.objectContaining({
        id: item.id,
        sourceDay: 2,
        sourceMappedDate: "2026-05-02",
        targetDay: 3,
        targetBlockKey: "consolidation",
        targetBlockLabel: "Consolidation",
        daysInBacklog: 3,
      }),
    ]);
  });

  it("includes the original mapped date in the backlog queue view model", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Carry this forward.");

    const [item] = getBacklogQueueItems(userState, userState.settings, "2026-05-05", "pending", "priority");
    expect(item?.originalMappedDate).toBe("2026-05-02");
  });

  it("marks assigned recovery complete when the destination block is completed", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Carry to consolidation.");
    const item = Object.values(userState.backlogItems).at(0)!;
    item.status = "rescheduled";
    item.rescheduledToDay = 3;
    item.rescheduledToBlockKey = "consolidation";

    completeAssignedRecoveryForTarget(userState, 3, "consolidation", "2026-05-03T12:00:00.000Z");

    expect(item).toMatchObject({
      status: "completed",
      completedAt: "2026-05-03T12:00:00.000Z",
      rescheduledToDay: 3,
      rescheduledToBlockKey: "consolidation",
    });
  });

  it("returns assigned recovery to pending when the destination block is missed again", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Carry to consolidation.");
    const originalItem = Object.values(userState.backlogItems).find((item) => item.originalDay === 2)!;
    originalItem.status = "rescheduled";
    originalItem.rescheduledToDay = 3;
    originalItem.rescheduledToBlockKey = "consolidation";

    moveBlockToBacklog(userState, 3, "consolidation", "missed", "missed", "Destination day fell apart.");

    expect(originalItem).toMatchObject({
      status: "pending",
      rescheduledToDay: null,
      rescheduledToBlockKey: null,
    });

    const destinationItem = Object.values(userState.backlogItems).find((item) => item.originalDay === 3 && item.originalBlockKey === "consolidation");
    expect(destinationItem).toMatchObject({
      status: "pending",
      sourceTag: "missed",
    });
  });

  it("releases assigned recovery during midnight rollover if the destination block was never finished", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    moveBlockToBacklog(userState, 2, "block_a", "missed", "missed", "Carry to consolidation.");
    const originalItem = Object.values(userState.backlogItems).find((item) => item.originalDay === 2)!;
    originalItem.status = "rescheduled";
    originalItem.rescheduledToDay = 3;
    originalItem.rescheduledToBlockKey = "consolidation";

    runMidnightRollover(userState, userState.settings, "2026-05-04", 4);

    expect(originalItem).toMatchObject({
      status: "pending",
      rescheduledToDay: null,
      rescheduledToBlockKey: null,
    });
    expect(
      Object.values(userState.backlogItems).some(
        (item) => item.originalDay === 3 && item.originalBlockKey === "consolidation" && item.sourceTag === "missed",
      ),
    ).toBe(true);
  });
});
