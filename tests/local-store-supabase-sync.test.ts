import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalStore, RevisionCompletion, RevisionType } from "@/lib/domain/types";

type SupabaseCall =
  | {
    table: string;
    action: "upsert";
    payload: unknown;
    options: unknown;
  }
  | {
    table: string;
    action: "delete";
    column: string;
    value: unknown;
  };

const calls: SupabaseCall[] = [];

const mockSupabaseClient = {
  from: vi.fn((table: string) => ({
    upsert: vi.fn(async (payload: unknown, options: unknown) => {
      calls.push({
        table,
        action: "upsert",
        payload,
        options,
      });
      return { error: null };
    }),
    delete: vi.fn(() => ({
      eq: vi.fn(async (column: string, value: unknown) => {
        calls.push({
          table,
          action: "delete",
          column,
          value,
        });
        return { error: null };
      }),
    })),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => mockSupabaseClient),
}));

import { createEmptyUserState, persistSupabaseStoreForUser } from "@/lib/data/local-store";

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

function buildStore(revisionCompletions: Record<string, RevisionCompletion>): LocalStore {
  const userId = "test-user";
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  userState.revisionCompletions = revisionCompletions;

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
    dev: {
      simulatedNowIso: null,
    },
  };
}

describe("supabase revision completion sync", () => {
  afterEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("replaces revision rows so removed checkpoints do not persist as stale completions", async () => {
    const sourceItemId = "d001-0800-001";
    const keep = buildRevisionCompletion(sourceItemId, "D+1");
    const removed = buildRevisionCompletion(sourceItemId, "D+3");

    const previousStore = buildStore({
      [keep.revisionId]: keep,
      [removed.revisionId]: removed,
    });
    const nextStore = buildStore({
      [keep.revisionId]: keep,
    });

    await persistSupabaseStoreForUser(nextStore, previousStore, null as never);

    const revisionDeleteCalls = calls.filter((call) => call.table === "revision_completions" && call.action === "delete");
    expect(revisionDeleteCalls).toHaveLength(1);
    expect(revisionDeleteCalls[0]).toMatchObject({
      table: "revision_completions",
      action: "delete",
      column: "user_id",
      value: "test-user",
    });

    const revisionUpserts = calls.filter((call) => call.table === "revision_completions" && call.action === "upsert");
    expect(revisionUpserts).toHaveLength(1);
    const payload = revisionUpserts[0]!.payload;
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toMatchObject([
      {
        user_id: "test-user",
        revision_id: keep.revisionId,
        source_item_id: sourceItemId,
        revision_type: "D+1",
      },
    ]);
  });
});
