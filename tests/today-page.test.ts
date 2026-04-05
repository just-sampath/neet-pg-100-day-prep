import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
    requireCurrentUser: vi.fn(),
}));

const localStoreMocks = vi.hoisted(() => ({
    readTodayStore: vi.fn(),
}));

vi.mock("@/lib/auth/session", async () => {
    const actual = await vi.importActual<typeof import("@/lib/auth/session")>("@/lib/auth/session");
    return {
        ...actual,
        requireCurrentUser: authMocks.requireCurrentUser,
    };
});

vi.mock("@/lib/data/local-store", async () => {
    const actual = await vi.importActual<typeof import("@/lib/data/local-store")>("@/lib/data/local-store");
    return {
        ...actual,
        readTodayStore: localStoreMocks.readTodayStore,
    };
});

vi.mock("@/lib/server/actions", () => ({
    setDayOneDateAction: async () => { },
    setThemeAction: async () => { },
    setTrafficLightAction: async () => { },
    updateBlockAction: async () => { },
    updateTopicAction: async () => { },
}));

vi.mock("@/components/app/dev-toolbar", () => ({
    DevToolbar: () => null,
}));

vi.mock("@/components/app/early-finish-suggestion", () => ({
    EarlyFinishSuggestionCard: () => null,
}));

vi.mock("@/components/app/morning-plan-panel", () => ({
    MorningPlanPanel: () => null,
}));

vi.mock("@/components/app/schedule-shift-panel", () => ({
    ScheduleShiftPanel: () => null,
}));

vi.mock("@/components/app/time-editor", () => ({
    TimeEditor: () => null,
}));

vi.mock("@/components/app/wind-down-prompts", () => ({
    WindDownPrompts: () => null,
}));

import TodayPage from "@/app/(app)/today/page";
import { completeBlockItems, getHomeData } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getCurrentDayNumber, getScheduleDay } from "@/lib/domain/schedule";
import type { BacklogItem, LocalStore, UserState } from "@/lib/domain/types";

const SIMULATED_NOW_ISO = "2026-04-10T00:01:00.000Z";
const SIMULATED_DATE = "2026-04-10";

