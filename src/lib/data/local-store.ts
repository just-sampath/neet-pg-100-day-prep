import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { DEFAULT_LOCAL_USER } from "@/lib/domain/constants";
import type {
  AppSettings,
  BacklogItem,
  BlockProgress,
  GtLog,
  LocalSession,
  LocalStore,
  LocalUser,
  McqBulkLog,
  McqItemLog,
  RevisionCompletion,
  RevisionSourceBlockKey,
  UserState,
  WeeklySummary,
} from "@/lib/domain/types";
import { createRevisionId } from "@/lib/domain/schedule";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const dataDir = resolve(process.cwd(), ".data");
const storePath = resolve(dataDir, "local-store.json");

function emptySettings(): AppSettings {
  return {
    dayOneDate: null,
    theme: "dark",
    scheduleShiftDays: 0,
    shiftAppliedAt: null,
  };
}

function emptyProcessedDates(): UserState["processedDates"] {
  return {
    lateNightSweepDates: [],
    midnightDates: [],
    weeklySummaryDates: [],
  };
}

export function createEmptyUserState(): UserState {
  return {
    settings: emptySettings(),
    dayStates: {},
    blockProgress: {},
    revisionCompletions: {},
    backlogItems: {},
    mcqBulkLogs: {},
    mcqItemLogs: {},
    gtLogs: {},
    weeklySummaries: {},
    processedDates: emptyProcessedDates(),
  };
}

function createDefaultUser(): LocalUser {
  return {
    id: "local-user",
    email: process.env.BESIDE_YOU_LOCAL_EMAIL || DEFAULT_LOCAL_USER.email,
    password: process.env.BESIDE_YOU_LOCAL_PASSWORD || DEFAULT_LOCAL_USER.password,
    displayName: process.env.BESIDE_YOU_LOCAL_NAME || DEFAULT_LOCAL_USER.displayName,
  };
}

function createDefaultStore(): LocalStore {
  const user = createDefaultUser();
  return {
    version: 1,
    users: {
      [user.id]: user,
    },
    sessions: {},
    userState: {
      [user.id]: createEmptyUserState(),
    },
    dev: {
      simulatedNowIso: null,
    },
  };
}

async function ensureStoreFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(storePath, "utf8");
  } catch {
    const store = createDefaultStore();
    await writeFile(storePath, JSON.stringify(store, null, 2));
  }
}

function ensureDefaultLocalUser(parsed: LocalStore) {
  const defaultUser = createDefaultUser();
  if (!parsed.users[defaultUser.id]) {
    parsed.users[defaultUser.id] = defaultUser;
  }
  if (!parsed.userState[defaultUser.id]) {
    parsed.userState[defaultUser.id] = createEmptyUserState();
  }
  parsed.userState[defaultUser.id] = normalizeUserState(parsed.userState[defaultUser.id]);
}

async function readLocalStore(): Promise<LocalStore> {
  await ensureStoreFile();
  const raw = await readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as LocalStore;
  ensureDefaultLocalUser(parsed);
  for (const userId of Object.keys(parsed.userState)) {
    parsed.userState[userId] = normalizeUserState(parsed.userState[userId]);
  }
  return parsed;
}

async function writeLocalStore(store: LocalStore) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

function createSessionScopedStore(user: LocalUser): LocalStore {
  return {
    version: 1,
    users: {
      [user.id]: user,
    },
    sessions: {},
    userState: {
      [user.id]: createEmptyUserState(),
    },
    dev: {
      simulatedNowIso: null,
    },
  };
}

export function createRemoteUser(userId: string, overrides?: Partial<Pick<LocalUser, "email" | "displayName">>): LocalUser {
  return {
    id: userId,
    email: overrides?.email ?? "",
    password: "",
    displayName: overrides?.displayName ?? "Aspirant",
  };
}

function asSupabaseUser(user: User): LocalUser {
  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : user.email?.split("@")[0] || "Aspirant";

  return {
    id: user.id,
    email: user.email || "",
    password: "",
    displayName,
  };
}

function normalizeProcessedDates(
  value: unknown,
): UserState["processedDates"] {
  if (!value || typeof value !== "object") {
    return emptyProcessedDates();
  }

  const candidate = value as Partial<UserState["processedDates"]>;
  return {
    lateNightSweepDates: Array.isArray(candidate.lateNightSweepDates) ? candidate.lateNightSweepDates : [],
    midnightDates: Array.isArray(candidate.midnightDates) ? candidate.midnightDates : [],
    weeklySummaryDates: Array.isArray(candidate.weeklySummaryDates) ? candidate.weeklySummaryDates : [],
  };
}

