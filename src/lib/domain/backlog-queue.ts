import { HARD_BOUNDARY_DATE } from "@/lib/domain/constants";
import { getScheduleDay, getScheduleDays, getDayState, getMappedDate, getVisibleBlockKeys, isCompressedHiddenDay } from "@/lib/domain/schedule";
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
import { diffDays, parseDateOnly, toDateOnlyInTimeZone } from "@/lib/utils/date";

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
  return getScheduleDay(dayNumber)?.blocks.find((slot) => slot.timeSlotKey === blockKey)?.displayLabel ?? blockKey;
}

function getTrackableSlotStart(dayNumber: number, blockKey: BlockKey) {
  return getScheduleDay(dayNumber)?.blocks.find((slot) => slot.timeSlotKey === blockKey)?.timeSlotKey.split("-")[0] ?? "23:59";
}

function isStudyBoundarySafe(dayNumber: number, settings: AppSettings, userState?: UserState) {
  const mappedDate = userState ? getMappedDate(dayNumber, userState) : getMappedDate(dayNumber, settings);
  if (!mappedDate) {
    return false;
  }

  return parseDateOnly(mappedDate) < parseDateOnly(HARD_BOUNDARY_DATE);
}

function isSameSubject(targetDayNumber: number, item: BacklogItem) {
  const targetDay = getScheduleDay(targetDayNumber);
  if (!targetDay) {
    return false;
  }

  const targetSubjects = new Set(targetDay.primaryFocusSubjectIds);
  return item.subjectIds.some((subjectId) => targetSubjects.has(subjectId));
}

