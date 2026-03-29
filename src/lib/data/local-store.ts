import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { DEFAULT_LOCAL_USER } from "@/lib/domain/constants";
import { normalizeStoredGtLog } from "@/lib/domain/gt";
import { normalizeStoredMcqBulkLog, normalizeStoredMcqItemLog } from "@/lib/domain/mcq";
import { emptyQuoteState, normalizeQuoteState } from "@/lib/domain/quotes";
import { getScheduleItemById } from "@/lib/domain/schedule";
import { findWeeklySummaryByWeekKey, normalizeStoredWeeklySummary } from "@/lib/domain/weekly";
import type {
  AppSettings,
  BacklogItem,
  BlockTiming,
  LocalSession,
  LocalStore,
  LocalUser,
  MorningRevisionAutoAddNotice,
  RevisionCompletion,
  ScheduleShiftEvent,
  TopicProgress,
  TopicStatus,
  UserState,
  WeeklySummary,
} from "@/lib/domain/types";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STORE_VERSION = 2;
const dataDir = resolve(process.cwd(), ".data");
const storePath = resolve(dataDir, "local-store.json");
const tempStorePath = resolve(dataDir, "local-store.tmp.json");
const backupStorePath = resolve(dataDir, "local-store.backup.json");
let localMutationQueue: Promise<void> = Promise.resolve();

function emptySettings(): AppSettings {
  return {
    dayOneDate: null,
    theme: "dark",
    scheduleShiftDays: 0,
    shiftAppliedAt: null,
    shiftEvents: [],
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
    topicProgress: {},
    blockTiming: {},
    revisionCompletions: {},
    backlogItems: {},
    quoteState: emptyQuoteState(),
    mcqBulkLogs: {},
    mcqItemLogs: {},
    gtLogs: {},
    weeklySummaries: {},
    morningRevisionSelections: {},
    morningRevisionActualMinutes: {},
    morningRevisionAutoAddNotice: {},
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
    version: STORE_VERSION,
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
    await persistLocalStoreFiles(createDefaultStore());
  }
}

