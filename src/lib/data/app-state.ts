import { randomUUID } from "node:crypto";

import {
  releaseAssignedRecoveryForTarget,
  getBacklogQueueItems,
  getBacklogStatusCounts,
  getBacklogSummary,
  getNextBacklogPriorityOrder,
  getScheduledRecoveryForDay,
  refreshBacklogSuggestions,
} from "@/lib/domain/backlog-queue";
import {
  getBacklogCount,
  getBlockProgress,
  getCurrentDayNumber,
  createRevisionId,
  getDayCompletionState,
  getDayState,
  getDisplayBlockDescription,
  getMappedDate,
  getMergedPartner,
  getOriginalPlannedDate,
  getSafeDayCountLabel,
  getScheduleDay,
  getScheduleDayEditState,
  getScheduleHealth,
  getShiftPreview,
  getSubjectFromPrimaryFocus,
  getTrackableBlocks,
  getVisibleBlockKeys,
  buildDailyRevisionPlan,
  isCompressedHiddenDay,
  getPreviousVisibleDayNumber,
  getShiftHiddenDayLabel,
} from "@/lib/domain/schedule";
import { getTrafficLightBacklogSourceTag, previewOverrunCascade, shouldCreateBacklogItem } from "@/lib/domain/backlog";
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
import { findWeeklySummaryByWeekKey, getWeeklyScheduleStatus, WEEKLY_AUTOMATION_MINUTES } from "@/lib/domain/weekly";
import type {
  AppSettings,
  BacklogItem,
  BacklogSourceTag,
  BacklogSortMode,
  BacklogViewFilter,
  BlockKey,
  BlockProgress,
  GtLog,
  LocalStore,
  TrafficLight,
  UserState,
  WeeklySummary,
} from "@/lib/domain/types";
import { scheduleData } from "@/lib/generated/schedule-data";
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

function progressKey(dayNumber: number, blockKey: BlockKey) {
  return `${dayNumber}:${blockKey}`;
}

export function getOrCreateProgress(userState: UserState, dayNumber: number, blockKey: BlockKey): BlockProgress {
  const key = progressKey(dayNumber, blockKey);
  if (!userState.blockProgress[key]) {
    userState.blockProgress[key] = {
      dayNumber,
      blockKey,
      status: "pending",
      actualStart: null,
      actualEnd: null,
      completedAt: null,
      sourceTag: null,
      note: null,
    };
  }
  return userState.blockProgress[key];
}

export function upsertBacklogItem(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  sourceTag: BacklogSourceTag,
) {
  const existing = Object.values(userState.backlogItems).find(
    (item) =>
      item.originalDay === dayNumber &&
      item.originalBlockKey === blockKey &&
      item.status === "pending" &&
      item.sourceTag === sourceTag,
  );
  if (existing) {
    return existing;
  }

  const day = getScheduleDay(dayNumber);
  if (!day) {
    throw new Error(`Missing schedule day ${dayNumber}`);
  }
  const slot = day.slots.find((entry) => entry.key === blockKey);
  const subject = getSubjectFromPrimaryFocus(day.primaryFocus);
  const backlogItem: BacklogItem = {
    id: randomUUID(),
    originalDay: dayNumber,
    originalBlockKey: blockKey,
    originalStart: slot?.start ?? null,
    originalEnd: slot?.end ?? null,
    priorityOrder: getNextBacklogPriorityOrder(userState),
    topicDescription: slot?.description ?? day.primaryFocus,
    subject,
    sourceTag,
    status: "pending",
    suggestedDay: null,
    suggestedBlockKey: null,
    suggestedNote: null,
    rescheduledToDay: null,
    rescheduledToBlockKey: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    dismissedAt: null,
  };
  userState.backlogItems[backlogItem.id] = backlogItem;
  return backlogItem;
}

export function moveBlockToBacklog(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  sourceTag: BacklogSourceTag,
  status: BlockProgress["status"] = "rescheduled",
  note: string | null = null,
) {
  const progress = getOrCreateProgress(userState, dayNumber, blockKey);
  if (progress.status !== "pending") {
    return;
  }

  releaseAssignedRecoveryForTarget(userState, dayNumber, blockKey);
  progress.status = status;
  progress.completedAt = null;
  progress.sourceTag = sourceTag;
  progress.note = note;

  if (shouldCreateBacklogItem(blockKey, sourceTag)) {
    upsertBacklogItem(userState, dayNumber, blockKey, sourceTag);
  }
}

