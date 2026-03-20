import { describe, expect, it } from "vitest";

import { createEmptyUserState } from "@/lib/data/local-store";
import { buildDailyRevisionPlan, getAbsorptionSavings, getVisibleBlockKeys, getMappedDate } from "@/lib/domain/schedule";

describe("schedule engine", () => {
  it("uses the green layout for the full block set", () => {
    expect(getVisibleBlockKeys("green")).toEqual([
      "morning_revision",
      "block_a",
      "block_b",
      "consolidation",
      "mcq",
      "pyq_image",
      "night_recall",
    ]);
  });

  it("absorbs one day when the buffer is used", () => {
    expect(getAbsorptionSavings(83, { dayOneDate: "2026-05-01", theme: "dark", scheduleShiftDays: 1, shiftAppliedAt: null })).toBe(0);
    expect(getAbsorptionSavings(84, { dayOneDate: "2026-05-01", theme: "dark", scheduleShiftDays: 1, shiftAppliedAt: null })).toBe(1);
  });

  it("keeps mapped dates stable when the first shift is absorbed by the buffer", () => {
    const settings = {
      dayOneDate: "2026-05-01",
      theme: "dark" as const,
      scheduleShiftDays: 1,
      shiftAppliedAt: null,
    };
    expect(getMappedDate(84, settings)).toBe("2026-07-23");
  });

  it("produces a revision queue from planned anchors when day one is configured", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    const plan = buildDailyRevisionPlan("2026-05-03", userState, userState.settings);
    expect(plan.queue.length).toBeGreaterThan(0);
  });
});
