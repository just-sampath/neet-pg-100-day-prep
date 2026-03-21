import { HARD_BOUNDARY_DATE } from "@/lib/domain/constants";
import {
  getDayState,
  getMappedDate,
  getScheduleDay,
  getSubjectFromPrimaryFocus,
  getVisibleBlockKeys,
  isCompressedHiddenDay,
} from "@/lib/domain/schedule";
import { scheduleData } from "@/lib/generated/schedule-data";
import type {
  AppSettings,
  BacklogBulkScope,
  BacklogItem,
  BacklogMoveDirection,
  BacklogQueueSummary,
  BacklogQueueViewItem,
  BacklogSortMode,
  BacklogStatus,
  BacklogViewFilter,
  BlockKey,
  ScheduledRecoveryItem,
  UserState,
} from "@/lib/domain/types";
import { diffDays, getWeekdayInTimeZone, parseDateOnly, timeValue, toDateOnlyInTimeZone } from "@/lib/utils/date";

const SOURCE_LABELS = {
  missed: "Missed day",
  skipped: "Manual skip",
  yellow_day: "Yellow day",
  red_day: "Red day",
  overrun_cascade: "Overrun cascade",
} as const;

const STATUS_ORDER: Record<BacklogStatus, number> = {
  pending: 1,
  rescheduled: 2,
  completed: 3,
  dismissed: 4,
};

function getPendingItems(userState: UserState) {
  return Object.values(userState.backlogItems)
    .filter((item) => item.status === "pending")
    .sort((left, right) => {
      if (left.priorityOrder !== right.priorityOrder) {
        return left.priorityOrder - right.priorityOrder;
      }
      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }
      return left.id.localeCompare(right.id);
    });
}

function getSlotKey(dayNumber: number, blockKey: BlockKey) {
  return `${dayNumber}:${blockKey}`;
}

function getTrackableSlotLabel(dayNumber: number, blockKey: BlockKey) {
  return getScheduleDay(dayNumber)?.slots.find((slot) => slot.key === blockKey)?.label ?? blockKey.replaceAll("_", " ");
}

function getTrackableSlotStart(dayNumber: number, blockKey: BlockKey) {
  return getScheduleDay(dayNumber)?.slots.find((slot) => slot.key === blockKey)?.start ?? "23:59";
}

function isStudyBoundarySafe(dayNumber: number, settings: AppSettings) {
  const mappedDate = getMappedDate(dayNumber, settings);
  if (!mappedDate) {
    return false;
  }

  return parseDateOnly(mappedDate) < parseDateOnly(HARD_BOUNDARY_DATE);
}

function isTargetSlotAvailable(
  userState: UserState,
  settings: AppSettings,
  dayNumber: number,
  blockKey: BlockKey,
  occupiedSlots: Set<string>,
) {
  if (blockKey === "morning_revision") {
    return false;
  }

  if (dayNumber < 1 || dayNumber > 100 || isCompressedHiddenDay(dayNumber, settings) || !isStudyBoundarySafe(dayNumber, settings)) {
    return false;
  }

  const day = getScheduleDay(dayNumber);
  const slot = day?.slots.find((entry) => entry.key === blockKey && entry.trackable);
  if (!day || !slot) {
    return false;
  }

  if (timeValue(slot.start) < timeValue("06:30") || timeValue(slot.end) > timeValue("23:00")) {
    return false;
  }

  const visible = new Set(getVisibleBlockKeys(getDayState(userState, dayNumber).trafficLight));
  if (!visible.has(blockKey)) {
    return false;
  }

  return !occupiedSlots.has(getSlotKey(dayNumber, blockKey));
}

function buildOccupiedSlotSet(userState: UserState, excludeBacklogId?: string) {
  const occupied = new Set<string>();

  for (const item of Object.values(userState.backlogItems)) {
    if (
      item.id !== excludeBacklogId &&
      item.status === "rescheduled" &&
      item.rescheduledToDay &&
      item.rescheduledToBlockKey
    ) {
      occupied.add(getSlotKey(item.rescheduledToDay, item.rescheduledToBlockKey));
    }
  }

  return occupied;
}

function createSuggestion(
  dayNumber: number | null,
  blockKey: BlockKey | null,
  note: string | null,
) {
  return {
    suggestedDay: dayNumber,
    suggestedBlockKey: blockKey,
    suggestedNote: note,
  };
}

