import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getScheduleListData } from "@/lib/data/app-state";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
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
    action: "insert";
    payload: unknown;
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
      insert: vi.fn(async (payload: unknown) => {
        callSink.push({
          table,
          action: "insert",
          payload,
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

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import {
  createEmptyUserState,
  createRemoteUser,
  isSupabaseRetryableConflictError,
  persistSupabaseStoreForUser,
  readScheduleBrowserStore,
  readRuntimeReferenceData,
  readSupabaseStoreForUser,
} from "@/lib/data/local-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

type ReferenceSeedTable = "subject_tiers" | "quote_catalog" | "gt_plan_items" | "revision_map_days";

function compareReferenceOrderValue(left: unknown, right: unknown) {
  if (left === right) {
    return 0;
  }

  return String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true });
}

function upsertReferenceRows(
  existingRows: Array<Record<string, unknown>>,
  incomingRows: Array<Record<string, unknown>>,
  onConflict: string,
) {
  const conflictColumns = onConflict
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const nextRows = [...existingRows];

  for (const row of incomingRows) {
    const matchIndex = nextRows.findIndex((existingRow) =>
      conflictColumns.every((column) => existingRow[column] === row[column]),
    );

    if (matchIndex >= 0) {
      nextRows[matchIndex] = { ...nextRows[matchIndex], ...row };
      continue;
    }

    nextRows.push(row);
  }

  return nextRows;
}

function createReferenceSeedClients(initialGtPlanRows: Array<Record<string, unknown>> = []) {
  const tables: Record<ReferenceSeedTable, Array<Record<string, unknown>>> = {
    subject_tiers: [],
    quote_catalog: [],
    gt_plan_items: [...initialGtPlanRows],
    revision_map_days: [],
  };

  const admin = {
    from: vi.fn((table: ReferenceSeedTable) => ({
      upsert: vi.fn(async (payload: unknown, options: { onConflict: string }) => {
        const rows = Array.isArray(payload)
          ? (payload as Array<Record<string, unknown>>)
          : [payload as Record<string, unknown>];

        if (table === "gt_plan_items" && options.onConflict === "gt_plan_ref") {
          const hasSourceDayConflict = rows.some((row) =>
            tables.gt_plan_items.some(
              (existingRow) =>
                existingRow.source_day_number === row.source_day_number &&
                existingRow.gt_plan_ref !== row.gt_plan_ref,
            ),
          );

          if (hasSourceDayConflict) {
            return {
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "gt_plan_items_source_day_number_key"',
              },
            };
          }
        }

        tables[table] = upsertReferenceRows(tables[table], rows, options.onConflict);
        return { error: null };
      }),
      insert: vi.fn(async (payload: unknown) => {
        const rows = Array.isArray(payload)
          ? (payload as Array<Record<string, unknown>>)
          : [payload as Record<string, unknown>];
        tables[table] = [...tables[table], ...rows];
        return { error: null };
      }),
      delete: vi.fn(() => ({
        neq: vi.fn(async () => {
          tables[table] = [];
          return { error: null };
        }),
      })),
    })),
  };

  const server = {
    from: vi.fn((table: ReferenceSeedTable) => ({
      select: vi.fn(() => ({
        order: vi.fn(async (column: string) => ({
          data: [...tables[table]].sort((left, right) =>
            compareReferenceOrderValue(left[column], right[column]),
          ),
          error: null,
        })),
      })),
    })),
  };

  return { admin, server };
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
    in: vi.fn((column: string, values: unknown[]) => {
      filteredRows = filteredRows.filter((row) => values.includes(row[column]));
      return query;
    }),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      if (operator === "is" && value === null) {
        filteredRows = filteredRows.filter((row) => row[column] !== null && row[column] !== undefined);
      }
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
    then: (
      onFulfilled: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve({
      data: [...filteredRows],
      error: null as null,
    }).then(onFulfilled, onRejected),
  };

  return query;
}

function createBrowserScopedReadSupabaseClient(
  userId: string,
  {
    settingsRow,
    scheduleDayRows,
    scheduleAssignmentRows,
    scheduleBlockRows,
    backlogRows,
  }: {
    settingsRow: Record<string, unknown>;
    scheduleDayRows: Array<Record<string, unknown>>;
    scheduleAssignmentRows: Array<Record<string, unknown>>;
    scheduleBlockRows: Array<Record<string, unknown>>;
    backlogRows: Array<Record<string, unknown>>;
  },
) {
  const rowsByTable: Record<string, Array<Record<string, unknown>>> = {
    app_settings: [{ ...settingsRow, user_id: userId }],
    schedule_days: scheduleDayRows,
    schedule_topic_assignments: scheduleAssignmentRows,
    schedule_blocks: scheduleBlockRows,
    backlog_items: backlogRows,
    revision_completions: [],
    subject_tiers: [],
    quote_catalog: [],
    gt_plan_items: [],
    revision_map_days: [],
  };

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: {
            id: userId,
            email: `${userId}@beside-you.local`,
            user_metadata: {},
          },
        },
        error: null,
      })),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn(() => createSupabaseReadQuery(rowsByTable[table] ?? [])),
    })),
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

  it("deletes changed+removed schedule assignment keys before insert to avoid slot collisions", async () => {
    const previousStore = buildStore();
    const nextStore = buildStore();
    const previousUserState = createEmptyUserState();
    previousUserState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(previousUserState);
    const nextUserState = structuredClone(previousUserState);

    const [changedSourceItemId, removedSourceItemId] = Object.keys(previousUserState.schedule.topicAssignments);
    expect(changedSourceItemId).toBeTruthy();
    expect(removedSourceItemId).toBeTruthy();

    const changedRow = nextUserState.schedule.topicAssignments[changedSourceItemId]!;
    changedRow.itemOrder += 1;
    delete nextUserState.schedule.topicAssignments[removedSourceItemId];

    previousStore.userState["test-user"] = previousUserState;
    nextStore.userState["test-user"] = nextUserState;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    await persistSupabaseStoreForUser(nextStore, previousStore, null as never);

    const scheduleCalls = calls.filter((call) => call.table === "schedule_topic_assignments");
    expect(scheduleCalls.map((call) => call.action)).toEqual(["delete_in", "insert"]);

    const deleteCall = scheduleCalls[0] as Extract<SupabaseCall, { action: "delete_in" }>;
    expect(deleteCall.inColumn).toBe("source_item_id");
    const deletedKeys = new Set(deleteCall.inValues as string[]);
    expect(deletedKeys.has(changedSourceItemId)).toBe(true);
    expect(deletedKeys.has(removedSourceItemId)).toBe(true);

    const insertCall = scheduleCalls[1] as Extract<SupabaseCall, { action: "insert" }>;
    const insertedRows = insertCall.payload as Array<{ source_item_id: string }>;
    expect(insertedRows.length).toBeGreaterThanOrEqual(1);
    expect(insertedRows.map((row) => row.source_item_id)).toContain(changedSourceItemId);
  });

  it("normalizes duplicate slot orders before delta sync and rewrites all colliding rows", async () => {
    const previousStore = buildStore();
    const nextStore = buildStore();
    const previousUserState = createEmptyUserState();
    previousUserState.settings.dayOneDate = "2026-05-01";
    ensureUserScheduleSeeded(previousUserState);
    const nextUserState = structuredClone(previousUserState);

    const slotGroups = new Map<string, Array<{ sourceItemId: string; itemOrder: number }>>();
    for (const row of Object.values(previousUserState.schedule.topicAssignments)) {
      const slotKey = `${row.dayNumber}:${row.blockKey}`;
      const keys = slotGroups.get(slotKey) ?? [];
      keys.push({ sourceItemId: row.sourceItemId, itemOrder: row.itemOrder });
      slotGroups.set(slotKey, keys);
    }
    const duplicateSlot = [...slotGroups.entries()]
      .map(([slotKey, rows]) => [slotKey, [...rows].sort((left, right) => left.itemOrder - right.itemOrder)] as const)
      .find(([, rows]) => rows.length >= 2 && rows[0]!.itemOrder !== rows[1]!.itemOrder);
    expect(duplicateSlot).toBeTruthy();

    const [, orderedRows] = duplicateSlot!;
    const firstSourceItemId = orderedRows[0]!.sourceItemId;
    const secondSourceItemId = orderedRows[1]!.sourceItemId;
    const firstRow = nextUserState.schedule.topicAssignments[firstSourceItemId]!;
    const secondRow = nextUserState.schedule.topicAssignments[secondSourceItemId]!;
    const simulatedNowIso = "2026-05-02T04:30:00.000Z";

    // Force a duplicate item_order for the same day/block pair.
    secondRow.itemOrder = firstRow.itemOrder;
    secondRow.updatedAt = simulatedNowIso;

    previousStore.userState["test-user"] = previousUserState;
    nextStore.userState["test-user"] = nextUserState;
    nextStore.dev.simulatedNowIso = simulatedNowIso;
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabaseClient as never);

    await persistSupabaseStoreForUser(nextStore, previousStore, null as never);

    const scheduleCalls = calls.filter((call) => call.table === "schedule_topic_assignments");
    expect(scheduleCalls.map((call) => call.action)).toEqual(["delete_in", "insert"]);

    const deleteCall = scheduleCalls[0] as Extract<SupabaseCall, { action: "delete_in" }>;
    expect((deleteCall.inValues as string[])).toContain(secondSourceItemId);

    const insertCall = scheduleCalls[1] as Extract<SupabaseCall, { action: "insert" }>;
    const insertedRows = insertCall.payload as Array<{ source_item_id: string; item_order: number }>;
    expect(insertedRows.map((row) => row.source_item_id)).toContain(secondSourceItemId);

    const finalFirst = nextStore.userState["test-user"].schedule.topicAssignments[firstSourceItemId]!;
    const finalSecond = nextStore.userState["test-user"].schedule.topicAssignments[secondSourceItemId]!;
    expect(new Set([finalFirst.itemOrder, finalSecond.itemOrder]).size).toBe(2);
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

      const emptyRows: { data: Array<Record<string, unknown>>; error: null } = { data: [], error: null };
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
              if (table === "app_settings") {
                return {
                  maybeSingle: async () => ({ data: settingsRow, error: null }),
                };
              }
              const query = {
                order: vi.fn(() => query),
                range: vi.fn(async () => emptyRows),
              };
              return query;
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

  it("paginates schedule topic assignment reads so hydration includes rows beyond 1000", async () => {
    const originalRuntime = process.env.BESIDE_YOU_RUNTIME;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      process.env.BESIDE_YOU_RUNTIME = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      const totalAssignments = 1151;
      const assignmentRows = Array.from({ length: totalAssignments }, (_, index) => ({
        source_item_id: `seed-${index + 1}`,
        day_number: 1,
        block_key: "06:30-07:45",
        item_order: index + 1,
        kind: "task",
        label: `Topic ${index + 1}`,
        raw_text: `Topic ${index + 1}`,
        planned_minutes: 30,
        subject_ids: ["general"],
        revision_eligible: false,
        recovery_lane: "none",
        phase_fence: "not_reschedulable",
        notes: null,
        revision_type: null,
        reference_label: null,
        reference_day_number: null,
        status: "pending",
        completed_at: null,
        source_tag: null,
        note: null,
        is_pinned: false,
        is_recovery: false,
        original_day_number: null,
        original_block_key: null,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      }));

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

      const emptyRows: { data: Array<Record<string, unknown>>; error: null } = { data: [], error: null };
      const pagedQuery = (rows: Array<Record<string, unknown>>) => {
        const query = {
          order: vi.fn(() => query),
          range: vi.fn(async (from: number, to: number) => ({
            data: rows.slice(from, to + 1),
            error: null,
          })),
          then: (onFulfilled: (value: typeof emptyRows) => unknown, onRejected?: (reason: unknown) => unknown) =>
            Promise.resolve({
              data: rows.slice(0, 1000),
              error: null,
            }).then(onFulfilled, onRejected),
        };
        return query;
      };

      const mockReadSupabase = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            order: vi.fn(async () => emptyRows),
            maybeSingle: vi.fn(async () => (table === "app_settings" ? { data: settingsRow, error: null } : { data: null, error: null })),
            eq: vi.fn(() => {
              if (table === "app_settings") {
                return {
                  maybeSingle: async () => ({ data: settingsRow, error: null }),
                };
              }
              if (table === "schedule_topic_assignments") {
                return pagedQuery(assignmentRows);
              }
              return pagedQuery([]);
            }),
          })),
        })),
      };

      const store = await readSupabaseStoreForUser(createRemoteUser("test-user"), mockReadSupabase as never);
      expect(Object.keys(store.userState["test-user"].schedule.topicAssignments)).toHaveLength(totalAssignments);
    } finally {
      process.env.BESIDE_YOU_RUNTIME = originalRuntime;
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
  });
});

