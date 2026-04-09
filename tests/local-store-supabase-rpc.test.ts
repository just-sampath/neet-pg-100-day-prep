import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import {
  createEmptyUserState,
  isSupabaseRetryableConflictError,
  persistSupabaseStoreForUser,
  readSupabaseStoreForUser,
  createRemoteUser,
} from "@/lib/data/local-store";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import type { BacklogItem, LocalStore } from "@/lib/domain/types";

const originalTransactionalRpcFlag = process.env.SUPABASE_TRANSACTIONAL_RPC;

function buildBacklogItem(id: string): BacklogItem {
  return {
    id,
    sourceItemId: id,
    originalDay: 1,
    originalBlockKey: "block_a",
    originalStart: "08:00",
    originalEnd: "10:00",
    priorityOrder: 1,
    topicDescription: "Atomic mutation test",
    subject: "Pathology",
    subjectIds: ["pathology"],
    subjectTier: "A",
    plannedMinutes: 120,
    sourceTag: "manual_skip",
    recoveryLane: "core_recovery",
    phaseFence: "same_phase_only",
    phase: 1,
    manualSortOverride: null,
    status: "pending",
    suggestedDay: null,
    suggestedBlockKey: null,
    suggestedNote: null,
    rescheduledToDay: null,
    rescheduledToBlockKey: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:01:00.000Z",
    completedAt: null,
    dismissedAt: null,
  };
}

function buildStore(backlogItems: Record<string, BacklogItem> = {}): LocalStore {
  const userId = "00000000-0000-0000-0000-000000000001";
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  userState.backlogItems = backlogItems;

  return {
    version: 2,
    users: {
      [userId]: {
        id: userId,
        email: "aspirant@beside-you.local",
        password: "beside-you-2026",
        displayName: "Aspirant",
      },
    },
    sessions: {},
    userState: {
      [userId]: userState,
    },
    referenceData: getStaticReferenceData(),
    dev: {
      simulatedNowIso: null,
    },
  };
}

function compareSupabaseValue(left: unknown, right: unknown, ascending: boolean) {
  if (left === right) {
    return 0;
  }
  const direction = ascending ? 1 : -1;
  if (left === null || left === undefined) {
    return 1 * direction;
  }
  if (right === null || right === undefined) {
    return -1 * direction;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left < right ? -1 * direction : 1 * direction;
  }
  const compared = String(left).localeCompare(String(right), undefined, { numeric: true });
  return compared * direction;
}

function createSupabaseReadQuery(rows: Array<Record<string, unknown>>) {
  let filteredRows = [...rows];

  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filteredRows = filteredRows.filter((row) => row[column] === value);
      return query;
    }),
    order: vi.fn((column: string, options?: { ascending?: boolean }) => {
      const ascending = options?.ascending ?? true;
      filteredRows = [...filteredRows].sort((left, right) => compareSupabaseValue(left[column], right[column], ascending));
      return query;
    }),
    range: vi.fn(async (from: number, to: number) => ({
      data: filteredRows.slice(from, to + 1),
      error: null,
    })),
    maybeSingle: vi.fn(async () => ({
      data: filteredRows[0] ?? null,
      error: null,
    })),
  };

  return query;
}

