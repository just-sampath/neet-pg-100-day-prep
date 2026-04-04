import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";
import type { BacklogItem, LocalStore, RevisionCompletion, RevisionType } from "@/lib/domain/types";

type SupabaseCall =
  | {
    table: string;
    action: "upsert";
    payload: unknown;
    options: unknown;
  }
  | {
    table: string;
    action: "update";
    payload: unknown;
    filters: Array<{ column: string; value: unknown }>;
  }
  | {
    table: string;
    action: "delete_in";
    column: string;
    value: unknown;
    inColumn: string;
    inValues: unknown[];
  };

const calls: SupabaseCall[] = [];
const originalTransactionalRpcFlag = process.env.SUPABASE_TRANSACTIONAL_RPC;

function createMockSupabaseClient(callSink: SupabaseCall[]) {
  const matchesCasExpectedVersion = (filters: Array<{ column: string; value: unknown }>) => {
    const stateVersionFilter = filters.find((entry) => entry.column === "state_version");
    return stateVersionFilter?.value === 0;
  };

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => {
            if (table === "app_settings") {
              return { data: { state_version: 0 }, error: null };
            }
            return { data: null, error: null };
          }),
        })),
        maybeSingle: vi.fn(async () => {
          if (table === "app_settings") {
            return { data: { state_version: 0 }, error: null };
          }
          return { data: null, error: null };
        }),
      })),
      upsert: vi.fn(async (payload: unknown, options: unknown) => {
        callSink.push({
          table,
          action: "upsert",
          payload,
          options,
        });
        return { error: null };
      }),
      update: vi.fn((payload: unknown) => {
        const filters: Array<{ column: string; value: unknown }> = [];
        let orFilter = "";
        const chain = {
          eq: vi.fn((column: string, value: unknown) => {
            filters.push({ column, value });
            return chain;
          }),
          is: vi.fn((column: string, value: unknown) => {
            filters.push({ column, value });
            return chain;
          }),
          or: vi.fn((value: string) => {
            orFilter = value;
            void orFilter;
            return chain;
          }),
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              callSink.push({
                table,
                action: "update",
                payload,
                filters,
              });
              if (table !== "app_settings" || !matchesCasExpectedVersion(filters)) {
                return { data: null, error: null };
              }
              const stateVersion = (payload as { state_version?: unknown }).state_version;
              return {
                data: {
                  state_version: typeof stateVersion === "number" ? stateVersion : 0,
                },
                error: null,
              };
            }),
          })),
        };
        return chain;
      }),
      delete: vi.fn(() => ({
        eq: vi.fn((column: string, value: unknown) => {
          const filters: Array<{ column: string; value: unknown }> = [{ column, value }];
          const eq = vi.fn((nextColumn: string, nextValue: unknown) => {
            filters.push({ column: nextColumn, value: nextValue });
            return { eq, in: inFn };
          });
          const inFn = vi.fn(async (inColumn: string, inValues: unknown[]) => {
            const userIdFilter = filters.find((entry) => entry.column === "user_id");
            callSink.push({
              table,
              action: "delete_in",
              column: userIdFilter?.column ?? column,
              value: userIdFilter?.value ?? value,
              inColumn,
              inValues,
            });
            return { error: null };
          });
          return { eq, in: inFn };
        }),
      })),
    })),
  };
}

const mockSupabaseClient = createMockSupabaseClient(calls);

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import {
  createEmptyUserState,
  createRemoteUser,
  isSupabaseRetryableConflictError,
  persistSupabaseStoreForUser,
  readSupabaseStoreForUser,
} from "@/lib/data/local-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function buildRevisionCompletion(sourceItemId: string, revisionType: RevisionType): RevisionCompletion {
  return {
    revisionId: `${sourceItemId}:${revisionType}`,
    sourceItemId,
    sourceDay: 1,
    sourceBlockKey: "block_a",
    revisionType,
    completedAt: "2026-05-01T12:00:00.000Z",
  };
}

function buildBacklogItem(id: string): BacklogItem {
  return {
    id,
    sourceItemId: id,
    originalDay: 1,
    originalBlockKey: "block_a",
    originalStart: "08:00",
    originalEnd: "10:00",
    priorityOrder: 1,
    topicDescription: "Test backlog item",
    subject: "Pathology",
    subjectIds: ["pathology"],
    subjectTier: "A",
    plannedMinutes: 120,
    sourceTag: "missed",
    recoveryLane: "core_recovery",
    phaseFence: "same_phase_only",
    phase: 1,
    manualSortOverride: 2,
    status: "pending",
    suggestedDay: 2,
    suggestedBlockKey: "block_b",
    suggestedNote: "Focus on recall",
    rescheduledToDay: null,
    rescheduledToBlockKey: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:01:00.000Z",
    completedAt: null,
    dismissedAt: null,
  };
}