describe("supabase browser-scoped schedule hydration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes assigned backlog rows in browser-scoped schedule completion state", async () => {
    const originalRuntime = process.env.BESIDE_YOU_RUNTIME;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const userId = "test-user";
    const dayNumber = 101;
    const blockKey = "06:30-07:45";
    const sourceItemId = "extension-block-a-item";

    const settingsRow = {
      day_one_date: null,
      theme: "dark",
      schedule_shift_days: 0,
      shift_applied_at: null,
      shift_events: [],
      schedule_seed_version: 0,
      schedule_seeded_at: null,
      quote_state: {},
      processed_dates: {
        midnightDates: [],
        lateNightSweepDates: [],
        endOfDaySweepDates: [],
        weeklySummaryDates: [],
        repackDates: [],
      },
      morning_revision_selections: null,
      morning_revision_actual_minutes: null,
      morning_revision_auto_add_notice: null,
      simulated_now_iso: "2026-05-02T06:30:00.000Z",
    };

    const scheduleDayRows = [{
      user_id: userId,
      day_number: dayNumber,
      original_day_number: null,
      phase_id: "phase_1",
      phase_name: "Phase 1",
      phase_group: "phase_1",
      primary_focus_raw: "",
      primary_focus_parts: [],
      primary_focus_subject_ids: [],
      resource_raw: "",
      resource_parts: [],
      deliverable_raw: "",
      notes_raw: null,
      source_minutes: null,
      buffer_minutes: null,
      planned_study_minutes: null,
      total_study_hours: null,
      gt_test_type: "No",
      gt_plan_ref: null,
      mapped_date: "2026-05-01",
      original_mapped_date: "2026-05-01",
      traffic_light: "green",
      traffic_light_updated_at: "2026-05-01T00:00:00.000Z",
      is_extension_day: true,
      shift_hidden_reason: null,
      merged_partner_day: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    }];

    const scheduleBlockRows = [{
      user_id: userId,
      day_number: dayNumber,
      block_key: blockKey,
      slot_order: 1,
      start_time: "06:30",
      end_time: "07:45",
      duration_minutes: 75,
      timeline_kind: "study",
      display_label: "Block A",
      semantic_block_key: "block_a",
      block_intent: "core_study",
      trackable: true,
      raw_text: "Extension block",
      recovery_lane: "core_recovery",
      phase_fence: "current_phase_preferred",
      default_revision_eligible: true,
      reschedulable: true,
      traffic_light_green: "visible",
      traffic_light_yellow: "visible",
      traffic_light_red: "visible",
      backlog_when_hidden: true,
      actual_start: null,
      actual_end: null,
      timing_note: null,
      timing_updated_at: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    }];

    const scheduleAssignmentRows = [{
      user_id: userId,
      source_item_id: sourceItemId,
      day_number: dayNumber,
      block_key: blockKey,
      item_order: 1,
      kind: "task",
      label: "Extension topic",
      raw_text: "Extension topic",
      planned_minutes: 60,
      subject_ids: ["general"],
      revision_eligible: false,
      recovery_lane: "core_recovery",
      phase_fence: "current_phase_preferred",
      notes: null,
      revision_type: null,
      reference_label: null,
      reference_day_number: null,
      status: "completed",
      completed_at: "2026-05-01T07:40:00.000Z",
      source_tag: null,
      note: null,
      is_pinned: false,
      is_recovery: false,
      original_day_number: null,
      original_block_key: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    }];

    const assignedBacklogRow = {
      id: "assigned-recovery-101",
      user_id: userId,
      source_item_id: "assigned-recovery-101",
      original_day: dayNumber,
      original_block_key: blockKey,
      original_start: null,
      original_end: null,
      priority_order: 1,
      topic_description: "Assigned recovery",
      subject: "General",
      subject_ids: [],
      subject_tier: null,
      planned_minutes: 30,
      source_tag: "traffic_light",
      recovery_lane: "core_recovery",
      phase_fence: "current_phase_preferred",
      phase: 1,
      manual_sort_override: null,
      status: "rescheduled",
      suggested_day: null,
      suggested_block_key: null,
      suggested_note: null,
      rescheduled_to_day: dayNumber,
      rescheduled_to_block_key: blockKey,
      created_at: "2026-05-01T07:45:00.000Z",
      updated_at: "2026-05-01T07:45:00.000Z",
      completed_at: null,
      dismissed_at: null,
    };

    try {
      process.env.BESIDE_YOU_RUNTIME = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      const withoutAssignedRecovery = createBrowserScopedReadSupabaseClient(userId, {
        settingsRow,
        scheduleDayRows,
        scheduleAssignmentRows,
        scheduleBlockRows,
        backlogRows: [],
      });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(withoutAssignedRecovery as never);

      const baselineRows = await readScheduleBrowserStore((store) => getScheduleListData(store, userId));
      expect(baselineRows.find((row) => row.runtimeDayNumber === dayNumber)?.status).toBe("completed");

      const withAssignedRecovery = createBrowserScopedReadSupabaseClient(userId, {
        settingsRow,
        scheduleDayRows,
        scheduleAssignmentRows,
        scheduleBlockRows,
        backlogRows: [assignedBacklogRow],
      });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(withAssignedRecovery as never);

      const withAssigned = await readScheduleBrowserStore((store) => {
        const rows = getScheduleListData(store, userId);
        const backlogItems = Object.values(store.userState[userId]?.backlogItems ?? {});
        return {
          dayStatus: rows.find((row) => row.runtimeDayNumber === dayNumber)?.status ?? null,
          backlogCount: backlogItems.length,
          backlogStatus: backlogItems[0]?.status ?? null,
        };
      });
      expect(withAssigned.backlogCount).toBe(1);
      expect(withAssigned.backlogStatus).toBe("rescheduled");
      expect(withAssigned.dayStatus).toBe("missed");

      const withCompletedAssignedRecovery = createBrowserScopedReadSupabaseClient(userId, {
        settingsRow,
        scheduleDayRows,
        scheduleAssignmentRows,
        scheduleBlockRows,
        backlogRows: [{
          ...assignedBacklogRow,
          status: "completed",
          completed_at: "2026-05-01T07:50:00.000Z",
          updated_at: "2026-05-01T07:50:00.000Z",
        }],
      });
      vi.mocked(createSupabaseServerClient).mockResolvedValue(withCompletedAssignedRecovery as never);

      const completedAssignedRows = await readScheduleBrowserStore((store) => getScheduleListData(store, userId));
      expect(completedAssignedRows.find((row) => row.runtimeDayNumber === dayNumber)?.status).toBe("completed");
    } finally {
      process.env.BESIDE_YOU_RUNTIME = originalRuntime;
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
  });
});

