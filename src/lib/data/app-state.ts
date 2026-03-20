import { randomUUID } from "node:crypto";

import {
  getBacklogCount,
  getBlockProgress,
  getCurrentDayNumber,
  getDayCompletionState,
  getDayState,
  getDisplayBlockDescription,
  getHiddenBlockKeys,
  getMappedDate,
  getSafeDayCountLabel,
  getScheduleDay,
  getScheduleHealth,
  getShiftPreview,
  getSubjectFromPrimaryFocus,
  getSuggestedBacklogTarget,
  getTrackableBlocks,
  getVisibleBlockKeys,
  buildDailyRevisionPlan,
  isCompressedHiddenDay,
} from "@/lib/domain/schedule";
import { getQuote } from "@/lib/domain/quotes";
import type {
  AppSettings,
  BacklogItem,
  BacklogSourceTag,
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
import { addDaysToDateOnly, getMinutesInTimeZone, IST_TIME_ZONE, toDateOnlyInTimeZone, weekBounds } from "@/lib/utils/date";

function progressKey(dayNumber: number, blockKey: BlockKey) {
  return `${dayNumber}:${blockKey}`;
}

function revisionKey(sourceDay: number, revisionType: string) {
  return `${sourceDay}:${revisionType}`;
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
  const suggestion = getSuggestedBacklogTarget(dayNumber, blockKey);
  const backlogItem: BacklogItem = {
    id: randomUUID(),
    originalDay: dayNumber,
    originalBlockKey: blockKey,
    topicDescription: slot?.description ?? day.primaryFocus,
    subject,
    sourceTag,
    status: "pending",
    suggestedDay: suggestion.suggestedDay,
    suggestedBlockKey: suggestion.suggestedBlockKey,
    suggestedNote: suggestion.suggestedNote,
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
) {
  const progress = getOrCreateProgress(userState, dayNumber, blockKey);
  if (progress.status === "completed" || progress.status === "partial") {
    return;
  }

  progress.status = status;
  progress.sourceTag = sourceTag;
  upsertBacklogItem(userState, dayNumber, blockKey, sourceTag);
}

function restoreTrafficLightBacklog(userState: UserState, dayNumber: number) {
  for (const item of Object.values(userState.backlogItems)) {
    if (
      item.originalDay === dayNumber &&
      item.status === "pending" &&
      (item.sourceTag === "yellow_day" || item.sourceTag === "red_day")
    ) {
      item.status = "dismissed";
      item.dismissedAt = new Date().toISOString();
      const progress = getOrCreateProgress(userState, item.originalDay, item.originalBlockKey);
      if (progress.status === "rescheduled") {
        progress.status = "pending";
        progress.sourceTag = null;
      }
    }
  }
}

export function applyTrafficLightToDay(userState: UserState, dayNumber: number, trafficLight: TrafficLight) {
  const previous = getDayState(userState, dayNumber);
  userState.dayStates[String(dayNumber)] = {
    dayNumber,
    trafficLight,
    updatedAt: new Date().toISOString(),
  };

  if (previous.trafficLight !== "green" && trafficLight === "green") {
    restoreTrafficLightBacklog(userState, dayNumber);
    return;
  }

  const hiddenBlocks = getHiddenBlockKeys(trafficLight);
  for (const blockKey of hiddenBlocks) {
    const progress = getOrCreateProgress(userState, dayNumber, blockKey);
    if (progress.status === "completed" || progress.status === "partial") {
      continue;
    }
    moveBlockToBacklog(userState, dayNumber, blockKey, trafficLight === "yellow" ? "yellow_day" : "red_day");
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
  const visibleBlocks = getVisibleBlockKeys(trafficLight);
  for (const blockKey of visibleBlocks) {
    const progress = getOrCreateProgress(userState, todayDayNumber, blockKey);
    if (progress.status === "pending") {
      moveBlockToBacklog(userState, todayDayNumber, blockKey, "missed");
    }
  }

  userState.processedDates.lateNightSweepDates.push(todayDate);
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

  const previousDayNumber = todayDayNumber - 1;
  let missedBlocks = 0;
  let backlogCreated = 0;
  if (previousDayNumber >= 1 && previousDayNumber <= 100) {
    for (const blockKey of getVisibleBlockKeys(getDayState(userState, previousDayNumber).trafficLight)) {
      const progress = getOrCreateProgress(userState, previousDayNumber, blockKey);
      if (progress.status === "pending") {
        progress.status = "missed";
        progress.sourceTag = "missed";
        missedBlocks += 1;
        if (blockKey !== "morning_revision") {
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

export function generateWeeklySummary(userState: UserState, settings: AppSettings, weekStartDate: string): WeeklySummary {
  const { start, end } = weekBounds(weekStartDate);
  const summaryDays = scheduleData.days.filter((day) => {
    const mappedDate = getMappedDate(day.dayNumber, settings);
    return mappedDate && mappedDate >= start && mappedDate <= end;
  });

  let blocksPlanned = 0;
  let blocksCompleted = 0;
  let greenDays = 0;
  let yellowDays = 0;
  let redDays = 0;
  let morningRevisionPlanned = 0;
  let morningRevisionCompleted = 0;
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
      Boolean(userState.revisionCompletions[revisionKey(item.sourceDay, item.revisionType)]),
    ).length;

    for (const block of visibleBlocks) {
      const progress = getBlockProgress(userState, day.dayNumber, block);
      if (progress.status === "completed" || progress.status === "partial") {
        blocksCompleted += 1;
        subjectsStudied.add(getSubjectFromPrimaryFocus(day.primaryFocus));
      }

      const slot = day.slots.find((entry) => entry.key === block);
      if (progress.actualEnd && slot && progress.actualEnd > slot.end) {
        const label = `${getSubjectFromPrimaryFocus(day.primaryFocus)} ${block}`;
        overrunMap.set(label, (overrunMap.get(label) ?? 0) + 1);
      }
    }
  }

  const bulkLogs = Object.values(userState.mcqBulkLogs).filter((item) => item.entryDate >= start && item.entryDate <= end);
  const itemLogs = Object.values(userState.mcqItemLogs).filter((item) => item.entryDate >= start && item.entryDate <= end);
  const totalMcqsSolved = bulkLogs.reduce((sum, log) => sum + log.totalAttempted, 0) + itemLogs.length;
  const correctFromBulk = bulkLogs.reduce((sum, log) => sum + log.correct, 0);
  const correctFromItems = itemLogs.filter((item) => item.result !== "wrong").length;
  const overallAccuracy = totalMcqsSolved > 0 ? Number((((correctFromBulk + correctFromItems) / totalMcqsSolved) * 100).toFixed(1)) : null;

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
    .filter((item) => item.gtDate >= start && item.gtDate <= end)
    .sort((left, right) => left.gtDate.localeCompare(right.gtDate))
    .at(-1) as GtLog | undefined;

  const current = {
    start,
    end,
    overallAccuracy,
  };
  const previousSummary = Object.values(userState.weeklySummaries)
    .filter((item) => item.weekEndDate < start)
    .sort((left, right) => right.weekEndDate.localeCompare(left.weekEndDate))
    .at(0);
  const previousAccuracy = previousSummary?.overallAccuracy ?? null;

  let accuracyVsPrevious: WeeklySummary["accuracyVsPrevious"] = "stable";
  if (overallAccuracy !== null && previousAccuracy !== null) {
    if (overallAccuracy > previousAccuracy) accuracyVsPrevious = "up";
    if (overallAccuracy < previousAccuracy) accuracyVsPrevious = "down";
  }

  const { missedDays, suggestShift } = getScheduleHealth(userState, settings, getCurrentDayNumber(settings, end));

  return {
    id: randomUUID(),
    weekKey: start,
    weekStartDate: start,
    weekEndDate: end,
    blocksCompleted,
    blocksPlanned,
    greenDays,
    yellowDays,
    redDays,
    morningRevisionCompleted,
    morningRevisionPlanned,
    overrunBlocks: [...overrunMap.entries()].map(([label, count]) => ({ label, count })),
    totalMcqsSolved,
    overallAccuracy: current.overallAccuracy,
    accuracyVsPrevious,
    topWrongSubjects: [...wrongSubjects.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
    topCauseCodes: [...causeCodes.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count })),
    gtNumber: gt?.gtNumber ?? null,
    gtScore: gt?.score ?? null,
    gtAir: gt?.airPercentile ?? null,
    gtWrapperSummary: gt?.changeBeforeNextGt ?? null,
    scheduleStatus: suggestShift ? `${missedDays.length} missed days detected` : "On track",
    backlogCount: getBacklogCount(userState),
    bufferDaysUsed: settings.scheduleShiftDays >= 1 ? 1 : 0,
    subjectsStudied: [...subjectsStudied],
    generatedAt: new Date().toISOString(),
  };
}

export function runWeeklySummaryAutomation(userState: UserState, settings: AppSettings, todayDate: string) {
  const week = weekBounds(todayDate);
  if (todayDate !== week.end) {
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

  const existingSummary = Object.values(userState.weeklySummaries).find((entry) => entry.weekKey === week.start);
  if (existingSummary) {
    userState.processedDates.weeklySummaryDates.push(week.start);
    return {
      generated: false,
      weekStart: week.start,
      summaryId: existingSummary.id,
    };
  }

  const summary = generateWeeklySummary(userState, settings, week.start);
  userState.weeklySummaries[summary.id] = summary;
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
    runWeeklySummaryAutomation(userState, settings, todayDate);
  }
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
  const dailyQuote = getQuote("daily", Math.max(0, todayDayNumber - 1));
  const toughQuote = getQuote("tough_day", Math.max(0, todayDayNumber - 1));
  const celebrationIndex = Math.max(
    0,
    scheduleData.days.filter((day) => getDayCompletionState(day, userState, getDayState(userState, day.dayNumber).trafficLight)).length - 1,
  );
  const celebrationQuote = getQuote("celebration", celebrationIndex);
  const quote =
    dayComplete && celebrationQuote
      ? celebrationQuote
      : todayState?.trafficLight === "green"
        ? dailyQuote
        : toughQuote;

  const shiftHealth = getScheduleHealth(userState, settings, todayDayNumber);
  const shiftPreview = shiftHealth.suggestShift ? getShiftPreview(settings, shiftHealth.missedDays.length) : null;

  return {
    nowIso: now.toISOString(),
    todayDate,
    todayDayNumber,
    dayCountLabel: getSafeDayCountLabel(todayDayNumber),
    settings,
    todayScheduleDay,
    todayState,
    todayRevisionPlan,
    backlogCount,
    dayComplete,
    quote,
    shiftHealth,
    shiftPreview,
  };
}

export function getScheduleListData(store: LocalStore, userId: string) {
  applyAutomations(store, userId);
  const userState = store.userState[userId];
  const now = getEffectiveNow(store);
  const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
  const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);

  return scheduleData.days.map((day) => {
    const mappedDate = getMappedDate(day.dayNumber, userState.settings);
    const dayState = getDayState(userState, day.dayNumber);
    const completed = getDayCompletionState(day, userState, dayState.trafficLight);
    const hasPendingPast =
      mappedDate !== null &&
      mappedDate < todayDate &&
      getVisibleBlockKeys(dayState.trafficLight).some((block) => {
        const progress = getBlockProgress(userState, day.dayNumber, block);
        return progress.status === "pending";
      });

    return {
      ...day,
      mappedDate,
      trafficLight: dayState.trafficLight,
      today: day.dayNumber === todayDayNumber,
      completed,
      hiddenByCompression: isCompressedHiddenDay(day.dayNumber, userState.settings),
      status: completed ? "completed" : hasPendingPast ? "pending" : day.dayNumber === todayDayNumber ? "today" : day.dayNumber < todayDayNumber ? "past" : "upcoming",
    };
  });
}

export function getDayDetailData(store: LocalStore, userId: string, dayNumber: number) {
  applyAutomations(store, userId);
  const userState = store.userState[userId];
  const day = getScheduleDay(dayNumber);
  if (!day) {
    return null;
  }

  const state = getDayState(userState, dayNumber);
  const mappedDate = getMappedDate(dayNumber, userState.settings);
  const revisionPlan = mappedDate ? buildDailyRevisionPlan(mappedDate, userState, userState.settings) : null;

  return {
    day,
    mappedDate,
    state,
    revisionPlan,
    blocks: getTrackableBlocks(day).map((slot) => ({
      ...slot,
      progress: getBlockProgress(userState, dayNumber, slot.key as BlockKey),
      displayDescription: getDisplayBlockDescription(day, slot.key as BlockKey, state.trafficLight),
    })),
  };
}