function buildTargetLabel(dayNumber: number, blockKey: BlockKey, settings: AppSettings) {
  const mappedDate = getMappedDate(dayNumber, settings);
  const slotLabel = getTrackableSlotLabel(dayNumber, blockKey);
  return mappedDate ? `Day ${dayNumber} · ${slotLabel} · ${mappedDate}` : `Day ${dayNumber} · ${slotLabel}`;
}

function getEligibleFutureDays(settings: AppSettings, startDay: number) {
  return scheduleData.days.filter(
    (day) => day.dayNumber >= startDay && !isCompressedHiddenDay(day.dayNumber, settings) && isStudyBoundarySafe(day.dayNumber, settings),
  );
}

function findFutureDay(
  days: typeof scheduleData.days,
  predicate: (day: (typeof scheduleData.days)[number]) => boolean,
) {
  return days.find(predicate) ?? null;
}

function isWeekendMappedDay(dayNumber: number, settings: AppSettings) {
  const mappedDate = getMappedDate(dayNumber, settings);
  if (!mappedDate) {
    return false;
  }

  const weekday = getWeekdayInTimeZone(mappedDate);
  return weekday === 0 || weekday === 6;
}

function generateBacklogSuggestion(
  item: BacklogItem,
  userState: UserState,
  settings: AppSettings,
  todayDayNumber: number,
  occupiedSlots: Set<string>,
) {
  if (!settings.dayOneDate) {
    return createSuggestion(null, null, "Set your Day 1 start date in Settings to enable recovery suggestions.");
  }

  const searchStartDay = Math.max(todayDayNumber + 1, item.originalDay + 1, 1);
  const futureDays = getEligibleFutureDays(settings, searchStartDay);
  if (futureDays.length === 0) {
    return createSuggestion(null, null, "No compatible slot before the August 20 boundary. Keeping this in backlog.");
  }

  const sameSubject = (dayNumber: number) =>
    getSubjectFromPrimaryFocus(getScheduleDay(dayNumber)?.primaryFocus ?? "") === item.subject;

  switch (item.originalBlockKey) {
    case "block_a":
    case "block_b": {
      const sameSubjectConsolidation = findFutureDay(
        futureDays,
        (day) => sameSubject(day.dayNumber) && isTargetSlotAvailable(userState, settings, day.dayNumber, "consolidation", occupiedSlots),
      );
      if (sameSubjectConsolidation) {
        return createSuggestion(
          sameSubjectConsolidation.dayNumber,
          "consolidation",
          `Suggested during ${item.subject} consolidation on Day ${sameSubjectConsolidation.dayNumber}.`,
        );
      }

      if (isTargetSlotAvailable(userState, settings, searchStartDay, "consolidation", occupiedSlots)) {
        return createSuggestion(
          searchStartDay,
          "consolidation",
          `Suggested for the next day's consolidation slot on Day ${searchStartDay}.`,
        );
      }

      const sameSubjectPrimarySlot = findFutureDay(
        futureDays,
        (day) => sameSubject(day.dayNumber) && isTargetSlotAvailable(userState, settings, day.dayNumber, item.originalBlockKey, occupiedSlots),
      );
      if (sameSubjectPrimarySlot) {
        return createSuggestion(
          sameSubjectPrimarySlot.dayNumber,
          item.originalBlockKey,
          `Suggested on the next ${item.subject} focus day so the topic returns in-context.`,
        );
      }

      return createSuggestion(
        null,
        null,
        "No compatible slot without cutting into sleep. Keeping this in backlog.",
      );
    }

    case "mcq": {
      const nextMcq = findFutureDay(
        futureDays,
        (day) => isTargetSlotAvailable(userState, settings, day.dayNumber, "mcq", occupiedSlots),
      );
      if (!nextMcq) {
        return createSuggestion(null, null, "No open MCQ slot before the August 20 study cutoff. Staying in backlog.");
      }

      return createSuggestion(
        nextMcq.dayNumber,
        "mcq",
        nextMcq.dayNumber === searchStartDay
          ? `Add to tomorrow's MCQ block? Increase target from 45-70 to 60-80.`
          : `Add to the next open MCQ block on Day ${nextMcq.dayNumber}. Increase target from 45-70 to 60-80.`,
      );
    }

    case "pyq_image": {
      if (isTargetSlotAvailable(userState, settings, searchStartDay, "pyq_image", occupiedSlots)) {
        return createSuggestion(
          searchStartDay,
          "pyq_image",
          `Suggested for the next day's PYQ / image slot on Day ${searchStartDay}.`,
        );
      }

      const weekendPyq = findFutureDay(
        futureDays,
        (day) =>
          isWeekendMappedDay(day.dayNumber, settings) &&
          isTargetSlotAvailable(userState, settings, day.dayNumber, "pyq_image", occupiedSlots),
      );

      return weekendPyq
        ? createSuggestion(
            weekendPyq.dayNumber,
            "pyq_image",
            `Suggested for the next weekend PYQ / image slot on Day ${weekendPyq.dayNumber}.`,
          )
        : createSuggestion(null, null, "No open PYQ / image slot before the August 20 study cutoff. Staying in backlog.");
    }

    case "consolidation": {
      if (isTargetSlotAvailable(userState, settings, searchStartDay, "consolidation", occupiedSlots)) {
        return createSuggestion(
          searchStartDay,
          "consolidation",
          `Suggested for the next day's consolidation slot on Day ${searchStartDay}.`,
        );
      }

      const sameSubjectAfternoon = findFutureDay(
        futureDays,
        (day) => sameSubject(day.dayNumber) && isTargetSlotAvailable(userState, settings, day.dayNumber, "consolidation", occupiedSlots),
      );

      return sameSubjectAfternoon
        ? createSuggestion(
            sameSubjectAfternoon.dayNumber,
            "consolidation",
            `Suggested during the next ${item.subject} afternoon consolidation on Day ${sameSubjectAfternoon.dayNumber}.`,
          )
        : createSuggestion(null, null, "No open consolidation slot before the August 20 study cutoff. Staying in backlog.");
    }

    case "night_recall": {
      const nextNightRecall = findFutureDay(
        futureDays,
        (day) => isTargetSlotAvailable(userState, settings, day.dayNumber, "night_recall", occupiedSlots),
      );
      return nextNightRecall
        ? createSuggestion(
            nextNightRecall.dayNumber,
            "night_recall",
            nextNightRecall.dayNumber === searchStartDay
              ? "Stack this with tomorrow's night recall."
              : `Stack this with the next open night recall on Day ${nextNightRecall.dayNumber}.`,
          )
        : createSuggestion(null, null, "No open night recall slot before the August 20 study cutoff. Staying in backlog.");
    }

    default:
      return createSuggestion(null, null, "Morning revision returns through the revision queue instead of the backlog.");
  }
}

