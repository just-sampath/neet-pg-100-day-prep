import { randomUUID } from "node:crypto";

import { getQuotePools } from "@/lib/data/reference-data";
import {
  completeAssignedRecoveryForTarget,
  getBacklogQueueItems,
  getBacklogStatusCounts,
  getBacklogSummary,
  getBacklogSourceLabel,
  getNextBacklogPriorityOrder,
  getScheduledRecoveryForDay,
  refreshBacklogSuggestions,
  releaseAssignedRecoveryForTarget,
  sortBacklogQueue,
  TIER_LABELS,
} from "@/lib/domain/backlog-queue";
import { getTrafficLightBacklogSourceTag, previewOverrunCascade, resolvePhase, resolveSubjectTier, shouldCreateBacklogItem } from "@/lib/domain/backlog";
import { HARD_BOUNDARY_DATE, MORNING_REVISION_SLOT_PLAN, NO_DUE_MORNING_REVISION_NOTE } from "@/lib/domain/constants";
import { runRepackAlgorithm } from "@/lib/domain/repack";
import type { ExtensionContext } from "@/lib/domain/repack";
import {
  buildGtComparisonSummary,
  buildGtDashboardSummary,
  buildGtScoreTrend,
  buildGtSectionPatterns,
  buildGtSectionTimeLostSummary,
  buildGtWeaknessPatterns,
  buildGtWrapperTrend,
  getMappedGtSchedule,
  getSuggestedGtPlanItem,
} from "@/lib/domain/gt";
import {
  buildMcqAccuracyBySubject,
  buildMcqBreakdownData,
  buildMcqDashboardSummary,
  buildMcqTrendData,
  getMcqRecentSources,
  getMcqRecentTopics,
  getMcqSubjectOptions,
  getMcqTopCauseCodes,
  getMcqTopWrongSubjects,
} from "@/lib/domain/mcq";
import { getTodayQuoteSelection } from "@/lib/domain/quotes";
import {
  buildDailyRevisionPlan,
  buildRevisionInventory,
  groupRevisionItemsForDisplay,
  getBacklogCount,
  getBlockProgress,
  getCurrentDayNumber,
  getDayCompletionState,
  getDayState,
  getDisplayBlockDescription,
  getMappedDate,
  getMorningRevisionStatsForDate,
  getMergedPartner,
  getOriginalPlannedDate,
  getPhaseDayStatus,
  getSafeDayCountLabel,
  getScheduleDay,
  getScheduleDays,
  getScheduleDayEditState,
  getScheduleItemById,
  getScheduleHealth,
  getShiftHiddenDayLabel,
  getShiftPreview,
  getSubjectFromPrimaryFocus,
  getTopicProgress,
  getTrackableBlocks,
  getVisibleBlockKeys,
  invalidateRuntimeScheduleIndex,
  isCompressedHiddenDay,
  reconcileRevisionCompletionsForSource,
} from "@/lib/domain/schedule";
import { findWeeklySummaryByWeekKey, getWeeklyScheduleStatus, WEEKLY_AUTOMATION_MINUTES } from "@/lib/domain/weekly";
import type {
  AppSettings,
  BacklogQueueViewItem,
  BacklogSourceTag,
  BacklogSortMode,
  BacklogViewFilter,
  BlockKey,
  BlockTiming,
  GtLog,
  LocalStore,
  RevisionType,
  ScheduleBlockRow,
  ScheduleDayRow,
  SubjectTier,
  TopicProgress,
  TopicStatus,
  TrafficLight,
  UserState,
  WeeklySummary,
} from "@/lib/domain/types";
import { getEffectiveNow } from "@/lib/data/local-store";
import { getRuntimeMode } from "@/lib/runtime/mode";
import {
  addDaysToDateOnly,
  getMinutesInTimeZone,
  getWeekdayInTimeZone,
  IST_TIME_ZONE,
  toDateOnlyInTimeZone,
  weekBounds,
} from "@/lib/utils/date";
import { applyScheduleMappingsFromSettings, buildExtensionDayRows, ensureUserScheduleSeeded, getExtensionDayCapacityTemplate } from "@/lib/data/schedule-seed";

function timingKey(dayNumber: number, blockKey: BlockKey) {
  return `${dayNumber}:${blockKey}`;
}

const MORNING_REVISION_MAX_MINUTES = MORNING_REVISION_SLOT_PLAN.reduce((sum, slot) => sum + slot.durationMinutes, 0);

function parseRevisionTypeFromRevisionId(revisionId: string): RevisionType | null {
  const revisionType = revisionId.split(":").at(-1);
  if (!revisionType || !["D+1", "D+3", "D+7", "D+14", "D+28"].includes(revisionType)) {
    return null;
  }
  return revisionType as RevisionType;
}

function parseSourceItemIdFromRevisionId(revisionId: string, revisionType: RevisionType) {
  const suffix = `:${revisionType}`;
  return revisionId.endsWith(suffix) ? revisionId.slice(0, -suffix.length) : revisionId;
}

function getRevisionDurationMinutes(revisionType: RevisionType) {
  return MORNING_REVISION_SLOT_PLAN.find((slot) => slot.revisionType === revisionType)?.durationMinutes ?? 0;
}

function getPlannedRevisionMinutesFromIds(revisionIds: string[]) {
  return revisionIds.reduce((sum, revisionId) => {
    const revisionType = parseRevisionTypeFromRevisionId(revisionId);
    return revisionType ? sum + getRevisionDurationMinutes(revisionType) : sum;
  }, 0);
}

function clearMorningRevisionAutoAddNoticeForDate(userState: UserState, targetDate: string) {
  if (!userState.morningRevisionAutoAddNotice[targetDate]) {
    return;
  }
  delete userState.morningRevisionAutoAddNotice[targetDate];
}

function getCompletedMorningSessionMinutesForDate(userState: UserState, targetDate: string) {
  const selectedRevisionIds = userState.morningRevisionSelections[targetDate] ?? [];
  if (selectedRevisionIds.length === 0) {
    return 0;
  }

  const plannedMinutesBySource = new Map<string, number>();
  for (const revisionId of selectedRevisionIds) {
    const completion = userState.revisionCompletions[revisionId];
    if (!completion) {
      continue;
    }

    const revisionType = completion.revisionType ?? parseRevisionTypeFromRevisionId(revisionId);
    if (!revisionType) {
      continue;
    }

    const sourceItemId = completion.sourceItemId || parseSourceItemIdFromRevisionId(revisionId, revisionType);
    const plannedMinutes = getRevisionDurationMinutes(revisionType);
    plannedMinutesBySource.set(sourceItemId, (plannedMinutesBySource.get(sourceItemId) ?? 0) + plannedMinutes);
  }

  const actualMinutesBySource = userState.morningRevisionActualMinutes[targetDate] ?? {};
  let totalMinutes = 0;
  for (const [sourceItemId, plannedMinutes] of plannedMinutesBySource) {
    const actualMinutes = actualMinutesBySource[sourceItemId];
    totalMinutes += typeof actualMinutes === "number" && actualMinutes > 0
      ? Math.min(actualMinutes, plannedMinutes)
      : plannedMinutes;
  }

  return totalMinutes;
}

function maybeAutoAddMorningRevisionSession(
  userState: UserState,
  targetDate: string,
  sourceItemId: string,
  actualMinutes: number,
  plannedSessionMinutes: number,
  completedAt: string,
  referenceData?: LocalStore["referenceData"],
) {
  if (plannedSessionMinutes <= 0) {
    return;
  }

  const normalizedActualMinutes = Math.max(1, Math.min(Math.round(actualMinutes), plannedSessionMinutes));
  if (!userState.morningRevisionActualMinutes[targetDate]) {
    userState.morningRevisionActualMinutes[targetDate] = {};
  }
  userState.morningRevisionActualMinutes[targetDate]![sourceItemId] = normalizedActualMinutes;

  const savedMinutes = plannedSessionMinutes - normalizedActualMinutes;
  if (savedMinutes <= 0) {
    return;
  }

  const plan = buildDailyRevisionPlan(targetDate, userState, userState.settings, referenceData);
  const selectedRevisionIds = userState.morningRevisionSelections[targetDate] ?? [];
  const selectedRevisionIdSet = new Set(selectedRevisionIds);

  const completedMinutes = getCompletedMorningSessionMinutesForDate(userState, targetDate);
  const remainingMinutes = MORNING_REVISION_MAX_MINUTES - (completedMinutes + plan.morningAllocatedMinutes);
  if (remainingMinutes <= 0) {
    return;
  }

  const candidateSessions = [...plan.overflowSessions, ...plan.catchUpSessions, ...plan.restudySessions];
  const candidate = candidateSessions.find(
    (session) =>
      session.allocatedMinutes > 0 &&
      session.allocatedMinutes <= remainingMinutes &&
      session.revisionIds.every((revisionId) => !selectedRevisionIdSet.has(revisionId)),
  );

  if (!candidate) {
    return;
  }

  for (const revisionId of candidate.revisionIds) {
    selectedRevisionIds.push(revisionId);
  }
  userState.morningRevisionSelections[targetDate] = selectedRevisionIds;

  const sourceTopicLabel = getScheduleItemById(sourceItemId, userState, referenceData)?.item.label ?? sourceItemId;
  userState.morningRevisionAutoAddNotice[targetDate] = {
    sourceItemId,
    sourceTopicLabel,
    actualMinutes: normalizedActualMinutes,
    savedMinutes,
    addedSessions: [
      {
        sourceItemId: candidate.sourceItemId,
        sourceTopicLabel: candidate.sourceTopicLabel,
        allocatedMinutes: candidate.allocatedMinutes,
      },
    ],
    createdAt: completedAt,
  };
}

function getBlockOrThrow(userState: UserState, dayNumber: number, blockKey: BlockKey, referenceData?: LocalStore["referenceData"]) {
  ensureUserScheduleSeeded(userState);
  const day = getScheduleDay(dayNumber, userState, referenceData);
  const block = day?.blocks.find((entry) => entry.timeSlotKey === blockKey);
  if (!day || !block) {
    throw new Error(`Missing schedule block ${dayNumber}:${blockKey}`);
  }

  return { day, block };
}

function getBlockItems(userState: UserState, dayNumber: number, blockKey: BlockKey, referenceData?: LocalStore["referenceData"]) {
  return getBlockOrThrow(userState, dayNumber, blockKey, referenceData).block.items;
}

function getUnresolvedItems(userState: UserState, dayNumber: number, blockKey: BlockKey, referenceData?: LocalStore["referenceData"]) {
  return getBlockItems(userState, dayNumber, blockKey, referenceData).filter((item) => {
    const progress = getTopicProgress(userState, item, dayNumber, blockKey);
    return progress.status !== "completed";
  });
}