function restoreTrafficLightBacklog(userState: UserState, dayNumber: number, restoredBlocks: Set<BlockKey>) {
  for (const item of Object.values(userState.backlogItems)) {
    if (
      item.originalDay === dayNumber &&
      restoredBlocks.has(item.originalBlockKey) &&
      item.status === "pending" &&
      (item.sourceTag === "yellow_day" || item.sourceTag === "red_day")
    ) {
      item.status = "dismissed";
      item.dismissedAt = new Date().toISOString();
      const progress = getOrCreateProgress(userState, item.originalDay, item.originalBlockKey);
      if (progress.status === "rescheduled") {
        progress.status = "pending";
        progress.sourceTag = null;
        progress.note = null;
      }
    }
  }
}

export function applyTrafficLightToDay(
  userState: UserState,
  dayNumber: number,
  trafficLight: TrafficLight,
  options?: { allowRestore?: boolean },
) {
  const previous = getDayState(userState, dayNumber);
  userState.dayStates[String(dayNumber)] = {
    dayNumber,
    trafficLight,
    updatedAt: new Date().toISOString(),
  };

  if (previous.trafficLight === trafficLight) {
    return;
  }

  const previousVisible = new Set(getVisibleBlockKeys(previous.trafficLight));
  const nextVisible = new Set(getVisibleBlockKeys(trafficLight));
  const hiddenSourceTag = getTrafficLightBacklogSourceTag(trafficLight === "red" ? "red" : "yellow");

  if (options?.allowRestore) {
    const restoredBlocks = new Set([...nextVisible].filter((blockKey) => !previousVisible.has(blockKey)));
    if (restoredBlocks.size > 0) {
      restoreTrafficLightBacklog(userState, dayNumber, restoredBlocks);
    }
  }

  const hiddenBlocks = [...previousVisible].filter((blockKey) => !nextVisible.has(blockKey));
  for (const blockKey of hiddenBlocks) {
    const progress = getOrCreateProgress(userState, dayNumber, blockKey);
    if (progress.status !== "pending") {
      continue;
    }
    moveBlockToBacklog(userState, dayNumber, blockKey, hiddenSourceTag);
  }
}

export function moveVisibleBlocksToBacklog(
  userState: UserState,
  dayNumber: number,
  trafficLight: TrafficLight,
  options?: { excludeNightRecall?: boolean; note?: string | null },
) {
  const visibleBlocks = getVisibleBlockKeys(trafficLight);
  for (const blockKey of visibleBlocks) {
    if (blockKey === "morning_revision") {
      continue;
    }
    if (options?.excludeNightRecall && blockKey === "night_recall") {
      continue;
    }
    moveBlockToBacklog(userState, dayNumber, blockKey, "missed", "missed", options?.note ?? null);
  }
}

export function runLateNightSweep(userState: UserState, settings: AppSettings, todayDate: string, todayDayNumber: number, nowMinutes: number) {
  if (!settings.dayOneDate || todayDayNumber < 1 || todayDayNumber > 100 || nowMinutes < 23 * 60 + 15) {
    return;
  }
  if (userState.processedDates.lateNightSweepDates.includes(todayDate)) {
    return;
  }

  const trafficLight = getDayState(userState, todayDayNumber).trafficLight;
  moveVisibleBlocksToBacklog(userState, todayDayNumber, trafficLight, {
    note: "Moved to backlog by wind-down prompt.",
  });

  userState.processedDates.lateNightSweepDates.push(todayDate);
}