export function normalizeBacklogPriorityOrder(userState: UserState) {
  const ordered = Object.values(userState.backlogItems).sort((left, right) => {
    const leftPriority = left.priorityOrder > 0 ? left.priorityOrder : Number.MAX_SAFE_INTEGER;
    const rightPriority = right.priorityOrder > 0 ? right.priorityOrder : Number.MAX_SAFE_INTEGER;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    if (left.createdAt !== right.createdAt) {
      return left.createdAt.localeCompare(right.createdAt);
    }
    return left.id.localeCompare(right.id);
  });

  ordered.forEach((item, index) => {
    item.priorityOrder = index + 1;
  });
}

export function getNextBacklogPriorityOrder(userState: UserState) {
  normalizeBacklogPriorityOrder(userState);
  const priorities = Object.values(userState.backlogItems).map((item) => item.priorityOrder || 0);
  return (priorities.length ? Math.max(...priorities) : 0) + 1;
}

export function refreshBacklogSuggestions(userState: UserState, settings: AppSettings, todayDayNumber: number) {
  normalizeBacklogPriorityOrder(userState);
  const occupiedSlots = buildOccupiedSlotSet(userState);

  for (const item of getPendingItems(userState)) {
    const suggestion = generateBacklogSuggestion(item, userState, settings, todayDayNumber, occupiedSlots);
    item.suggestedDay = suggestion.suggestedDay;
    item.suggestedBlockKey = suggestion.suggestedBlockKey;
    item.suggestedNote = suggestion.suggestedNote;

    if (suggestion.suggestedDay && suggestion.suggestedBlockKey) {
      occupiedSlots.add(getSlotKey(suggestion.suggestedDay, suggestion.suggestedBlockKey));
    }
  }
}

export function getBacklogAgeDays(createdAt: string, todayDate: string) {
  return Math.max(0, diffDays(todayDate, toDateOnlyInTimeZone(createdAt)));
}