function setTopicProgress(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  itemId: string,
  updates: Partial<Omit<TopicProgress, "itemId" | "dayNumber" | "blockKey">>,
  referenceData?: LocalStore["referenceData"],
) {
  const item = getBlockItems(userState, dayNumber, blockKey, referenceData).find((entry) => entry.itemId === itemId);
  if (!item) {
    throw new Error(`Missing schedule item ${itemId} for ${dayNumber}:${blockKey}`);
  }

  const row = userState.schedule.topicAssignments[itemId];
  if (!row) {
    throw new Error(`Missing schedule assignment ${itemId}`);
  }

  if (row.dayNumber !== dayNumber || row.blockKey !== blockKey) {
    invalidateRuntimeScheduleIndex(userState);
  }
  row.dayNumber = dayNumber;
  row.blockKey = blockKey;
  row.status = updates.status ?? row.status;
  row.completedAt = updates.completedAt ?? row.completedAt;
  row.sourceTag = updates.sourceTag === undefined ? row.sourceTag : updates.sourceTag;
  row.note = updates.note === undefined ? row.note : updates.note;
  row.updatedAt = new Date().toISOString();

  return {
    itemId: row.sourceItemId,
    dayNumber: row.dayNumber,
    blockKey: row.blockKey,
    status: row.status,
    completedAt: row.completedAt,
    sourceTag: row.sourceTag,
    note: row.note,
    updatedAt: row.updatedAt,
  };
}

export function getOrCreateProgress(userState: UserState, dayNumber: number, blockKey: BlockKey): BlockTiming {
  ensureUserScheduleSeeded(userState);
  const row = userState.schedule.blocks[timingKey(dayNumber, blockKey)];
  if (!row) {
    throw new Error(`Missing schedule block timing ${dayNumber}:${blockKey}`);
  }

  return {
    get dayNumber() {
      return row.dayNumber;
    },
    set dayNumber(value) {
      if (row.dayNumber !== value) {
        invalidateRuntimeScheduleIndex(userState);
      }
      row.dayNumber = value;
    },
    get blockKey() {
      return row.blockKey;
    },
    set blockKey(value) {
      if (row.blockKey !== value) {
        invalidateRuntimeScheduleIndex(userState);
      }
      row.blockKey = value;
    },
    get actualStart() {
      return row.actualStart;
    },
    set actualStart(value) {
      row.actualStart = value;
    },
    get actualEnd() {
      return row.actualEnd;
    },
    set actualEnd(value) {
      row.actualEnd = value;
    },
    get note() {
      return row.timingNote;
    },
    set note(value) {
      row.timingNote = value;
    },
    get updatedAt() {
      return row.timingUpdatedAt;
    },
    set updatedAt(value) {
      row.timingUpdatedAt = value;
      if (value) {
        row.updatedAt = value;
      }
    },
  };
}

export function getOrCreateTopicProgress(userState: UserState, dayNumber: number, blockKey: BlockKey, itemId: string) {
  ensureUserScheduleSeeded(userState);
  const row = userState.schedule.topicAssignments[itemId];
  if (!row) {
    throw new Error(`Missing schedule assignment ${itemId}`);
  }

  row.dayNumber = dayNumber;
  row.blockKey = blockKey;

  return {
    get itemId() {
      return row.sourceItemId;
    },
    set itemId(value) {
      row.sourceItemId = value;
    },
    get dayNumber() {
      return row.dayNumber;
    },
    set dayNumber(value) {
      row.dayNumber = value;
    },
    get blockKey() {
      return row.blockKey;
    },
    set blockKey(value) {
      row.blockKey = value;
    },
    get status() {
      return row.status;
    },
    set status(value) {
      row.status = value;
    },
    get completedAt() {
      return row.completedAt;
    },
    set completedAt(value) {
      row.completedAt = value;
    },
    get sourceTag() {
      return row.sourceTag;
    },
    set sourceTag(value) {
      row.sourceTag = value;
    },
    get note() {
      return row.note;
    },
    set note(value) {
      row.note = value;
    },
    get updatedAt() {
      return row.updatedAt;
    },
    set updatedAt(value) {
      row.updatedAt = value ?? row.updatedAt;
    },
  };
}

function markBacklogCompletedBySourceItem(userState: UserState, sourceItemId: string, completedAt: string) {
  const item = userState.backlogItems[sourceItemId];
  if (!item || item.status === "dismissed") {
    return;
  }

  item.status = "completed";
  item.completedAt = completedAt;
}

export function completeTopicItem(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  itemId: string,
  completedAt: string,
  note: string | null = null,
  referenceData?: LocalStore["referenceData"],
) {
  const progress = setTopicProgress(userState, dayNumber, blockKey, itemId, {
    status: "completed",
    completedAt,
    sourceTag: null,
    note,
  }, referenceData);
  reconcileRevisionCompletionsForSource(userState.revisionCompletions, itemId, completedAt);
  markBacklogCompletedBySourceItem(userState, itemId, completedAt);
  return progress;
}

export function completeBlockItems(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  completedAt: string,
  note: string | null = null,
  referenceData?: LocalStore["referenceData"],
) {
  const unresolvedItems = getUnresolvedItems(userState, dayNumber, blockKey, referenceData);
  for (const item of unresolvedItems) {
    completeTopicItem(userState, dayNumber, blockKey, item.itemId, completedAt, note, referenceData);
  }

  completeAssignedRecoveryForTarget(userState, dayNumber, blockKey, completedAt);
}

export function completeRevisionSession(
  userState: UserState,
  sourceItemId: string,
  sourceDay: number,
  sourceBlockKey: BlockKey,
  revisionIds: string[],
  completedAt = new Date().toISOString(),
  options?: {
    actualMinutes?: number | null;
    targetDate?: string | null;
  },
  referenceData?: LocalStore["referenceData"],
) {
  const validRevisionIds: string[] = [];
  for (const revisionId of revisionIds) {
    const revisionType = parseRevisionTypeFromRevisionId(revisionId);
    if (!revisionType) {
      continue;
    }

    validRevisionIds.push(revisionId);
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId,
      sourceDay,
      sourceBlockKey,
      revisionType,
      completedAt,
    };
  }

  const targetDate = options?.targetDate ?? null;
  if (!targetDate) {
    return;
  }

  clearMorningRevisionAutoAddNoticeForDate(userState, targetDate);

  const actualMinutes = options?.actualMinutes;
  if (typeof actualMinutes !== "number" || !Number.isFinite(actualMinutes) || actualMinutes <= 0) {
    return;
  }

  const plannedSessionMinutes = getPlannedRevisionMinutesFromIds(validRevisionIds);
  maybeAutoAddMorningRevisionSession(
    userState,
    targetDate,
    sourceItemId,
    actualMinutes,
    plannedSessionMinutes,
    completedAt,
    referenceData,
  );
}

function markTopicForRecovery(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  itemId: string,
  sourceTag: BacklogSourceTag,
  status: TopicStatus,
  note: string | null,
  referenceData?: LocalStore["referenceData"],
) {
  setTopicProgress(userState, dayNumber, blockKey, itemId, {
    status,
    completedAt: null,
    sourceTag,
    note,
  }, referenceData);
}

export function skipTopicItem(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  itemId: string,
  sourceTag: BacklogSourceTag,
  status: TopicStatus = "skipped",
  note: string | null = null,
  referenceData?: LocalStore["referenceData"],
) {
  markTopicForRecovery(userState, dayNumber, blockKey, itemId, sourceTag, status, note, referenceData);
  if (shouldCreateBacklogItem(dayNumber, blockKey, sourceTag, referenceData)) {
    upsertBacklogItem(userState, dayNumber, blockKey, itemId, sourceTag, referenceData);
  }
}

/**
 * Move a pending topic from its current block into a target block (early finish pull-forward).
 * The topic is appended after the last existing item in the target block, and the
 * source block's items are re-indexed to fill the gap.
 */
export function pullTopicForward(
  userState: UserState,
  sourceItemId: string,
  targetDayNumber: number,
  targetBlockKey: BlockKey,
) {
  const row = userState.schedule.topicAssignments[sourceItemId];
  if (!row) {
    throw new Error(`Missing topic assignment ${sourceItemId}`);
  }

  if (row.status !== "pending") {
    return;
  }

  const sourceDayNumber = row.dayNumber;
  const sourceBlockKey = row.blockKey as BlockKey;

  // Find the max itemOrder in the target block to append after it
  let maxOrder = -1;
  for (const entry of Object.values(userState.schedule.topicAssignments)) {
    if (entry.dayNumber === targetDayNumber && entry.blockKey === targetBlockKey) {
      if (entry.itemOrder > maxOrder) {
        maxOrder = entry.itemOrder;
      }
    }
  }

  // Move the topic to the target block
  row.dayNumber = targetDayNumber;
  row.blockKey = targetBlockKey;
  row.itemOrder = maxOrder + 1;
  row.updatedAt = new Date().toISOString();

  // Re-index remaining items in the source block to fill the gap
  const sourceItems = Object.values(userState.schedule.topicAssignments)
    .filter((entry) => entry.dayNumber === sourceDayNumber && entry.blockKey === sourceBlockKey)
    .sort((a, b) => a.itemOrder - b.itemOrder);

  for (let i = 0; i < sourceItems.length; i++) {
    sourceItems[i].itemOrder = i;
    sourceItems[i].updatedAt = new Date().toISOString();
  }

  invalidateRuntimeScheduleIndex(userState);
}

export function upsertBacklogItem(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  itemId: string,
  sourceTag: BacklogSourceTag,
  referenceData?: LocalStore["referenceData"],
) {
  const { day, block } = getBlockOrThrow(userState, dayNumber, blockKey, referenceData);
  const item = block.items.find((entry) => entry.itemId === itemId);
  if (!item) {
    throw new Error(`Missing schedule item ${itemId}`);
  }

  const existing = userState.backlogItems[itemId];
  const subject = item.subjectIds[0] ? item.subjectIds[0].replaceAll("_", " ") : getSubjectFromPrimaryFocus(day.primaryFocusRaw, referenceData);
  const { subject: resolvedSubject, subjectTier } = resolveSubjectTier(item.subjectIds, referenceData);
  const phase = resolvePhase(dayNumber, userState);
  const now = new Date().toISOString();

  userState.backlogItems[itemId] = {
    id: itemId,
    sourceItemId: itemId,
    originalDay: dayNumber,
    originalBlockKey: blockKey,
    originalStart: block.timeSlotKey.split("-")[0] ?? null,
    originalEnd: block.timeSlotKey.split("-")[1] ?? null,
    priorityOrder: existing?.priorityOrder ?? getNextBacklogPriorityOrder(userState),
    topicDescription: item.label,
    subject: resolvedSubject !== "General" ? resolvedSubject : subject,
    subjectIds: [...item.subjectIds],
    subjectTier,
    plannedMinutes: item.plannedMinutes,
    sourceTag,
    recoveryLane: item.recoveryLane,
    phaseFence: item.phaseFence,
    phase,
    manualSortOverride: existing?.manualSortOverride ?? null,
    status: "pending",
    suggestedDay: null,
    suggestedBlockKey: null,
    suggestedNote: null,
    rescheduledToDay: null,
    rescheduledToBlockKey: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    completedAt: null,
    dismissedAt: null,
  };

  return userState.backlogItems[itemId]!;
}