function normalizeRevisionCompletions(
  value: UserState["revisionCompletions"] | undefined,
): UserState["revisionCompletions"] {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    Object.values(value).map((entry) => {
      const sourceDay = Number(entry.sourceDay);
      const sourceBlockKey = ((entry as RevisionCompletion & { sourceBlockKey?: RevisionSourceBlockKey }).sourceBlockKey ??
        "block_a") as RevisionSourceBlockKey;
      const revisionType = entry.revisionType;
      const revisionId =
        (entry as RevisionCompletion & { revisionId?: string }).revisionId ??
        createRevisionId(sourceDay, sourceBlockKey, revisionType);

      return [
        revisionId,
        {
          revisionId,
          sourceDay,
          sourceBlockKey,
          revisionType,
          completedAt: entry.completedAt,
        } satisfies RevisionCompletion,
      ];
    }),
  );
}

function normalizeUserState(userState: UserState | undefined): UserState {
  const base = userState ?? createEmptyUserState();
  return {
    ...base,
    revisionCompletions: normalizeRevisionCompletions(base.revisionCompletions),
    processedDates: normalizeProcessedDates(base.processedDates),
  };
}

async function requireSupabaseRequestUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase runtime is active, but the public Supabase env vars are missing.");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Unable to read the Supabase session: ${error.message}`);
  }

  if (!user) {
    throw new Error("A signed-in user is required to read persisted app state.");
  }

  return { supabase, user };
}

