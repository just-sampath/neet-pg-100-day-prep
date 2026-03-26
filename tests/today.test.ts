import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import { getScheduleDay } from "@/lib/domain/schedule";
import { buildTodayTimeline, getBacklogIndicatorLabel, getRevisionMinutesLabel, getWindDownState } from "@/lib/domain/today";

describe("today flow", () => {
  it("keeps the full day in one chronological timeline with breaks, meals, and hidden blocks inline", () => {
    const userState = createEmptyUserState();
    const day = getScheduleDay(2)!;
    const timeline = buildTodayTimeline(day, userState, "yellow");

    expect(timeline).toHaveLength(13);
    expect(timeline[0]).toMatchObject({
      kind: "block",
      blockKey: "06:30-08:00",
      mode: "visible",
    });
    expect(timeline[1]).toMatchObject({
      kind: "separator",
      slotKind: "break",
      label: "Break",
    });
    expect(timeline.find((entry) => entry.kind === "separator" && entry.slotKind === "meal")).toMatchObject({
      kind: "separator",
      label: "Lunch",
    });
    expect(timeline.find((entry) => entry.kind === "block" && entry.blockKey === "14:15-16:45")).toMatchObject({
      kind: "block",
      mode: "hidden",
    });
    expect(timeline.find((entry) => entry.kind === "block" && entry.blockKey === "20:15-21:45")).toMatchObject({
      kind: "block",
      mode: "hidden",
    });
  });

  it("returns the 22:30 wrap-up prompt only when unfinished blocks exist besides night recall", () => {
    expect(
      getWindDownState({
        minutes: 22 * 60 + 30,
        incompleteVisibleBlocks: ["08:15-10:45", "22:00-23:00"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "wrap_up",
      label: "22:30 Check",
    });

    expect(
      getWindDownState({
        minutes: 22 * 60 + 30,
        incompleteVisibleBlocks: ["22:00-23:00"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toEqual({ kind: "none" });
  });

  it("reappears once at 22:45 and then stops prompting after a second dismissal", () => {
    expect(
      getWindDownState({
        minutes: 22 * 60 + 40,
        incompleteVisibleBlocks: ["08:15-10:45"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 1,
        lateNightSweepProcessed: false,
      }),
    ).toEqual({ kind: "none" });

    expect(
      getWindDownState({
        minutes: 22 * 60 + 45,
        incompleteVisibleBlocks: ["08:15-10:45"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 1,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "wrap_up",
      label: "22:45 Check",
    });

    expect(
      getWindDownState({
        minutes: 22 * 60 + 50,
        incompleteVisibleBlocks: ["08:15-10:45"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 2,
        lateNightSweepProcessed: false,
      }),
    ).toEqual({ kind: "none" });
  });

  it("switches to the night recall prompt at 23:00", () => {
    expect(
      getWindDownState({
        minutes: 23 * 60,
        incompleteVisibleBlocks: ["22:00-23:00"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "night_recall",
      label: "23:00 Check",
    });
  });

  it("distinguishes between the 23:15 auto-move trigger and the completed safety-net message", () => {
    expect(
      getWindDownState({
        minutes: 23 * 60 + 15,
        incompleteVisibleBlocks: ["08:15-10:45", "22:00-23:00"],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: false,
      }),
    ).toMatchObject({
      kind: "auto_move_due",
      label: "23:15 Safety Net",
    });

    expect(
      getWindDownState({
        minutes: 23 * 60 + 15,
        incompleteVisibleBlocks: [],
        nightRecallBlockKey: "22:00-23:00",
        wrapUpDismissals: 0,
        lateNightSweepProcessed: true,
      }),
    ).toMatchObject({
      kind: "auto_move_done",
      label: "23:15 Safety Net",
    });
  });

  it("formats small today-view helper labels cleanly", () => {
    expect(getBacklogIndicatorLabel(1)).toBe("1 block in backlog");
    expect(getBacklogIndicatorLabel(3)).toBe("3 blocks in backlog");
    expect(getRevisionMinutesLabel(18)).toBe("~18 min each");
    expect(getRevisionMinutesLabel(0)).toBeNull();
  });
});