export function moveBlockToBacklog(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  sourceTag: BacklogSourceTag,
  status: TopicStatus = "rescheduled",
  note: string | null = null,
  referenceData?: LocalStore["referenceData"],
) {
  const { block } = getBlockOrThrow(userState, dayNumber, blockKey, referenceData);
  const movedItemIds: string[] = [];

  releaseAssignedRecoveryForTarget(userState, dayNumber, blockKey);

  for (const item of block.items) {
    const progress = getOrCreateTopicProgress(userState, dayNumber, blockKey, item.itemId);
    if (progress.status === "completed") {
      continue;
    }

    markTopicForRecovery(userState, dayNumber, blockKey, item.itemId, sourceTag, status, note, referenceData);
    if (shouldCreateBacklogItem(dayNumber, blockKey, sourceTag, referenceData)) {
      upsertBacklogItem(userState, dayNumber, blockKey, item.itemId, sourceTag, referenceData);
    }
    movedItemIds.push(item.itemId);
  }

  if (!block.reschedulable) {
    return movedItemIds;
  }

  return movedItemIds;
}

function restoreTrafficLightBacklog(userState: UserState, dayNumber: number, restoredBlocks: Set<BlockKey>, referenceData?: LocalStore["referenceData"]) {
  const day = getScheduleDay(dayNumber, userState, referenceData);

  for (const item of Object.values(userState.backlogItems)) {
    if (
      item.originalDay === dayNumber &&
      restoredBlocks.has(item.originalBlockKey) &&
      item.status === "pending" &&
      (item.sourceTag === "yellow_day" || item.sourceTag === "red_day" || item.sourceTag === "traffic_light")
    ) {
      item.status = "dismissed";
      item.dismissedAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      const progress = userState.schedule.topicAssignments[item.sourceItemId];
      if (progress && progress.status === "rescheduled") {
        progress.status = "pending";
        progress.sourceTag = null;
        progress.note = null;
        progress.updatedAt = new Date().toISOString();
      }
    }
  }

  if (!day) {
    return;
  }

  for (const blockKey of restoredBlocks) {
    const block = day.blocks.find((entry) => entry.timeSlotKey === blockKey);
    if (!block) {
      continue;
    }

    for (const item of block.items) {
      const progress = userState.schedule.topicAssignments[item.itemId];
      if (!progress) {
        continue;
      }

      if (
        progress.status === "rescheduled" &&
        (progress.sourceTag === "yellow_day" || progress.sourceTag === "red_day" || progress.sourceTag === "traffic_light")
      ) {
        progress.status = "pending";
        progress.sourceTag = null;
        progress.note = null;
        progress.updatedAt = new Date().toISOString();
      }
    }
  }
}

function markNoDueMorningRevisionClosed(userState: UserState, dayNumber: number, closedAt: string, referenceData?: LocalStore["referenceData"]) {
  const day = getScheduleDay(dayNumber, userState, referenceData);
  const blockKey = day?.blocks.find((entry) => entry.semanticBlockKey === "morning_revision")?.timeSlotKey;
  if (!blockKey) {
    return;
  }

  const timing = getOrCreateProgress(userState, dayNumber, blockKey);
  timing.note = NO_DUE_MORNING_REVISION_NOTE;
  timing.updatedAt = closedAt;
}

export function applyTrafficLightToDay(
  userState: UserState,
  dayNumber: number,
  trafficLight: TrafficLight,
  options?: { allowRestore?: boolean },
  referenceData?: LocalStore["referenceData"],
) {
  ensureUserScheduleSeeded(userState);
  const day = getScheduleDay(dayNumber, userState, referenceData);
  if (!day) {
    return;
  }

  const previous = getDayState(userState, dayNumber);
  const dayRow = userState.schedule.days[String(dayNumber)];
  if (dayRow) {
    const updatedAt = new Date().toISOString();
    dayRow.trafficLight = trafficLight;
    dayRow.trafficLightUpdatedAt = updatedAt;
    dayRow.updatedAt = updatedAt;
  }

  if (previous.trafficLight === trafficLight) {
    return;
  }

  const previousVisible = new Set(getVisibleBlockKeys(previous.trafficLight, day));
  const nextVisible = new Set(getVisibleBlockKeys(trafficLight, day));
  const hiddenSourceTag = getTrafficLightBacklogSourceTag(trafficLight === "red" ? "red" : "yellow");

  if (options?.allowRestore) {
    const restoredBlocks = new Set([...nextVisible].filter((blockKey) => !previousVisible.has(blockKey)));
    if (restoredBlocks.size > 0) {
      restoreTrafficLightBacklog(userState, dayNumber, restoredBlocks, referenceData);
    }
  }

  const hiddenBlocks = [...previousVisible].filter((blockKey) => !nextVisible.has(blockKey));
  for (const blockKey of hiddenBlocks) {
    moveBlockToBacklog(userState, dayNumber, blockKey, hiddenSourceTag, "rescheduled", null, referenceData);
  }
}

export function moveVisibleBlocksToBacklog(
  userState: UserState,
  dayNumber: number,
  trafficLight: TrafficLight,
  options?: { excludeFinalReview?: boolean; note?: string | null },
  referenceData?: LocalStore["referenceData"],
) {
  const day = getScheduleDay(dayNumber, userState, referenceData);
  if (!day) {
    return;
  }

  const visibleBlocks = getVisibleBlockKeys(trafficLight, day);
  for (const blockKey of visibleBlocks) {
    const block = day.blocks.find((entry) => entry.timeSlotKey === blockKey);
    if (!block) {
      continue;
    }

    if (block.semanticBlockKey === "morning_revision") {
      const mappedDate = getMappedDate(dayNumber, userState);
      const revisionPlan = mappedDate ? buildDailyRevisionPlan(mappedDate, userState, userState.settings, referenceData) : null;
      if (!revisionPlan || revisionPlan.morningSessionPlanned === 0) {
        continue;
      }

      for (const item of getUnresolvedItems(userState, dayNumber, blockKey, referenceData)) {
        markTopicForRecovery(userState, dayNumber, blockKey, item.itemId, "missed", "missed", options?.note ?? null, referenceData);
      }
      continue;
    }

    if (options?.excludeFinalReview && block.semanticBlockKey === "final_review") {
      continue;
    }

    moveBlockToBacklog(userState, dayNumber, blockKey, "missed", "missed", options?.note ?? null, referenceData);
  }
}

export function runBlockOverrunCutoff(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  todayDayNumber: number,
  nowMinutes: number,
  referenceData?: LocalStore["referenceData"],
) {
  if (!settings.dayOneDate || todayDayNumber < 1 || todayDayNumber > 105 || nowMinutes < 22 * 60 + 45) {
    return;
  }
  if (userState.processedDates.lateNightSweepDates.includes(todayDate)) {
    return;
  }

  const day = getScheduleDay(todayDayNumber, userState, referenceData);
  if (!day) {
    return;
  }

  const trafficLight = getDayState(userState, todayDayNumber).trafficLight;
  const visibleBlocks = new Set(getVisibleBlockKeys(trafficLight, day));

  for (const block of day.blocks) {
    const blockKey = block.timeSlotKey as BlockKey;
    if (!visibleBlocks.has(blockKey)) {
      continue;
    }

    if (block.semanticBlockKey === "morning_revision") {
      const mappedDate = getMappedDate(todayDayNumber, userState);
      const revisionPlan = mappedDate ? buildDailyRevisionPlan(mappedDate, userState, userState.settings, referenceData) : null;
      if (revisionPlan && revisionPlan.morningSessionPlanned > 0) {
        for (const item of block.items) {
          const progress = getTopicProgress(userState, item, todayDayNumber, blockKey);
          if (progress.status === "pending") {
            markTopicForRecovery(userState, todayDayNumber, blockKey, item.itemId, "block_overrun_2245", "missed", null, referenceData);
          }
        }
      }
      continue;
    }

    if (!shouldCreateBacklogItem(todayDayNumber, blockKey, "block_overrun_2245", referenceData)) {
      continue;
    }

    releaseAssignedRecoveryForTarget(userState, todayDayNumber, blockKey);

    for (const item of block.items) {
      const progress = getTopicProgress(userState, item, todayDayNumber, blockKey);
      if (progress.status !== "pending") {
        continue;
      }
      markTopicForRecovery(userState, todayDayNumber, blockKey, item.itemId, "block_overrun_2245", "missed", null, referenceData);
      upsertBacklogItem(userState, todayDayNumber, blockKey, item.itemId, "block_overrun_2245", referenceData);
    }
  }

  userState.processedDates.lateNightSweepDates.push(todayDate);
}

export function runEndOfDaySweep(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  todayDayNumber: number,
  nowMinutes: number,
  referenceData?: LocalStore["referenceData"],
) {
  if (!settings.dayOneDate || todayDayNumber < 1 || todayDayNumber > 105 || nowMinutes < 23 * 60 + 15) {
    return;
  }
  if (userState.processedDates.endOfDaySweepDates.includes(todayDate)) {
    return;
  }

  const day = getScheduleDay(todayDayNumber, userState, referenceData);
  if (!day) {
    return;
  }

  const trafficLight = getDayState(userState, todayDayNumber).trafficLight;
  const visibleBlocks = new Set(getVisibleBlockKeys(trafficLight, day));

  for (const block of day.blocks) {
    const blockKey = block.timeSlotKey as BlockKey;
    if (!visibleBlocks.has(blockKey)) {
      continue;
    }

    if (block.semanticBlockKey === "morning_revision") {
      const mappedDate = getMappedDate(todayDayNumber, userState);
      const revisionPlan = mappedDate ? buildDailyRevisionPlan(mappedDate, userState, userState.settings, referenceData) : null;
      if (revisionPlan && revisionPlan.morningSessionPlanned > 0) {
        for (const item of block.items) {
          const progress = getTopicProgress(userState, item, todayDayNumber, blockKey);
          if (progress.status === "pending") {
            markTopicForRecovery(userState, todayDayNumber, blockKey, item.itemId, "end_of_day_sweep", "missed", null, referenceData);
          }
        }
      }
      continue;
    }

    if (!shouldCreateBacklogItem(todayDayNumber, blockKey, "end_of_day_sweep", referenceData)) {
      continue;
    }

    releaseAssignedRecoveryForTarget(userState, todayDayNumber, blockKey);

    for (const item of block.items) {
      const progress = getTopicProgress(userState, item, todayDayNumber, blockKey);
      if (progress.status !== "pending") {
        continue;
      }
      markTopicForRecovery(userState, todayDayNumber, blockKey, item.itemId, "end_of_day_sweep", "missed", null, referenceData);
      upsertBacklogItem(userState, todayDayNumber, blockKey, item.itemId, "end_of_day_sweep", referenceData);
    }
  }

  userState.processedDates.endOfDaySweepDates.push(todayDate);
}

