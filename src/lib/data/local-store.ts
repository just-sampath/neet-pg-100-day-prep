import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { DEFAULT_LOCAL_USER } from "@/lib/domain/constants";
import {
  buildReferenceDataFromRows,
  getStaticReferenceData,
} from "@/lib/data/reference-data";
import { normalizeStoredGtLog } from "@/lib/domain/gt";
import { normalizeStoredMcqBulkLog, normalizeStoredMcqItemLog } from "@/lib/domain/mcq";
import { emptyQuoteState, normalizeQuoteState } from "@/lib/domain/quotes";
import { getScheduleItemById } from "@/lib/domain/schedule";
import {
  applyScheduleMappingsFromSettings,
  applyLegacyScheduleStateToSchedule,
  buildSeededScheduleState,
  createEmptyScheduleState,
  ensureUserScheduleSeeded,
  getReferenceSeedRows,
  SCHEDULE_SEED_VERSION,
} from "@/lib/data/schedule-seed";
import { findWeeklySummaryByWeekKey, normalizeStoredWeeklySummary } from "@/lib/domain/weekly";
import type {
  AppSettings,
  BacklogItem,
  BlockTiming,
  DayState,
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IST_TIME_ZONE, toDateOnlyInTimeZone } from "@/lib/utils/date";

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
    scheduleSeedVersion: 0,
    scheduleSeededAt: null,
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
    schedule: createEmptyScheduleState(),
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
    referenceData: getStaticReferenceData(),
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

  // On Windows, rename can fail with EPERM when another process briefly
  // holds the target file (antivirus, editor watcher, concurrent request).
  // Retry a few times, then fall back to a direct overwrite.
  let renamed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rename(tempStorePath, storePath);
      renamed = true;
      break;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        await sleep(50 * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
  if (!renamed) {
    // Fallback: write directly (not atomic, but avoids the EPERM wall)
    await writeFile(storePath, serialized);
    // Clean up the temp file we couldn't rename
    try { await unlink(tempStorePath); } catch { /* ignore */ }
  }

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
    scheduleSeedVersion:
      typeof base.scheduleSeedVersion === "number" && Number.isFinite(base.scheduleSeedVersion)
        ? Math.max(0, Math.floor(base.scheduleSeedVersion))
        : 0,
    scheduleSeededAt: base.scheduleSeededAt ?? null,
  };
}

function normalizeScheduleState(value: unknown): UserState["schedule"] {
  if (!value || typeof value !== "object") {
    return createEmptyScheduleState();
  }

  const candidate = value as Partial<UserState["schedule"]>;
  return {
    days: candidate.days && typeof candidate.days === "object" ? candidate.days : {},
    blocks: candidate.blocks && typeof candidate.blocks === "object" ? candidate.blocks : {},
    topicAssignments:
      candidate.topicAssignments && typeof candidate.topicAssignments === "object"
        ? candidate.topicAssignments
        : {},
    phaseConfig: candidate.phaseConfig && typeof candidate.phaseConfig === "object" ? candidate.phaseConfig : {},
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

function normalizeDayStateMap(value: unknown): Record<string, DayState> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, DayState>).map(([key, entry]) => [
      key,
      {
        dayNumber: Number(entry.dayNumber),
        trafficLight: entry.trafficLight === "yellow" || entry.trafficLight === "red" ? entry.trafficLight : "green",
        updatedAt: entry.updatedAt ?? null,
      } satisfies DayState,
    ]),
  );
}

function normalizeTopicProgressMap(value: unknown): Record<string, TopicProgress> {
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

function normalizeBlockTimingMap(value: unknown): Record<string, BlockTiming> {
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
    subjectTier: entry.subjectTier ?? null,
    plannedMinutes,
    recoveryLane,
    phaseFence,
    phase: entry.phase ?? null,
    manualSortOverride: entry.manualSortOverride ?? null,
    originalStart: entry.originalStart ?? null,
    originalEnd: entry.originalEnd ?? null,
    suggestedDay: entry.suggestedDay ?? null,
    suggestedBlockKey: entry.suggestedBlockKey ?? null,
    suggestedNote: entry.suggestedNote ?? null,
    rescheduledToDay: entry.rescheduledToDay ?? null,
    rescheduledToBlockKey: entry.rescheduledToBlockKey ?? null,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date().toISOString(),
    completedAt: entry.completedAt ?? null,
    dismissedAt: entry.dismissedAt ?? null,
  };
}

