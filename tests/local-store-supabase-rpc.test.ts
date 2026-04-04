import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import {
  createEmptyUserState,
  isSupabaseRetryableConflictError,
  persistSupabaseStoreForUser,
} from "@/lib/data/local-store";
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