function createStore(userState?: UserState, simulatedNowIso = SIMULATED_NOW_ISO): LocalStore {
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

function createGreenDayRecoveryStore() {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-04-03";
    userState.processedDates.midnightDates.push(SIMULATED_DATE);
    ensureUserScheduleSeeded(userState);

    const store = createStore(userState);
    const todayDayNumber = getCurrentDayNumber(userState, SIMULATED_DATE, store.referenceData);
    userState.processedDates.repackDates.push(SIMULATED_DATE);

    const todayDay = getScheduleDay(todayDayNumber, userState, store.referenceData)!;
    const recoveryBlock = todayDay.blocks.find((block) => block.semanticBlockKey === "block_a")!;
    const recoveryItem = recoveryBlock.items[0]!;
    const assignment = userState.schedule.topicAssignments[recoveryItem.itemId]!;

    assignment.isRecovery = true;
    assignment.originalDayNumber = 5;
    assignment.originalBlockKey = "11:15-14:15";
    assignment.sourceTag = "traffic_light";
    assignment.updatedAt = "2026-04-10T00:01:00.000Z";

    userState.backlogItems["recovery-item-1"] = {
        id: "recovery-item-1",
        sourceItemId: recoveryItem.itemId,
        originalDay: 5,
        originalBlockKey: "11:15-14:15",
        originalStart: "11:15",
        originalEnd: "14:15",
        priorityOrder: 1,
        topicDescription: recoveryItem.label,
        subject: "Pharmacology",
        subjectIds: ["pharmacology"],
        subjectTier: "A",
        plannedMinutes: recoveryItem.plannedMinutes,
        sourceTag: "traffic_light",
        recoveryLane: recoveryItem.recoveryLane,
        phaseFence: recoveryItem.phaseFence,
        phase: 1,
        manualSortOverride: null,
        status: "rescheduled",
        suggestedDay: null,
        suggestedBlockKey: null,
        suggestedNote: null,
        rescheduledToDay: todayDayNumber,
        rescheduledToBlockKey: recoveryBlock.timeSlotKey,
        createdAt: "2026-04-09T00:01:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        completedAt: null,
        dismissedAt: null,
    } satisfies BacklogItem;

    return {
        store,
        todayDayNumber,
        recoveryItemLabel: recoveryItem.label,
    };
}

describe("TodayPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMocks.requireCurrentUser.mockResolvedValue({ id: "local-user" });
    });

    it("renders the completion moment on Day 1 once all non-revision work is done", async () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = SIMULATED_DATE;
        userState.processedDates.repackDates.push(SIMULATED_DATE);
        ensureUserScheduleSeeded(userState);

        const store = createStore(userState);
        const dayOne = getScheduleDay(1, userState, store.referenceData)!;

        for (const block of dayOne.blocks.filter((entry) => entry.trackable && entry.semanticBlockKey !== "morning_revision")) {
            completeBlockItems(userState, 1, block.timeSlotKey, `${SIMULATED_DATE}T12:00:00.000Z`, null, store.referenceData);
        }

        const data = getHomeData(store, "local-user");
        expect(data.dayComplete).toBe(true);
        expect(data.celebrationQuote).toBeTruthy();

        localStoreMocks.readTodayStore.mockResolvedValue({
            data,
            userState: store.userState["local-user"],
            referenceData: store.referenceData,
        });

        const html = renderToStaticMarkup(await TodayPage());

        expect(html).toContain("Completion Moment");
    });

    it("renders green-day assigned recovery as ordinary topics without recovery framing", async () => {
        const { store, todayDayNumber, recoveryItemLabel } = createGreenDayRecoveryStore();
        const baseData = getHomeData(store, "local-user");
        const data = {
            ...baseData,
            backlogCount: 0,
            shiftHealth: {
                ...baseData.shiftHealth,
                missedDays: [],
            },
            shiftPreview: null,
        };

        expect(data.todayDayNumber).toBe(todayDayNumber);
        expect(data.todayState?.trafficLight).toBe("green");
        expect(data.plannedRecovery).toHaveLength(1);

        localStoreMocks.readTodayStore.mockResolvedValue({
            data,
            userState: store.userState["local-user"],
            referenceData: store.referenceData,
        });

        const html = renderToStaticMarkup(await TodayPage());

        expect(html).toContain(recoveryItemLabel);
        expect(html).not.toContain("Recovery Radar");
        expect(html).not.toContain("Recovery · Day 5");
        expect(html).not.toContain(">Rescheduled<");
    });

    it("uses non-backlog skip copy for final review actions", async () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = "2026-04-03";
        userState.processedDates.midnightDates.push("2026-04-09");
        userState.processedDates.repackDates.push(SIMULATED_DATE);
        ensureUserScheduleSeeded(userState);

        const store = createStore(userState);
        const todayDayNumber = getCurrentDayNumber(userState, SIMULATED_DATE, store.referenceData);
        const todayDay = getScheduleDay(todayDayNumber, userState, store.referenceData)!;
        const finalReviewBlock = todayDay.blocks.find((block) => block.semanticBlockKey === "final_review")!;

        for (const block of todayDay.blocks.filter((entry) => entry.trackable && entry.semanticBlockKey !== "final_review")) {
            completeBlockItems(userState, todayDayNumber, block.timeSlotKey, `${SIMULATED_DATE}T12:00:00.000Z`, null, store.referenceData);
        }

        const data = getHomeData(store, "local-user");
        localStoreMocks.readTodayStore.mockResolvedValue({
            data,
            userState: store.userState["local-user"],
            referenceData: store.referenceData,
        });

        const html = renderToStaticMarkup(await TodayPage());
        const finalReviewSkipMatches = [...html.matchAll(
            new RegExp(`name=\"blockKey\" value=\"${finalReviewBlock.timeSlotKey}\"[\\s\\S]{0,320}name=\"intent\" value=\"skip\"[\\s\\S]{0,160}`, "g"),
        )].map((match) => match[0]);
        const finalReviewBlockSkip = finalReviewSkipMatches.find((snippet) => !snippet.includes("name=\"itemId\"")) ?? "";

        expect(finalReviewBlockSkip).toContain("Skip block");
        expect(finalReviewBlockSkip).not.toContain("Move to backlog");
    });
});