/** @deprecated Use runBlockOverrunCutoff + runEndOfDaySweep. Kept for backward compat with wrapUpDayAction / midnight rollover. */
export function runLateNightSweep(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  todayDayNumber: number,
  nowMinutes: number,
  referenceData?: LocalStore["referenceData"],
) {
  runBlockOverrunCutoff(userState, settings, todayDate, todayDayNumber, nowMinutes, referenceData);
  runEndOfDaySweep(userState, settings, todayDate, todayDayNumber, nowMinutes, referenceData);
}

function buildOverrunSlots(userState: UserState, dayNumber: number, referenceData?: LocalStore["referenceData"]) {
  const day = getScheduleDay(dayNumber, userState, referenceData);
  if (!day) {
    return [];
  }

  const trafficLight = getDayState(userState, dayNumber).trafficLight;
  const visible = new Set(getVisibleBlockKeys(trafficLight, day));

  return getTrackableBlocks(day).map((block) => {
    const progress = getBlockProgress(userState, dayNumber, block.timeSlotKey, referenceData);
    const [start, end] = block.timeSlotKey.split("-");
    return {
      key: block.timeSlotKey,
      label: block.displayLabel,
      start,
      end,
      status: progress.status,
      actualStart: progress.actualStart,
      actualEnd: progress.actualEnd,
      visible: visible.has(block.timeSlotKey),
      reschedulable: block.reschedulable,
    };
  });
}

export function applyOverrunCascadeBacklog(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  newEndTime: string,
  note?: string | null,
  referenceData?: LocalStore["referenceData"],
) {
  const preview = previewOverrunCascade({
    editedBlockKey: blockKey,
    newEndTime,
    slots: buildOverrunSlots(userState, dayNumber, referenceData),
  });

  if (preview.kind === "decision") {
    moveBlockToBacklog(
      userState,
      dayNumber,
      preview.affectedBlockKey,
      "overrun_cascade",
      "rescheduled",
      note ?? "Moved to recovery after an overrun.",
      referenceData,
    );
    return { preview, movedBlockKeys: [preview.affectedBlockKey] };
  }

  if (preview.kind === "force_to_backlog") {
    for (const affectedBlockKey of preview.affectedBlockKeys) {
      moveBlockToBacklog(
        userState,
        dayNumber,
        affectedBlockKey,
        "overrun_cascade",
        "rescheduled",
        note ?? "Moved to recovery to protect sleep.",
        referenceData,
      );
    }
    return { preview, movedBlockKeys: [...preview.affectedBlockKeys] };
  }

  return { preview, movedBlockKeys: [] as BlockKey[] };
}

export function applyOverrunCascadeShift(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  newEndTime: string,
  referenceData?: LocalStore["referenceData"],
) {
  const preview = previewOverrunCascade({
    editedBlockKey: blockKey,
    newEndTime,
    slots: buildOverrunSlots(userState, dayNumber, referenceData),
  });

  if (preview.kind !== "decision") {
    return { preview, shiftedBlockKey: null as BlockKey | null };
  }

  for (const shifted of preview.shiftedBlocks) {
    const timing = getOrCreateProgress(userState, dayNumber, shifted.key);
    timing.actualStart = shifted.shiftedStart;
    timing.actualEnd = shifted.shiftedEnd;
    timing.updatedAt = new Date().toISOString();
  }

  return { preview, shiftedBlockKey: preview.affectedBlockKey };
}

export function getRevisionRolloverSnapshot(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  referenceData?: LocalStore["referenceData"],
) {
  const revisionPlan = buildDailyRevisionPlan(todayDate, userState, settings, referenceData);
  return {
    due: revisionPlan.queue.length,
    overflow: revisionPlan.overflow.length,
    catchUp: revisionPlan.catchUp.length,
    restudyFlags: revisionPlan.restudyFlags.length,
  };
}

export function runMidnightRollover(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  todayDayNumber: number,
  referenceData?: LocalStore["referenceData"],
) {
  if (!settings.dayOneDate || todayDayNumber <= 1) {
    return {
      processedDate: null,
      missedBlocks: 0,
      backlogCreated: 0,
      revisionRollover: getRevisionRolloverSnapshot(userState, settings, todayDate, referenceData),
    };
  }

  const previousDate = addDaysToDateOnly(todayDate, -1);
  if (userState.processedDates.midnightDates.includes(previousDate)) {
    return {
      processedDate: previousDate,
      missedBlocks: 0,
      backlogCreated: 0,
      revisionRollover: getRevisionRolloverSnapshot(userState, settings, todayDate, referenceData),
    };
  }

  const previousDayNumber = todayDayNumber - 1;
  let missedBlocks = 0;
  let backlogCreated = 0;
  ensureUserScheduleSeeded(userState);

  if (previousDayNumber >= 1 && previousDayNumber <= 105) {
    const day = getScheduleDay(previousDayNumber, userState, referenceData);
    if (day) {
      const trafficLight = getDayState(userState, previousDayNumber).trafficLight;
      const mappedDate = getMappedDate(previousDayNumber, userState);
      const revisionPlan = mappedDate ? buildDailyRevisionPlan(mappedDate, userState, userState.settings, referenceData) : null;
      if (revisionPlan && revisionPlan.morningSessionPlanned === 0) {
        markNoDueMorningRevisionClosed(userState, previousDayNumber, `${previousDate}T23:59:00.000Z`, referenceData);
      }
      const visibleBlocks = getVisibleBlockKeys(trafficLight, day);
      const beforeCount = Object.values(userState.backlogItems).filter((item) => item.status === "pending").length;
      moveVisibleBlocksToBacklog(userState, previousDayNumber, trafficLight, undefined, referenceData);
      const afterCount = Object.values(userState.backlogItems).filter((item) => item.status === "pending").length;
      backlogCreated += Math.max(0, afterCount - beforeCount);
      missedBlocks += visibleBlocks.filter((blockKey) => getBlockProgress(userState, previousDayNumber, blockKey, referenceData).status === "missed").length;
    }
  }

  // Clean up stale morningRevisionSelections for dates before today.
  for (const dateKey of Object.keys(userState.morningRevisionSelections)) {
    if (dateKey < todayDate) {
      delete userState.morningRevisionSelections[dateKey];
    }
  }
  for (const dateKey of Object.keys(userState.morningRevisionActualMinutes)) {
    if (dateKey < todayDate) {
      delete userState.morningRevisionActualMinutes[dateKey];
    }
  }
  for (const dateKey of Object.keys(userState.morningRevisionAutoAddNotice)) {
    if (dateKey < todayDate) {
      delete userState.morningRevisionAutoAddNotice[dateKey];
    }
  }

  userState.processedDates.midnightDates.push(previousDate);
  return {
    processedDate: previousDate,
    missedBlocks,
    backlogCreated,
    revisionRollover: getRevisionRolloverSnapshot(userState, settings, todayDate, referenceData),
  };
}

export function applyScheduleShiftToUserState(
  userState: UserState,
  preview: NonNullable<ReturnType<typeof getShiftPreview>>,
  appliedAt = new Date().toISOString(),
) {
  if (preview.hardBoundaryExceeded || !userState.settings.dayOneDate) {
    return false;
  }

  userState.settings.shiftEvents = [
    ...userState.settings.shiftEvents,
    {
      id: randomUUID(),
      anchorDayNumber: preview.anchorDayNumber,
      shiftDays: preview.shiftDays,
      appliedAt,
      missedDays: [...preview.missedDays],
      bufferDayUsed: preview.bufferDaysUsed ? 84 : null,
      compressedPairs: [...preview.compressedPairs],
    },
  ].toSorted((left, right) => left.appliedAt.localeCompare(right.appliedAt));
  userState.settings.scheduleShiftDays = userState.settings.shiftEvents.reduce((sum, event) => sum + event.shiftDays, 0);
  userState.settings.shiftAppliedAt = appliedAt;
  ensureUserScheduleSeeded(userState, appliedAt);
  applyScheduleMappingsFromSettings(userState.schedule, userState.settings, appliedAt);

  for (const row of Object.values(userState.schedule.days)) {
    if (row.dayNumber >= preview.anchorDayNumber) {
      row.trafficLight = "green";
      row.trafficLightUpdatedAt = appliedAt;
      row.updatedAt = appliedAt;
    }
  }

  for (const row of Object.values(userState.schedule.blocks)) {
    if (row.dayNumber >= preview.anchorDayNumber) {
      row.actualStart = null;
      row.actualEnd = null;
      row.timingNote = null;
      row.timingUpdatedAt = null;
      row.updatedAt = appliedAt;
    }
  }

  for (const row of Object.values(userState.schedule.topicAssignments)) {
    if (row.dayNumber < preview.anchorDayNumber) {
      continue;
    }

    if (row.status === "completed") {
      continue;
    }

    row.status = "pending";
    row.completedAt = null;
    row.sourceTag = null;
    row.note = null;
    row.updatedAt = appliedAt;
  }

  for (const item of Object.values(userState.backlogItems)) {
    if (item.originalDay < preview.anchorDayNumber) {
      continue;
    }

    if (item.status === "pending" || item.status === "rescheduled") {
      item.status = "dismissed";
      item.dismissedAt = appliedAt;
      item.rescheduledToDay = null;
      item.rescheduledToBlockKey = null;
    }
  }

  for (const [revisionId, completion] of Object.entries(userState.revisionCompletions)) {
    if (completion.sourceDay < preview.anchorDayNumber) {
      continue;
    }

    const source = userState.schedule.topicAssignments[completion.sourceItemId];
    if (!source || source.status !== "completed" || !source.completedAt) {
      delete userState.revisionCompletions[revisionId];
    }
  }

  return true;
}

function getSummaryRate(completed: number, planned: number) {
  return planned > 0 ? Number(((completed / planned) * 100).toFixed(1)) : null;
}

function clampWeeklyCoverage(weekStartDate: string, throughDate?: string) {
  const { start, end } = weekBounds(weekStartDate);
  if (!throughDate) {
    return end;
  }
  if (throughDate < start) {
    return start;
  }
  if (throughDate > end) {
    return end;
  }
  return throughDate;
}