export function getBacklogSourceLabel(sourceTag: BacklogItem["sourceTag"]) {
  return SOURCE_LABELS[sourceTag];
}

export function getBacklogSummary(userState: UserState): BacklogQueueSummary {
  const pendingItems = Object.values(userState.backlogItems).filter((item) => item.status === "pending");

  return {
    totalPending: pendingItems.length,
    fromMissed: pendingItems.filter((item) => item.sourceTag === "missed" || item.sourceTag === "skipped").length,
    fromYellowRed: pendingItems.filter((item) => item.sourceTag === "yellow_day" || item.sourceTag === "red_day").length,
    fromOverrun: pendingItems.filter((item) => item.sourceTag === "overrun_cascade").length,
  };
}

export function getBacklogStatusCounts(userState: UserState) {
  return Object.values(userState.backlogItems).reduce(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    {
      pending: 0,
      rescheduled: 0,
      completed: 0,
      dismissed: 0,
      all: Object.keys(userState.backlogItems).length,
    },
  );
}

function sortBacklogItems(items: BacklogItem[], todayDate: string, sort: BacklogSortMode) {
  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      return STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    }

    if (sort === "subject") {
      const subjectDelta = left.subject.localeCompare(right.subject);
      if (subjectDelta !== 0) {
        return subjectDelta;
      }
    }

    if (sort === "oldest") {
      const ageDelta = getBacklogAgeDays(right.createdAt, todayDate) - getBacklogAgeDays(left.createdAt, todayDate);
      if (ageDelta !== 0) {
        return ageDelta;
      }
    }

    if (sort === "newest") {
      if (left.createdAt !== right.createdAt) {
        return right.createdAt.localeCompare(left.createdAt);
      }
    } else {
      if (left.priorityOrder !== right.priorityOrder) {
        return left.priorityOrder - right.priorityOrder;
      }
    }

    if (left.createdAt !== right.createdAt) {
      return left.createdAt.localeCompare(right.createdAt);
    }

    return left.id.localeCompare(right.id);
  });
}

export function getBacklogQueueItems(
  userState: UserState,
  settings: AppSettings,
  todayDate: string,
  filter: BacklogViewFilter,
  sort: BacklogSortMode,
): BacklogQueueViewItem[] {
  const allItems = Object.values(userState.backlogItems);
  const filtered = filter === "all" ? allItems : allItems.filter((item) => item.status === filter);

  return sortBacklogItems(filtered, todayDate, sort).map((item) => ({
    ...item,
    daysInBacklog: getBacklogAgeDays(item.createdAt, todayDate),
    sourceLabel: getBacklogSourceLabel(item.sourceTag),
    originalMappedDate: getMappedDate(item.originalDay, settings),
    suggestionLabel:
      item.suggestedDay && item.suggestedBlockKey ? buildTargetLabel(item.suggestedDay, item.suggestedBlockKey, settings) : null,
    rescheduledLabel:
      item.rescheduledToDay && item.rescheduledToBlockKey
        ? buildTargetLabel(item.rescheduledToDay, item.rescheduledToBlockKey, settings)
        : null,
  }));
}

export function getScheduledRecoveryForDay(
  userState: UserState,
  settings: AppSettings,
  dayNumber: number,
  todayDate: string,
): ScheduledRecoveryItem[] {
  return Object.values(userState.backlogItems)
    .filter((item) => item.status === "rescheduled" && item.rescheduledToDay === dayNumber && item.rescheduledToBlockKey)
    .sort((left, right) => {
      const leftStart = getTrackableSlotStart(dayNumber, left.rescheduledToBlockKey!);
      const rightStart = getTrackableSlotStart(dayNumber, right.rescheduledToBlockKey!);
      if (leftStart !== rightStart) {
        return leftStart.localeCompare(rightStart);
      }
      if (left.priorityOrder !== right.priorityOrder) {
        return left.priorityOrder - right.priorityOrder;
      }
      return left.id.localeCompare(right.id);
    })
    .map((item) => ({
      id: item.id,
      sourceDay: item.originalDay,
      sourceMappedDate: getMappedDate(item.originalDay, settings),
      subject: item.subject,
      topicDescription: item.topicDescription,
      sourceTag: item.sourceTag,
      targetDay: dayNumber,
      targetBlockKey: item.rescheduledToBlockKey!,
      targetBlockLabel: getTrackableSlotLabel(dayNumber, item.rescheduledToBlockKey!),
      daysInBacklog: getBacklogAgeDays(item.createdAt, todayDate),
      priorityOrder: item.priorityOrder,
    }));
}