function normalizeUserState(userState: UserState | undefined): UserState {
  const base = userState ?? createEmptyUserState();
  const legacyBase = userState as
    | (Partial<UserState> & {
      dayStates?: unknown;
      topicProgress?: unknown;
      blockTiming?: unknown;
    })
    | undefined;
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

  const normalized: UserState = {
    settings: normalizeSettings(base.settings),
    schedule: normalizeScheduleState(base.schedule),
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

  const legacyDayStates = normalizeDayStateMap(legacyBase?.dayStates);
  const legacyTopicProgress = normalizeTopicProgressMap(legacyBase?.topicProgress);
  const legacyBlockTiming = normalizeBlockTimingMap(legacyBase?.blockTiming);
  const hadLegacyState =
    Object.keys(legacyDayStates).length > 0 ||
    Object.keys(legacyTopicProgress).length > 0 ||
    Object.keys(legacyBlockTiming).length > 0;

  if (normalized.settings.dayOneDate) {
    const hadScheduleState = Object.keys(normalized.schedule.days).length > 0;

    ensureUserScheduleSeeded(normalized, normalized.settings.scheduleSeededAt ?? new Date().toISOString());

    if (!hadScheduleState && hadLegacyState) {
      applyLegacyScheduleStateToSchedule(
        normalized.schedule,
        {
          dayStates: legacyDayStates,
          topicProgress: legacyTopicProgress,
          blockTiming: legacyBlockTiming,
        },
        normalized.settings.scheduleSeededAt ?? new Date().toISOString(),
      );
      applyScheduleMappingsFromSettings(
        normalized.schedule,
        normalized.settings,
        normalized.settings.scheduleSeededAt ?? new Date().toISOString(),
      );
    }
  }

  return normalized;
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
    referenceData: getStaticReferenceData(),
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
  parsed.referenceData = getStaticReferenceData();
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
    referenceData: getStaticReferenceData(),
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

function buildAppSettingsRow(userId: string, store: LocalStore, userState: UserState) {
  return {
    user_id: userId,
    day_one_date: userState.settings.dayOneDate,
    theme: userState.settings.theme,
    schedule_shift_days: userState.settings.scheduleShiftDays,
    shift_applied_at: userState.settings.shiftAppliedAt,
    shift_events: userState.settings.shiftEvents,
    schedule_seed_version: userState.settings.scheduleSeedVersion,
    schedule_seeded_at: userState.settings.scheduleSeededAt,
    quote_state: userState.quoteState,
    processed_dates: userState.processedDates,
    morning_revision_selections: userState.morningRevisionSelections,
    morning_revision_actual_minutes: userState.morningRevisionActualMinutes,
    morning_revision_auto_add_notice: userState.morningRevisionAutoAddNotice,
    simulated_now_iso: store.dev.simulatedNowIso,
  };
}

function buildScheduleDayRows(userId: string, schedule: UserState["schedule"]) {
  return Object.values(schedule.days).map((entry) => ({
    user_id: userId,
    day_number: entry.dayNumber,
    phase_id: entry.phaseId,
    phase_name: entry.phaseName,
    phase_group: entry.phaseGroup,
    primary_focus_raw: entry.primaryFocusRaw,
    primary_focus_parts: entry.primaryFocusParts,
    primary_focus_subject_ids: entry.primaryFocusSubjectIds,
    resource_raw: entry.resourceRaw,
    resource_parts: entry.resourceParts,
    deliverable_raw: entry.deliverableRaw,
    notes_raw: entry.notesRaw,
    source_minutes: entry.sourceMinutes,
    buffer_minutes: entry.bufferMinutes,
    planned_study_minutes: entry.plannedStudyMinutes,
    total_study_hours: entry.totalStudyHours,
    gt_test_type: entry.gtTestType,
    gt_plan_ref: entry.gtPlanRef,
    mapped_date: entry.mappedDate,
    original_mapped_date: entry.originalMappedDate,
    traffic_light: entry.trafficLight,
    traffic_light_updated_at: entry.trafficLightUpdatedAt,
    is_extension_day: entry.isExtensionDay,
    shift_hidden_reason: entry.shiftHiddenReason,
    merged_partner_day: entry.mergedPartnerDay,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  }));
}

function buildScheduleBlockRows(userId: string, schedule: UserState["schedule"]) {
  return Object.values(schedule.blocks).map((entry) => ({
    user_id: userId,
    day_number: entry.dayNumber,
    block_key: entry.blockKey,
    slot_order: entry.slotOrder,
    start_time: entry.startTime,
    end_time: entry.endTime,
    duration_minutes: entry.durationMinutes,
    timeline_kind: entry.timelineKind,
    display_label: entry.displayLabel,
    semantic_block_key: entry.semanticBlockKey,
    block_intent: entry.blockIntent,
    trackable: entry.trackable,
    raw_text: entry.rawText,
    recovery_lane: entry.recoveryLane,
    phase_fence: entry.phaseFence,
    default_revision_eligible: entry.defaultRevisionEligible,
    reschedulable: entry.reschedulable,
    traffic_light_green: entry.trafficLightGreen,
    traffic_light_yellow: entry.trafficLightYellow,
    traffic_light_red: entry.trafficLightRed,
    backlog_when_hidden: entry.backlogWhenHidden,
    actual_start: entry.actualStart,
    actual_end: entry.actualEnd,
    timing_note: entry.timingNote,
    timing_updated_at: entry.timingUpdatedAt,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  }));
}

function buildScheduleTopicAssignmentRows(userId: string, schedule: UserState["schedule"]) {
  return Object.values(schedule.topicAssignments).map((entry) => ({
    user_id: userId,
    source_item_id: entry.sourceItemId,
    day_number: entry.dayNumber,
    block_key: entry.blockKey,
    item_order: entry.itemOrder,
    kind: entry.kind,
    label: entry.label,
    raw_text: entry.rawText,
    planned_minutes: entry.plannedMinutes,
    subject_ids: entry.subjectIds,
    revision_eligible: entry.revisionEligible,
    recovery_lane: entry.recoveryLane,
    phase_fence: entry.phaseFence,
    notes: entry.notes,
    revision_type: entry.revisionType,
    reference_label: entry.referenceLabel,
    reference_day_number: entry.referenceDayNumber,
    status: entry.status,
    completed_at: entry.completedAt,
    source_tag: entry.sourceTag,
    note: entry.note,
    is_pinned: entry.isPinned,
    is_recovery: entry.isRecovery,
    original_day_number: entry.originalDayNumber,
    original_block_key: entry.originalBlockKey,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  }));
}

function buildPhaseConfigRows(userId: string, schedule: UserState["schedule"]) {
  return Object.values(schedule.phaseConfig).map((entry) => ({
    user_id: userId,
    phase_number: entry.phaseNumber,
    phase_id: entry.phaseId,
    original_start_day: entry.originalStartDay,
    original_end_day: entry.originalEndDay,
    extension_budget: entry.extensionBudget,
    extensions_used: entry.extensionsUsed,
    current_start_day: entry.currentStartDay,
    current_end_day: entry.currentEndDay,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  }));
}

function buildBacklogRows(userId: string, userState: UserState) {
  return Object.values(userState.backlogItems).map((entry) => ({
    id: entry.id,
    user_id: userId,
    source_item_id: entry.sourceItemId,
    original_day: entry.originalDay,
    original_block_key: entry.originalBlockKey,
    original_start: entry.originalStart,
    original_end: entry.originalEnd,
    priority_order: entry.priorityOrder,
    topic_description: entry.topicDescription,
    subject: entry.subject,
    subject_ids: entry.subjectIds,
    subject_tier: entry.subjectTier,
    planned_minutes: entry.plannedMinutes,
    source_tag: entry.sourceTag,
    recovery_lane: entry.recoveryLane,
    phase_fence: entry.phaseFence,
    phase: entry.phase,
    manual_sort_override: entry.manualSortOverride,
    status: entry.status,
    suggested_day: entry.suggestedDay,
    suggested_block_key: entry.suggestedBlockKey,
    suggested_note: entry.suggestedNote,
    rescheduled_to_day: entry.rescheduledToDay,
    rescheduled_to_block_key: entry.rescheduledToBlockKey,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    completed_at: entry.completedAt,
    dismissed_at: entry.dismissedAt,
  }));
}

async function ensureSupabaseReferenceDataSeeded() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const refs = getReferenceSeedRows();

  const quoteRows = refs.quotes.map((entry, index) => ({
    quote_id: entry.id,
    display_order: index + 1,
    quote_text: entry.quote,
    author: entry.author,
    category: entry.category,
    seed_version: SCHEDULE_SEED_VERSION,
  }));
  const subjectRows = refs.subjectTiers.map((entry, index) => ({
    subject_id: entry.subjectId,
    display_order: index + 1,
    subject_name: entry.subjectName,
    aliases: entry.aliases,
    wor_hours: entry.worHours,
    first_pass_days: entry.firstPassDays,
    priority_tier: entry.priorityTier,
    priority_rank: entry.priorityRank,
    resource_decision_raw: entry.resourceDecisionRaw,
    must_focus_topics: entry.mustFocusTopics,
    seed_version: SCHEDULE_SEED_VERSION,
  }));
  const gtPlanRows = refs.gtPlanItems.map((entry) => ({
    gt_plan_ref: entry.gtPlanRef,
    source_day_number: entry.dayNumber,
    test_type: entry.testType,
    purpose_raw: entry.purposeRaw,
    what_to_measure_raw: entry.whatToMeasureRaw,
    what_to_measure_items: entry.whatToMeasureItems,
    must_output_raw: entry.mustOutputRaw,
    must_output_items: entry.mustOutputItems,
    resource_raw: entry.resourceRaw,
    review_raw: entry.reviewRaw,
    wrap_up_raw: entry.wrapUpRaw,
    notes_raw: entry.notesRaw,
    seed_version: SCHEDULE_SEED_VERSION,
  }));
  const revisionMapRows = refs.revisionMapDays.map((entry) => ({
    day_number: entry.dayNumber,
    d1_due_topics: entry.d1DueTopics,
    d3_due_topics: entry.d3DueTopics,
    d7_due_topics: entry.d7DueTopics,
    d14_due_topics: entry.d14DueTopics,
    d28_due_topics: entry.d28DueTopics,
    morning_queue_rule: entry.morningQueueRule,
    seed_version: SCHEDULE_SEED_VERSION,
  }));

  const operations = await Promise.all([
    admin.from("subject_tiers").upsert(subjectRows, {
      onConflict: "subject_id",
      ignoreDuplicates: false,
    }),
    admin.from("quote_catalog").upsert(quoteRows, {
      onConflict: "quote_id",
      ignoreDuplicates: false,
    }),
    admin.from("gt_plan_items").upsert(gtPlanRows, {
      onConflict: "gt_plan_ref",
      ignoreDuplicates: false,
    }),
    admin.from("revision_map_days").upsert(revisionMapRows, {
      onConflict: "day_number",
      ignoreDuplicates: false,
    }),
  ]);

  const error = operations.find((result) => result.error)?.error;
  if (error) {
    throw new Error(`reference seed: ${error.message}`);
  }
}

async function loadSupabaseReferenceData(supabase: SupabaseClient) {
  const [
    subjectTiersResult,
    quoteCatalogResult,
    gtPlanItemsResult,
    revisionMapDaysResult,
  ] = await Promise.all([
    supabase.from("subject_tiers").select("*").order("display_order", { ascending: true }),
    supabase.from("quote_catalog").select("*").order("display_order", { ascending: true }),
    supabase.from("gt_plan_items").select("*").order("source_day_number", { ascending: true }),
    supabase.from("revision_map_days").select("*").order("day_number", { ascending: true }),
  ]);

  const errors = [
    subjectTiersResult.error,
    quoteCatalogResult.error,
    gtPlanItemsResult.error,
    revisionMapDaysResult.error,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.message).join(" | "));
  }

  return buildReferenceDataFromRows({
    subjectTiers: subjectTiersResult.data ?? [],
    quoteCatalog: quoteCatalogResult.data ?? [],
    gtPlanItems: gtPlanItemsResult.data ?? [],
    revisionMapDays: revisionMapDaysResult.data ?? [],
  });
}

