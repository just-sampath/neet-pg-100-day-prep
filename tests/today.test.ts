import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import { getScheduleDay } from "@/lib/domain/schedule";
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
