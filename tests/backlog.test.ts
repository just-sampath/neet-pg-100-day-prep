import { describe, expect, it } from "vitest";

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
import { getVisibleBlockKeys } from "@/lib/domain/schedule";

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
});