export function generateWeeklySummary(
  userState: UserState,
  settings: AppSettings,
  weekStartDate: string,
  options?: {
    id?: string;
    generatedAt?: string;
    throughDate?: string;
  },
  referenceData?: LocalStore["referenceData"],
): WeeklySummary {
  const { start, end } = weekBounds(weekStartDate);
  const coveredThroughDate = clampWeeklyCoverage(start, options?.throughDate);
  const summaryDays = getScheduleDays(userState, referenceData).filter((day) => {
    if (isCompressedHiddenDay(day.dayNumber, settings)) {
      return false;
    }
    const mappedDate = getMappedDate(day.dayNumber, userState);
    return mappedDate && mappedDate >= start && mappedDate <= coveredThroughDate;
  });

  let blocksPlanned = 0;
  let blocksCompleted = 0;
  let greenDays = 0;
  let yellowDays = 0;
  let redDays = 0;
  let morningRevisionPlanned = 0;
  let morningRevisionCompleted = 0;
  let revisionOverflowDays = 0;
  const catchUpRevisionIds = new Set<string>();
  const restudyRevisionIds = new Set<string>();
  const overrunMap = new Map<string, number>();
  const subjectsStudied = new Set<string>();

  for (const day of summaryDays) {
    const state = getDayState(userState, day.dayNumber);
    const visibleBlocks = getVisibleBlockKeys(state.trafficLight, day);
    if (state.trafficLight === "green") greenDays += 1;
    if (state.trafficLight === "yellow") yellowDays += 1;
    if (state.trafficLight === "red") redDays += 1;
    blocksPlanned += visibleBlocks.length;

    const mappedDate = getMappedDate(day.dayNumber, userState)!;
    const revisionPlan = buildDailyRevisionPlan(mappedDate, userState, settings, referenceData);
    const morningRevisionStats = getMorningRevisionStatsForDate(mappedDate, userState, settings, referenceData);
    morningRevisionPlanned += morningRevisionStats.planned;
    morningRevisionCompleted += morningRevisionStats.completed;

    if (revisionPlan.overflow.length > 0) {
      revisionOverflowDays += 1;
    }
    for (const item of revisionPlan.catchUp) {
      catchUpRevisionIds.add(item.id);
    }
    for (const item of revisionPlan.restudyFlags) {
      restudyRevisionIds.add(item.id);
    }

    for (const blockKey of visibleBlocks) {
      const progress = getBlockProgress(userState, day.dayNumber, blockKey, referenceData);
      if (progress.status === "completed") {
        blocksCompleted += 1;
      }

      const [, slotEnd] = blockKey.split("-");
      if (progress.actualEnd && slotEnd && progress.actualEnd > slotEnd) {
        const label = `${getSubjectFromPrimaryFocus(day.primaryFocusRaw, referenceData)} · ${getBlockOrThrow(userState, day.dayNumber, blockKey, referenceData).block.displayLabel}`;
        overrunMap.set(label, (overrunMap.get(label) ?? 0) + 1);
      }
    }

    if (getDayCompletionState(day, userState, state.trafficLight, referenceData)) {
      subjectsStudied.add(getSubjectFromPrimaryFocus(day.primaryFocusRaw, referenceData));
    }
  }

  const bulkLogs = Object.values(userState.mcqBulkLogs).filter((item) => item.entryDate >= start && item.entryDate <= coveredThroughDate);
  const itemLogs = Object.values(userState.mcqItemLogs).filter((item) => item.entryDate >= start && item.entryDate <= coveredThroughDate);
  const totalMcqsSolved = bulkLogs.reduce((sum, log) => sum + log.totalAttempted, 0) + itemLogs.length;
  const correctFromBulk = bulkLogs.reduce((sum, log) => sum + log.correct, 0);
  const correctFromItems = itemLogs.filter((item) => item.result !== "wrong").length;
  const overallAccuracy =
    totalMcqsSolved > 0 ? Number((((correctFromBulk + correctFromItems) / totalMcqsSolved) * 100).toFixed(1)) : null;

  const wrongSubjects = new Map<string, number>();
  const causeCodes = new Map<string, number>();
  for (const item of itemLogs) {
    if (item.result === "wrong" && item.subject) {
      wrongSubjects.set(item.subject, (wrongSubjects.get(item.subject) ?? 0) + 1);
    }
    if (item.result === "wrong" && item.causeCode) {
      causeCodes.set(item.causeCode, (causeCodes.get(item.causeCode) ?? 0) + 1);
    }
  }

  const gt = Object.values(userState.gtLogs)
    .filter((item) => item.gtDate >= start && item.gtDate <= coveredThroughDate)
    .sort((left, right) => left.gtDate.localeCompare(right.gtDate))
    .at(-1) as GtLog | undefined;

  const previousSummary = Object.values(userState.weeklySummaries)
    .filter((item) => item.weekEndDate < start)
    .sort((left, right) => right.weekEndDate.localeCompare(left.weekEndDate) || right.generatedAt.localeCompare(left.generatedAt))
    .at(0);
  const previousAccuracy = previousSummary?.overallAccuracy ?? null;

  let accuracyVsPrevious: WeeklySummary["accuracyVsPrevious"] = "stable";
  if (overallAccuracy !== null && previousAccuracy !== null) {
    if (overallAccuracy > previousAccuracy) accuracyVsPrevious = "up";
    if (overallAccuracy < previousAccuracy) accuracyVsPrevious = "down";
  }

  const currentDayNumber = getCurrentDayNumber(userState, coveredThroughDate);
  const { missedDays } = getScheduleHealth(userState, settings, currentDayNumber, referenceData);
  const backlogSummary = getBacklogSummary(userState);
  const bufferDaysUsed = settings.shiftEvents.filter((event) => event.bufferDayUsed !== null).length;
  const scheduleStatus = getWeeklyScheduleStatus(missedDays.length, bufferDaysUsed);
  const overrunBlocks = [...overrunMap.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, count]) => ({ label, count }));

  return {
    id: options?.id ?? randomUUID(),
    weekKey: start,
    weekStartDate: start,
    weekEndDate: end,
    coveredThroughDate,
    isPartialWeek: coveredThroughDate < end,
    blocksCompleted,
    blocksPlanned,
    blocksCompletedRate: getSummaryRate(blocksCompleted, blocksPlanned),
    greenDays,
    yellowDays,
    redDays,
    morningRevisionCompleted,
    morningRevisionPlanned,
    morningRevisionCompletionRate: getSummaryRate(morningRevisionCompleted, morningRevisionPlanned),
    revisionOverflowDays,
    revisionCatchUpCount: catchUpRevisionIds.size,
    revisionRestudyCount: restudyRevisionIds.size,
    overrunBlockCount: overrunBlocks.reduce((sum, item) => sum + item.count, 0),
    overrunBlocks,
    totalMcqsSolved,
    overallAccuracy,
    accuracyVsPrevious,
    topWrongSubjects: [...wrongSubjects.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
    topCauseCodes: [...causeCodes.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
    gtNumber: gt?.gtNumber ?? null,
    gtScore: gt?.score ?? null,
    gtAir: gt?.airPercentile ?? null,
    gtWrapperSummary: gt?.changeBeforeNextGt ?? null,
    scheduleStatusKind: scheduleStatus.kind,
    scheduleStatus: scheduleStatus.label,
    daysBehind: missedDays.length,
    backlogCount: backlogSummary.totalPending,
    backlogSummary,
    bufferDaysUsed,
    subjectsStudied: [...subjectsStudied].sort((left, right) => left.localeCompare(right)),
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
  };
}

export function upsertWeeklySummary(
  userState: UserState,
  settings: AppSettings,
  weekStartDate: string,
  throughDate?: string,
  referenceData?: LocalStore["referenceData"],
) {
  const week = weekBounds(weekStartDate);
  const existing = findWeeklySummaryByWeekKey(userState.weeklySummaries, week.start);
  const summary = generateWeeklySummary(userState, settings, week.start, {
    id: existing?.id,
    throughDate,
  }, referenceData);

  for (const entry of Object.values(userState.weeklySummaries)) {
    if (entry.weekKey === week.start && entry.id !== summary.id) {
      delete userState.weeklySummaries[entry.id];
    }
  }

  userState.weeklySummaries[summary.id] = summary;
  return summary;
}

export function runWeeklySummaryAutomation(
  userState: UserState,
  settings: AppSettings,
  runAt: Date | string,
  referenceData?: LocalStore["referenceData"],
) {
  const todayDate = toDateOnlyInTimeZone(runAt, IST_TIME_ZONE);
  const week = weekBounds(todayDate);
  if (todayDate !== week.end || getWeekdayInTimeZone(runAt, IST_TIME_ZONE) !== 0) {
    return {
      generated: false,
      weekStart: week.start,
      summaryId: null,
    };
  }
  if (getMinutesInTimeZone(runAt, IST_TIME_ZONE) < WEEKLY_AUTOMATION_MINUTES) {
    return {
      generated: false,
      weekStart: week.start,
      summaryId: null,
    };
  }
  if (userState.processedDates.weeklySummaryDates.includes(week.start)) {
    return {
      generated: false,
      weekStart: week.start,
      summaryId: null,
    };
  }

  const summary = upsertWeeklySummary(userState, settings, week.start, week.end, referenceData);
  userState.processedDates.weeklySummaryDates.push(week.start);
  return {
    generated: true,
    weekStart: week.start,
    summaryId: summary.id,
  };
}

// ---------------------------------------------------------------------------
// Midnight Repack Engine — Data Collection & Write Layer
// ---------------------------------------------------------------------------

export interface RepackResult {
  skipped: boolean;
  reason?: string;
  date: string;
  placed: number;
  overflowBacklog: number;
  overflowTopics: number;
  backlogRescheduled: number;
  extensionDaysCreated: number;
  phaseClosed: number;
  phaseTransitionClosed: number;
}

/**
 * Collect inputs for the repack algorithm from UserState.
 *
 * Resolves subject tiers for topic assignments (using referenceData) so the
 * pure algorithm never needs reference data.
 */
function collectRepackInputs(
  userState: UserState,
  todayDayNumber: number,
  phaseEndDay: number,
  referenceData?: LocalStore["referenceData"],
) {
  const schedule = userState.schedule;

  // --- Pinned topics ---
  const pinnedTopics: import("@/lib/domain/repack").PinnedTopic[] = [];
  for (const row of Object.values(schedule.topicAssignments)) {
    if (
      row.isPinned &&
      row.dayNumber >= todayDayNumber &&
      row.dayNumber <= phaseEndDay
    ) {
      pinnedTopics.push({
        sourceItemId: row.sourceItemId,
        dayNumber: row.dayNumber,
        blockKey: row.blockKey,
        plannedMinutes: row.plannedMinutes,
        itemOrder: row.itemOrder,
      });
    }
  }

  // --- Pending backlog items (Source A) ---
  const pendingBacklog: import("@/lib/domain/repack").UnifiedQueueItem[] = [];
  for (const item of sortBacklogQueue(Object.values(userState.backlogItems).filter((b) => b.status === "pending"))) {
    // Look up the topic assignment row to check existing recovery fields
    const topicRow = schedule.topicAssignments[item.sourceItemId];
    pendingBacklog.push({
      sourceItemId: item.sourceItemId,
      plannedMinutes: item.plannedMinutes,
      subjectTier: item.subjectTier,
      dateKey: item.originalDay,
      isFromBacklog: true,
      existingIsRecovery: topicRow?.isRecovery ?? false,
      existingOriginalDayNumber: topicRow?.originalDayNumber ?? null,
      existingOriginalBlockKey: topicRow?.originalBlockKey ?? null,
      backlogOriginalDay: item.originalDay,
      backlogOriginalBlockKey: item.originalBlockKey,
    });
  }

  // --- Uncompleted future topic assignments (Source B) ---
  // CRITICAL: Only status='pending'. Topics with 'missed', 'skipped',
  // 'completed', 'rescheduled' are excluded — they've been handled elsewhere.
  const futureTopicRows: Array<{ row: typeof schedule.topicAssignments[string]; tier: SubjectTier | null }> = [];
  for (const row of Object.values(schedule.topicAssignments)) {
    if (
      row.dayNumber >= todayDayNumber &&
      row.dayNumber <= phaseEndDay &&
      row.status === "pending" &&
      !row.isPinned
    ) {
      const { subjectTier } = resolveSubjectTier(row.subjectIds, referenceData);
      futureTopicRows.push({ row, tier: subjectTier });
    }
  }

  // Sort by tier ASC, dayNumber ASC, itemOrder ASC
  futureTopicRows.sort((a, b) => {
    const tDelta = tierRankLocal(a.tier) - tierRankLocal(b.tier);
    if (tDelta !== 0) return tDelta;
    if (a.row.dayNumber !== b.row.dayNumber) return a.row.dayNumber - b.row.dayNumber;
    return a.row.itemOrder - b.row.itemOrder;
  });

  const futureTopics: import("@/lib/domain/repack").UnifiedQueueItem[] = futureTopicRows.map(({ row, tier }) => ({
    sourceItemId: row.sourceItemId,
    plannedMinutes: row.plannedMinutes,
    subjectTier: tier,
    dateKey: row.dayNumber,
    isFromBacklog: false,
    existingIsRecovery: row.isRecovery,
    existingOriginalDayNumber: row.originalDayNumber,
    existingOriginalBlockKey: row.originalBlockKey,
    backlogOriginalDay: null,
    backlogOriginalBlockKey: null,
  }));

  // --- Block capacities ---
  // Only core_study and consolidation blocks participate
  const REPACK_INTENTS = new Set(["core_study", "consolidation"]);
  const rawCapacities: import("@/lib/domain/repack").BlockCapacity[] = [];
  for (const blockRow of Object.values(schedule.blocks)) {
    if (
      blockRow.dayNumber >= todayDayNumber &&
      blockRow.dayNumber <= phaseEndDay &&
      REPACK_INTENTS.has(blockRow.blockIntent)
    ) {
      rawCapacities.push({
        dayNumber: blockRow.dayNumber,
        blockKey: blockRow.blockKey,
        durationMinutes: blockRow.durationMinutes,
        slotOrder: blockRow.slotOrder,
      });
    }
  }
  // Order: dayNumber ASC, slotOrder ASC (gives block_a → block_b → block_c)
  rawCapacities.sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return a.slotOrder - b.slotOrder;
  });

  return { pinnedTopics, pendingBacklog, futureTopics, rawCapacities };
}