export function applyOverrunCascadeBacklog(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  newEndTime: string,
  note?: string | null,
) {
  const day = getScheduleDay(dayNumber);
  if (!day) {
    return { preview: { kind: "none" } as const, movedBlockKeys: [] as BlockKey[] };
  }

  const trafficLight = getDayState(userState, dayNumber).trafficLight;
  const preview = previewOverrunCascade({
    editedBlockKey: blockKey,
    newEndTime,
    trafficLight,
    slots: getTrackableBlocks(day).map((slot) => {
      const key = slot.key as BlockKey;
      const progress = getBlockProgress(userState, dayNumber, key);
      return {
        key,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        status: progress.status,
        actualStart: progress.actualStart,
        actualEnd: progress.actualEnd,
      };
    }),
  });

  if (preview.kind === "decision") {
    moveBlockToBacklog(userState, dayNumber, preview.affectedBlockKey, "overrun_cascade", "rescheduled", note ?? "Moved to backlog after an overrun.");
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
        note ?? "Moved to backlog to protect sleep.",
      );
    }
    return { preview, movedBlockKeys: [...preview.affectedBlockKeys] };
  }

  return { preview, movedBlockKeys: [] as BlockKey[] };
}

export function getRevisionRolloverSnapshot(userState: UserState, settings: AppSettings, todayDate: string) {
  const revisionPlan = buildDailyRevisionPlan(todayDate, userState, settings);
  return {
    due: revisionPlan.queue.length,
    overflow: revisionPlan.overflow.length,
    catchUp: revisionPlan.catchUp.length,
    restudyFlags: revisionPlan.restudyFlags.length,
  };
}