function buildStore(
  {
    revisionCompletions = {},
    backlogItems = {},
  }: {
    revisionCompletions?: Record<string, RevisionCompletion>;
    backlogItems?: Record<string, BacklogItem>;
  } = {},
): LocalStore {
  const userId = "test-user";
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  userState.revisionCompletions = revisionCompletions;
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

describe("supabase revision completion sync", () => {
  afterEach(() => {
    process.env.SUPABASE_TRANSACTIONAL_RPC = originalTransactionalRpcFlag;
    calls.length = 0;
    vi.clearAllMocks();
  });

  beforeEach(() => {
    process.env.SUPABASE_TRANSACTIONAL_RPC = "false";
  });

  it("removes only deleted revision checkpoints without rewriting unchanged rows", async () => {
    const sourceItemId = "d001-0800-001";
    const keep = buildRevisionCompletion(sourceItemId, "D+1");
    const removed = buildRevisionCompletion(sourceItemId, "D+3");

    const previousStore = buildStore({
      revisionCompletions: {
        [keep.revisionId]: keep,
        [removed.revisionId]: removed,
      },
    });
    const nextStore = buildStore({
      revisionCompletions: {
        [keep.revisionId]: keep,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    await persistSupabaseStoreForUser(nextStore, previousStore, null as never);

    const revisionDeleteCalls = calls.filter((call) => call.table === "revision_completions" && call.action === "delete_in");
    expect(revisionDeleteCalls).toHaveLength(1);
    expect(revisionDeleteCalls[0]).toMatchObject({
      table: "revision_completions",
      action: "delete_in",
      column: "user_id",
      value: "test-user",
      inColumn: "revision_id",
      inValues: [removed.revisionId],
    });

    const revisionUpserts = calls.filter((call) => call.table === "revision_completions" && call.action === "upsert");
    expect(revisionUpserts).toHaveLength(0);
  });

  it("does not delete or upsert revision rows when nothing changed", async () => {
    const sourceItemId = "d001-0800-001";
    const existing = buildRevisionCompletion(sourceItemId, "D+1");

    const previousStore = buildStore({
      revisionCompletions: {
        [existing.revisionId]: existing,
      },
    });
    const nextStore = buildStore({
      revisionCompletions: {
        [existing.revisionId]: existing,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    await persistSupabaseStoreForUser(nextStore, previousStore, null as never);

    const revisionCalls = calls.filter((call) => call.table === "revision_completions");
    expect(revisionCalls).toHaveLength(0);
  });

  it("returns a retryable conflict when expected state_version is stale", async () => {
    const previousStore = buildStore();
    const nextStore = buildStore();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    let thrown: unknown = null;
    try {
      await persistSupabaseStoreForUser(nextStore, previousStore, null as never, 1);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeTruthy();
    expect(isSupabaseRetryableConflictError(thrown)).toBe(true);
    const nonSettingsWrites = calls.filter((call) => call.table !== "app_settings");
    expect(nonSettingsWrites).toHaveLength(0);
  });
});

describe("supabase backlog persistence", () => {
  afterEach(() => {
    process.env.SUPABASE_TRANSACTIONAL_RPC = originalTransactionalRpcFlag;
    calls.length = 0;
    vi.clearAllMocks();
  });

  beforeEach(() => {
    process.env.SUPABASE_TRANSACTIONAL_RPC = "false";
  });

  it("upserts backlog rows with the evolved schema columns", async () => {
    const backlogItem = buildBacklogItem("d001-0800-001");
    const previousStore = buildStore();
    const nextStore = buildStore({
      backlogItems: {
        [backlogItem.id]: backlogItem,
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    await persistSupabaseStoreForUser(nextStore, previousStore, null as never);

    const backlogUpsert = calls.find((call) => call.table === "backlog_items" && call.action === "upsert");
    expect(backlogUpsert).toBeDefined();
    const payload = (backlogUpsert as Extract<SupabaseCall, { action: "upsert" }>).payload as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(1);

    expect(payload[0]).toMatchObject({
      id: backlogItem.id,
      user_id: "test-user",
      source_item_id: backlogItem.sourceItemId,
      original_day: backlogItem.originalDay,
      original_block_key: backlogItem.originalBlockKey,
      subject_ids: backlogItem.subjectIds,
      subject_tier: backlogItem.subjectTier,
      planned_minutes: backlogItem.plannedMinutes,
      source_tag: backlogItem.sourceTag,
      recovery_lane: backlogItem.recoveryLane,
      phase_fence: backlogItem.phaseFence,
      phase: backlogItem.phase,
      manual_sort_override: backlogItem.manualSortOverride,
      updated_at: backlogItem.updatedAt,
    });
  });

  it("uses the injected Supabase client for per-user automation persistence", async () => {
    const injectedCalls: SupabaseCall[] = [];
    const injectedSupabaseClient = createMockSupabaseClient(injectedCalls);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    const previousStore = buildStore();
    const nextStore = buildStore();
    await persistSupabaseStoreForUser(nextStore, previousStore, injectedSupabaseClient as never);

    expect(injectedCalls.some((call) => call.table === "app_settings" && call.action === "update")).toBe(true);
    expect(calls).toHaveLength(0);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("hydrates supabase user state without quote-pool runtime errors when settings row exists", async () => {
    const originalRuntime = process.env.BESIDE_YOU_RUNTIME;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    try {
      process.env.BESIDE_YOU_RUNTIME = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      const emptyRows = { data: [], error: null };
      const settingsRow = {
        day_one_date: null,
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
      };

      const mockReadSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            order: vi.fn(async () => emptyRows),
            maybeSingle: vi.fn(async () => (table === "app_settings" ? { data: settingsRow, error: null } : { data: null, error: null })),
            eq: vi.fn(() => {
              const result = Promise.resolve(emptyRows) as Promise<typeof emptyRows> & {
                maybeSingle: () => Promise<{ data: typeof settingsRow | null; error: null }>;
              };
              result.maybeSingle = async () => (table === "app_settings" ? { data: settingsRow, error: null } : { data: null, error: null });
              return result;
            }),
          })),
        })),
      };

      await expect(readSupabaseStoreForUser(createRemoteUser("test-user"), mockReadSupabase as never)).resolves.toBeDefined();
    } finally {
      process.env.BESIDE_YOU_RUNTIME = originalRuntime;
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
  });
});
