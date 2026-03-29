import { describe, expect, it } from "vitest";

import { completeBlockItems, getRevisionQueuePageData } from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { buildRevisionInventory, getScheduleDay } from "@/lib/domain/schedule";
import type { BlockKey, LocalStore, UserState } from "@/lib/domain/types";
import { addDaysToDateOnly } from "@/lib/utils/date";

function createStore(userState?: UserState, simulatedNowIso = "2026-05-02T06:30:00.000Z"): LocalStore {
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
        dev: {
            simulatedNowIso,
        },
    };
}

function getBlockKey(dayNumber: number, semanticBlockKey: string): BlockKey {
    return getScheduleDay(dayNumber)!.blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!.timeSlotKey;
}

describe("revision item accuracy", () => {
    it("generates exactly 5 revision items per completed source item", () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = "2026-05-01";

        completeBlockItems(userState, 1, getBlockKey(1, "block_a"), "2026-05-01T10:00:00.000Z");

        const inventory = buildRevisionInventory(userState, userState.settings);

        const sourceItemIds = [...new Set(inventory.map((item) => item.sourceItemId))];
        expect(sourceItemIds.length).toBe(2);

        for (const sourceItemId of sourceItemIds) {
            const items = inventory.filter((item) => item.sourceItemId === sourceItemId);
            expect(items).toHaveLength(5);
            expect(items.map((i) => i.revisionType).sort()).toEqual(["D+1", "D+14", "D+28", "D+3", "D+7"]);
        }
    });

    it("produces revision items on consecutive days when completing on consecutive days", () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = "2026-05-01";

        for (let dayNum = 1; dayNum <= 5; dayNum++) {
            const completionDate = addDaysToDateOnly("2026-05-01", dayNum - 1);
            const completionIso = `${completionDate}T10:00:00.000Z`;
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_a"), completionIso);
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_b"), completionIso);
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_c"), completionIso);
        }

        const inventory = buildRevisionInventory(userState, userState.settings);
        const datesWithItems = new Set(inventory.map((i) => i.scheduledDate));

        expect(datesWithItems.has("2026-05-02")).toBe(true);
        expect(datesWithItems.has("2026-05-03")).toBe(true);
        expect(datesWithItems.has("2026-05-04")).toBe(true);
        expect(datesWithItems.has("2026-05-08")).toBe(true);
    });

    it("clusters all intervals on 5 dates when blocks are burst-completed on the same day", () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = "2026-05-01";

        const burstDate = "2026-05-05T10:00:00.000Z";
        for (let dayNum = 1; dayNum <= 5; dayNum++) {
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_a"), burstDate);
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_b"), burstDate);
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_c"), burstDate);
        }

        const inventory = buildRevisionInventory(userState, userState.settings);
        const uniqueDates = new Set(inventory.map((i) => i.scheduledDate));

        expect(uniqueDates.size).toBe(5);
        expect(uniqueDates.has("2026-05-06")).toBe(true);
        expect(uniqueDates.has("2026-05-08")).toBe(true);
        expect(uniqueDates.has("2026-05-12")).toBe(true);
        expect(uniqueDates.has("2026-05-19")).toBe(true);
        expect(uniqueDates.has("2026-06-02")).toBe(true);
    });

    it("re-selects morning queue when stored selection becomes stale", () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = "2026-05-01";

        completeBlockItems(userState, 1, getBlockKey(1, "block_a"), "2026-05-01T10:00:00.000Z");
        completeBlockItems(userState, 1, getBlockKey(1, "block_b"), "2026-05-01T10:00:00.000Z");
        completeBlockItems(userState, 1, getBlockKey(1, "block_c"), "2026-05-01T10:00:00.000Z");

        // Inject stale IDs that don't match any current candidates
        userState.morningRevisionSelections["2026-05-02"] = ["fake-id-1", "fake-id-2"];

        const store = createStore(userState, "2026-05-02T06:30:00.000Z");
        const data = getRevisionQueuePageData(store, "local-user");
        const queueSessions = data.revisionPlan?.queueSessions ?? [];

        // Must re-select rather than showing an empty queue
        expect(queueSessions.length).toBeGreaterThan(0);
        expect(data.revision.dueTodayCount).toBeGreaterThan(0);
    });

    it("covers every date in the D+14 to D+28 window when enough days are completed", () => {
        const userState = createEmptyUserState();
        userState.settings.dayOneDate = "2026-05-01";

        // Complete 15 consecutive days so D+14 and D+28 overlap
        for (let dayNum = 1; dayNum <= 15; dayNum++) {
            const completionDate = addDaysToDateOnly("2026-05-01", dayNum - 1);
            const completionIso = `${completionDate}T10:00:00.000Z`;
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_a"), completionIso);
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_b"), completionIso);
            completeBlockItems(userState, dayNum, getBlockKey(dayNum, "block_c"), completionIso);
        }

        const inventory = buildRevisionInventory(userState, userState.settings);

        // With 15 consecutive completion days, the D+14 range (May 15 - May 29)
        // and D+28 range (May 29 - Jun 12) should fill the gap.
        // Check the window from May 2 (first D+1) through Jun 12 (last D+28).
        for (let d = 0; d < 42; d++) {
            const date = addDaysToDateOnly("2026-05-02", d);
            const itemsOnDate = inventory.filter((i) => i.scheduledDate === date);
            // Every date in the first 42 days should have at least 1 item
            expect(itemsOnDate.length, `Expected items on ${date}`).toBeGreaterThan(0);
        }
    });
});
