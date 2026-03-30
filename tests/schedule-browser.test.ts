import { describe, expect, it } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import { getDayDetailData, getScheduleListData } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getOriginalPlannedDate, getScheduleDayEditState } from "@/lib/domain/schedule";
import type { LocalStore, UserState } from "@/lib/domain/types";

function createStore(userState?: UserState, simulatedNowIso = "2026-05-03T06:30:00.000Z"): LocalStore {
  return {
    version: 2,
    users: {
      "local-user": {
        id: "local-user",
        email: "aspirant@beside-you.local",
        password: "beside-you-2026",
        displayName: "Aspirant",
      },
    },
    sessions: {},
    userState: {
      "local-user": userState ?? createEmptyUserState(),
    },
    referenceData: getStaticReferenceData(),
    dev: {
      simulatedNowIso,
    },
  };
}

describe("schedule browser and retroactive editing", () => {
  it("keeps the original planned date stable even when mapped dates shift", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-1",
        anchorDayNumber: 1,
        shiftDays: 1,
        appliedAt: "2026-05-10T00:00:00.000Z",
        missedDays: [8, 9],
        bufferDayUsed: 84,
        compressedPairs: [],
      },
    ];

    expect(getOriginalPlannedDate(10, userState.settings)).toBe("2026-05-10");
  });

  it("distinguishes past, today, future, and hidden shift days for editing", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    expect(getScheduleDayEditState(2, userState.settings, "2026-05-03")).toMatchObject({
      relation: "past",
      canRetroactivelyComplete: true,
      canAdjustToday: false,
      isReadOnly: false,
    });

    expect(getScheduleDayEditState(3, userState.settings, "2026-05-03")).toMatchObject({
      relation: "today",
      canRetroactivelyComplete: false,
      canAdjustToday: true,
      isReadOnly: false,
    });

    expect(getScheduleDayEditState(4, userState.settings, "2026-05-03")).toMatchObject({
      relation: "future",
      canRetroactivelyComplete: false,
      canAdjustToday: false,
      isReadOnly: true,
    });

    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-2",
        anchorDayNumber: 1,
        shiftDays: 1,
        appliedAt: "2026-07-20T00:00:00.000Z",
        missedDays: [70, 71],
        bufferDayUsed: 84,
        compressedPairs: [],
      },
    ];

    expect(getScheduleDayEditState(84, userState.settings, "2026-07-23")).toMatchObject({
      isShiftHidden: true,
      isReadOnly: true,
    });
  });

  it("marks today distinctly in the browser list and keeps missed past days visible", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";

    const days = getScheduleListData(createStore(userState), "local-user");

    expect(days.find((day) => day.dayNumber === 3)).toMatchObject({
      today: true,
      status: "today",
    });
    expect(days.find((day) => day.dayNumber === 2)).toMatchObject({
      status: "missed",
    });
  }, 15_000);

  it("exposes retroactive completion only on past day detail views and returns semantic block items", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.settings.scheduleShiftDays = 1;
    userState.settings.shiftEvents = [
      {
        id: "shift-3",
        anchorDayNumber: 90,
        shiftDays: 1,
        appliedAt: "2026-08-10T00:00:00.000Z",
        missedDays: [90, 91],
        bufferDayUsed: null,
        compressedPairs: [[95, 96]],
      },
    ];

    const store = createStore(userState);
    const pastDetail = getDayDetailData(store, "local-user", 2);
    const futureDetail = getDayDetailData(store, "local-user", 5);
    const hiddenShiftDetail = getDayDetailData(createStore(userState, "2026-08-15T06:30:00.000Z"), "local-user", 96);

    expect(pastDetail?.editState).toMatchObject({
      relation: "past",
      canRetroactivelyComplete: true,
    });
    expect(pastDetail?.blocks[0]).toMatchObject({
      displayLabel: "Morning Revision",
    });
    expect(pastDetail?.blocks[0]?.items.length).toBeGreaterThan(0);

    expect(futureDetail?.editState).toMatchObject({
      relation: "future",
      isReadOnly: true,
    });
    expect(hiddenShiftDetail?.hiddenShiftLabel).toBe("merged by shift compression");
    expect(hiddenShiftDetail?.editState.isReadOnly).toBe(true);
  });
});