describe("supabase reference seeding", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs admin fetch failures as a concise message while falling back to static reference data", async () => {
    const originalRuntime = process.env.BESIDE_YOU_RUNTIME;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    try {
      process.env.BESIDE_YOU_RUNTIME = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      const admin = {
        from: vi.fn(() => ({
          upsert: vi.fn(async () => {
            throw new TypeError("fetch failed");
          }),
          insert: vi.fn(async () => ({ error: null })),
          delete: vi.fn(() => ({
            neq: vi.fn(async () => ({ error: null })),
          })),
        })),
      };

      const { server } = createReferenceSeedClients();

      vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);
      vi.mocked(createSupabaseServerClient).mockResolvedValue(server as never);

      const runtimeReferenceData = await readRuntimeReferenceData();

      expect(runtimeReferenceData).toEqual(getStaticReferenceData());
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        "Supabase admin reference seed skipped: reference seed: fetch failed",
      );
    } finally {
      warnSpy.mockRestore();
      process.env.BESIDE_YOU_RUNTIME = originalRuntime;
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
  });

  it("repairs stale gt plan refs when source-day uniqueness blocks reseeding", async () => {
    const originalRuntime = process.env.BESIDE_YOU_RUNTIME;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    try {
      process.env.BESIDE_YOU_RUNTIME = "supabase";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

      const staticReferenceData = getStaticReferenceData();
      const gt8 = staticReferenceData.scheduleData.gtTestPlan.tests.find((entry) => entry.gtPlanRef === "gt_8");
      expect(gt8).toBeTruthy();

      const { admin, server } = createReferenceSeedClients([
        {
          gt_plan_ref: "legacy_gt_8",
          source_day_number: gt8!.dayNumber,
          test_type: gt8!.testType,
          purpose_raw: gt8!.purposeRaw,
          what_to_measure_raw: gt8!.whatToMeasureRaw,
          what_to_measure_items: gt8!.whatToMeasureItems,
          must_output_raw: gt8!.mustOutputRaw,
          must_output_items: gt8!.mustOutputItems,
          resource_raw: gt8!.resourceRaw,
          review_raw: gt8!.reviewRaw,
          wrap_up_raw: gt8!.wrapUpRaw,
          notes_raw: gt8!.notesRaw,
          seed_version: 0,
        },
      ]);

      vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);
      vi.mocked(createSupabaseServerClient).mockResolvedValue(server as never);

      const runtimeReferenceData = await readRuntimeReferenceData();

      expect(warnSpy).not.toHaveBeenCalled();
      expect(runtimeReferenceData.scheduleData.gtTestPlan.tests).toEqual(
        staticReferenceData.scheduleData.gtTestPlan.tests,
      );
    } finally {
      warnSpy.mockRestore();
      process.env.BESIDE_YOU_RUNTIME = originalRuntime;
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    }
  });
});