export function runMidnightRollover(userState: UserState, settings: AppSettings, todayDate: string, todayDayNumber: number) {
  if (!settings.dayOneDate || todayDayNumber <= 1) {
    return {
      processedDate: null,
      missedBlocks: 0,
      backlogCreated: 0,
      revisionRollover: getRevisionRolloverSnapshot(userState, settings, todayDate),
    };
  }

  const previousDate = addDaysToDateOnly(todayDate, -1);
  if (userState.processedDates.midnightDates.includes(previousDate)) {
    return {
      processedDate: previousDate,
      missedBlocks: 0,
      backlogCreated: 0,
      revisionRollover: getRevisionRolloverSnapshot(userState, settings, todayDate),
    };
  }

  const previousDayNumber = getPreviousVisibleDayNumber(todayDayNumber, settings);
  let missedBlocks = 0;
  let backlogCreated = 0;
  if (previousDayNumber && previousDayNumber >= 1 && previousDayNumber <= 100) {
    for (const blockKey of getVisibleBlockKeys(getDayState(userState, previousDayNumber).trafficLight)) {
      const progress = getOrCreateProgress(userState, previousDayNumber, blockKey);
      if (progress.status === "pending") {
        progress.status = "missed";
        progress.sourceTag = "missed";
        missedBlocks += 1;
        if (blockKey !== "morning_revision") {
          releaseAssignedRecoveryForTarget(userState, previousDayNumber, blockKey);
          upsertBacklogItem(userState, previousDayNumber, blockKey, "missed");
          backlogCreated += 1;
        }
      }
    }
  }

  userState.processedDates.midnightDates.push(previousDate);
  return {
    processedDate: previousDate,
    missedBlocks,
    backlogCreated,
    revisionRollover: getRevisionRolloverSnapshot(userState, settings, todayDate),
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

  for (const [key, state] of Object.entries(userState.dayStates)) {
    if (state.dayNumber >= preview.anchorDayNumber) {
      userState.dayStates[key] = {
        dayNumber: state.dayNumber,
        trafficLight: "green",
        updatedAt: appliedAt,
      };
    }
  }

  for (const progress of Object.values(userState.blockProgress)) {
    if (progress.dayNumber < preview.anchorDayNumber) {
      continue;
    }

    if (progress.status === "completed" || progress.status === "partial") {
      continue;
    }

    progress.status = "pending";
    progress.actualStart = null;
    progress.actualEnd = null;
    progress.completedAt = null;
    progress.sourceTag = null;
    progress.note = null;
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

    const sourceProgress = getBlockProgress(userState, completion.sourceDay, completion.sourceBlockKey);
    const sourceStillCompleted =
      (sourceProgress.status === "completed" || sourceProgress.status === "partial") && Boolean(sourceProgress.completedAt);

    if (!sourceStillCompleted) {
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
): WeeklySummary {
  const { start, end } = weekBounds(weekStartDate);
  const coveredThroughDate = clampWeeklyCoverage(start, options?.throughDate);
  const summaryDays = scheduleData.days.filter((day) => {
    if (isCompressedHiddenDay(day.dayNumber, settings)) {
      return false;
    }
    const mappedDate = getMappedDate(day.dayNumber, settings);
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
    const visibleBlocks = getVisibleBlockKeys(state.trafficLight);
    if (state.trafficLight === "green") greenDays += 1;
    if (state.trafficLight === "yellow") yellowDays += 1;
    if (state.trafficLight === "red") redDays += 1;
    blocksPlanned += visibleBlocks.length;

    const mappedDate = getMappedDate(day.dayNumber, settings)!;
    const revisionPlan = buildDailyRevisionPlan(mappedDate, userState, settings);
    morningRevisionPlanned += revisionPlan.queue.length;
    morningRevisionCompleted += revisionPlan.queue.filter((item) =>
      Boolean(userState.revisionCompletions[createRevisionId(item.sourceDay, item.sourceBlockKey, item.revisionType)]),
    ).length;

    if (revisionPlan.overflow.length > 0) {
      revisionOverflowDays += 1;
    }
    for (const item of revisionPlan.catchUp) {
      catchUpRevisionIds.add(item.id);
    }
    for (const item of revisionPlan.restudyFlags) {
      restudyRevisionIds.add(item.id);
    }

    for (const block of visibleBlocks) {
      const progress = getBlockProgress(userState, day.dayNumber, block);
      if (progress.status === "completed" || progress.status === "partial") {
        blocksCompleted += 1;
      }

      const slot = day.slots.find((entry) => entry.key === block);
      if (progress.actualEnd && slot && progress.actualEnd > slot.end) {
        const label = `${getSubjectFromPrimaryFocus(day.primaryFocus)} · ${slot.label}`;
        overrunMap.set(label, (overrunMap.get(label) ?? 0) + 1);
      }
    }

    if (getDayCompletionState(day, userState, state.trafficLight)) {
      subjectsStudied.add(getSubjectFromPrimaryFocus(day.primaryFocus));
    }
  }

  const bulkLogs = Object.values(userState.mcqBulkLogs).filter(
    (item) => item.entryDate >= start && item.entryDate <= coveredThroughDate,
  );
  const itemLogs = Object.values(userState.mcqItemLogs).filter(
    (item) => item.entryDate >= start && item.entryDate <= coveredThroughDate,
  );
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

  const currentDayNumber = getCurrentDayNumber(settings, coveredThroughDate);
  const { missedDays } = getScheduleHealth(userState, settings, currentDayNumber);
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

export function upsertWeeklySummary(userState: UserState, settings: AppSettings, weekStartDate: string, throughDate?: string) {
  const week = weekBounds(weekStartDate);
  const existing = findWeeklySummaryByWeekKey(userState.weeklySummaries, week.start);
  const summary = generateWeeklySummary(userState, settings, week.start, {
    id: existing?.id,
    throughDate,
  });

  for (const entry of Object.values(userState.weeklySummaries)) {
    if (entry.weekKey === week.start && entry.id !== summary.id) {
      delete userState.weeklySummaries[entry.id];
    }
  }

  userState.weeklySummaries[summary.id] = summary;
  return summary;
}

export function runWeeklySummaryAutomation(userState: UserState, settings: AppSettings, runAt: Date | string) {
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

  const summary = upsertWeeklySummary(userState, settings, week.start, week.end);
  userState.processedDates.weeklySummaryDates.push(week.start);
  return {
    generated: true,
    weekStart: week.start,
    summaryId: summary.id,
  };
}

export function applyAutomations(store: LocalStore, userId: string) {
  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const settings = userState.settings;
  const todayDayNumber = getCurrentDayNumber(settings, todayDate);
  const minutes = getMinutesInTimeZone(now, IST_TIME_ZONE);

  runLateNightSweep(userState, settings, todayDate, todayDayNumber, minutes);

  if (getRuntimeMode() === "local") {
    runMidnightRollover(userState, settings, todayDate, todayDayNumber);
    runWeeklySummaryAutomation(userState, settings, now);
  }

  refreshBacklogSuggestions(userState, settings, todayDayNumber);
}

export function getHomeData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);

  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const settings = userState.settings;
  const todayDayNumber = getCurrentDayNumber(settings, todayDate);
  const todayScheduleDay = getScheduleDay(todayDayNumber);

  const todayState = todayScheduleDay ? getDayState(userState, todayDayNumber) : null;
  const todayRevisionPlan =
    todayScheduleDay && settings.dayOneDate ? buildDailyRevisionPlan(todayDate, userState, settings) : null;
  const backlogCount = getBacklogCount(userState);
  const dayComplete =
    todayScheduleDay && todayState ? getDayCompletionState(todayScheduleDay, userState, todayState.trafficLight) : false;
  const quoteSelection =
    todayScheduleDay && todayState
      ? getTodayQuoteSelection(userState.quoteState, {
          dateKey: todayDate,
          userKey: userId,
          trafficLight: todayState.trafficLight,
          dayComplete,
        })
      : {
          lineCategory: null,
          lineQuote: null,
          dailyQuote: null,
          toughQuote: null,
          celebrationQuote: null,
        };

  const shiftHealth = getScheduleHealth(userState, settings, todayDayNumber);
  const shiftPreview = shiftHealth.suggestShift ? getShiftPreview(settings, shiftHealth.missedDays) : null;
  const plannedRecovery = getScheduledRecoveryForDay(userState, settings, todayDayNumber, todayDate);

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
  };
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
  const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);

  return {
    todayDate,
    todayDayNumber,
    summary: getBacklogSummary(userState),
    counts: getBacklogStatusCounts(userState),
    items: getBacklogQueueItems(userState, userState.settings, todayDate, options.filter, options.sort),
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
    subjects: getMcqSubjectOptions(),
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
  const schedule = getMappedGtSchedule(userState.settings, todayDate);
  const suggestedPlanItem = getSuggestedGtPlanItem(userState.settings, todayDate);

  return {
    todayDate,
    summary: buildGtDashboardSummary(logs),
    schedule,
    suggestedPlanItem,
    recentLogs: logs.slice(0, 6),
    subjectOptions: getMcqSubjectOptions(),
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
  const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);

  return scheduleData.days.map((day) => {
    const mappedDate = getMappedDate(day.dayNumber, userState.settings);
    const originalPlannedDate = getOriginalPlannedDate(day.dayNumber, userState.settings);
    const dayState = getDayState(userState, day.dayNumber);
    const completed = getDayCompletionState(day, userState, dayState.trafficLight);
    const mergedPartnerDay = getMergedPartner(day.dayNumber, userState.settings);
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
      hiddenShiftLabel: getShiftHiddenDayLabel(day.dayNumber, userState.settings),
      status: day.dayNumber === todayDayNumber ? "today" : completed ? "completed" : isPastVisibleDay ? "missed" : "upcoming",
    };
  });
}

export function getDayDetailData(store: LocalStore, userId: string, dayNumber: number) {
  applyAutomations(store, userId);
  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const day = getScheduleDay(dayNumber);
  if (!day) {
    return null;
  }

  const state = getDayState(userState, dayNumber);
  const mappedDate = getMappedDate(dayNumber, userState.settings);
  const originalPlannedDate = getOriginalPlannedDate(dayNumber, userState.settings);
  const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate);
  const revisionPlan =
    mappedDate && !editState.isFuture && !editState.isShiftHidden
      ? buildDailyRevisionPlan(mappedDate, userState, userState.settings)
      : null;
  const plannedRecovery = getScheduledRecoveryForDay(userState, userState.settings, dayNumber, todayDate);

  return {
    day,
    todayDate,
    todayDayNumber: getCurrentDayNumber(userState.settings, todayDate),
    mappedDate,
    originalPlannedDate,
    state,
    editState,
    hiddenShiftLabel: getShiftHiddenDayLabel(dayNumber, userState.settings),
    mergedPartnerDay: getMergedPartner(dayNumber, userState.settings),
    revisionPlan,
    plannedRecovery,
    blocks: getTrackableBlocks(day).map((slot) => ({
      ...slot,
      progress: getBlockProgress(userState, dayNumber, slot.key as BlockKey),
      displayDescription: getDisplayBlockDescription(day, slot.key as BlockKey, state.trafficLight),
    })),
  };
}