async function persistLocalStoreFiles(store: LocalStore) {
  await mkdir(dataDir, { recursive: true });
  const serialized = JSON.stringify(store, null, 2);
  await writeFile(tempStorePath, serialized);
  await rename(tempStorePath, storePath);
  await writeFile(backupStorePath, serialized);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseLocalStoreFile(path: string, attempts = 3): Promise<LocalStore> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const raw = await readFile(path, "utf8");
      if (!raw.trim()) {
        throw new SyntaxError(`Local store file is empty: ${path}`);
      }
      return JSON.parse(raw) as LocalStore;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(15 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Unable to parse local store: ${path}`);
}

function normalizeShiftEvents(value: unknown): ScheduleShiftEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidate = entry as Partial<ScheduleShiftEvent>;
      if (typeof candidate.shiftDays !== "number" || candidate.shiftDays <= 0) {
        return [];
      }

      return [
        {
          id: typeof candidate.id === "string" ? candidate.id : randomUUID(),
          anchorDayNumber:
            typeof candidate.anchorDayNumber === "number" && Number.isFinite(candidate.anchorDayNumber)
              ? candidate.anchorDayNumber
              : 1,
          shiftDays: candidate.shiftDays,
          appliedAt: typeof candidate.appliedAt === "string" ? candidate.appliedAt : new Date(0).toISOString(),
          missedDays: Array.isArray(candidate.missedDays)
            ? candidate.missedDays.filter((day): day is number => typeof day === "number" && Number.isFinite(day))
            : [],
          bufferDayUsed:
            typeof candidate.bufferDayUsed === "number" && Number.isFinite(candidate.bufferDayUsed)
              ? candidate.bufferDayUsed
              : null,
          compressedPairs: Array.isArray(candidate.compressedPairs)
            ? candidate.compressedPairs.flatMap((pair) =>
              Array.isArray(pair) &&
                pair.length === 2 &&
                typeof pair[0] === "number" &&
                typeof pair[1] === "number"
                ? [[pair[0], pair[1]] as [number, number]]
                : [],
            )
            : [],
        } satisfies ScheduleShiftEvent,
      ];
    })
    .sort((left, right) => left.appliedAt.localeCompare(right.appliedAt));
}

function normalizeSettings(settings: AppSettings | undefined): AppSettings {
  const base = settings ?? emptySettings();
  const shiftEvents = normalizeShiftEvents(base.shiftEvents);

  return {
    dayOneDate: base.dayOneDate ?? null,
    theme: base.theme === "light" ? "light" : "dark",
    scheduleShiftDays: shiftEvents.reduce((sum, event) => sum + event.shiftDays, 0),
    shiftAppliedAt: shiftEvents.at(-1)?.appliedAt ?? null,
    shiftEvents,
  };
}

function normalizeProcessedDates(value: unknown): UserState["processedDates"] {
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

function normalizeTopicStatus(value: unknown): TopicStatus {
  switch (value) {
    case "completed":
    case "skipped":
    case "missed":
    case "rescheduled":
      return value;
    default:
      return "pending";
  }
}

function normalizeTopicProgressMap(value: unknown): UserState["topicProgress"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, TopicProgress>).map(([key, entry]) => [
      key,
      {
        itemId: entry.itemId ?? key,
        dayNumber: Number(entry.dayNumber),
        blockKey: String(entry.blockKey),
        status: normalizeTopicStatus(entry.status),
        completedAt: entry.completedAt ?? null,
        sourceTag: entry.sourceTag ?? null,
        note: entry.note ?? null,
        updatedAt: entry.updatedAt ?? null,
      } satisfies TopicProgress,
    ]),
  );
}

function normalizeBlockTimingMap(value: unknown): UserState["blockTiming"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, BlockTiming>).map(([key, entry]) => [
      key,
      {
        dayNumber: Number(entry.dayNumber),
        blockKey: String(entry.blockKey),
        actualStart: entry.actualStart ?? null,
        actualEnd: entry.actualEnd ?? null,
        note: entry.note ?? null,
        updatedAt: entry.updatedAt ?? null,
      } satisfies BlockTiming,
    ]),
  );
}

function normalizeRevisionCompletions(value: unknown): UserState["revisionCompletions"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, RevisionCompletion>).map(([revisionId, entry]) => [
      revisionId,
      {
        revisionId,
        sourceItemId: entry.sourceItemId ?? revisionId.split(":").slice(0, -1).join(":"),
        sourceDay: Number(entry.sourceDay),
        sourceBlockKey: String(entry.sourceBlockKey),
        revisionType: entry.revisionType,
        completedAt: entry.completedAt,
      } satisfies RevisionCompletion,
    ]),
  );
}

function normalizeMorningRevisionSelections(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const result: Record<string, string[]> = {};
  for (const [dateKey, ids] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
      result[dateKey] = ids as string[];
    }
  }
  return result;
}

function normalizeMorningRevisionActualMinutes(value: unknown): Record<string, Record<string, number>> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const result: Record<string, Record<string, number>> = {};
  for (const [dateKey, entries] of Object.entries(value as Record<string, unknown>)) {
    if (!entries || typeof entries !== "object") {
      continue;
    }
    const normalized: Record<string, number> = {};
    for (const [sourceItemId, actualMinutes] of Object.entries(entries as Record<string, unknown>)) {
      const parsed = Number(actualMinutes);
      if (Number.isFinite(parsed) && parsed > 0) {
        normalized[sourceItemId] = Math.round(parsed);
      }
    }
    if (Object.keys(normalized).length > 0) {
      result[dateKey] = normalized;
    }
  }
  return result;
}

function normalizeMorningRevisionAutoAddNotice(value: unknown): Record<string, MorningRevisionAutoAddNotice> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const result: Record<string, MorningRevisionAutoAddNotice> = {};
  for (const [dateKey, notice] of Object.entries(value as Record<string, unknown>)) {
    if (!notice || typeof notice !== "object") {
      continue;
    }
    const candidate = notice as Partial<MorningRevisionAutoAddNotice>;
    if (
      typeof candidate.sourceItemId !== "string" ||
      typeof candidate.sourceTopicLabel !== "string" ||
      typeof candidate.actualMinutes !== "number" ||
      !Number.isFinite(candidate.actualMinutes) ||
      candidate.actualMinutes <= 0 ||
      typeof candidate.savedMinutes !== "number" ||
      !Number.isFinite(candidate.savedMinutes) ||
      candidate.savedMinutes < 0 ||
      typeof candidate.createdAt !== "string"
    ) {
      continue;
    }

    const addedSessions = Array.isArray(candidate.addedSessions)
      ? candidate.addedSessions.flatMap((entry) => {
        if (
          !entry ||
          typeof entry !== "object" ||
          typeof entry.sourceItemId !== "string" ||
          typeof entry.sourceTopicLabel !== "string" ||
          typeof entry.allocatedMinutes !== "number" ||
          !Number.isFinite(entry.allocatedMinutes) ||
          entry.allocatedMinutes <= 0
        ) {
          return [];
        }
        return [{
          sourceItemId: entry.sourceItemId,
          sourceTopicLabel: entry.sourceTopicLabel,
          allocatedMinutes: Math.round(entry.allocatedMinutes),
        }];
      })
      : [];

    if (addedSessions.length === 0) {
      continue;
    }

    result[dateKey] = {
      sourceItemId: candidate.sourceItemId,
      sourceTopicLabel: candidate.sourceTopicLabel,
      actualMinutes: Math.round(candidate.actualMinutes),
      savedMinutes: Math.round(candidate.savedMinutes),
      addedSessions,
      createdAt: candidate.createdAt,
    };
  }
  return result;
}

function normalizeBacklogItem(entry: BacklogItem, id: string): BacklogItem {
  const sourceItemId = entry.sourceItemId ?? id;
  const scheduleItem = getScheduleItemById(sourceItemId);
  const subjectIds = entry.subjectIds?.length ? entry.subjectIds : scheduleItem?.item.subjectIds ?? [];
  const plannedMinutes =
    typeof entry.plannedMinutes === "number" && Number.isFinite(entry.plannedMinutes)
      ? entry.plannedMinutes
      : scheduleItem?.item.plannedMinutes ?? 0;
  const recoveryLane = entry.recoveryLane || scheduleItem?.item.recoveryLane || "none";
  const phaseFence = entry.phaseFence || scheduleItem?.item.phaseFence || "not_reschedulable";

  return {
    ...entry,
    id,
    sourceItemId,
    subjectIds,
    plannedMinutes,
    recoveryLane,
    phaseFence,
    originalStart: entry.originalStart ?? null,
    originalEnd: entry.originalEnd ?? null,
    suggestedDay: entry.suggestedDay ?? null,
    suggestedBlockKey: entry.suggestedBlockKey ?? null,
    suggestedNote: entry.suggestedNote ?? null,
    rescheduledToDay: entry.rescheduledToDay ?? null,
    rescheduledToBlockKey: entry.rescheduledToBlockKey ?? null,
    completedAt: entry.completedAt ?? null,
    dismissedAt: entry.dismissedAt ?? null,
  };
}

function normalizeUserState(userState: UserState | undefined): UserState {
  const base = userState ?? createEmptyUserState();
  const weeklySummaries = Object.entries(base.weeklySummaries ?? {}).reduce<Record<string, WeeklySummary>>((entries, [id, summary]) => {
    const normalized = normalizeStoredWeeklySummary({
      ...summary,
      id: summary.id ?? id,
    });
    const existing = findWeeklySummaryByWeekKey(entries, normalized.weekKey);
    if (!existing || existing.generatedAt <= normalized.generatedAt) {
      if (existing) {
        delete entries[existing.id];
      }
      entries[normalized.id] = normalized;
    }
    return entries;
  }, {});

  return {
    settings: normalizeSettings(base.settings),
    dayStates: base.dayStates ?? {},
    topicProgress: normalizeTopicProgressMap(base.topicProgress),
    blockTiming: normalizeBlockTimingMap(base.blockTiming),
    revisionCompletions: normalizeRevisionCompletions(base.revisionCompletions),
    backlogItems: Object.fromEntries(
      Object.entries(base.backlogItems ?? {}).map(([id, item]) => [id, normalizeBacklogItem(item, id)]),
    ),
    quoteState: normalizeQuoteState(base.quoteState),
    mcqBulkLogs: Object.fromEntries(
      Object.entries(base.mcqBulkLogs ?? {}).map(([id, log]) => [id, normalizeStoredMcqBulkLog(log)]),
    ),
    mcqItemLogs: Object.fromEntries(
      Object.entries(base.mcqItemLogs ?? {}).map(([id, log]) => [id, normalizeStoredMcqItemLog(log)]),
    ),
    gtLogs: Object.fromEntries(Object.entries(base.gtLogs ?? {}).map(([id, log]) => [id, normalizeStoredGtLog(log)])),
    weeklySummaries,
    morningRevisionSelections: normalizeMorningRevisionSelections(base.morningRevisionSelections),
    morningRevisionActualMinutes: normalizeMorningRevisionActualMinutes(base.morningRevisionActualMinutes),
    morningRevisionAutoAddNotice: normalizeMorningRevisionAutoAddNotice(base.morningRevisionAutoAddNotice),
    processedDates: normalizeProcessedDates(base.processedDates),
  };
}

function createDefaultUserStateMap(users: Record<string, LocalUser>, previous?: Record<string, UserState>) {
  const userState: Record<string, UserState> = {};

  for (const userId of Object.keys(users)) {
    userState[userId] = normalizeUserState(previous?.[userId]);
  }

  return userState;
}

function ensureDefaultLocalUser(parsed: LocalStore) {
  const defaultUser = createDefaultUser();
  if (!parsed.users[defaultUser.id]) {
    parsed.users[defaultUser.id] = defaultUser;
  }
  if (!parsed.userState[defaultUser.id]) {
    parsed.userState[defaultUser.id] = createEmptyUserState();
  }
}

function resetStoreToCurrentVersion(parsed: LocalStore): LocalStore {
  const users = {
    ...parsed.users,
  };

  if (Object.keys(users).length === 0) {
    const defaultUser = createDefaultUser();
    users[defaultUser.id] = defaultUser;
  }

  return {
    version: STORE_VERSION,
    users,
    sessions: parsed.sessions ?? {},
    userState: createDefaultUserStateMap(users),
    dev: {
      simulatedNowIso: parsed.dev?.simulatedNowIso ?? null,
    },
  };
}

async function readLocalStore(): Promise<LocalStore> {
  await ensureStoreFile();
  let parsed: LocalStore;

  try {
    parsed = await parseLocalStoreFile(storePath);
  } catch (error) {
    parsed = await parseLocalStoreFile(backupStorePath);
    await persistLocalStoreFiles(parsed);
    if (error instanceof Error) {
      console.warn(`Recovered local store from backup after read failure: ${error.message}`);
    }
  }

  if (parsed.version !== STORE_VERSION) {
    const resetStore = resetStoreToCurrentVersion(parsed);
    await persistLocalStoreFiles(resetStore);
    parsed = resetStore;
  }

  ensureDefaultLocalUser(parsed);
  parsed.userState = createDefaultUserStateMap(parsed.users, parsed.userState);
  return parsed;
}

async function writeLocalStore(store: LocalStore) {
  await persistLocalStoreFiles(store);
}

async function withLocalMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = localMutationQueue;
  let release!: () => void;
  localMutationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}

function createSessionScopedStore(user: LocalUser): LocalStore {
  return {
    version: STORE_VERSION,
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

function parseSourceItemIdFromRevisionId(revisionId: string, revisionType: string) {
  const suffix = `:${revisionType}`;
  return revisionId.endsWith(suffix) ? revisionId.slice(0, -suffix.length) : revisionId;
}

function buildTopicProgressRows(userId: string, topicProgress: UserState["topicProgress"]) {
  return Object.values(topicProgress).map((entry) => ({
    user_id: userId,
    day_number: entry.dayNumber,
    block_key: `item::${entry.itemId}`,
    status: entry.status,
    actual_start: null,
    actual_end: null,
    completed_at: entry.completedAt,
    source_tag: entry.sourceTag,
    note: entry.note,
  }));
}

function buildBlockTimingRows(userId: string, blockTiming: UserState["blockTiming"]) {
  return Object.values(blockTiming).map((entry) => ({
    user_id: userId,
    day_number: entry.dayNumber,
    block_key: `block::${entry.blockKey}`,
    status: "pending",
    actual_start: entry.actualStart,
    actual_end: entry.actualEnd,
    completed_at: null,
    source_tag: null,
    note: entry.note,
  }));
}

async function hydrateSupabaseStore(user: LocalUser, supabase: SupabaseClient): Promise<LocalStore> {
  const store = createSessionScopedStore(user);
  const userState = store.userState[user.id];

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
    supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("day_states").select("*").eq("user_id", user.id),
    supabase.from("block_progress").select("*").eq("user_id", user.id),
    supabase.from("revision_completions").select("*").eq("user_id", user.id),
    supabase.from("backlog_items").select("*").eq("user_id", user.id),
    supabase.from("mcq_bulk_logs").select("*").eq("user_id", user.id),
    supabase.from("mcq_item_logs").select("*").eq("user_id", user.id),
    supabase.from("gt_logs").select("*").eq("user_id", user.id),
    supabase.from("weekly_summaries").select("*").eq("user_id", user.id),
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

  if (settingsResult.data) {
    userState.settings = normalizeSettings({
      dayOneDate: settingsResult.data.day_one_date,
      theme: settingsResult.data.theme ?? "dark",
      scheduleShiftDays: settingsResult.data.schedule_shift_days ?? 0,
      shiftAppliedAt: settingsResult.data.shift_applied_at ?? null,
      shiftEvents: settingsResult.data.shift_events ?? [],
    });
    userState.quoteState = normalizeQuoteState(settingsResult.data.quote_state);
    userState.processedDates = normalizeProcessedDates(settingsResult.data.processed_dates);
    userState.morningRevisionSelections = normalizeMorningRevisionSelections(settingsResult.data.morning_revision_selections);
    userState.morningRevisionActualMinutes = normalizeMorningRevisionActualMinutes(
      settingsResult.data.morning_revision_actual_minutes,
    );
    userState.morningRevisionAutoAddNotice = normalizeMorningRevisionAutoAddNotice(
      settingsResult.data.morning_revision_auto_add_notice,
    );
    store.dev.simulatedNowIso = settingsResult.data.simulated_now_iso ?? null;
  }

  for (const row of dayStatesResult.data ?? []) {
    userState.dayStates[String(row.day_number)] = {
      dayNumber: row.day_number,
      trafficLight: row.traffic_light,
      updatedAt: row.updated_at,
    };
  }

  for (const row of blockProgressResult.data ?? []) {
    if (typeof row.block_key !== "string") {
      continue;
    }

    if (row.block_key.startsWith("item::")) {
      const itemId = row.block_key.slice("item::".length);
      const scheduleItem = getScheduleItemById(itemId);
      userState.topicProgress[itemId] = {
        itemId,
        dayNumber: row.day_number,
        blockKey: scheduleItem?.block.timeSlotKey ?? "",
        status: normalizeTopicStatus(row.status),
        completedAt: row.completed_at,
        sourceTag: row.source_tag,
        note: row.note,
        updatedAt: row.updated_at ?? null,
      };
      continue;
    }

    if (row.block_key.startsWith("block::")) {
      const blockKey = row.block_key.slice("block::".length);
      userState.blockTiming[`${row.day_number}:${blockKey}`] = {
        dayNumber: row.day_number,
        blockKey,
        actualStart: row.actual_start,
        actualEnd: row.actual_end,
        note: row.note,
        updatedAt: row.updated_at ?? null,
      };
    }
  }

  for (const row of revisionCompletionsResult.data ?? []) {
    const sourceItemId =
      row.source_item_id ?? parseSourceItemIdFromRevisionId(row.revision_id, row.revision_type);
    userState.revisionCompletions[row.revision_id] = {
      revisionId: row.revision_id,
      sourceItemId,
      sourceDay: row.source_day,
      sourceBlockKey: row.source_block_key,
      revisionType: row.revision_type,
      completedAt: row.completed_at,
    };
  }

  for (const row of backlogItemsResult.data ?? []) {
    const sourceItemId = row.id;
    const scheduleItem = getScheduleItemById(sourceItemId);
    const subjectIds = scheduleItem?.item.subjectIds ?? [];
    userState.backlogItems[row.id] = normalizeBacklogItem(
      {
        id: row.id,
        sourceItemId,
        originalDay: row.original_day,
        originalBlockKey: row.original_block_key,
        originalStart: row.original_start ?? null,
        originalEnd: row.original_end ?? null,
        priorityOrder: row.priority_order ?? 0,
        topicDescription: row.topic_description ?? scheduleItem?.item.label ?? row.original_block_key,
        subject: row.subject ?? (scheduleItem?.item.subjectIds[0] ?? "General"),
        subjectIds,
        plannedMinutes: scheduleItem?.item.plannedMinutes ?? 0,
        sourceTag: row.source_tag,
        recoveryLane: scheduleItem?.item.recoveryLane ?? "none",
        phaseFence: scheduleItem?.item.phaseFence ?? "not_reschedulable",
        status: row.status,
        suggestedDay: row.suggested_day,
        suggestedBlockKey: row.suggested_block_key,
        suggestedNote: row.suggested_note,
        rescheduledToDay: row.rescheduled_to_day,
        rescheduledToBlockKey: row.rescheduled_to_block_key,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        dismissedAt: row.dismissed_at,
      },
      row.id,
    );
  }

  for (const row of mcqBulkLogsResult.data ?? []) {
    const log = normalizeStoredMcqBulkLog({
      id: row.id,
      entryDate: row.entry_date,
      totalAttempted: row.total_attempted,
      correct: row.correct,
      wrong: row.wrong,
      subject: row.subject,
      source: row.source,
      createdAt: row.created_at,
    });
    userState.mcqBulkLogs[log.id] = log;
  }

  for (const row of mcqItemLogsResult.data ?? []) {
    const log = normalizeStoredMcqItemLog({
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
    });
    userState.mcqItemLogs[log.id] = log;
  }

  for (const row of gtLogsResult.data ?? []) {
    const log = normalizeStoredGtLog({
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
      weakestSubjects: row.weakest_subjects ?? [],
      knowledgeVsBehaviour: row.knowledge_vs_behaviour,
      unsureRightCount: row.unsure_right_count,
      changeBeforeNextGt: row.change_before_next_gt,
      createdAt: row.created_at,
    });
    userState.gtLogs[log.id] = log;
  }

  for (const row of weeklySummariesResult.data ?? []) {
    const summary = normalizeStoredWeeklySummary({
      ...(row.payload as WeeklySummary),
      id: row.id,
      generatedAt: row.generated_at ?? (row.payload as WeeklySummary).generatedAt,
    });
    const existing = findWeeklySummaryByWeekKey(userState.weeklySummaries, summary.weekKey);
    if (!existing || existing.generatedAt <= summary.generatedAt) {
      if (existing) {
        delete userState.weeklySummaries[existing.id];
      }
      userState.weeklySummaries[summary.id] = summary;
    }
  }

  store.userState[user.id] = normalizeUserState(userState);
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

async function syncUserRows(
  {
    table,
    rows,
    onConflict,
    previousCount,
    userId,
  }: SyncTableInput,
  supabase: SupabaseClient,
) {
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
      shift_events: nextState.settings.shiftEvents,
      quote_state: nextState.quoteState,
      processed_dates: nextState.processedDates,
      morning_revision_selections: nextState.morningRevisionSelections,
      morning_revision_actual_minutes: nextState.morningRevisionActualMinutes,
      morning_revision_auto_add_notice: nextState.morningRevisionAutoAddNotice,
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

  const blockProgressRows = [
    ...buildTopicProgressRows(userId, nextState.topicProgress),
    ...buildBlockTimingRows(userId, nextState.blockTiming),
  ];
  const previousBlockProgressCount =
    Object.keys(previousState.topicProgress).length + Object.keys(previousState.blockTiming).length;

  await Promise.all([
    syncUserRows(
      {
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
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "block_progress",
        userId,
        onConflict: "user_id,day_number,block_key",
        previousCount: previousBlockProgressCount,
        rows: blockProgressRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "revision_completions",
        userId,
        onConflict: "user_id,revision_id",
        previousCount: Object.keys(previousState.revisionCompletions).length,
        rows: Object.values(nextState.revisionCompletions).map((entry) => ({
          user_id: userId,
          revision_id: entry.revisionId,
          source_item_id: entry.sourceItemId,
          source_day: entry.sourceDay,
          source_block_key: entry.sourceBlockKey,
          revision_type: entry.revisionType,
          completed_at: entry.completedAt,
        })),
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "backlog_items",
        userId,
        onConflict: "id",
        previousCount: Object.keys(previousState.backlogItems).length,
        rows: Object.values(nextState.backlogItems).map((entry) => ({
          id: entry.id,
          user_id: userId,
          original_day: entry.originalDay,
          original_block_key: entry.originalBlockKey,
          original_start: entry.originalStart,
          original_end: entry.originalEnd,
          priority_order: entry.priorityOrder,
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
      },
      supabase,
    ),
    syncUserRows(
      {
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
      },
      supabase,
    ),
    syncUserRows(
      {
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
      },
      supabase,
    ),
    syncUserRows(
      {
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
          weakest_subjects: entry.weakestSubjects,
          knowledge_vs_behaviour: entry.knowledgeVsBehaviour,
          unsure_right_count: entry.unsureRightCount,
          change_before_next_gt: entry.changeBeforeNextGt,
          created_at: entry.createdAt,
        })),
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "weekly_summaries",
        userId,
        onConflict: "user_id,week_key",
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
      },
      supabase,
    ),
  ]);
}

export async function persistSupabaseStoreForUser(nextStore: LocalStore, previousStore: LocalStore, supabase: SupabaseClient) {
  void supabase;
  await persistSupabaseStore(nextStore, previousStore);
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

  await withLocalMutationLock(async () => {
    await writeLocalStore(store);
  });
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

  return withLocalMutationLock(async () => {
    const store = await readLocalStore();
    const previous = structuredClone(store);
    const result = await mutator(store);

    if (JSON.stringify(store) !== JSON.stringify(previous)) {
      await writeLocalStore(store);
    }

    return result;
  });
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