export async function readRuntimeReferenceData() {
  if (getRuntimeMode() !== "supabase") {
    return getStaticReferenceData();
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    await ensureSupabaseReferenceDataSeeded();
    return loadSupabaseReferenceData(admin);
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    return loadSupabaseReferenceData(supabase);
  }

  throw new Error("Supabase runtime is active, but runtime reference data could not be loaded from Supabase.");
}

function applySupabaseSettingsRow(store: LocalStore, userId: string, row: Record<string, unknown> | null | undefined) {
  const userState = store.userState[userId];
  if (!row || !userState) {
    return;
  }

  userState.settings = normalizeSettings({
    dayOneDate: (row.day_one_date as string | null | undefined) ?? null,
    theme: ((row.theme as string | null | undefined) ?? "dark") === "light" ? "light" : "dark",
    scheduleShiftDays: (row.schedule_shift_days as number | null | undefined) ?? 0,
    shiftAppliedAt: (row.shift_applied_at as string | null | undefined) ?? null,
    shiftEvents: (row.shift_events as ScheduleShiftEvent[] | null | undefined) ?? [],
    scheduleSeedVersion: (row.schedule_seed_version as number | null | undefined) ?? 0,
    scheduleSeededAt: (row.schedule_seeded_at as string | null | undefined) ?? null,
  });
  userState.quoteState = normalizeQuoteState((row.quote_state as UserState["quoteState"] | undefined) ?? undefined);
  userState.processedDates = normalizeProcessedDates(row.processed_dates);
  userState.morningRevisionSelections = normalizeMorningRevisionSelections(row.morning_revision_selections);
  userState.morningRevisionActualMinutes = normalizeMorningRevisionActualMinutes(row.morning_revision_actual_minutes);
  userState.morningRevisionAutoAddNotice = normalizeMorningRevisionAutoAddNotice(row.morning_revision_auto_add_notice);
  store.dev.simulatedNowIso = (row.simulated_now_iso as string | null | undefined) ?? null;
}

function applySupabaseScheduleDayRows(userState: UserState, rows: Array<Record<string, unknown>> | null | undefined) {
  for (const row of rows ?? []) {
    userState.schedule.days[String(row.day_number)] = {
      dayNumber: row.day_number as number,
      phaseId: row.phase_id as string,
      phaseName: row.phase_name as string,
      phaseGroup: row.phase_group as UserState["schedule"]["days"][string]["phaseGroup"],
      primaryFocusRaw: row.primary_focus_raw as string,
      primaryFocusParts: (row.primary_focus_parts as string[] | null | undefined) ?? [],
      primaryFocusSubjectIds: (row.primary_focus_subject_ids as string[] | null | undefined) ?? [],
      resourceRaw: row.resource_raw as string,
      resourceParts: (row.resource_parts as string[] | null | undefined) ?? [],
      deliverableRaw: row.deliverable_raw as string,
      notesRaw: (row.notes_raw as string | null | undefined) ?? null,
      sourceMinutes: (row.source_minutes as number | null | undefined) ?? null,
      bufferMinutes: (row.buffer_minutes as number | null | undefined) ?? null,
      plannedStudyMinutes: (row.planned_study_minutes as number | null | undefined) ?? null,
      totalStudyHours: (row.total_study_hours as number | null | undefined) ?? null,
      gtTestType: row.gt_test_type as UserState["schedule"]["days"][string]["gtTestType"],
      gtPlanRef: (row.gt_plan_ref as string | null | undefined) ?? null,
      mappedDate: row.mapped_date as string,
      originalMappedDate: row.original_mapped_date as string,
      trafficLight: row.traffic_light as UserState["schedule"]["days"][string]["trafficLight"],
      trafficLightUpdatedAt: ((row.traffic_light_updated_at as string | null | undefined) ?? (row.updated_at as string | undefined)) as string,
      isExtensionDay: (row.is_extension_day as boolean | null | undefined) ?? false,
      shiftHiddenReason: (row.shift_hidden_reason as UserState["schedule"]["days"][string]["shiftHiddenReason"] | null | undefined) ?? null,
      mergedPartnerDay: (row.merged_partner_day as number | null | undefined) ?? null,
      createdAt: ((row.created_at as string | null | undefined) ?? (row.updated_at as string | undefined)) as string,
      updatedAt: ((row.updated_at as string | null | undefined) ?? (row.created_at as string | undefined)) as string,
    };
  }
}

function applySupabaseScheduleBlockRows(userState: UserState, rows: Array<Record<string, unknown>> | null | undefined) {
  for (const row of rows ?? []) {
    userState.schedule.blocks[`${row.day_number}:${row.block_key}`] = {
      dayNumber: row.day_number as number,
      blockKey: row.block_key as string,
      slotOrder: row.slot_order as number,
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      durationMinutes: row.duration_minutes as number,
      timelineKind: row.timeline_kind as UserState["schedule"]["blocks"][string]["timelineKind"],
      displayLabel: row.display_label as string,
      semanticBlockKey: row.semantic_block_key as string,
      blockIntent: row.block_intent as UserState["schedule"]["blocks"][string]["blockIntent"],
      trackable: row.trackable as boolean,
      rawText: row.raw_text as string,
      recoveryLane: row.recovery_lane as UserState["schedule"]["blocks"][string]["recoveryLane"],
      phaseFence: row.phase_fence as UserState["schedule"]["blocks"][string]["phaseFence"],
      defaultRevisionEligible: row.default_revision_eligible as boolean,
      reschedulable: row.reschedulable as boolean,
      trafficLightGreen: row.traffic_light_green as UserState["schedule"]["blocks"][string]["trafficLightGreen"],
      trafficLightYellow: row.traffic_light_yellow as UserState["schedule"]["blocks"][string]["trafficLightYellow"],
      trafficLightRed: row.traffic_light_red as UserState["schedule"]["blocks"][string]["trafficLightRed"],
      backlogWhenHidden: row.backlog_when_hidden as boolean,
      actualStart: (row.actual_start as string | null | undefined) ?? null,
      actualEnd: (row.actual_end as string | null | undefined) ?? null,
      timingNote: (row.timing_note as string | null | undefined) ?? null,
      timingUpdatedAt: (row.timing_updated_at as string | null | undefined) ?? null,
      createdAt: ((row.created_at as string | null | undefined) ?? (row.updated_at as string | undefined)) as string,
      updatedAt: ((row.updated_at as string | null | undefined) ?? (row.created_at as string | undefined)) as string,
    };
  }
}

function applySupabaseScheduleAssignmentRows(userState: UserState, rows: Array<Record<string, unknown>> | null | undefined) {
  for (const row of rows ?? []) {
    userState.schedule.topicAssignments[row.source_item_id as string] = {
      sourceItemId: row.source_item_id as string,
      dayNumber: row.day_number as number,
      blockKey: row.block_key as string,
      itemOrder: row.item_order as number,
      kind: row.kind as UserState["schedule"]["topicAssignments"][string]["kind"],
      label: row.label as string,
      rawText: row.raw_text as string,
      plannedMinutes: row.planned_minutes as number,
      subjectIds: (row.subject_ids as string[] | null | undefined) ?? [],
      revisionEligible: row.revision_eligible as boolean,
      recoveryLane: row.recovery_lane as UserState["schedule"]["topicAssignments"][string]["recoveryLane"],
      phaseFence: row.phase_fence as UserState["schedule"]["topicAssignments"][string]["phaseFence"],
      notes: (row.notes as string | null | undefined) ?? null,
      revisionType: (row.revision_type as UserState["schedule"]["topicAssignments"][string]["revisionType"] | null | undefined) ?? null,
      referenceLabel: (row.reference_label as string | null | undefined) ?? null,
      referenceDayNumber: (row.reference_day_number as number | null | undefined) ?? null,
      status: normalizeTopicStatus(row.status),
      completedAt: (row.completed_at as string | null | undefined) ?? null,
      sourceTag: (row.source_tag as UserState["schedule"]["topicAssignments"][string]["sourceTag"] | null | undefined) ?? null,
      note: (row.note as string | null | undefined) ?? null,
      isPinned: (row.is_pinned as boolean | null | undefined) ?? false,
      isRecovery: (row.is_recovery as boolean | null | undefined) ?? false,
      originalDayNumber: (row.original_day_number as number | null | undefined) ?? null,
      originalBlockKey: (row.original_block_key as string | null | undefined) ?? null,
      createdAt: ((row.created_at as string | null | undefined) ?? (row.updated_at as string | undefined)) as string,
      updatedAt: ((row.updated_at as string | null | undefined) ?? (row.created_at as string | undefined)) as string,
    };
  }
}

