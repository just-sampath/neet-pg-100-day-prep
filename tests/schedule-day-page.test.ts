import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyTrafficLightToDay } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getScheduleDay } from "@/lib/domain/schedule";
import type { BlockKey, LocalStore, UserState } from "@/lib/domain/types";

const authMocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  requireDayOneSetup: vi.fn(),
}));

const localStoreMocks = vi.hoisted(() => ({
  readScheduleDayStore: vi.fn(),
}));

const timeEditorCapture = vi.hoisted(
  () =>
  ({
    props: [] as Array<{
      blockKey: BlockKey;
      slots: Array<{ key: BlockKey; visible: boolean }>;
    }>,
  }),
);

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>("@/lib/auth/session");
  return {
    ...actual,
    requireCurrentUser: authMocks.requireCurrentUser,
    requireDayOneSetup: authMocks.requireDayOneSetup,
  };
});

vi.mock("@/lib/data/local-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/local-store")>("@/lib/data/local-store");
  return {
    ...actual,
    readScheduleDayStore: localStoreMocks.readScheduleDayStore,
  };
});

vi.mock("@/components/app/morning-plan-panel", () => ({
  MorningPlanPanel: () => null,
}));

vi.mock("@/components/app/time-editor", () => ({
  TimeEditor: (props: { blockKey: BlockKey; slots: Array<{ key: BlockKey; visible: boolean }> }) => {
    timeEditorCapture.props.push({ blockKey: props.blockKey, slots: props.slots });
    return null;
  },
}));

vi.mock("@/lib/server/actions", () => ({
  setTrafficLightAction: async () => { },
  updateBlockAction: async () => { },
  updateTopicAction: async () => { },
}));

import ScheduleDayPage from "@/app/(app)/schedule/[day]/page";

function createStore(userState?: UserState, simulatedNowIso = "2026-05-01T09:30:00.000Z"): LocalStore {
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

describe("ScheduleDayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireCurrentUser.mockResolvedValue({ id: "local-user" });
    authMocks.requireDayOneSetup.mockResolvedValue(undefined);
    timeEditorCapture.props.length = 0;
  });

  it("passes traffic-light visibility into TimeEditor slots so hidden blocks stay out of overrun preview", async () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.processedDates.midnightDates.push("2026-04-30");
    userState.processedDates.repackDates.push("2026-05-01");
    ensureUserScheduleSeeded(userState);
    applyTrafficLightToDay(userState, 1, "red", { allowRestore: true });
    const store = createStore(userState);

    localStoreMocks.readScheduleDayStore.mockImplementation(async (dayNumber: number, reader: (store: LocalStore) => unknown) => {
      expect(dayNumber).toBe(1);
      return reader(store);
    });

    const html = renderToStaticMarkup(await ScheduleDayPage({ params: Promise.resolve({ day: "1" }) }));
    expect(html).toContain("Day 1");

    const todayDay = getScheduleDay(1, userState, store.referenceData)!;
    const blockAKey = todayDay.blocks.find((block) => block.semanticBlockKey === "block_a")!.timeSlotKey as BlockKey;
    const blockBKey = todayDay.blocks.find((block) => block.semanticBlockKey === "block_b")!.timeSlotKey as BlockKey;
    const finalReviewKey = todayDay.blocks.find((block) => block.semanticBlockKey === "final_review")!.timeSlotKey as BlockKey;
    const blockAEditor = timeEditorCapture.props.find((entry) => entry.blockKey === blockAKey);

    expect(blockAEditor).toBeDefined();
    expect(blockAEditor?.slots.find((slot) => slot.key === blockAKey)?.visible).toBe(false);
    expect(blockAEditor?.slots.find((slot) => slot.key === blockBKey)?.visible).toBe(false);
    expect(blockAEditor?.slots.find((slot) => slot.key === finalReviewKey)?.visible).toBe(false);
  });
});