function tierRankLocal(tier: SubjectTier | null): number {
  if (tier === "A") return 0;
  if (tier === "B") return 1;
  if (tier === "C") return 2;
  return 3;
}

/**
 * Apply the repack algorithm output back into UserState.
 *
 * For placed topics:
 * - Update schedule_topic_assignments row (dayNumber, blockKey, itemOrder)
 * - If from backlog: set recovery fields (write-once) and mark backlog 'rescheduled'
 * - If already recovery: preserve existing recovery origin fields
 *
 * For overflow original topics:
 * - Mark topic assignment status='missed', sourceTag='repack_overflow'
 * - Create/update backlog item with source_tag='repack_overflow'
 *
 * For overflow backlog items:
 * - Left as-is (status='pending' in backlogItems)
 */
function applyRepackResult(
  userState: UserState,
  output: import("@/lib/domain/repack").RepackOutput,
  referenceData?: LocalStore["referenceData"],
) {
  const now = new Date().toISOString();
  const schedule = userState.schedule;
  let backlogRescheduled = 0;

  // --- Apply placements ---
  for (const placement of output.placements) {
    const row = schedule.topicAssignments[placement.sourceItemId];
    if (!row) continue;

    const dayChanged = row.dayNumber !== placement.dayNumber || row.blockKey !== placement.blockKey;

    row.dayNumber = placement.dayNumber;
    row.blockKey = placement.blockKey;
    row.itemOrder = placement.itemOrder;
    row.status = "pending";
    row.updatedAt = now;

    // Recovery fields are write-once: only set if not already set
    if (placement.isRecovery && !row.isRecovery) {
      row.isRecovery = true;
      row.originalDayNumber = placement.originalDayNumber;
      row.originalBlockKey = placement.originalBlockKey;
    }

    // If this topic had a pending backlog entry, mark it as rescheduled
    const backlogItem = userState.backlogItems[placement.sourceItemId];
    if (backlogItem && backlogItem.status === "pending") {
      backlogItem.status = "rescheduled";
      backlogItem.rescheduledToDay = placement.dayNumber;
      backlogItem.rescheduledToBlockKey = placement.blockKey;
      backlogItem.updatedAt = now;
      backlogRescheduled++;
    }

    if (dayChanged) {
      invalidateRuntimeScheduleIndex(userState);
    }
  }

  // --- Handle phase_closed original topics ---
  for (const sourceItemId of output.phaseClosedTopicSourceItemIds) {
    const row = schedule.topicAssignments[sourceItemId];
    if (!row) continue;

    // Mark the topic as missed with phase_closed tag
    row.status = "missed";
    row.sourceTag = "phase_closed";
    row.updatedAt = now;

    // Create or update a backlog item with terminal phase_closed status
    const { subject: resolvedSubject, subjectTier } = resolveSubjectTier(row.subjectIds, referenceData);
    const phase = resolvePhaseFromConfig(row.dayNumber, userState);

    const existing = userState.backlogItems[sourceItemId];
    userState.backlogItems[sourceItemId] = {
      id: sourceItemId,
      sourceItemId,
      originalDay: existing?.originalDay ?? row.dayNumber,
      originalBlockKey: existing?.originalBlockKey ?? row.blockKey,
      originalStart: existing?.originalStart ?? null,
      originalEnd: existing?.originalEnd ?? null,
      priorityOrder: existing?.priorityOrder ?? getNextBacklogPriorityOrder(userState),
      topicDescription: row.label,
      subject: resolvedSubject,
      subjectIds: [...row.subjectIds],
      subjectTier,
      plannedMinutes: row.plannedMinutes,
      sourceTag: "phase_closed",
      recoveryLane: row.recoveryLane,
      phaseFence: row.phaseFence,
      phase,
      manualSortOverride: existing?.manualSortOverride ?? null,
      status: "phase_closed",
      suggestedDay: null,
      suggestedBlockKey: null,
      suggestedNote: null,
      rescheduledToDay: null,
      rescheduledToBlockKey: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: null,
      dismissedAt: null,
    };
  }

  // Phase-closed backlog items: mark terminal
  for (const sourceItemId of output.phaseClosedBacklogSourceItemIds) {
    const item = userState.backlogItems[sourceItemId];
    if (item && item.status === "pending") {
      item.status = "phase_closed";
      item.sourceTag = "phase_closed";
      item.updatedAt = now;
    }
  }

  return backlogRescheduled;
}