function isTargetSlotAvailable(
  userState: UserState,
  settings: AppSettings,
  item: BacklogItem,
  dayNumber: number,
  blockKey: BlockKey,
  occupiedSlots: Set<string>,
) {
  if (
    dayNumber < 1 ||
    dayNumber > MAX_SCHEDULE_DAY ||
    isCompressedHiddenDay(dayNumber, settings) ||
    !isStudyBoundarySafe(dayNumber, settings, userState)
  ) {
    return false;
  }

  const day = getScheduleDay(dayNumber, userState);
  const block = day?.blocks.find((entry) => entry.timeSlotKey === blockKey && entry.trackable);
  if (!day || !block || !block.reschedulable) {
    return false;
  }

  const visible = new Set(getVisibleBlockKeys(getDayState(userState, dayNumber).trafficLight, day));
  if (!visible.has(blockKey)) {
    return false;
  }

  if (block.recoveryLane !== item.recoveryLane) {
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

function createSuggestion(dayNumber: number | null, blockKey: BlockKey | null, note: string | null) {
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

function getCompatibleFutureDays(item: BacklogItem, settings: AppSettings, startDay: number) {
  const sourceDay = getScheduleDay(item.originalDay, undefined);
  const sourcePhaseId = sourceDay?.phaseId ?? null;
  const days = getScheduleDays().filter(
    (day) =>
      day.dayNumber >= startDay &&
      !isCompressedHiddenDay(day.dayNumber, settings) &&
      isStudyBoundarySafe(day.dayNumber, settings, undefined),
  );

  if (item.phaseFence === "same_phase_only" || item.phaseFence === "no_auto_cross_phase") {
    return days.filter((day) => day.phaseId === sourcePhaseId);
  }

  if (item.phaseFence === "current_phase_preferred") {
    const samePhase = days.filter((day) => day.phaseId === sourcePhaseId);
    return samePhase.length ? samePhase : days;
  }

  return [];
}

function findBestTargetBlock(dayNumber: number, userState: UserState, settings: AppSettings, item: BacklogItem, occupiedSlots: Set<string>) {
  const day = getScheduleDay(dayNumber);
  if (!day) {
    return null;
  }

  const candidates = day.blocks.filter(
    (block) => block.trackable && block.reschedulable && block.recoveryLane === item.recoveryLane,
  );
  const prioritized = candidates.toSorted((left, right) => {
    const sameSubjectLeft = isSameSubject(dayNumber, item) ? (left.blockIntent === "core_study" || left.blockIntent === "revision" ? 0 : 1) : 1;
    const sameSubjectRight = isSameSubject(dayNumber, item) ? (right.blockIntent === "core_study" || right.blockIntent === "revision" ? 0 : 1) : 1;
    if (sameSubjectLeft !== sameSubjectRight) {
      return sameSubjectLeft - sameSubjectRight;
    }
    return left.timeSlotKey.localeCompare(right.timeSlotKey);
  });

  return (
    prioritized.find((candidate) => isTargetSlotAvailable(userState, settings, item, dayNumber, candidate.timeSlotKey, occupiedSlots)) ??
    null
  );
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

  if (item.phaseFence === "not_reschedulable") {
    return createSuggestion(null, null, "This task should stay in its original phase and won’t be auto-rescheduled.");
  }

  const searchStartDay = Math.max(todayDayNumber + 1, item.originalDay + 1, 1);
  const futureDays = getCompatibleFutureDays(item, settings, searchStartDay);
  if (futureDays.length === 0) {
    return createSuggestion(null, null, "No compatible slot is available within the allowed phase window.");
  }

  for (const day of futureDays) {
    const target = findBestTargetBlock(day.dayNumber, userState, settings, item, occupiedSlots);
    if (!target) {
      continue;
    }

    const sameSubject = isSameSubject(day.dayNumber, item);
    return createSuggestion(
      day.dayNumber,
      target.timeSlotKey,
      sameSubject
        ? `Suggested on the next matching ${item.subject} day so the topic returns in context.`
        : `Suggested in the next open ${target.displayLabel.toLowerCase()} that fits this phase.`,
    );
  }

  return createSuggestion(null, null, "No compatible slot before the August 20 study boundary. Keeping this in recovery.");
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
    } else if (left.priorityOrder !== right.priorityOrder) {
      return left.priorityOrder - right.priorityOrder;
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
    originalMappedDate: getMappedDate(item.originalDay, userState),
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
      sourceItemId: item.sourceItemId,
      sourceDay: item.originalDay,
      sourceMappedDate: getMappedDate(item.originalDay, userState),
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

export function releaseAssignedRecoveryForTarget(userState: UserState, targetDay: number, targetBlockKey: BlockKey) {
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

  const item = excludeBacklogId ? userState.backlogItems[excludeBacklogId] : null;
  if (!item) {
    return false;
  }

  const occupiedSlots = buildOccupiedSlotSet(userState, excludeBacklogId);
  return isTargetSlotAvailable(userState, settings, item, targetDay, targetBlockKey, occupiedSlots);
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
  const target = pendingItems[swapIndex]!;
  const currentPriority = current.priorityOrder;
  current.priorityOrder = target.priorityOrder;
  target.priorityOrder = currentPriority;
  normalizeBacklogPriorityOrder(userState);
  return true;
}

function getScopeFilter(scope: BacklogBulkScope) {
  switch (scope) {
    case "missed_skipped":
      return (item: BacklogItem) => item.status === "pending" && (item.sourceTag === "missed" || item.sourceTag === "skipped");
    case "yellow_red":
      return (item: BacklogItem) => item.status === "pending" && (item.sourceTag === "yellow_day" || item.sourceTag === "red_day");
    case "overrun":
      return (item: BacklogItem) => item.status === "pending" && item.sourceTag === "overrun_cascade";
    default:
      return (item: BacklogItem) => item.status === "pending";
  }
}

export function dismissBacklogScope(userState: UserState, scope: BacklogBulkScope) {
  const filter = getScopeFilter(scope);
  const dismissedAt = new Date().toISOString();

  for (const item of Object.values(userState.backlogItems)) {
    if (!filter(item)) {
      continue;
    }

    item.status = "dismissed";
    item.dismissedAt = dismissedAt;
    item.rescheduledToDay = null;
    item.rescheduledToBlockKey = null;
  }
}

export function rescheduleBacklogScopeToSuggestions(
  userState: UserState,
  settings: AppSettings,
  todayDayNumber: number,
  scope: BacklogBulkScope,
) {
  refreshBacklogSuggestions(userState, settings, todayDayNumber);
  const filter = getScopeFilter(scope);

  for (const item of Object.values(userState.backlogItems)) {
    if (!filter(item) || !item.suggestedDay || !item.suggestedBlockKey) {
      continue;
    }

    if (!isValidBacklogRescheduleTarget(userState, settings, todayDayNumber, item.suggestedDay, item.suggestedBlockKey, item.id)) {
      continue;
    }

    item.status = "rescheduled";
    item.rescheduledToDay = item.suggestedDay;
    item.rescheduledToBlockKey = item.suggestedBlockKey;
  }
}
const MAX_SCHEDULE_DAY = 105;