export function completeAssignedRecoveryForTarget(
  userState: UserState,
  targetDay: number,
  targetBlockKey: BlockKey,
  completedAt: string,
) {
  let count = 0;

  for (const item of Object.values(userState.backlogItems)) {
    if (item.status !== "rescheduled" || item.rescheduledToDay !== targetDay || item.rescheduledToBlockKey !== targetBlockKey) {
      continue;
    }

    item.status = "completed";
    item.completedAt = completedAt;
    count += 1;
  }

  return count;
}

export function releaseAssignedRecoveryForTarget(
  userState: UserState,
  targetDay: number,
  targetBlockKey: BlockKey,
) {
  let count = 0;

  for (const item of Object.values(userState.backlogItems)) {
    if (item.status !== "rescheduled" || item.rescheduledToDay !== targetDay || item.rescheduledToBlockKey !== targetBlockKey) {
      continue;
    }

    item.status = "pending";
    item.rescheduledToDay = null;
    item.rescheduledToBlockKey = null;
    item.suggestedDay = null;
    item.suggestedBlockKey = null;
    item.suggestedNote = null;
    item.completedAt = null;
    count += 1;
  }

  return count;
}

export function isValidBacklogRescheduleTarget(
  userState: UserState,
  settings: AppSettings,
  todayDayNumber: number,
  targetDay: number,
  targetBlockKey: BlockKey,
  excludeBacklogId?: string,
) {
  if (!Number.isInteger(targetDay) || targetDay <= todayDayNumber) {
    return false;
  }

  const occupiedSlots = buildOccupiedSlotSet(userState, excludeBacklogId);
  return isTargetSlotAvailable(userState, settings, targetDay, targetBlockKey, occupiedSlots);
}

export function moveBacklogItemPriority(userState: UserState, backlogId: string, direction: BacklogMoveDirection) {
  normalizeBacklogPriorityOrder(userState);
  const pendingItems = getPendingItems(userState);
  const index = pendingItems.findIndex((item) => item.id === backlogId);
  if (index === -1) {
    return false;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= pendingItems.length) {
    return false;
  }

  const current = pendingItems[index]!;
  const adjacent = pendingItems[swapIndex]!;
  const priority = current.priorityOrder;
  current.priorityOrder = adjacent.priorityOrder;
  adjacent.priorityOrder = priority;
  normalizeBacklogPriorityOrder(userState);
  return true;
}

function matchesBulkScope(item: BacklogItem, scope: BacklogBulkScope) {
  if (scope === "all_pending") {
    return item.status === "pending";
  }

  if (item.status !== "pending") {
    return false;
  }

  switch (scope) {
    case "missed_skipped":
      return item.sourceTag === "missed" || item.sourceTag === "skipped";
    case "yellow_red":
      return item.sourceTag === "yellow_day" || item.sourceTag === "red_day";
    case "overrun":
      return item.sourceTag === "overrun_cascade";
    default:
      return false;
  }
}

export function dismissBacklogScope(userState: UserState, scope: BacklogBulkScope) {
  const dismissedAt = new Date().toISOString();
  let count = 0;

  for (const item of Object.values(userState.backlogItems)) {
    if (!matchesBulkScope(item, scope)) {
      continue;
    }

    item.status = "dismissed";
    item.dismissedAt = dismissedAt;
    count += 1;
  }

  return count;
}

export function acceptBacklogSuggestionsForScope(
  userState: UserState,
  settings: AppSettings,
  todayDayNumber: number,
  scope: BacklogBulkScope,
) {
  refreshBacklogSuggestions(userState, settings, todayDayNumber);

  let accepted = 0;
  for (const item of getPendingItems(userState)) {
    if (!matchesBulkScope(item, scope) || !item.suggestedDay || !item.suggestedBlockKey) {
      continue;
    }

    if (!isValidBacklogRescheduleTarget(userState, settings, todayDayNumber, item.suggestedDay, item.suggestedBlockKey, item.id)) {
      continue;
    }

    item.status = "rescheduled";
    item.rescheduledToDay = item.suggestedDay;
    item.rescheduledToBlockKey = item.suggestedBlockKey;
    accepted += 1;
  }

  return accepted;
}

export const rescheduleBacklogScopeToSuggestions = acceptBacklogSuggestionsForScope;