function resolvePhaseFromConfig(dayNumber: number, userState: UserState): number | null {
  for (const phase of Object.values(userState.schedule.phaseConfig)) {
    if (dayNumber >= phase.currentStartDay && dayNumber <= phase.currentEndDay) {
      return phase.phaseNumber;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Extension Day Capacity Template
// ---------------------------------------------------------------------------

// Provided by getExtensionDayCapacityTemplate() from schedule-seed.ts

// ---------------------------------------------------------------------------
// Renumber Cascade
// ---------------------------------------------------------------------------

/**
 * Shift all days after `insertionPoint` forward by `count` positions.
 *
 * This maintains contiguous day_number sequences when extension days are
 * inserted at the end of a phase. All references in days, blocks,
 * topicAssignments, backlogItems, and downstream phases are updated.
 * Mapped dates on shifted days are also pushed forward by `count` days
 * so the schedule browser shows correct calendar dates.
 *
 * Operates in-place on userState for efficiency. Rebuilds the Record maps
 * with new string keys so lookups remain correct.
 */
function applyRenumberCascade(
  userState: UserState,
  insertionPoint: number,
  count: number,
  now: string,
): void {
  if (count <= 0) return;

  const schedule = userState.schedule;

  // --- 1) Rebuild days: shift keys > insertionPoint forward by count ---
  //     Also shift mapped_date forward by count calendar days.
  const newDays: Record<string, ScheduleDayRow> = {};
  for (const [key, day] of Object.entries(schedule.days)) {
    if (day.dayNumber > insertionPoint) {
      day.dayNumber += count;
      day.mappedDate = addDaysToDateOnly(day.mappedDate, count);
      day.updatedAt = now;
      newDays[String(day.dayNumber)] = day;
    } else {
      newDays[key] = day;
    }
  }
  schedule.days = newDays;

  // --- 2) Rebuild blocks: shift dayNumber > insertionPoint ---
  const newBlocks: Record<string, ScheduleBlockRow> = {};
  for (const block of Object.values(schedule.blocks)) {
    if (block.dayNumber > insertionPoint) {
      block.dayNumber += count;
      block.updatedAt = now;
    }
    newBlocks[`${block.dayNumber}:${block.blockKey}`] = block;
  }
  schedule.blocks = newBlocks;

  // --- 3) Update topicAssignments: shift dayNumber > insertionPoint ---
  for (const topic of Object.values(schedule.topicAssignments)) {
    if (topic.dayNumber > insertionPoint) {
      topic.dayNumber += count;
      topic.updatedAt = now;
    }
    // Also shift originalDayNumber if it pointed past the insertion
    if (topic.originalDayNumber && topic.originalDayNumber > insertionPoint) {
      topic.originalDayNumber += count;
    }
  }

  // --- 4) Update backlogItems: shift day references ---
  for (const item of Object.values(userState.backlogItems)) {
    if (item.originalDay > insertionPoint) {
      item.originalDay += count;
      item.updatedAt = now;
    }
    if (item.suggestedDay && item.suggestedDay > insertionPoint) {
      item.suggestedDay += count;
    }
    if (item.rescheduledToDay && item.rescheduledToDay > insertionPoint) {
      item.rescheduledToDay += count;
    }
  }

  // --- 5) Update phaseConfig: shift start/end day boundaries ---
  for (const phase of Object.values(schedule.phaseConfig)) {
    if (phase.currentStartDay > insertionPoint) {
      phase.currentStartDay += count;
      phase.updatedAt = now;
    }
    if (phase.currentEndDay > insertionPoint) {
      phase.currentEndDay += count;
      phase.updatedAt = now;
    }
  }

  invalidateRuntimeScheduleIndex(userState);
}

// ---------------------------------------------------------------------------
// Phase Transition Backlog Cleanup
// ---------------------------------------------------------------------------

/**
 * When a repack runs, close any pending backlog items that belong to a
 * phase earlier than the current one. These items can never be placed
 * because phase fencing prevents cross-phase movement.
 *
 * This also migrates legacy `repack_overflow` backlog items from prior
 * Chunk 4 repacks — they'll be caught here and terminally closed.
 */
function closeStalePhaseBacklog(
  userState: UserState,
  currentPhaseNumber: number,
  now: string,
): number {
  let closed = 0;
  for (const item of Object.values(userState.backlogItems)) {
    if (
      item.status === "pending" &&
      item.phase !== null &&
      item.phase < currentPhaseNumber
    ) {
      item.status = "phase_closed";
      item.sourceTag = "phase_closed";
      item.updatedAt = now;
      closed++;
    }
  }
  return closed;
}

/**
 * Full midnight repack orchestrator.
 *
 * Idempotent: if the repack has already run for the given date, it's a no-op.
 * Run after midnight rollover (which creates backlog items) so the repack
 * can redistribute them.
 *
 * Phase extension: when the unified queue overflows the current phase, the
 * engine adds full study days at the end of the phase (up to the phase's
 * extension budget), renumbers all subsequent days to keep day_numbers
 * contiguous, and marks truly unplaceable items as terminal phase_closed.
 */
export function runMidnightRepack(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  todayDayNumber: number,
  referenceData?: LocalStore["referenceData"],
): RepackResult {
  const emptyResult = (reason: string): RepackResult => ({
    skipped: true, reason, date: todayDate,
    placed: 0, overflowBacklog: 0, overflowTopics: 0, backlogRescheduled: 0,
    extensionDaysCreated: 0, phaseClosed: 0, phaseTransitionClosed: 0,
  });

  // --- Guard: nothing to do if schedule hasn't started ---
  if (!settings.dayOneDate || todayDayNumber < 1) {
    return emptyResult("no_schedule");
  }

  // --- Idempotency: already ran for this date? ---
  if (userState.processedDates.repackDates.includes(todayDate)) {
    return emptyResult("already_processed");
  }

  ensureUserScheduleSeeded(userState);

  const now = new Date().toISOString();

  // --- Find current phase ---
  let currentPhase: typeof userState.schedule.phaseConfig[string] | null = null;
  for (const phase of Object.values(userState.schedule.phaseConfig)) {
    if (todayDayNumber >= phase.currentStartDay && todayDayNumber <= phase.currentEndDay) {
      currentPhase = phase;
      break;
    }
  }

  if (!currentPhase) {
    return emptyResult("no_phase");
  }

  const phaseEndDay = currentPhase.currentEndDay;

  // --- Close stale backlog from prior phases ---
  const phaseTransitionClosed = closeStalePhaseBacklog(userState, currentPhase.phaseNumber, now);

  // --- Collect inputs ---
  const { pinnedTopics, pendingBacklog, futureTopics, rawCapacities } = collectRepackInputs(
    userState,
    todayDayNumber,
    phaseEndDay,
    referenceData,
  );

  // --- Build extension context ---
  const remainingBudget = currentPhase.extensionBudget - currentPhase.extensionsUsed;
  let extensionContext: ExtensionContext | undefined;

  if (remainingBudget > 0) {
    // Resolve the mapped_date of the current phase end day
    const phaseEndDayRow = userState.schedule.days[String(phaseEndDay)];
    const phaseEndMappedDate = phaseEndDayRow?.mappedDate ?? addDaysToDateOnly(settings.dayOneDate, phaseEndDay - 1);

    extensionContext = {
      remainingBudget,
      phaseEndDay,
      phaseEndMappedDate,
      hardStopDate: HARD_BOUNDARY_DATE,
      phaseNumber: currentPhase.phaseNumber,
      extensionDayBlockCapacities: getExtensionDayCapacityTemplate(),
    };
  }

  // --- Run pure algorithm ---
  const output = runRepackAlgorithm(pendingBacklog, futureTopics, rawCapacities, pinnedTopics, extensionContext);

  // --- If extension days were used, apply renumber cascade + insert extension days ---
  if (output.extensionDaysUsed > 0) {
    // 1) Renumber: shift everything after phaseEndDay forward
    applyRenumberCascade(userState, phaseEndDay, output.extensionDaysUsed, now);

    // 2) Insert extension day rows
    const phaseEndDayRow = userState.schedule.days[String(phaseEndDay)];
    const phaseEndMappedDate = phaseEndDayRow?.mappedDate ?? addDaysToDateOnly(settings.dayOneDate, phaseEndDay - 1);

    for (let i = 1; i <= output.extensionDaysUsed; i++) {
      const extDayNumber = phaseEndDay + i;
      const extMappedDate = addDaysToDateOnly(phaseEndMappedDate, i);

      const { dayRow, blockRows } = buildExtensionDayRows(
        extDayNumber,
        currentPhase.phaseId,
        `phase_${currentPhase.phaseNumber}` as "phase_1" | "phase_2" | "phase_3",
        `Phase ${currentPhase.phaseNumber}`,
        extMappedDate,
        now,
      );

      userState.schedule.days[String(extDayNumber)] = dayRow;
      for (const block of blockRows) {
        userState.schedule.blocks[`${extDayNumber}:${block.blockKey}`] = block;
      }
    }

    // 3) Update phase config: extend end day and record usage
    currentPhase.currentEndDay = phaseEndDay + output.extensionDaysUsed;
    currentPhase.extensionsUsed += output.extensionDaysUsed;
    currentPhase.updatedAt = now;

    invalidateRuntimeScheduleIndex(userState);
  }

  // --- Apply placements + phase_closed ---
  const backlogRescheduled = applyRepackResult(userState, output, referenceData);

  // --- Record idempotency ---
  userState.processedDates.repackDates.push(todayDate);

  return {
    skipped: false,
    date: todayDate,
    placed: output.stats.placed,
    overflowBacklog: 0,
    overflowTopics: 0,
    backlogRescheduled,
    extensionDaysCreated: output.stats.extensionDaysCreated,
    phaseClosed: output.stats.phaseClosed,
    phaseTransitionClosed,
  };
}

export function applyAutomations(store: LocalStore, userId: string) {
  const userState = store.userState[userId];
  ensureUserScheduleSeeded(userState);
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const settings = userState.settings;
  const todayDayNumber = getCurrentDayNumber(userState, todayDate);
  const minutes = getMinutesInTimeZone(now, IST_TIME_ZONE);

  runBlockOverrunCutoff(userState, settings, todayDate, todayDayNumber, minutes, store.referenceData);
  runEndOfDaySweep(userState, settings, todayDate, todayDayNumber, minutes, store.referenceData);

  if (getRuntimeMode() === "local") {
    runMidnightRollover(userState, settings, todayDate, todayDayNumber, store.referenceData);
    runWeeklySummaryAutomation(userState, settings, now, store.referenceData);
  }

  // Repack runs in both modes: scheduled via cron (Supabase) + catch-up on
  // app load if midnight was missed. Idempotency prevents double-runs.
  runMidnightRepack(userState, settings, todayDate, todayDayNumber, store.referenceData);

  refreshBacklogSuggestions(userState, settings, todayDayNumber, store.referenceData);
}

export function getHomeData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const settings = userState.settings;
  const todayDayNumber = getCurrentDayNumber(userState, todayDate);
  const todayScheduleDay = getScheduleDay(todayDayNumber, userState, store.referenceData);

  const todayState = todayScheduleDay ? getDayState(userState, todayDayNumber) : null;
  const todayRevisionPlan =
    todayScheduleDay && settings.dayOneDate ? buildDailyRevisionPlan(todayDate, userState, settings, store.referenceData) : null;
  const backlogCount = getBacklogCount(userState);
  const dayComplete =
    todayScheduleDay && todayState ? getDayCompletionState(todayScheduleDay, userState, todayState.trafficLight, store.referenceData) : false;
  const quoteSelection =
    todayScheduleDay && todayState
      ? getTodayQuoteSelection(userState.quoteState, {
        dateKey: todayDate,
        userKey: userId,
        trafficLight: todayState.trafficLight,
        dayComplete,
      }, getQuotePools(store.referenceData))
      : {
        lineCategory: null,
        lineQuote: null,
        dailyQuote: null,
        toughQuote: null,
        celebrationQuote: null,
      };

  const shiftHealth = getScheduleHealth(userState, settings, todayDayNumber, store.referenceData);
  const shiftPreview = shiftHealth.suggestShift ? getShiftPreview(settings, shiftHealth.missedDays, store.referenceData) : null;
  const plannedRecovery = getScheduledRecoveryForDay(userState, settings, todayDayNumber, todayDate, store.referenceData);

  return {
    nowIso: now.toISOString(),
    todayDate,
    todayDayNumber,
    lateNightSweepProcessed: userState.processedDates.lateNightSweepDates.includes(todayDate),
    dayCountLabel: getSafeDayCountLabel(todayDayNumber),
    settings,
    todayScheduleDay,
    todayState,
    todayRevisionPlan,
    backlogCount,
    dayComplete,
    lineQuote: quoteSelection.lineQuote,
    lineQuoteCategory: quoteSelection.lineCategory,
    celebrationQuote: quoteSelection.celebrationQuote,
    shiftHealth,
    shiftPreview,
    plannedRecovery,
    phase:
      todayScheduleDay
        ? store.referenceData.scheduleData.daywisePlan.phaseCatalog.find(
          (entry) =>
            entry.phaseId === todayScheduleDay.phaseId &&
            todayScheduleDay.dayNumber >= entry.startDay &&
            todayScheduleDay.dayNumber <= entry.endDay,
        ) ?? null
        : null,
  };
}

function buildRevisionOverview(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  referenceData?: LocalStore["referenceData"],
) {
  const allItems = buildRevisionInventory(userState, settings, referenceData);
  const pendingItems = allItems.filter((item) => item.status !== "completed" && item.scheduledDate <= todayDate);
  const completedItems = allItems.filter((item) => item.status === "completed");
  const overdueItems = pendingItems.filter((item) => item.scheduledDate < todayDate);
  const dueToday = pendingItems.filter((item) => item.scheduledDate === todayDate);
  const upcoming = allItems.filter((item) => item.status !== "completed" && item.scheduledDate > todayDate);
  const groups = groupRevisionItemsForDisplay(pendingItems);
  return {
    totalPending: pendingItems.length,
    totalCompleted: completedItems.length,
    overdueCount: overdueItems.length,
    dueTodayCount: dueToday.length,
    upcomingCount: upcoming.length,
    groups,
  };
}

export function getRevisionQueuePageData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const settings = userState.settings;
  const todayDayNumber = getCurrentDayNumber(userState, todayDate);
  const todayScheduleDay = getScheduleDay(todayDayNumber, userState, store.referenceData);
  const revisionPlan = settings.dayOneDate ? buildDailyRevisionPlan(todayDate, userState, settings, store.referenceData) : null;
  const waitingSessions = revisionPlan
    ? [...revisionPlan.overflowSessions, ...revisionPlan.catchUpSessions, ...revisionPlan.restudySessions]
    : [];

  return {
    todayDate,
    todayDayNumber,
    dayCountLabel: getSafeDayCountLabel(todayDayNumber),
    todayScheduleDay,
    revisionPlan,
    waitingSessions,
    revision: buildRevisionOverview(userState, settings, todayDate, store.referenceData),
  };
}

export interface BacklogTierGroup {
  tier: SubjectTier;
  tierLabel: string;
  items: BacklogQueueViewItem[];
}

export function getBacklogPageData(
  store: LocalStore,
  userId: string,
  options: {
    filter: BacklogViewFilter;
    sort: BacklogSortMode;
  },
) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const todayDayNumber = getCurrentDayNumber(userState, todayDate);

  // Build tier-grouped pending items using the queue sort order
  const pendingItems = Object.values(userState.backlogItems).filter((item) => item.status === "pending");
  const sorted = sortBacklogQueue(pendingItems);
  const tierOrder: SubjectTier[] = ["A", "B", "C"];
  const tierGroups: BacklogTierGroup[] = tierOrder
    .map((tier) => ({
      tier,
      tierLabel: TIER_LABELS[tier],
      items: sorted
        .filter((item) => item.subjectTier === tier)
        .map((item) => ({
          ...item,
          daysInBacklog: Math.max(0, todayDayNumber - item.originalDay),
          sourceLabel: getBacklogSourceLabel(item.sourceTag),
          originalMappedDate: getMappedDate(item.originalDay, userState),
          suggestionLabel:
            item.suggestedDay && item.suggestedBlockKey
              ? `Day ${item.suggestedDay} \u00b7 ${item.suggestedBlockKey}`
              : null,
          rescheduledLabel:
            item.rescheduledToDay && item.rescheduledToBlockKey
              ? `Day ${item.rescheduledToDay} \u00b7 ${item.rescheduledToBlockKey}`
              : null,
        })),
    }))
    .filter((group) => group.items.length > 0);

  // Dismissed items for the toggle section
  const dismissedItems = Object.values(userState.backlogItems)
    .filter((item) => item.status === "dismissed")
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
    .map((item) => ({
      ...item,
      daysInBacklog: Math.max(0, todayDayNumber - item.originalDay),
      sourceLabel: getBacklogSourceLabel(item.sourceTag),
      originalMappedDate: getMappedDate(item.originalDay, userState),
      suggestionLabel: null as string | null,
      rescheduledLabel: null as string | null,
    }));

  // Phase-closed items
  const phaseClosedItems = Object.values(userState.backlogItems)
    .filter((item) => item.status === "phase_closed")
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
    .map((item) => ({
      ...item,
      daysInBacklog: Math.max(0, todayDayNumber - item.originalDay),
      sourceLabel: getBacklogSourceLabel(item.sourceTag),
      originalMappedDate: getMappedDate(item.originalDay, userState),
      suggestionLabel: null as string | null,
      rescheduledLabel: null as string | null,
    }));

  // Per-source-tag counts for bulk dismiss labels
  const bulkDismissCounts = {
    source_manual_skip: pendingItems.filter((i) => i.sourceTag === "manual_skip").length,
    source_traffic_light: pendingItems.filter((i) => i.sourceTag === "traffic_light").length,
    source_end_of_day_sweep: pendingItems.filter((i) => i.sourceTag === "end_of_day_sweep").length,
    source_block_overrun_2245: pendingItems.filter((i) => i.sourceTag === "block_overrun_2245").length,
    all_pending: pendingItems.length,
  };

  return {
    todayDate,
    todayDayNumber,
    summary: getBacklogSummary(userState),
    counts: getBacklogStatusCounts(userState),
    items: getBacklogQueueItems(userState, userState.settings, todayDate, options.filter, options.sort, store.referenceData, todayDayNumber),
    tierGroups,
    dismissedItems,
    phaseClosedItems,
    bulkDismissCounts,
    revision: buildRevisionOverview(userState, userState.settings, todayDate, store.referenceData),
  };
}