async function hydrateSupabaseStore(user: LocalUser, supabase: SupabaseClient): Promise<LocalStore> {
  const scopedUser = user;
  const store = createSessionScopedStore(scopedUser);
  const userState = store.userState[scopedUser.id];

  const [
    settingsResult,
    dayStatesResult,
    blockProgressResult,
    revisionCompletionsResult,
    backlogItemsResult,
    mcqBulkLogsResult,
    mcqItemLogsResult,
    gtLogsResult,
    weeklySummariesResult,
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("user_id", scopedUser.id).maybeSingle(),
    supabase.from("day_states").select("*").eq("user_id", scopedUser.id),
    supabase.from("block_progress").select("*").eq("user_id", scopedUser.id),
    supabase.from("revision_completions").select("*").eq("user_id", scopedUser.id),
    supabase.from("backlog_items").select("*").eq("user_id", scopedUser.id),
    supabase.from("mcq_bulk_logs").select("*").eq("user_id", scopedUser.id),
    supabase.from("mcq_item_logs").select("*").eq("user_id", scopedUser.id),
    supabase.from("gt_logs").select("*").eq("user_id", scopedUser.id),
    supabase.from("weekly_summaries").select("*").eq("user_id", scopedUser.id),
  ]);

  const errors = [
    settingsResult.error,
    dayStatesResult.error,
    blockProgressResult.error,
    revisionCompletionsResult.error,
    backlogItemsResult.error,
    mcqBulkLogsResult.error,
    mcqItemLogsResult.error,
    gtLogsResult.error,
    weeklySummariesResult.error,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.message).join(" | "));
  }

  const settingsRow = settingsResult.data;
  if (settingsRow) {
    userState.settings = {
      dayOneDate: settingsRow.day_one_date,
      theme: settingsRow.theme ?? "dark",
      scheduleShiftDays: settingsRow.schedule_shift_days ?? 0,
      shiftAppliedAt: settingsRow.shift_applied_at,
    };
    userState.processedDates = normalizeProcessedDates(settingsRow.processed_dates);
    store.dev.simulatedNowIso = settingsRow.simulated_now_iso ?? null;
  }

  for (const row of dayStatesResult.data ?? []) {
    userState.dayStates[String(row.day_number)] = {
      dayNumber: row.day_number,
      trafficLight: row.traffic_light,
      updatedAt: row.updated_at,
    };
  }

  for (const row of blockProgressResult.data ?? []) {
    const progress: BlockProgress = {
      dayNumber: row.day_number,
      blockKey: row.block_key,
      status: row.status,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      completedAt: row.completed_at,
      sourceTag: row.source_tag,
      note: row.note,
    };
    userState.blockProgress[`${row.day_number}:${row.block_key}`] = progress;
  }

  for (const row of revisionCompletionsResult.data ?? []) {
    const completion: RevisionCompletion = {
      revisionId: row.revision_id ?? `${row.source_day}:${row.source_block_key ?? "block_a"}:${row.revision_type}`,
      sourceDay: row.source_day,
      sourceBlockKey: row.source_block_key ?? "block_a",
      revisionType: row.revision_type,
      completedAt: row.completed_at,
    };
    userState.revisionCompletions[completion.revisionId] = completion;
  }

  for (const row of backlogItemsResult.data ?? []) {
    const item: BacklogItem = {
      id: row.id,
      originalDay: row.original_day,
      originalBlockKey: row.original_block_key,
      topicDescription: row.topic_description,
      subject: row.subject,
      sourceTag: row.source_tag,
      status: row.status,
      suggestedDay: row.suggested_day,
      suggestedBlockKey: row.suggested_block_key,
      suggestedNote: row.suggested_note,
      rescheduledToDay: row.rescheduled_to_day,
      rescheduledToBlockKey: row.rescheduled_to_block_key,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      dismissedAt: row.dismissed_at,
    };
    userState.backlogItems[item.id] = item;
  }

  for (const row of mcqBulkLogsResult.data ?? []) {
    const log: McqBulkLog = {
      id: row.id,
      entryDate: row.entry_date,
      totalAttempted: row.total_attempted,
      correct: row.correct,
      wrong: row.wrong,
      subject: row.subject,
      source: row.source,
      createdAt: row.created_at,
    };
    userState.mcqBulkLogs[log.id] = log;
  }

  for (const row of mcqItemLogsResult.data ?? []) {
    const log: McqItemLog = {
      id: row.id,
      entryDate: row.entry_date,
      mcqId: row.mcq_id,
      result: row.result,
      subject: row.subject,
      topic: row.topic,
      source: row.source,
      causeCode: row.cause_code,
      priority: row.priority,
      correctRule: row.correct_rule,
      whatFooledMe: row.what_fooled_me,
      fixCodes: row.fix_codes ?? [],
      tags: row.tags ?? [],
      createdAt: row.created_at,
    };
    userState.mcqItemLogs[log.id] = log;
  }

  for (const row of gtLogsResult.data ?? []) {
    const log: GtLog = {
      id: row.id,
      gtNumber: row.gt_number,
      gtDate: row.gt_date,
      dayNumber: row.day_number,
      score: row.score,
      correct: row.correct,
      wrong: row.wrong,
      unattempted: row.unattempted,
      airPercentile: row.air_percentile,
      device: row.device,
      attemptedLive: row.attempted_live,
      overallFeeling: row.overall_feeling,
      sectionA: row.section_a ?? {},
      sectionB: row.section_b ?? {},
      sectionC: row.section_c ?? {},
      sectionD: row.section_d ?? {},
      sectionE: row.section_e ?? {},
      errorTypes: row.error_types,
      recurringTopics: row.recurring_topics,
      knowledgeVsBehaviour: row.knowledge_vs_behaviour,
      unsureRightCount: row.unsure_right_count,
      changeBeforeNextGt: row.change_before_next_gt,
      createdAt: row.created_at,
    };
    userState.gtLogs[log.id] = log;
  }

  for (const row of weeklySummariesResult.data ?? []) {
    const summary = row.payload as WeeklySummary;
    userState.weeklySummaries[row.id] = {
      ...summary,
      id: row.id,
      generatedAt: row.generated_at ?? summary.generatedAt,
    };
  }

  return store;
}

export async function readSupabaseStoreForUser(user: LocalUser, supabase: SupabaseClient) {
  return hydrateSupabaseStore(user, supabase);
}

async function loadSupabaseStore(): Promise<LocalStore> {
  const { supabase, user } = await requireSupabaseRequestUser();
  return hydrateSupabaseStore(asSupabaseUser(user), supabase);
}

type SyncTableInput = {
  table: string;
  rows: Record<string, unknown>[];
  onConflict: string;
  previousCount: number;
  userId: string;
};