describe("supabase transactional mutation rpc", () => {
  beforeEach(() => {
    process.env.SUPABASE_TRANSACTIONAL_RPC = "true";
  });

  afterEach(() => {
    process.env.SUPABASE_TRANSACTIONAL_RPC = originalTransactionalRpcFlag;
    vi.restoreAllMocks();
  });

  it("persists deltas and CAS in one rpc call", async () => {
    const previousStore = buildStore();
    const nextStore = buildStore({
      "item-1": buildBacklogItem("item-1"),
    });

    const rpc = vi.fn(async () => ({
      data: [{ applied: true, state_version: 1, conflict_reason: null }],
      error: null,
    }));

    const supabase = {
      rpc,
      from: vi.fn(() => {
        throw new Error("from() should not be called when transactional rpc path is enabled");
      }),
    };

    await persistSupabaseStoreForUser(nextStore, previousStore, supabase as never, 0);

    expect(rpc).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(fnName).toBe("apply_user_state_mutation_atomic");
    expect(args.p_expected_state_version).toBe(0);
    expect(args.p_next_state_version).toBe(1);
    const deltas = args.p_deltas as Record<string, { changed: Array<Record<string, unknown>>; removed: unknown[] }>;
    expect(deltas.backlog_items.changed).toHaveLength(1);
    expect(deltas.backlog_items.removed).toHaveLength(0);
  });

  it("repairs missing parent schedule rows before sending assignment deltas", async () => {
    const previousStore = buildStore();
    const nextStore = buildStore();
    const userId = Object.keys(nextStore.userState)[0]!;

    const previousUserState = createEmptyUserState();
    previousUserState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(previousUserState);

    const nextUserState = structuredClone(previousUserState);
    const assignment = Object.values(nextUserState.schedule.topicAssignments)[0]!;
    const dayKey = String(assignment.dayNumber);
    const blockKey = `${assignment.dayNumber}:${assignment.blockKey}`;

    delete previousUserState.schedule.days[dayKey];
    delete previousUserState.schedule.blocks[blockKey];
    delete nextUserState.schedule.days[dayKey];
    delete nextUserState.schedule.blocks[blockKey];

    nextUserState.schedule.topicAssignments[assignment.sourceItemId]!.note = "trigger parent-row repair";

    previousStore.userState[userId] = previousUserState;
    nextStore.userState[userId] = nextUserState;

    const rpc = vi.fn(async () => ({
      data: [{ applied: true, state_version: 1, conflict_reason: null }],
      error: null,
    }));

    const supabase = {
      rpc,
      from: vi.fn(() => {
        throw new Error("from() should not be called when transactional rpc path is enabled");
      }),
    };

    await persistSupabaseStoreForUser(nextStore, previousStore, supabase as never, 0);

    const [, args] = rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    const deltas = args.p_deltas as Record<string, { changed: Array<Record<string, unknown>>; removed: unknown[] }>;

    expect(deltas.schedule_days?.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          day_number: assignment.dayNumber,
        }),
      ]),
    );

    expect(deltas.schedule_blocks?.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          day_number: assignment.dayNumber,
          block_key: assignment.blockKey,
        }),
      ]),
    );

    expect(deltas.schedule_topic_assignments?.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_item_id: assignment.sourceItemId,
          day_number: assignment.dayNumber,
          block_key: assignment.blockKey,
        }),
      ]),
    );
  });

  it("backfills full schedule tables when day one date exists but Supabase schedule rows are missing", async () => {
    const userId = "00000000-0000-0000-0000-000000000111";
    const readSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => {
          if (table === "app_settings") {
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    user_id: userId,
                    day_one_date: "2026-05-01",
                    theme: "dark",
                    schedule_shift_days: 0,
                    shift_applied_at: null,
                    shift_events: [],
                    schedule_seed_version: 0,
                    schedule_seeded_at: null,
                    quote_state: {},
                    processed_dates: null,
                    morning_revision_selections: null,
                    morning_revision_actual_minutes: null,
                    morning_revision_auto_add_notice: null,
                    simulated_now_iso: null,
                    state_version: 0,
                  },
                  error: null,
                })),
              })),
            };
          }

          return {
            eq: vi.fn(() => createSupabaseReadQuery([])),
          };
        }),
      })),
    };

    const nextStore = await readSupabaseStoreForUser(createRemoteUser(userId), readSupabase as never);
    const previousStore = structuredClone(nextStore);
    const assignment = Object.values(nextStore.userState[userId]!.schedule.topicAssignments)[0]!;
    nextStore.userState[userId]!.schedule.topicAssignments[assignment.sourceItemId]!.note = "day-one mutation";

    const rpc = vi.fn(async () => ({
      data: [{ applied: true, state_version: 1, conflict_reason: null }],
      error: null,
    }));

    const writeSupabase = {
      rpc,
      from: vi.fn(() => {
        throw new Error("from() should not be called when transactional rpc path is enabled");
      }),
    };

    await persistSupabaseStoreForUser(nextStore, previousStore, writeSupabase as never, 0);

    const [, args] = rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    const deltas = args.p_deltas as Record<string, { changed: Array<Record<string, unknown>>; removed: unknown[] }>;

    expect((deltas.schedule_days?.changed?.length ?? 0)).toBeGreaterThan(0);
    expect((deltas.schedule_blocks?.changed?.length ?? 0)).toBeGreaterThan(0);
    expect((deltas.schedule_topic_assignments?.changed?.length ?? 0)).toBeGreaterThan(1);
    expect(deltas.schedule_topic_assignments?.changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_item_id: assignment.sourceItemId,
          day_number: assignment.dayNumber,
          block_key: assignment.blockKey,
        }),
      ]),
    );
  });

  it("returns retryable conflict when rpc reports version mismatch", async () => {
    const previousStore = buildStore();
    const nextStore = buildStore({
      "item-2": buildBacklogItem("item-2"),
    });

    const rpc = vi.fn(async () => ({
      data: [{ applied: false, state_version: 7, conflict_reason: "version_mismatch" }],
      error: null,
    }));

    const supabase = {
      rpc,
      from: vi.fn(() => {
        throw new Error("from() should not be called when transactional rpc path is enabled");
      }),
    };

    let thrown: unknown = null;
    try {
      await persistSupabaseStoreForUser(nextStore, previousStore, supabase as never, 0);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeTruthy();
    expect(isSupabaseRetryableConflictError(thrown)).toBe(true);
  });
});