function applySupabaseRevisionCompletionRows(userState: UserState, rows: Array<Record<string, unknown>> | null | undefined) {
  for (const row of rows ?? []) {
    const revisionId = row.revision_id as string;
    const revisionType = row.revision_type as string;
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId: ((row.source_item_id as string | null | undefined) ?? parseSourceItemIdFromRevisionId(revisionId, revisionType)),
      sourceDay: row.source_day as number,
      sourceBlockKey: row.source_block_key as string,
      revisionType: revisionType as RevisionCompletion["revisionType"],
      completedAt: row.completed_at as string,
    };
  }
}

function applySupabaseBacklogItemRows(userState: UserState, rows: Array<Record<string, unknown>> | null | undefined) {
  for (const row of rows ?? []) {
    const sourceItemId = (row.source_item_id as string | null | undefined) ?? (row.id as string);
    const scheduleItem = getScheduleItemById(sourceItemId, userState);
    const subjectIds = (row.subject_ids as string[] | null | undefined)?.length
      ? (row.subject_ids as string[])
      : scheduleItem?.item.subjectIds ?? [];
    userState.backlogItems[row.id as string] = normalizeBacklogItem(
      {
        id: row.id as string,
        sourceItemId,
        originalDay: row.original_day as number,
        originalBlockKey: row.original_block_key as string,
        originalStart: (row.original_start as string | null | undefined) ?? null,
        originalEnd: (row.original_end as string | null | undefined) ?? null,
        priorityOrder: (row.priority_order as number | null | undefined) ?? 0,
        topicDescription: (row.topic_description as string | null | undefined) ?? scheduleItem?.item.label ?? (row.original_block_key as string),
        subject: (row.subject as string | null | undefined) ?? (scheduleItem?.item.subjectIds[0] ?? "General"),
        subjectIds,
        subjectTier: (row.subject_tier as string | null | undefined) as BacklogItem["subjectTier"] ?? null,
        plannedMinutes: (row.planned_minutes as number | null | undefined) ?? scheduleItem?.item.plannedMinutes ?? 0,
        sourceTag: row.source_tag as BacklogItem["sourceTag"],
        recoveryLane: (row.recovery_lane as string | null | undefined) ?? scheduleItem?.item.recoveryLane ?? "none",
        phaseFence: (row.phase_fence as string | null | undefined) ?? scheduleItem?.item.phaseFence ?? "not_reschedulable",
        phase: (row.phase as number | null | undefined) ?? null,
        manualSortOverride: (row.manual_sort_override as number | null | undefined) ?? null,
        status: row.status as BacklogItem["status"],
        suggestedDay: (row.suggested_day as number | null | undefined) ?? null,
        suggestedBlockKey: (row.suggested_block_key as string | null | undefined) ?? null,
        suggestedNote: (row.suggested_note as string | null | undefined) ?? null,
        rescheduledToDay: (row.rescheduled_to_day as number | null | undefined) ?? null,
        rescheduledToBlockKey: (row.rescheduled_to_block_key as string | null | undefined) ?? null,
        createdAt: row.created_at as string,
        updatedAt: (row.updated_at as string | null | undefined) ?? (row.created_at as string),
        completedAt: (row.completed_at as string | null | undefined) ?? null,
        dismissedAt: (row.dismissed_at as string | null | undefined) ?? null,
      },
      row.id as string,
    );
  }
}

async function ensureSupabaseScheduleSeeded(
  userId: string,
  settings: AppSettings,
  supabase: SupabaseClient,
) {
  if (!settings.dayOneDate || settings.scheduleSeedVersion >= SCHEDULE_SEED_VERSION) {
    return;
  }

  const seededAt = new Date().toISOString();
  const seededSchedule = buildSeededScheduleState(settings.dayOneDate, seededAt);
  applyScheduleMappingsFromSettings(seededSchedule, settings, seededAt);

  const [settingsResult, daysResult, blocksResult, assignmentsResult, phaseResult] = await Promise.all([
    supabase.from("app_settings").upsert(
      {
        user_id: userId,
        schedule_seed_version: SCHEDULE_SEED_VERSION,
        schedule_seeded_at: seededAt,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      },
    ),
    supabase.from("schedule_days").upsert(buildScheduleDayRows(userId, seededSchedule), {
      onConflict: "user_id,day_number",
      ignoreDuplicates: false,
    }),
    supabase.from("schedule_blocks").upsert(buildScheduleBlockRows(userId, seededSchedule), {
      onConflict: "user_id,day_number,block_key",
      ignoreDuplicates: false,
    }),
    supabase.from("schedule_topic_assignments").upsert(buildScheduleTopicAssignmentRows(userId, seededSchedule), {
      onConflict: "user_id,source_item_id",
      ignoreDuplicates: false,
    }),
    supabase.from("phase_config").upsert(buildPhaseConfigRows(userId, seededSchedule), {
      onConflict: "user_id,phase_number",
      ignoreDuplicates: false,
    }),
  ]);

  const error = [settingsResult, daysResult, blocksResult, assignmentsResult, phaseResult]
    .find((result) => result.error)?.error;

  if (error) {
    throw new Error(`schedule seed: ${error.message}`);
  }
}