async function syncUserRows({
  table,
  rows,
  onConflict,
  previousCount,
  userId,
}: SyncTableInput, supabase: SupabaseClient) {

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, {
      onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }

  if (rows.length === 0 && previousCount > 0) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

async function persistSupabaseStore(nextStore: LocalStore, previousStore: LocalStore) {
  const userId = Object.keys(nextStore.userState)[0];
  if (!userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase runtime is active, but the Supabase server client is unavailable.");
  }

  const nextState = nextStore.userState[userId] ?? createEmptyUserState();
  const previousState = previousStore.userState[userId] ?? createEmptyUserState();

  const { error: settingsError } = await supabase.from("app_settings").upsert(
    {
      user_id: userId,
      day_one_date: nextState.settings.dayOneDate,
      theme: nextState.settings.theme,
      schedule_shift_days: nextState.settings.scheduleShiftDays,
      shift_applied_at: nextState.settings.shiftAppliedAt,
      processed_dates: nextState.processedDates,
      simulated_now_iso: nextStore.dev.simulatedNowIso,
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );

  if (settingsError) {
    throw new Error(`app_settings: ${settingsError.message}`);
  }

  await Promise.all([
    syncUserRows({
      table: "day_states",
      userId,
      onConflict: "user_id,day_number",
      previousCount: Object.keys(previousState.dayStates).length,
      rows: Object.values(nextState.dayStates).map((entry) => ({
        user_id: userId,
        day_number: entry.dayNumber,
        traffic_light: entry.trafficLight,
        updated_at: entry.updatedAt,
      })),
    }, supabase),
    syncUserRows({
      table: "block_progress",
      userId,
      onConflict: "user_id,day_number,block_key",
      previousCount: Object.keys(previousState.blockProgress).length,
      rows: Object.values(nextState.blockProgress).map((entry) => ({
        user_id: userId,
        day_number: entry.dayNumber,
        block_key: entry.blockKey,
        status: entry.status,
        actual_start: entry.actualStart,
        actual_end: entry.actualEnd,
        completed_at: entry.completedAt,
        source_tag: entry.sourceTag,
        note: entry.note,
      })),
    }, supabase),
    syncUserRows({
      table: "revision_completions",
      userId,
      onConflict: "user_id,source_day,source_block_key,revision_type",
      previousCount: Object.keys(previousState.revisionCompletions).length,
      rows: Object.values(nextState.revisionCompletions).map((entry) => ({
        user_id: userId,
        revision_id: entry.revisionId,
        source_day: entry.sourceDay,
        source_block_key: entry.sourceBlockKey,
        revision_type: entry.revisionType,
        completed_at: entry.completedAt,
      })),
    }, supabase),
    syncUserRows({
      table: "backlog_items",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.backlogItems).length,
      rows: Object.values(nextState.backlogItems).map((entry) => ({
        id: entry.id,
        user_id: userId,
        original_day: entry.originalDay,
        original_block_key: entry.originalBlockKey,
        topic_description: entry.topicDescription,
        subject: entry.subject,
        source_tag: entry.sourceTag,
        status: entry.status,
        suggested_day: entry.suggestedDay,
        suggested_block_key: entry.suggestedBlockKey,
        suggested_note: entry.suggestedNote,
        rescheduled_to_day: entry.rescheduledToDay,
        rescheduled_to_block_key: entry.rescheduledToBlockKey,
        created_at: entry.createdAt,
        completed_at: entry.completedAt,
        dismissed_at: entry.dismissedAt,
      })),
    }, supabase),
    syncUserRows({
      table: "mcq_bulk_logs",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.mcqBulkLogs).length,
      rows: Object.values(nextState.mcqBulkLogs).map((entry) => ({
        id: entry.id,
        user_id: userId,
        entry_date: entry.entryDate,
        total_attempted: entry.totalAttempted,
        correct: entry.correct,
        wrong: entry.wrong,
        subject: entry.subject,
        source: entry.source,
        created_at: entry.createdAt,
      })),
    }, supabase),
    syncUserRows({
      table: "mcq_item_logs",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.mcqItemLogs).length,
      rows: Object.values(nextState.mcqItemLogs).map((entry) => ({
        id: entry.id,
        user_id: userId,
        entry_date: entry.entryDate,
        mcq_id: entry.mcqId,
        result: entry.result,
        subject: entry.subject,
        topic: entry.topic,
        source: entry.source,
        cause_code: entry.causeCode,
        priority: entry.priority,
        correct_rule: entry.correctRule,
        what_fooled_me: entry.whatFooledMe,
        fix_codes: entry.fixCodes,
        tags: entry.tags,
        created_at: entry.createdAt,
      })),
    }, supabase),
    syncUserRows({
      table: "gt_logs",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.gtLogs).length,
      rows: Object.values(nextState.gtLogs).map((entry) => ({
        id: entry.id,
        user_id: userId,
        gt_number: entry.gtNumber,
        gt_date: entry.gtDate,
        day_number: entry.dayNumber,
        score: entry.score,
        correct: entry.correct,
        wrong: entry.wrong,
        unattempted: entry.unattempted,
        air_percentile: entry.airPercentile,
        device: entry.device,
        attempted_live: entry.attemptedLive,
        overall_feeling: entry.overallFeeling,
        section_a: entry.sectionA,
        section_b: entry.sectionB,
        section_c: entry.sectionC,
        section_d: entry.sectionD,
        section_e: entry.sectionE,
        error_types: entry.errorTypes,
        recurring_topics: entry.recurringTopics,
        knowledge_vs_behaviour: entry.knowledgeVsBehaviour,
        unsure_right_count: entry.unsureRightCount,
        change_before_next_gt: entry.changeBeforeNextGt,
        created_at: entry.createdAt,
      })),
    }, supabase),
    syncUserRows({
      table: "weekly_summaries",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.weeklySummaries).length,
      rows: Object.values(nextState.weeklySummaries).map((entry) => ({
        id: entry.id,
        user_id: userId,
        week_key: entry.weekKey,
        week_start_date: entry.weekStartDate,
        week_end_date: entry.weekEndDate,
        payload: entry,
        generated_at: entry.generatedAt,
      })),
    }, supabase),
  ]);
}

