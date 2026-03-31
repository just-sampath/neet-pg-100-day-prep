import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay, getBacklogCount } from "@/lib/domain/schedule";
import { buildTodayTimeline, getBacklogIndicatorLabel, getRevisionMinutesLabel, getWindDownState } from "@/lib/domain/today";

describe("today flow", () => {
  it("keeps the full day in one chronological timeline with breaks, meals, and hidden blocks inline", () => {
    const userState = createEmptyUserState();
    const day = getScheduleDay(2)!;
    const timeline = buildTodayTimeline(day, userState, "yellow");

    expect(timeline).toHaveLength(12);
    expect(timeline[0]).toMatchObject({
      kind: "block",
      blockKey: "06:30-07:45",
      mode: "visible",
    });
    expect(timeline[1]).toMatchObject({
      kind: "separator",
      slotKind: "break",
      label: "Breakfast Buffer",
    });
    expect(timeline.find((entry) => entry.kind === "separator" && entry.slotKind === "meal")).toMatchObject({
      kind: "separator",
      label: "Lunch",
    });
    expect(timeline.find((entry) => entry.kind === "block" && entry.blockKey === "15:00-17:45")).toMatchObject({
      kind: "block",
      mode: "hidden",
    });
    expect(timeline.find((entry) => entry.kind === "block" && entry.blockKey === "20:30-22:15")).toMatchObject({
      kind: "block",
      mode: "hidden",
    });
  });

  it("returns the 21:45 wrap-up prompt only when unfinished blocks exist besides final review", () => {
    expect(
      getWindDownState({
        minutes: 21 * 60 + 45,
        incompleteVisibleBlocks: ["08:00-11:00", "20:30-22:15"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "wrap_up",
      label: "21:45 Check",
    });

    expect(
      getWindDownState({
        minutes: 21 * 60 + 45,
        incompleteVisibleBlocks: ["20:30-22:15"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toEqual({ kind: "none" });
  });

  it("reappears once at 22:00 and then stops prompting after a second dismissal", () => {
    expect(
      getWindDownState({
        minutes: 21 * 60 + 55,
        incompleteVisibleBlocks: ["08:00-11:00"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 1,
        lateNightSweepProcessed: false,
      }),
    ).toEqual({ kind: "none" });

    expect(
      getWindDownState({
        minutes: 22 * 60,
        incompleteVisibleBlocks: ["08:00-11:00"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 1,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "wrap_up",
      label: "22:00 Check",
    });

    expect(
      getWindDownState({
        minutes: 22 * 60 + 5,
        incompleteVisibleBlocks: ["08:00-11:00"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 2,
        lateNightSweepProcessed: false,
      }),
    ).toEqual({ kind: "none" });
  });

  it("switches to the final-review prompt at 22:15", () => {
    expect(
      getWindDownState({
        minutes: 22 * 60 + 15,
        incompleteVisibleBlocks: ["20:30-22:15"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "final_review",
      label: "22:15 Check",
    });
  });

  it("distinguishes between the 22:45 auto-move trigger and the completed safety-net message", () => {
    expect(
      getWindDownState({
        minutes: 22 * 60 + 45,
        incompleteVisibleBlocks: ["08:00-11:00", "20:30-22:15"],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "auto_move_due",
      label: "22:45 Safety Net",
    });

    expect(
      getWindDownState({
        minutes: 22 * 60 + 45,
        incompleteVisibleBlocks: [],
        finalReviewBlockKey: "20:30-22:15",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: true,
      }),
    ).toMatchObject({
      kind: "auto_move_done",
      label: "22:45 Safety Net",
    });
  });

  it("formats small today-view helper labels cleanly", () => {
    expect(getBacklogIndicatorLabel(1)).toBe("1 block in backlog");
    expect(getBacklogIndicatorLabel(3)).toBe("3 blocks in backlog");
    expect(getRevisionMinutesLabel(15)).toBe("~15 min each");
    expect(getRevisionMinutesLabel(0)).toBeNull();
  });
});

describe("backlog badge count", () => {
  it("counts only pending backlog items", () => {
    const userState = createEmptyUserState();
    userState.backlogItems["item-1"] = {
      id: "item-1",
      sourceItemId: "item-1",
      originalDay: 1,
      originalBlockKey: "08:00-11:00",
      status: "pending",
      subject: "Anatomy",
      topicDescription: "Upper limb",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceTag: "manual_skip",
    } as never;
    userState.backlogItems["item-2"] = {
      id: "item-2",
      sourceItemId: "item-2",
      originalDay: 1,
      originalBlockKey: "08:00-11:00",
      status: "pending",
      subject: "Anatomy",
      topicDescription: "Lower limb",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceTag: "manual_skip",
    } as never;
    userState.backlogItems["item-3"] = {
      id: "item-3",
      sourceItemId: "item-3",
      originalDay: 2,
      originalBlockKey: "08:00-11:00",
      status: "phase_closed",
      subject: "Physiology",
      topicDescription: "Nerve conduction",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceTag: "manual_skip",
    } as never;
    userState.backlogItems["item-4"] = {
      id: "item-4",
      sourceItemId: "item-4",
      originalDay: 2,
      originalBlockKey: "11:30-13:00",
      status: "dismissed",
      subject: "Physiology",
      topicDescription: "Muscle physiology",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceTag: "manual_skip",
    } as never;

    expect(getBacklogCount(userState)).toBe(2);
  });

  it("returns 0 when no backlog items are pending", () => {
    const userState = createEmptyUserState();
    expect(getBacklogCount(userState)).toBe(0);
  });
});

describe("recovery card fields in schedule items", () => {
  it("passes isRecovery and originalDayNumber through from topicAssignments", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(userState);

    // Seed a recovery assignment into day 5 block_a
    const day5 = getScheduleDay(5, userState)!;
    const blockA = day5.blocks.find((b) => b.semanticBlockKey === "block_a")!;
    const firstItem = blockA.items[0]!;

    const row = userState.schedule.topicAssignments[firstItem.itemId]!;
    row.isRecovery = true;
    row.originalDayNumber = 2;
    row.originalBlockKey = "08:00-11:00";
    row.updatedAt = new Date().toISOString();

    // Re-read the day to get a fresh schedule with runtime data merged
    const refreshedDay = getScheduleDay(5, userState)!;
    const refreshedBlock = refreshedDay.blocks.find((b) => b.semanticBlockKey === "block_a")!;
    const refreshedItem = refreshedBlock.items.find((i) => i.itemId === firstItem.itemId)!;

    expect(refreshedItem.isRecovery).toBe(true);
    expect(refreshedItem.originalDayNumber).toBe(2);
    expect(refreshedItem.originalBlockKey).toBe("08:00-11:00");
  });

  it("does not set recovery fields on normal items", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-10";
    ensureUserScheduleSeeded(userState);

    const day = getScheduleDay(2, userState)!;
    const block = day.blocks.find((b) => b.trackable && b.items.length > 0)!;
    const item = block.items[0]!;

    expect(item.isRecovery).toBeUndefined();
    expect(item.originalDayNumber).toBeUndefined();
    expect(item.originalBlockKey).toBeUndefined();
  });
});