export function getMcqPageData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const bulkLogs = Object.values(userState.mcqBulkLogs).toSorted((left, right) => right.entryDate.localeCompare(left.entryDate));
  const itemLogs = Object.values(userState.mcqItemLogs).toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    todayDate,
    summary: buildMcqDashboardSummary(userState),
    subjects: getMcqSubjectOptions(store.referenceData),
    recentTopics: getMcqRecentTopics(itemLogs),
    recentSources: getMcqRecentSources(bulkLogs, itemLogs),
    recentDetailedEntries: itemLogs.slice(0, 6),
  };
}

export function getMcqAnalyticsData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];

  return {
    summary: buildMcqDashboardSummary(userState),
    trendData: buildMcqTrendData(userState),
    breakdownData: buildMcqBreakdownData(userState),
    accuracyBySubject: buildMcqAccuracyBySubject(userState),
    wrongSubjects: getMcqTopWrongSubjects(userState),
    causeCodes: getMcqTopCauseCodes(userState),
  };
}

export function getGtPageData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const logs = Object.values(userState.gtLogs).toSorted((left, right) => right.gtDate.localeCompare(left.gtDate));
  const schedule = getMappedGtSchedule(userState, todayDate, store.referenceData);
  const suggestedPlanItem = getSuggestedGtPlanItem(userState, todayDate, store.referenceData);

  return {
    todayDate,
    summary: buildGtDashboardSummary(logs),
    schedule,
    suggestedPlanItem,
    recentLogs: logs.slice(0, 6),
    subjectOptions: getMcqSubjectOptions(store.referenceData),
  };
}

export function getGtAnalyticsData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const logs = Object.values(store.userState[userId].gtLogs).toSorted((left, right) => left.gtDate.localeCompare(right.gtDate));

  return {
    summary: buildGtDashboardSummary(logs),
    scoreTrend: buildGtScoreTrend(logs),
    sectionPatterns: buildGtSectionPatterns(logs),
    sectionTimeLost: buildGtSectionTimeLostSummary(logs),
    comparison: buildGtComparisonSummary(logs),
    wrapperTrend: buildGtWrapperTrend(logs),
    weaknesses: buildGtWeaknessPatterns(logs),
    logs: structuredClone(logs),
  };
}

export function getWeeklyPageData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const summaries = Object.values(store.userState[userId].weeklySummaries).toSorted(
    (left, right) => right.weekStartDate.localeCompare(left.weekStartDate) || right.generatedAt.localeCompare(left.generatedAt),
  );

  return {
    todayDate,
    currentWeekStart: weekBounds(todayDate).start,
    summaries: structuredClone(summaries),
  };
}

export function getWeeklyDetailData(store: LocalStore, userId: string, weekKey: string) {
  applyAutomations(store, userId);

  const summary = findWeeklySummaryByWeekKey(store.userState[userId].weeklySummaries, weekKey);
  return summary ? structuredClone(summary) : null;
}

export function getScheduleListData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);
  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const todayDayNumber = getCurrentDayNumber(userState, todayDate);

  return getScheduleDays(userState, store.referenceData).map((day) => {
    const mappedDate = getMappedDate(day.dayNumber, userState);
    const originalPlannedDate = getOriginalPlannedDate(day.dayNumber, userState);
    const dayState = getDayState(userState, day.dayNumber);
    const completed = getDayCompletionState(day, userState, dayState.trafficLight, store.referenceData);
    const dayStatus = getPhaseDayStatus(day.dayNumber, userState, store.referenceData);
    const mergedPartnerDay = getMergedPartner(day.dayNumber, userState.settings, userState);
    const isPastVisibleDay = mappedDate !== null && mappedDate < todayDate;

    return {
      ...day,
      mappedDate,
      originalPlannedDate,
      trafficLight: dayState.trafficLight,
      today: day.dayNumber === todayDayNumber,
      completed,
      mergedPartnerDay,
      hiddenByCompression: isCompressedHiddenDay(day.dayNumber, userState.settings),
      hiddenShiftLabel: getShiftHiddenDayLabel(day.dayNumber, userState.settings, userState),
      status:
        day.dayNumber === todayDayNumber
          ? "today"
          : dayStatus === "completed"
            ? "completed"
            : isPastVisibleDay
              ? "missed"
              : "upcoming",
    };
  });
}

export function getDayDetailData(store: LocalStore, userId: string, dayNumber: number) {
  applyAutomations(store, userId);
  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const day = getScheduleDay(dayNumber, userState, store.referenceData);
  if (!day) {
    return null;
  }

  const state = getDayState(userState, dayNumber);
  const mappedDate = getMappedDate(dayNumber, userState);
  const originalPlannedDate = getOriginalPlannedDate(dayNumber, userState);
  const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate, userState);
  const revisionPlan =
    mappedDate && !editState.isFuture && !editState.isShiftHidden
      ? buildDailyRevisionPlan(mappedDate, userState, userState.settings, store.referenceData)
      : null;
  const plannedRecovery = getScheduledRecoveryForDay(userState, userState.settings, dayNumber, todayDate, store.referenceData);

  return {
    day,
    todayDate,
    todayDayNumber: getCurrentDayNumber(userState, todayDate),
    mappedDate,
    originalPlannedDate,
    state,
    editState,
    hiddenShiftLabel: getShiftHiddenDayLabel(dayNumber, userState.settings, userState),
    mergedPartnerDay: getMergedPartner(dayNumber, userState.settings, userState),
    revisionPlan,
    plannedRecovery,
    blocks: getTrackableBlocks(day).map((block) => {
      const [start, end] = block.timeSlotKey.split("-");
      return {
        ...block,
        start,
        end,
        progress: getBlockProgress(userState, dayNumber, block.timeSlotKey, store.referenceData),
        displayDescription: getDisplayBlockDescription(day, block.timeSlotKey, state.trafficLight),
        items: block.items.map((item) => ({
          ...item,
          progress: getTopicProgress(userState, item, dayNumber, block.timeSlotKey),
        })),
      };
    }),
  };
}