export async function persistSupabaseStoreForUser(nextStore: LocalStore, previousStore: LocalStore, supabase: SupabaseClient) {
  const userId = Object.keys(nextStore.userState)[0];
  if (!userId) {
    return;
  }

  const nextState = nextStore.userState[userId] ?? createEmptyUserState();
  const previousState = previousStore.userState[userId] ?? createEmptyUserState();

  const { error: settingsError } = await supabase.from("app_settings").upsert(
    {
      user_id: userId,
      day_one_date: nextState.settings.dayOneDate,
      theme: nextState.settings.theme,
      schedule_shift_days: nextState.settings.scheduleShiftDays,
      shift_applied_at: nextState.settings.shiftAppliedAt,
      processed_dates: nextState.processedDates,
      simulated_now_iso: nextStore.dev.simulatedNowIso,
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );

  if (settingsError) {
    throw new Error(`app_settings: ${settingsError.message}`);
  }

  await Promise.all([
    syncUserRows({
      table: "day_states",
      userId,
      onConflict: "user_id,day_number",
      previousCount: Object.keys(previousState.dayStates).length,
      rows: Object.values(nextState.dayStates).map((entry) => ({
        user_id: userId,
        day_number: entry.dayNumber,
        traffic_light: entry.trafficLight,
        updated_at: entry.updatedAt,
      })),
    }, supabase),
    syncUserRows({
      table: "block_progress",
      userId,
      onConflict: "user_id,day_number,block_key",
      previousCount: Object.keys(previousState.blockProgress).length,
      rows: Object.values(nextState.blockProgress).map((entry) => ({
        user_id: userId,
        day_number: entry.dayNumber,
        block_key: entry.blockKey,
        status: entry.status,
        actual_start: entry.actualStart,
        actual_end: entry.actualEnd,
        completed_at: entry.completedAt,
        source_tag: entry.sourceTag,
        note: entry.note,
      })),
    }, supabase),
    syncUserRows({
      table: "revision_completions",
      userId,
      onConflict: "user_id,source_day,source_block_key,revision_type",
      previousCount: Object.keys(previousState.revisionCompletions).length,
      rows: Object.values(nextState.revisionCompletions).map((entry) => ({
        user_id: userId,
        revision_id: entry.revisionId,
        source_day: entry.sourceDay,
        source_block_key: entry.sourceBlockKey,
        revision_type: entry.revisionType,
        completed_at: entry.completedAt,
      })),
    }, supabase),
    syncUserRows({
      table: "backlog_items",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.backlogItems).length,
      rows: Object.values(nextState.backlogItems).map((entry) => ({
        id: entry.id,
        user_id: userId,
        original_day: entry.originalDay,
        original_block_key: entry.originalBlockKey,
        topic_description: entry.topicDescription,
        subject: entry.subject,
        source_tag: entry.sourceTag,
        status: entry.status,
        suggested_day: entry.suggestedDay,
        suggested_block_key: entry.suggestedBlockKey,
        suggested_note: entry.suggestedNote,
        rescheduled_to_day: entry.rescheduledToDay,
        rescheduled_to_block_key: entry.rescheduledToBlockKey,
        created_at: entry.createdAt,
        completed_at: entry.completedAt,
        dismissed_at: entry.dismissedAt,
      })),
    }, supabase),
    syncUserRows({
      table: "mcq_bulk_logs",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.mcqBulkLogs).length,
      rows: Object.values(nextState.mcqBulkLogs).map((entry) => ({
        id: entry.id,
        user_id: userId,
        entry_date: entry.entryDate,
        total_attempted: entry.totalAttempted,
        correct: entry.correct,
        wrong: entry.wrong,
        subject: entry.subject,
        source: entry.source,
        created_at: entry.createdAt,
      })),
    }, supabase),
    syncUserRows({
      table: "mcq_item_logs",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.mcqItemLogs).length,
      rows: Object.values(nextState.mcqItemLogs).map((entry) => ({
        id: entry.id,
        user_id: userId,
        entry_date: entry.entryDate,
        mcq_id: entry.mcqId,
        result: entry.result,
        subject: entry.subject,
        topic: entry.topic,
        source: entry.source,
        cause_code: entry.causeCode,
        priority: entry.priority,
        correct_rule: entry.correctRule,
        what_fooled_me: entry.whatFooledMe,
        fix_codes: entry.fixCodes,
        tags: entry.tags,
        created_at: entry.createdAt,
      })),
    }, supabase),
    syncUserRows({
      table: "gt_logs",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.gtLogs).length,
      rows: Object.values(nextState.gtLogs).map((entry) => ({
        id: entry.id,
        user_id: userId,
        gt_number: entry.gtNumber,
        gt_date: entry.gtDate,
        day_number: entry.dayNumber,
        score: entry.score,
        correct: entry.correct,
        wrong: entry.wrong,
        unattempted: entry.unattempted,
        air_percentile: entry.airPercentile,
        device: entry.device,
        attempted_live: entry.attemptedLive,
        overall_feeling: entry.overallFeeling,
        section_a: entry.sectionA,
        section_b: entry.sectionB,
        section_c: entry.sectionC,
        section_d: entry.sectionD,
        section_e: entry.sectionE,
        error_types: entry.errorTypes,
        recurring_topics: entry.recurringTopics,
        knowledge_vs_behaviour: entry.knowledgeVsBehaviour,
        unsure_right_count: entry.unsureRightCount,
        change_before_next_gt: entry.changeBeforeNextGt,
        created_at: entry.createdAt,
      })),
    }, supabase),
    syncUserRows({
      table: "weekly_summaries",
      userId,
      onConflict: "id",
      previousCount: Object.keys(previousState.weeklySummaries).length,
      rows: Object.values(nextState.weeklySummaries).map((entry) => ({
        id: entry.id,
        user_id: userId,
        week_key: entry.weekKey,
        week_start_date: entry.weekStartDate,
        week_end_date: entry.weekEndDate,
        payload: entry,
        generated_at: entry.generatedAt,
      })),
    }, supabase),
  ]);
}

export async function readStore(): Promise<LocalStore> {
  return getRuntimeMode() === "supabase" ? loadSupabaseStore() : readLocalStore();
}

export async function writeStore(store: LocalStore) {
  if (getRuntimeMode() === "supabase") {
    const previous = await loadSupabaseStore();
    await persistSupabaseStore(store, previous);
    return;
  }

  await writeLocalStore(store);
}

export async function mutateStore<T>(mutator: (store: LocalStore) => T | Promise<T>): Promise<T> {
  if (getRuntimeMode() === "supabase") {
    const store = await loadSupabaseStore();
    const previous = structuredClone(store);
    const result = await mutator(store);

    if (JSON.stringify(store) !== JSON.stringify(previous)) {
      await persistSupabaseStore(store, previous);
    }

    return result;
  }

  const store = await readLocalStore();
  const result = await mutator(store);
  await writeLocalStore(store);
  return result;
}

export function createSession(userId: string): LocalSession {
  return {
    id: randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
  };
}

export function getEffectiveNow(store: LocalStore): Date {
  return store.dev.simulatedNowIso ? new Date(store.dev.simulatedNowIso) : new Date();
}