async function hydrateSupabaseStore(user: LocalUser, supabase: SupabaseClient): Promise<LocalStore> {
  const store = createSessionScopedStore(user);
  const userState = store.userState[user.id];
  store.referenceData = await loadSupabaseReferenceData(supabase);

  const [
    settingsResult,
    scheduleDaysResult,
    scheduleBlocksResult,
    scheduleTopicAssignmentsResult,
    phaseConfigResult,
    revisionCompletionsResult,
    backlogItemsResult,
    mcqBulkLogsResult,
    mcqItemLogsResult,
    gtLogsResult,
    weeklySummariesResult,
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("schedule_days").select("*").eq("user_id", user.id),
    supabase.from("schedule_blocks").select("*").eq("user_id", user.id),
    supabase.from("schedule_topic_assignments").select("*").eq("user_id", user.id),
    supabase.from("phase_config").select("*").eq("user_id", user.id),
    supabase.from("revision_completions").select("*").eq("user_id", user.id),
    supabase.from("backlog_items").select("*").eq("user_id", user.id),
    supabase.from("mcq_bulk_logs").select("*").eq("user_id", user.id),
    supabase.from("mcq_item_logs").select("*").eq("user_id", user.id),
    supabase.from("gt_logs").select("*").eq("user_id", user.id),
    supabase.from("weekly_summaries").select("*").eq("user_id", user.id),
  ]);

  const errors = [
    settingsResult.error,
    scheduleDaysResult.error,
    scheduleBlocksResult.error,
    scheduleTopicAssignmentsResult.error,
    phaseConfigResult.error,
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
      scheduleSeedVersion: settingsResult.data.schedule_seed_version ?? 0,
      scheduleSeededAt: settingsResult.data.schedule_seeded_at ?? null,
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

  for (const row of scheduleDaysResult.data ?? []) {
    userState.schedule.days[String(row.day_number)] = {
      dayNumber: row.day_number,
      phaseId: row.phase_id,
      phaseName: row.phase_name,
      phaseGroup: row.phase_group,
      primaryFocusRaw: row.primary_focus_raw,
      primaryFocusParts: row.primary_focus_parts ?? [],
      primaryFocusSubjectIds: row.primary_focus_subject_ids ?? [],
      resourceRaw: row.resource_raw,
      resourceParts: row.resource_parts ?? [],
      deliverableRaw: row.deliverable_raw,
      notesRaw: row.notes_raw ?? null,
      sourceMinutes: row.source_minutes,
      bufferMinutes: row.buffer_minutes,
      plannedStudyMinutes: row.planned_study_minutes,
      totalStudyHours: row.total_study_hours,
      gtTestType: row.gt_test_type,
      gtPlanRef: row.gt_plan_ref ?? null,
      mappedDate: row.mapped_date,
      originalMappedDate: row.original_mapped_date,
      trafficLight: row.traffic_light,
      trafficLightUpdatedAt: row.traffic_light_updated_at ?? row.updated_at,
      isExtensionDay: row.is_extension_day ?? false,
      shiftHiddenReason: row.shift_hidden_reason ?? null,
      mergedPartnerDay: row.merged_partner_day ?? null,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  for (const row of scheduleBlocksResult.data ?? []) {
    userState.schedule.blocks[`${row.day_number}:${row.block_key}`] = {
      dayNumber: row.day_number,
      blockKey: row.block_key,
      slotOrder: row.slot_order,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      timelineKind: row.timeline_kind,
      displayLabel: row.display_label,
      semanticBlockKey: row.semantic_block_key,
      blockIntent: row.block_intent,
      trackable: row.trackable,
      rawText: row.raw_text,
      recoveryLane: row.recovery_lane,
      phaseFence: row.phase_fence,
      defaultRevisionEligible: row.default_revision_eligible,
      reschedulable: row.reschedulable,
      trafficLightGreen: row.traffic_light_green,
      trafficLightYellow: row.traffic_light_yellow,
      trafficLightRed: row.traffic_light_red,
      backlogWhenHidden: row.backlog_when_hidden,
      actualStart: row.actual_start ?? null,
      actualEnd: row.actual_end ?? null,
      timingNote: row.timing_note ?? null,
      timingUpdatedAt: row.timing_updated_at ?? null,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  for (const row of scheduleTopicAssignmentsResult.data ?? []) {
    userState.schedule.topicAssignments[row.source_item_id] = {
      sourceItemId: row.source_item_id,
      dayNumber: row.day_number,
      blockKey: row.block_key,
      itemOrder: row.item_order,
      kind: row.kind,
      label: row.label,
      rawText: row.raw_text,
      plannedMinutes: row.planned_minutes,
      subjectIds: row.subject_ids ?? [],
      revisionEligible: row.revision_eligible,
      recoveryLane: row.recovery_lane,
      phaseFence: row.phase_fence,
      notes: row.notes ?? null,
      revisionType: row.revision_type ?? null,
      referenceLabel: row.reference_label ?? null,
      referenceDayNumber: row.reference_day_number ?? null,
      status: normalizeTopicStatus(row.status),
      completedAt: row.completed_at ?? null,
      sourceTag: row.source_tag ?? null,
      note: row.note ?? null,
      isPinned: row.is_pinned ?? false,
      isRecovery: row.is_recovery ?? false,
      originalDayNumber: row.original_day_number ?? null,
      originalBlockKey: row.original_block_key ?? null,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  for (const row of phaseConfigResult.data ?? []) {
    userState.schedule.phaseConfig[String(row.phase_number)] = {
      phaseNumber: row.phase_number,
      phaseId: row.phase_id,
      originalStartDay: row.original_start_day,
      originalEndDay: row.original_end_day,
      extensionBudget: row.extension_budget,
      extensionsUsed: row.extensions_used ?? 0,
      currentStartDay: row.current_start_day,
      currentEndDay: row.current_end_day,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
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
    const sourceItemId = row.source_item_id ?? row.id;
    const scheduleItem = getScheduleItemById(sourceItemId);
    const rowSubjectIds = (row.subject_ids as string[] | null | undefined)?.length
      ? (row.subject_ids as string[])
      : scheduleItem?.item.subjectIds ?? [];
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
        subjectIds: rowSubjectIds,
        subjectTier: (row.subject_tier as string | null | undefined) as BacklogItem["subjectTier"] ?? null,
        plannedMinutes: (row.planned_minutes as number | null | undefined) ?? scheduleItem?.item.plannedMinutes ?? 0,
        sourceTag: row.source_tag,
        recoveryLane: (row.recovery_lane as string | null | undefined) ?? scheduleItem?.item.recoveryLane ?? "none",
        phaseFence: (row.phase_fence as string | null | undefined) ?? scheduleItem?.item.phaseFence ?? "not_reschedulable",
        phase: (row.phase as number | null | undefined) ?? null,
        manualSortOverride: (row.manual_sort_override as number | null | undefined) ?? null,
        status: row.status,
        suggestedDay: row.suggested_day,
        suggestedBlockKey: row.suggested_block_key,
        suggestedNote: row.suggested_note,
        rescheduledToDay: row.rescheduled_to_day,
        rescheduledToBlockKey: row.rescheduled_to_block_key,
        createdAt: row.created_at,
        updatedAt: (row.updated_at as string | null | undefined) ?? row.created_at,
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

async function hydrateSupabaseScheduleStore(user: LocalUser, supabase: SupabaseClient): Promise<LocalStore> {
  const store = createSessionScopedStore(user);
  const userState = store.userState[user.id];
  store.referenceData = await loadSupabaseReferenceData(supabase);

  const [
    settingsResult,
    scheduleDaysResult,
    scheduleBlocksResult,
    scheduleTopicAssignmentsResult,
    phaseConfigResult,
    revisionCompletionsResult,
    backlogItemsResult,
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("schedule_days").select("*").eq("user_id", user.id),
    supabase.from("schedule_blocks").select("*").eq("user_id", user.id),
    supabase.from("schedule_topic_assignments").select("*").eq("user_id", user.id),
    supabase.from("phase_config").select("*").eq("user_id", user.id),
    supabase.from("revision_completions").select("*").eq("user_id", user.id),
    supabase.from("backlog_items").select("*").eq("user_id", user.id),
  ]);

  const errors = [
    settingsResult.error,
    scheduleDaysResult.error,
    scheduleBlocksResult.error,
    scheduleTopicAssignmentsResult.error,
    phaseConfigResult.error,
    revisionCompletionsResult.error,
    backlogItemsResult.error,
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
      scheduleSeedVersion: settingsResult.data.schedule_seed_version ?? 0,
      scheduleSeededAt: settingsResult.data.schedule_seeded_at ?? null,
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

  for (const row of scheduleDaysResult.data ?? []) {
    userState.schedule.days[String(row.day_number)] = {
      dayNumber: row.day_number,
      phaseId: row.phase_id,
      phaseName: row.phase_name,
      phaseGroup: row.phase_group,
      primaryFocusRaw: row.primary_focus_raw,
      primaryFocusParts: row.primary_focus_parts ?? [],
      primaryFocusSubjectIds: row.primary_focus_subject_ids ?? [],
      resourceRaw: row.resource_raw,
      resourceParts: row.resource_parts ?? [],
      deliverableRaw: row.deliverable_raw,
      notesRaw: row.notes_raw ?? null,
      sourceMinutes: row.source_minutes,
      bufferMinutes: row.buffer_minutes,
      plannedStudyMinutes: row.planned_study_minutes,
      totalStudyHours: row.total_study_hours,
      gtTestType: row.gt_test_type,
      gtPlanRef: row.gt_plan_ref ?? null,
      mappedDate: row.mapped_date,
      originalMappedDate: row.original_mapped_date,
      trafficLight: row.traffic_light,
      trafficLightUpdatedAt: row.traffic_light_updated_at ?? row.updated_at,
      isExtensionDay: row.is_extension_day ?? false,
      shiftHiddenReason: row.shift_hidden_reason ?? null,
      mergedPartnerDay: row.merged_partner_day ?? null,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  for (const row of scheduleBlocksResult.data ?? []) {
    userState.schedule.blocks[`${row.day_number}:${row.block_key}`] = {
      dayNumber: row.day_number,
      blockKey: row.block_key,
      slotOrder: row.slot_order,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      timelineKind: row.timeline_kind,
      displayLabel: row.display_label,
      semanticBlockKey: row.semantic_block_key,
      blockIntent: row.block_intent,
      trackable: row.trackable,
      rawText: row.raw_text,
      recoveryLane: row.recovery_lane,
      phaseFence: row.phase_fence,
      defaultRevisionEligible: row.default_revision_eligible,
      reschedulable: row.reschedulable,
      trafficLightGreen: row.traffic_light_green,
      trafficLightYellow: row.traffic_light_yellow,
      trafficLightRed: row.traffic_light_red,
      backlogWhenHidden: row.backlog_when_hidden,
      actualStart: row.actual_start ?? null,
      actualEnd: row.actual_end ?? null,
      timingNote: row.timing_note ?? null,
      timingUpdatedAt: row.timing_updated_at ?? null,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  for (const row of scheduleTopicAssignmentsResult.data ?? []) {
    userState.schedule.topicAssignments[row.source_item_id] = {
      sourceItemId: row.source_item_id,
      dayNumber: row.day_number,
      blockKey: row.block_key,
      itemOrder: row.item_order,
      kind: row.kind,
      label: row.label,
      rawText: row.raw_text,
      plannedMinutes: row.planned_minutes,
      subjectIds: row.subject_ids ?? [],
      revisionEligible: row.revision_eligible,
      recoveryLane: row.recovery_lane,
      phaseFence: row.phase_fence,
      notes: row.notes ?? null,
      revisionType: row.revision_type ?? null,
      referenceLabel: row.reference_label ?? null,
      referenceDayNumber: row.reference_day_number ?? null,
      status: normalizeTopicStatus(row.status),
      completedAt: row.completed_at ?? null,
      sourceTag: row.source_tag ?? null,
      note: row.note ?? null,
      isPinned: row.is_pinned ?? false,
      isRecovery: row.is_recovery ?? false,
      originalDayNumber: row.original_day_number ?? null,
      originalBlockKey: row.original_block_key ?? null,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
  }

  for (const row of phaseConfigResult.data ?? []) {
    userState.schedule.phaseConfig[String(row.phase_number)] = {
      phaseNumber: row.phase_number,
      phaseId: row.phase_id,
      originalStartDay: row.original_start_day,
      originalEndDay: row.original_end_day,
      extensionBudget: row.extension_budget,
      extensionsUsed: row.extensions_used ?? 0,
      currentStartDay: row.current_start_day,
      currentEndDay: row.current_end_day,
      createdAt: row.created_at ?? row.updated_at,
      updatedAt: row.updated_at ?? row.created_at,
    };
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
    const sourceItemId = row.source_item_id ?? row.id;
    const scheduleItem = getScheduleItemById(sourceItemId, userState);
    const rowSubjectIds = (row.subject_ids as string[] | null | undefined)?.length
      ? (row.subject_ids as string[])
      : scheduleItem?.item.subjectIds ?? [];
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
        subjectIds: rowSubjectIds,
        subjectTier: (row.subject_tier as string | null | undefined) as BacklogItem["subjectTier"] ?? null,
        plannedMinutes: (row.planned_minutes as number | null | undefined) ?? scheduleItem?.item.plannedMinutes ?? 0,
        sourceTag: row.source_tag,
        recoveryLane: (row.recovery_lane as string | null | undefined) ?? scheduleItem?.item.recoveryLane ?? "none",
        phaseFence: (row.phase_fence as string | null | undefined) ?? scheduleItem?.item.phaseFence ?? "not_reschedulable",
        phase: (row.phase as number | null | undefined) ?? null,
        manualSortOverride: (row.manual_sort_override as number | null | undefined) ?? null,
        status: row.status,
        suggestedDay: row.suggested_day,
        suggestedBlockKey: row.suggested_block_key,
        suggestedNote: row.suggested_note,
        rescheduledToDay: row.rescheduled_to_day,
        rescheduledToBlockKey: row.rescheduled_to_block_key,
        createdAt: row.created_at,
        updatedAt: (row.updated_at as string | null | undefined) ?? row.created_at,
        completedAt: row.completed_at,
        dismissedAt: row.dismissed_at,
      },
      row.id,
    );
  }

  store.userState[user.id] = normalizeUserState(userState);
  return store;
}

async function getSupabaseScheduleReadContext() {
  const { supabase, user } = await requireSupabaseRequestUser();
  const localUser = asSupabaseUser(user);
  await ensureSupabaseReferenceDataSeeded();

  const settingsResult = await supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle();
  if (settingsResult.error) {
    throw new Error(`Unable to read the Supabase app settings: ${settingsResult.error.message}`);
  }

  if (settingsResult.data) {
    await ensureSupabaseScheduleSeeded(
      user.id,
      normalizeSettings({
        dayOneDate: settingsResult.data.day_one_date,
        theme: settingsResult.data.theme ?? "dark",
        scheduleShiftDays: settingsResult.data.schedule_shift_days ?? 0,
        shiftAppliedAt: settingsResult.data.shift_applied_at ?? null,
        shiftEvents: settingsResult.data.shift_events ?? [],
        scheduleSeedVersion: settingsResult.data.schedule_seed_version ?? 0,
        scheduleSeededAt: settingsResult.data.schedule_seeded_at ?? null,
      }),
      supabase,
    );
  }

  return { supabase, user, localUser, settingsRow: settingsResult.data ?? null };
}

function buildScheduleAssignmentOrFilter(dayNumbers: number[]) {
  if (dayNumbers.length === 0) {
    return "revision_eligible.eq.true";
  }

  return `revision_eligible.eq.true,day_number.in.(${dayNumbers.join(",")})`;
}

function dedupeRows<T>(rows: T[], getKey: (row: T) => string) {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    byKey.set(getKey(row), row);
  }
  return [...byKey.values()];
}

async function loadVisibleScheduleDaysUpToDate(
  userId: string,
  supabase: SupabaseClient,
  todayDate: string,
  limit: number,
) {
  const result = await supabase
    .from("schedule_days")
    .select("*")
    .eq("user_id", userId)
    .is("shift_hidden_reason", null)
    .lte("mapped_date", todayDate)
    .order("mapped_date", { ascending: false })
    .order("day_number", { ascending: false })
    .limit(limit);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return [...(result.data ?? [])].toSorted((left, right) => left.day_number - right.day_number);
}

async function loadScheduleDaysByNumbers(userId: string, supabase: SupabaseClient, dayNumbers: number[]) {
  if (dayNumbers.length === 0) {
    return [] as Array<Record<string, unknown>>;
  }

  const result = await supabase.from("schedule_days").select("*").eq("user_id", userId).in("day_number", dayNumbers);
  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).toSorted((left, right) => left.day_number - right.day_number);
}

async function loadRevisionCompletionsForSourceItems(userId: string, supabase: SupabaseClient, sourceItemIds: string[]) {
  if (sourceItemIds.length === 0) {
    return [] as Array<Record<string, unknown>>;
  }

  const rows: Array<Record<string, unknown>> = [];
  for (let index = 0; index < sourceItemIds.length; index += 200) {
    const batch = sourceItemIds.slice(index, index + 200);
    const result = await supabase.from("revision_completions").select("*").eq("user_id", userId).in("source_item_id", batch);
    if (result.error) {
      throw new Error(result.error.message);
    }
    rows.push(...(result.data ?? []));
  }

  return rows;
}

async function loadPendingBacklogItems(userId: string, supabase: SupabaseClient) {
  const result = await supabase.from("backlog_items").select("*").eq("user_id", userId).eq("status", "pending");
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data ?? [];
}

async function loadRescheduledBacklogItemsForDay(userId: string, supabase: SupabaseClient, dayNumber: number) {
  if (dayNumber <= 0) {
    return [] as Array<Record<string, unknown>>;
  }

  const result = await supabase
    .from("backlog_items")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "rescheduled")
    .eq("rescheduled_to_day", dayNumber);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data ?? [];
}

async function hydrateSupabaseScheduleBrowserReadStore(user: LocalUser, supabase: SupabaseClient, settingsRow: Record<string, unknown> | null) {
  const store = createSessionScopedStore(user);
  const userState = store.userState[user.id];
  store.referenceData = await loadSupabaseReferenceData(supabase);
  applySupabaseSettingsRow(store, user.id, settingsRow);

  const [scheduleDaysResult, scheduleAssignmentsResult] = await Promise.all([
    supabase.from("schedule_days").select("*").eq("user_id", user.id),
    supabase.from("schedule_topic_assignments").select("*").eq("user_id", user.id),
  ]);

  const errors = [
    scheduleDaysResult.error,
    scheduleAssignmentsResult.error,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.message).join(" | "));
  }

  applySupabaseScheduleDayRows(userState, scheduleDaysResult.data);
  applySupabaseScheduleAssignmentRows(userState, scheduleAssignmentsResult.data);

  store.userState[user.id] = normalizeUserState(userState);
  return store;
}

async function hydrateSupabaseTodayReadStore(user: LocalUser, supabase: SupabaseClient, settingsRow: Record<string, unknown> | null) {
  const store = createSessionScopedStore(user);
  const userState = store.userState[user.id];
  store.referenceData = await loadSupabaseReferenceData(supabase);
  applySupabaseSettingsRow(store, user.id, settingsRow);

  const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
  const visibleDays = await loadVisibleScheduleDaysUpToDate(user.id, supabase, todayDate, 7);
  const todayDayNumber = visibleDays.at(-1)?.day_number ?? 0;
  const dayNumbers = visibleDays.map((row) => row.day_number);

  const assignmentsResult = await supabase
    .from("schedule_topic_assignments")
    .select("*")
    .eq("user_id", user.id)
    .or(buildScheduleAssignmentOrFilter(dayNumbers));

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const revisionSourceItemIds = [...new Set((assignmentsResult.data ?? [])
    .filter((row) => row.revision_eligible === true)
    .map((row) => row.source_item_id as string))];
  const [revisionCompletionRows, pendingBacklogRows, scheduledRecoveryRows, blockRows] = await Promise.all([
    loadRevisionCompletionsForSourceItems(user.id, supabase, revisionSourceItemIds),
    loadPendingBacklogItems(user.id, supabase),
    loadRescheduledBacklogItemsForDay(user.id, supabase, todayDayNumber),
    todayDayNumber > 0
      ? supabase.from("schedule_blocks").select("*").eq("user_id", user.id).eq("day_number", todayDayNumber)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (blockRows.error) {
    throw new Error(blockRows.error.message);
  }

  applySupabaseScheduleDayRows(userState, visibleDays);
  applySupabaseScheduleBlockRows(userState, blockRows.data);
  applySupabaseScheduleAssignmentRows(userState, assignmentsResult.data);
  applySupabaseRevisionCompletionRows(userState, revisionCompletionRows);
  applySupabaseBacklogItemRows(userState, dedupeRows(
    [...pendingBacklogRows, ...scheduledRecoveryRows],
    (row) => String(row.id),
  ));

  store.userState[user.id] = normalizeUserState(userState);
  return store;
}

async function hydrateSupabaseScheduleDayReadStore(
  user: LocalUser,
  supabase: SupabaseClient,
  settingsRow: Record<string, unknown> | null,
  dayNumber: number,
) {
  const store = createSessionScopedStore(user);
  const userState = store.userState[user.id];
  store.referenceData = await loadSupabaseReferenceData(supabase);
  applySupabaseSettingsRow(store, user.id, settingsRow);
  const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
  const [currentVisibleDays, dayRows] = await Promise.all([
    loadVisibleScheduleDaysUpToDate(user.id, supabase, todayDate, 1),
    loadScheduleDaysByNumbers(user.id, supabase, dayNumber > 0 ? [dayNumber] : []),
  ]);

  const assignmentsResult = await supabase
    .from("schedule_topic_assignments")
    .select("*")
    .eq("user_id", user.id)
    .or(buildScheduleAssignmentOrFilter(dayNumber > 0 ? [dayNumber] : []));

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const revisionSourceItemIds = [...new Set((assignmentsResult.data ?? [])
    .filter((row) => row.revision_eligible === true)
    .map((row) => row.source_item_id as string))];
  const [revisionCompletionRows, scheduledRecoveryRows, blockRows] = await Promise.all([
    loadRevisionCompletionsForSourceItems(user.id, supabase, revisionSourceItemIds),
    loadRescheduledBacklogItemsForDay(user.id, supabase, dayNumber),
    dayNumber > 0
      ? supabase.from("schedule_blocks").select("*").eq("user_id", user.id).eq("day_number", dayNumber)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (blockRows.error) {
    throw new Error(blockRows.error.message);
  }

  applySupabaseScheduleDayRows(userState, dedupeRows(
    [...currentVisibleDays, ...dayRows],
    (row) => String(row.day_number),
  ));
  applySupabaseScheduleBlockRows(userState, blockRows.data);
  applySupabaseScheduleAssignmentRows(userState, assignmentsResult.data);
  applySupabaseRevisionCompletionRows(userState, revisionCompletionRows);
  applySupabaseBacklogItemRows(userState, scheduledRecoveryRows);

  store.userState[user.id] = normalizeUserState(userState);
  return store;
}

async function persistSupabaseScheduleReadStore(nextStore: LocalStore, previousStore: LocalStore) {
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

  const changedAssignments = Object.keys(nextState.schedule.topicAssignments).some((key) => {
    return JSON.stringify(nextState.schedule.topicAssignments[key]) !== JSON.stringify(previousState.schedule.topicAssignments[key]);
  });
  const changedBacklog = Object.keys(nextState.backlogItems).some((key) => {
    return JSON.stringify(nextState.backlogItems[key]) !== JSON.stringify(previousState.backlogItems[key]);
  }) || Object.keys(nextState.backlogItems).length !== Object.keys(previousState.backlogItems).length;

  const { error: settingsError } = await supabase.from("app_settings").upsert(buildAppSettingsRow(userId, nextStore, nextState), {
    onConflict: "user_id",
    ignoreDuplicates: false,
  });

  if (settingsError) {
    throw new Error(`app_settings: ${settingsError.message}`);
  }

  const writes: Promise<unknown>[] = [];

  if (changedAssignments) {
    writes.push(
      Promise.resolve(
        supabase.from("schedule_topic_assignments").upsert(buildScheduleTopicAssignmentRows(userId, nextState.schedule), {
          onConflict: "user_id,source_item_id",
          ignoreDuplicates: false,
        }),
      ).then(({ error }) => {
        if (error) {
          throw new Error(`schedule_topic_assignments: ${error.message}`);
        }
      }),
    );
  }

  if (changedBacklog) {
    const backlogRows = buildBacklogRows(userId, nextState);
    if (backlogRows.length > 0) {
      writes.push(
        Promise.resolve(
          supabase.from("backlog_items").upsert(backlogRows, {
            onConflict: "id",
            ignoreDuplicates: false,
          }),
        ).then(({ error }) => {
          if (error) {
            throw new Error(`backlog_items: ${error.message}`);
          }
        }),
      );
    }
  }

  await Promise.all(writes);
}

async function loadSupabaseStore(): Promise<LocalStore> {
  const { supabase, localUser } = await getSupabaseScheduleReadContext();
  return hydrateSupabaseStore(localUser, supabase);
}

async function loadSupabaseScheduleStore(): Promise<LocalStore> {
  const { supabase, localUser } = await getSupabaseScheduleReadContext();
  return hydrateSupabaseScheduleStore(localUser, supabase);
}

async function loadSupabaseTodayReadStore() {
  const { supabase, localUser, settingsRow } = await getSupabaseScheduleReadContext();
  return hydrateSupabaseTodayReadStore(localUser, supabase, settingsRow);
}

async function loadSupabaseScheduleBrowserReadStore() {
  const { supabase, localUser, settingsRow } = await getSupabaseScheduleReadContext();
  return hydrateSupabaseScheduleBrowserReadStore(localUser, supabase, settingsRow);
}

async function loadSupabaseScheduleDayReadStore(dayNumber: number) {
  const { supabase, localUser, settingsRow } = await getSupabaseScheduleReadContext();
  return hydrateSupabaseScheduleDayReadStore(localUser, supabase, settingsRow, dayNumber);
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

async function syncRevisionCompletionRows(
  userId: string,
  rows: Record<string, unknown>[],
  supabase: SupabaseClient,
) {
  const { error: deleteError } = await supabase.from("revision_completions").delete().eq("user_id", userId);
  if (deleteError) {
    throw new Error(`revision_completions: ${deleteError.message}`);
  }

  if (rows.length === 0) {
    return;
  }

  const { error: upsertError } = await supabase.from("revision_completions").upsert(rows, {
    onConflict: "user_id,revision_id",
    ignoreDuplicates: false,
  });

  if (upsertError) {
    throw new Error(`revision_completions: ${upsertError.message}`);
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
      schedule_seed_version: nextState.settings.scheduleSeedVersion,
      schedule_seeded_at: nextState.settings.scheduleSeededAt,
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

  const scheduleDayRows = buildScheduleDayRows(userId, nextState.schedule);
  const scheduleBlockRows = buildScheduleBlockRows(userId, nextState.schedule);
  const scheduleTopicAssignmentRows = buildScheduleTopicAssignmentRows(userId, nextState.schedule);
  const phaseConfigRows = buildPhaseConfigRows(userId, nextState.schedule);
  const revisionCompletionRows = Object.values(nextState.revisionCompletions).map((entry) => ({
    user_id: userId,
    revision_id: entry.revisionId,
    source_item_id: entry.sourceItemId,
    source_day: entry.sourceDay,
    source_block_key: entry.sourceBlockKey,
    revision_type: entry.revisionType,
    completed_at: entry.completedAt,
  }));

  await Promise.all([
    syncUserRows(
      {
        table: "schedule_days",
        userId,
        onConflict: "user_id,day_number",
        previousCount: Object.keys(previousState.schedule.days).length,
        rows: scheduleDayRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "schedule_blocks",
        userId,
        onConflict: "user_id,day_number,block_key",
        previousCount: Object.keys(previousState.schedule.blocks).length,
        rows: scheduleBlockRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "schedule_topic_assignments",
        userId,
        onConflict: "user_id,source_item_id",
        previousCount: Object.keys(previousState.schedule.topicAssignments).length,
        rows: scheduleTopicAssignmentRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "phase_config",
        userId,
        onConflict: "user_id,phase_number",
        previousCount: Object.keys(previousState.schedule.phaseConfig).length,
        rows: phaseConfigRows,
      },
      supabase,
    ),
    syncRevisionCompletionRows(userId, revisionCompletionRows, supabase),
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

async function persistSupabaseScheduleStore(nextStore: LocalStore, previousStore: LocalStore) {
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
      schedule_seed_version: nextState.settings.scheduleSeedVersion,
      schedule_seeded_at: nextState.settings.scheduleSeededAt,
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

  const scheduleDayRows = buildScheduleDayRows(userId, nextState.schedule);
  const scheduleBlockRows = buildScheduleBlockRows(userId, nextState.schedule);
  const scheduleTopicAssignmentRows = buildScheduleTopicAssignmentRows(userId, nextState.schedule);
  const phaseConfigRows = buildPhaseConfigRows(userId, nextState.schedule);
  const revisionCompletionRows = Object.values(nextState.revisionCompletions).map((entry) => ({
    user_id: userId,
    revision_id: entry.revisionId,
    source_item_id: entry.sourceItemId,
    source_day: entry.sourceDay,
    source_block_key: entry.sourceBlockKey,
    revision_type: entry.revisionType,
    completed_at: entry.completedAt,
  }));

  await Promise.all([
    syncUserRows(
      {
        table: "schedule_days",
        userId,
        onConflict: "user_id,day_number",
        previousCount: Object.keys(previousState.schedule.days).length,
        rows: scheduleDayRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "schedule_blocks",
        userId,
        onConflict: "user_id,day_number,block_key",
        previousCount: Object.keys(previousState.schedule.blocks).length,
        rows: scheduleBlockRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "schedule_topic_assignments",
        userId,
        onConflict: "user_id,source_item_id",
        previousCount: Object.keys(previousState.schedule.topicAssignments).length,
        rows: scheduleTopicAssignmentRows,
      },
      supabase,
    ),
    syncUserRows(
      {
        table: "phase_config",
        userId,
        onConflict: "user_id,phase_number",
        previousCount: Object.keys(previousState.schedule.phaseConfig).length,
        rows: phaseConfigRows,
      },
      supabase,
    ),
    syncRevisionCompletionRows(userId, revisionCompletionRows, supabase),
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
  ]);
}

export async function persistSupabaseStoreForUser(nextStore: LocalStore, previousStore: LocalStore, supabase: SupabaseClient) {
  void supabase;
  await persistSupabaseStore(nextStore, previousStore);
}

function reconcileStoreScheduleState(store: LocalStore) {
  const updatedAt = getEffectiveNow(store).toISOString();

  for (const userState of Object.values(store.userState)) {
    if (userState.settings.dayOneDate) {
      ensureUserScheduleSeeded(userState, userState.settings.scheduleSeededAt ?? updatedAt);
      applyScheduleMappingsFromSettings(userState.schedule, userState.settings, updatedAt);
      continue;
    }

    userState.schedule = createEmptyScheduleState();
  }
}

export async function readStore(): Promise<LocalStore> {
  return getRuntimeMode() === "supabase" ? loadSupabaseStore() : readLocalStore();
}

export async function writeStore(store: LocalStore) {
  reconcileStoreScheduleState(store);

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
    reconcileStoreScheduleState(store);

    if (JSON.stringify(store) !== JSON.stringify(previous)) {
      await persistSupabaseStore(store, previous);
    }

    return result;
  }

  return withLocalMutationLock(async () => {
    const store = await readLocalStore();
    const result = await mutator(store);
    reconcileStoreScheduleState(store);
    // Always write: avoids expensive structuredClone + double JSON.stringify
    // comparison on the full store. The disk write (single stringify) is
    // far cheaper than the clone + compare that was here before.
    await writeLocalStore(store);
    return result;
  });
}

export async function mutateScheduleStore<T>(mutator: (store: LocalStore) => T | Promise<T>): Promise<T> {
  if (getRuntimeMode() === "supabase") {
    const store = await loadSupabaseScheduleStore();
    const previous = structuredClone(store);
    const result = await mutator(store);
    reconcileStoreScheduleState(store);

    if (JSON.stringify(store) !== JSON.stringify(previous)) {
      await persistSupabaseScheduleStore(store, previous);
    }

    return result;
  }

  return mutateStore(mutator);
}

async function runScopedScheduleReader<T>(
  loader: () => Promise<LocalStore>,
  reader: (store: LocalStore) => T | Promise<T>,
) {
  if (getRuntimeMode() !== "supabase") {
    return mutateStore(reader);
  }

  const store = await loader();
  const previous = structuredClone(store);
  const result = await reader(store);

  if (JSON.stringify(store) !== JSON.stringify(previous)) {
    await persistSupabaseScheduleReadStore(store, previous);
  }

  return result;
}

export async function readTodayStore<T>(reader: (store: LocalStore) => T | Promise<T>): Promise<T> {
  return runScopedScheduleReader(loadSupabaseTodayReadStore, reader);
}

export async function readScheduleBrowserStore<T>(reader: (store: LocalStore) => T | Promise<T>): Promise<T> {
  return runScopedScheduleReader(loadSupabaseScheduleBrowserReadStore, reader);
}

export async function readScheduleDayStore<T>(
  dayNumber: number,
  reader: (store: LocalStore) => T | Promise<T>,
): Promise<T> {
  return runScopedScheduleReader(() => loadSupabaseScheduleDayReadStore(dayNumber), reader);
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
