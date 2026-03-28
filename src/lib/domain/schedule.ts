import { scheduleData } from "@/lib/generated/schedule-data";
import {
  BREAK_MICRO_SLOT_LABELS,
  BREAK_MICRO_SLOT_ORDER,
  BUFFER_DAY,
  EXAM_DATE,
  HARD_BOUNDARY_DATE,
  REVISION_INTERVALS,
  SHIFT_COMPRESSION_PAIRS,
} from "@/lib/domain/constants";
import type { ScheduleDayBlock, ScheduleDayBlockItem, ScheduleDayPlan, SchedulePhaseGroup } from "@/lib/domain/schedule-data-types";
import type {
  AppSettings,
  BlockKey,
  BlockProgress,
  BlockStatus,
  DailyRevisionPlan,
  DayState,
  MorningPhaseMode,
  MorningBlockStatusMode,
  OverflowRevisionItem,
  RevisionCompletion,
  RevisionDisplayGroup,
  RevisionQueueItem,
  RevisionSession,
  RevisionSessionLane,
  RevisionType,
  ScheduleDayEditState,
  ScheduleDayRelation,
  ScheduleHealth,
  ScheduleShiftEvent,
  ScheduleShiftPreview,
  ShiftMergedDay,
  TopicProgress,
  TopicStatus,
  TrafficLight,
  UserState,
} from "@/lib/domain/types";
import { addDaysToDateOnly, diffDays, parseDateOnly, toDateOnlyInTimeZone } from "@/lib/utils/date";

const ALL_DAYS = scheduleData.daywisePlan.days;
const DAY_BY_NUMBER = new Map(ALL_DAYS.map((day) => [day.dayNumber, day] as const));
const SUBJECTS = scheduleData.subjectStrategy.subjects;
const SUBJECT_LABEL_BY_ID = new Map(SUBJECTS.map((subject) => [subject.subjectId, subject.subjectName] as const));
const SUBJECT_PRIORITY_BY_ID = new Map(SUBJECTS.map((subject) => [subject.subjectId, subject.priorityRank] as const));
const SUBJECT_PRIORITY_BY_LABEL = new Map(SUBJECTS.map((subject) => [subject.subjectName, subject.priorityRank] as const));
const PHASE_GROUP_BY_ID = new Map(scheduleData.daywisePlan.phaseCatalog.map((phase) => [phase.phaseId, phase.phaseGroup] as const));
const ITEM_LOOKUP = new Map(
  ALL_DAYS.flatMap((day) =>
    day.blocks.flatMap((block) =>
      block.items.map((item) => [
        item.itemId,
        {
          day,
          block,
          item,
        },
      ] as const),
    ),
  ),
);
const SUBJECT_MATCHERS = SUBJECTS.flatMap((subject) => [
  { label: subject.subjectName, normalized: subject.subjectName.toLowerCase() },
  ...subject.aliases.map((alias) => ({ label: subject.subjectName, normalized: alias.toLowerCase() })),
]).sort((left, right) => right.normalized.length - left.normalized.length);

function timingKey(dayNumber: number, blockKey: BlockKey) {
  return `${dayNumber}:${blockKey}`;
}

function getTopicProgressKey(itemId: string) {
  return itemId;
}

function getShiftEvents(settings: AppSettings): ScheduleShiftEvent[] {
  return [...(settings.shiftEvents ?? [])].sort((left, right) => left.appliedAt.localeCompare(right.appliedAt));
}

function getConsumedShiftRecoveryKeys(settings: AppSettings) {
  const keys = new Set<string>();

  for (const event of getShiftEvents(settings)) {
    if (event.bufferDayUsed) {
      keys.add(`buffer:${event.bufferDayUsed}`);
    }

    for (const pair of event.compressedPairs) {
      keys.add(`compression:${pair[0]}:${pair[1]}`);
    }
  }

  return keys;
}

function getAvailableShiftRecoveries(settings: AppSettings, anchorDayNumber: number) {
  const consumed = getConsumedShiftRecoveryKeys(settings);
  const recoveries: Array<
    | {
        kind: "buffer";
        hiddenDay: number;
      }
    | {
        kind: "compression";
        pair: [number, number];
        hiddenDay: number;
      }
  > = [];

  if (anchorDayNumber <= BUFFER_DAY && !consumed.has(`buffer:${BUFFER_DAY}`)) {
    recoveries.push({
      kind: "buffer",
      hiddenDay: BUFFER_DAY,
    });
  }

  for (const pair of SHIFT_COMPRESSION_PAIRS) {
    const typedPair = [pair[0], pair[1]] as [number, number];
    if (anchorDayNumber > typedPair[0]) {
      continue;
    }

    if (consumed.has(`compression:${typedPair[0]}:${typedPair[1]}`)) {
      continue;
    }

    recoveries.push({
      kind: "compression",
      pair: typedPair,
      hiddenDay: typedPair[1],
    });
  }

  return recoveries;
}

function defaultDayState(dayNumber: number): DayState {
  return {
    dayNumber,
    trafficLight: "green",
    updatedAt: new Date().toISOString(),
  };
}

function defaultBlockTiming(dayNumber: number, blockKey: BlockKey) {
  return {
    dayNumber,
    blockKey,
    actualStart: null,
    actualEnd: null,
    note: null,
    updatedAt: null,
  };
}

function defaultTopicProgress(item: ScheduleDayBlockItem, dayNumber: number, blockKey: BlockKey): TopicProgress {
  return {
    itemId: item.itemId,
    dayNumber,
    blockKey,
    status: "pending",
    completedAt: null,
    sourceTag: null,
    note: null,
    updatedAt: null,
  };
}

function getLastCompletedAt(values: Array<string | null>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function getDerivedStatus(statuses: TopicStatus[]) {
  if (statuses.length === 0) {
    return "pending" as const;
  }

  if (statuses.every((status) => status === "completed")) {
    return "completed" as const;
  }

  const unresolved = statuses.filter((status) => status !== "completed");
  if (unresolved.some((status) => status === "missed")) {
    return "missed" as const;
  }
  if (unresolved.some((status) => status === "rescheduled")) {
    return "rescheduled" as const;
  }
  if (unresolved.some((status) => status === "skipped")) {
    return "skipped" as const;
  }
  if (statuses.includes("completed")) {
    return "partially_complete" as const;
  }

  return "pending" as const;
}

function getSubjectLabel(subjectIds: string[], fallback: string) {
  const first = subjectIds.find((subjectId) => SUBJECT_LABEL_BY_ID.has(subjectId));
  return (first ? SUBJECT_LABEL_BY_ID.get(first) : null) ?? fallback;
}

function getPhaseGroup(day: ScheduleDayPlan): SchedulePhaseGroup {
  return PHASE_GROUP_BY_ID.get(day.phaseId) ?? "phase_1";
}

function getSubjectPriorityForRevisionItem(item: RevisionQueueItem) {
  const source = ITEM_LOOKUP.get(item.sourceItemId);
  const subjectId = source?.item.subjectIds.find((entry) => SUBJECT_PRIORITY_BY_ID.has(entry));
  if (subjectId) {
    return SUBJECT_PRIORITY_BY_ID.get(subjectId) ?? Number.MAX_SAFE_INTEGER;
  }

  return SUBJECT_PRIORITY_BY_LABEL.get(item.subject) ?? Number.MAX_SAFE_INTEGER;
}

type RevisionSessionBucket = {
  sourceItemId: string;
  sourceDay: number;
  sourceBlockKey: BlockKey;
  sourceTopicLabel: string;
  subject: string;
  allItems: RevisionQueueItem[];
  pendingItems: RevisionQueueItem[];
  completedItems: RevisionQueueItem[];
  earliestScheduledDate: string;
  maxOverdueBy: number;
  subjectPriority: number;
};

function sortRevisionBuckets(left: RevisionSessionBucket, right: RevisionSessionBucket) {
  if (left.earliestScheduledDate !== right.earliestScheduledDate) {
    return left.earliestScheduledDate.localeCompare(right.earliestScheduledDate);
  }

  if (left.maxOverdueBy !== right.maxOverdueBy) {
    return right.maxOverdueBy - left.maxOverdueBy;
  }

  if (left.subjectPriority !== right.subjectPriority) {
    return left.subjectPriority - right.subjectPriority;
  }

  if (left.sourceDay !== right.sourceDay) {
    return left.sourceDay - right.sourceDay;
  }

  return left.sourceTopicLabel.localeCompare(right.sourceTopicLabel);
}

function createRevisionSessionBuckets(items: RevisionQueueItem[]) {
  const buckets = new Map<string, RevisionSessionBucket>();

  for (const item of items) {
    const existing = buckets.get(item.sourceItemId);
    if (existing) {
      existing.allItems.push(item);
      if (item.status === "completed") {
        existing.completedItems.push(item);
      } else {
        existing.pendingItems.push(item);
      }
      if (item.scheduledDate < existing.earliestScheduledDate) {
        existing.earliestScheduledDate = item.scheduledDate;
      }
      if (item.overdueBy > existing.maxOverdueBy) {
        existing.maxOverdueBy = item.overdueBy;
      }
      continue;
    }

    buckets.set(item.sourceItemId, {
      sourceItemId: item.sourceItemId,
      sourceDay: item.sourceDay,
      sourceBlockKey: item.sourceBlockKey,
      sourceTopicLabel: item.sourceTopicLabel,
      subject: item.subject,
      allItems: [item],
      pendingItems: item.status === "completed" ? [] : [item],
      completedItems: item.status === "completed" ? [item] : [],
      earliestScheduledDate: item.scheduledDate,
      maxOverdueBy: item.overdueBy,
      subjectPriority: getSubjectPriorityForRevisionItem(item),
    });
  }

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      allItems: [...bucket.allItems].sort((left, right) => getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType)),
      pendingItems: [...bucket.pendingItems].sort((left, right) => getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType)),
      completedItems: [...bucket.completedItems].sort((left, right) => getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType)),
    }))
    .sort(sortRevisionBuckets);
}

function createRevisionSession(
  bucket: RevisionSessionBucket,
  lane: RevisionSessionLane,
  assignedSlot: RevisionSession["assignedSlot"],
): RevisionSession {
  return {
    id: `${lane}:${bucket.sourceItemId}`,
    sourceItemId: bucket.sourceItemId,
    sourceDay: bucket.sourceDay,
    sourceBlockKey: bucket.sourceBlockKey,
    sourceTopicLabel: bucket.sourceTopicLabel,
    subject: bucket.subject,
    lane,
    revisionTypes: bucket.pendingItems.map((item) => item.revisionType),
    revisionIds: bucket.pendingItems.map((item) => item.id),
    items: bucket.pendingItems.map((item) => ({
      ...item,
      assignedSlot,
    })),
    assignedSlot,
    earliestScheduledDate: bucket.earliestScheduledDate,
    maxOverdueBy: bucket.maxOverdueBy,
    totalIntervals: bucket.allItems.length,
    completedIntervals: bucket.completedItems.length,
    remainingIntervals: bucket.pendingItems.length,
    status: bucket.pendingItems.length === 0 ? "completed" : "pending",
  };
}

function getBlock(day: ScheduleDayPlan, blockKey: BlockKey) {
  return day.blocks.find((block) => block.timeSlotKey === blockKey) ?? null;
}

function getActiveAssignedRecovery(userState: UserState, dayNumber: number, blockKey: BlockKey) {
  return Object.values(userState.backlogItems).filter(
    (item) => item.status === "rescheduled" && item.rescheduledToDay === dayNumber && item.rescheduledToBlockKey === blockKey,
  );
}

function getCompletedAssignedRecovery(userState: UserState, dayNumber: number, blockKey: BlockKey) {
  return Object.values(userState.backlogItems).filter(
    (item) =>
      item.status === "completed" &&
      item.rescheduledToDay === dayNumber &&
      item.rescheduledToBlockKey === blockKey,
  );
}

function getItemCompletion(userState: UserState, item: ScheduleDayBlockItem, dayNumber: number, blockKey: BlockKey) {
  return userState.topicProgress[getTopicProgressKey(item.itemId)] ?? defaultTopicProgress(item, dayNumber, blockKey);
}

export function getScheduleDay(dayNumber: number): ScheduleDayPlan | undefined {
  return DAY_BY_NUMBER.get(dayNumber);
}

export function getScheduleDays() {
  return ALL_DAYS;
}

export function getScheduleItemById(itemId: string) {
  return ITEM_LOOKUP.get(itemId) ?? null;
}

export function getTrackableBlocks(day: ScheduleDayPlan) {
  return day.blocks.filter((block) => block.trackable);
}

export function getDayState(userState: UserState, dayNumber: number): DayState {
  return userState.dayStates[String(dayNumber)] ?? defaultDayState(dayNumber);
}

export function getBlockTiming(userState: UserState, dayNumber: number, blockKey: BlockKey) {
  return userState.blockTiming[timingKey(dayNumber, blockKey)] ?? defaultBlockTiming(dayNumber, blockKey);
}

export function getTopicProgress(userState: UserState, item: ScheduleDayBlockItem, dayNumber: number, blockKey: BlockKey) {
  return getItemCompletion(userState, item, dayNumber, blockKey);
}

export function getBlockProgress(userState: UserState, dayNumber: number, blockKey: BlockKey): BlockProgress {
  const day = getScheduleDay(dayNumber);
  const timing = getBlockTiming(userState, dayNumber, blockKey);

  if (!day) {
    return {
      dayNumber,
      blockKey,
      status: "pending",
      actualStart: timing.actualStart,
      actualEnd: timing.actualEnd,
      completedAt: null,
      sourceTag: null,
      note: timing.note,
      completedItemCount: 0,
      totalItemCount: 0,
      unresolvedItemCount: 0,
    };
  }

  const block = getBlock(day, blockKey);
  if (!block) {
    return {
      dayNumber,
      blockKey,
      status: "pending",
      actualStart: timing.actualStart,
      actualEnd: timing.actualEnd,
      completedAt: null,
      sourceTag: null,
      note: timing.note,
      completedItemCount: 0,
      totalItemCount: 0,
      unresolvedItemCount: 0,
    };
  }

  const nativeProgress = block.items.map((item) => getItemCompletion(userState, item, dayNumber, blockKey));

  if (block.semanticBlockKey === "morning_revision") {
    const mappedDate = getMappedDate(dayNumber, userState.settings);
    if (mappedDate) {
      const revisionPlan = buildDailyRevisionPlan(mappedDate, userState, userState.settings);
      if (revisionPlan.blockStatusMode === "revision_sessions") {
        const nativeStatus = getDerivedStatus(nativeProgress.map((entry) => entry.status));
        if (nativeStatus === "missed" || nativeStatus === "skipped" || nativeStatus === "rescheduled") {
          return {
            dayNumber,
            blockKey,
            status: nativeStatus,
            actualStart: timing.actualStart,
            actualEnd: timing.actualEnd,
            completedAt: getLastCompletedAt(nativeProgress.map((entry) => entry.completedAt)),
            sourceTag: nativeProgress.find((entry) => entry.sourceTag)?.sourceTag ?? null,
            note: timing.note,
            completedItemCount: nativeProgress.filter((entry) => entry.status === "completed").length,
            totalItemCount: nativeProgress.length,
            unresolvedItemCount: nativeProgress.filter((entry) => entry.status !== "completed").length,
          };
        }

        const status =
          revisionPlan.morningSessionRemaining === 0
            ? "completed"
            : revisionPlan.morningSessionCompleted > 0
              ? "partially_complete"
              : "pending";

        return {
          dayNumber,
          blockKey,
          status,
          actualStart: timing.actualStart,
          actualEnd: timing.actualEnd,
          completedAt: null,
          sourceTag: null,
          note: timing.note,
          completedItemCount: revisionPlan.morningSessionCompleted,
          totalItemCount: revisionPlan.morningSessionPlanned,
          unresolvedItemCount: revisionPlan.morningSessionRemaining,
        };
      }
    }
  }

  const assignedRecovery = getActiveAssignedRecovery(userState, dayNumber, blockKey);
  const completedRecovery = getCompletedAssignedRecovery(userState, dayNumber, blockKey);
  const statuses: TopicStatus[] = [
    ...nativeProgress.map((entry) => entry.status),
    ...assignedRecovery.map(() => "rescheduled" as const),
    ...completedRecovery.map(() => "completed" as const),
  ];
  const status = getDerivedStatus(statuses);
  const completedItemCount = statuses.filter((entry) => entry === "completed").length;
  const totalItemCount = statuses.length;
  const unresolvedItemCount = statuses.filter((entry) => entry !== "completed").length;
  const completedAt = getLastCompletedAt([
    ...nativeProgress.map((entry) => entry.completedAt),
    ...completedRecovery.map((entry) => entry.completedAt),
  ]);
  const firstSourceTag =
    nativeProgress.find((entry) => entry.sourceTag)?.sourceTag ??
    assignedRecovery[0]?.sourceTag ??
    completedRecovery[0]?.sourceTag ??
    null;

  return {
    dayNumber,
    blockKey,
    status,
    actualStart: timing.actualStart,
    actualEnd: timing.actualEnd,
    completedAt,
    sourceTag: firstSourceTag,
    note: timing.note,
    completedItemCount,
    totalItemCount,
    unresolvedItemCount,
  };
}

export function getSubjectFromPrimaryFocus(primaryFocus: string): string {
  const normalized = primaryFocus.toLowerCase();
  const match = SUBJECT_MATCHERS.find((candidate) => normalized.includes(candidate.normalized));
  if (match) {
    return match.label;
  }

  return primaryFocus.split(/[+/]/u)[0]?.trim() || primaryFocus;
}

export function getDisplayBlockDescription(day: ScheduleDayPlan, blockKey: BlockKey, trafficLight: TrafficLight) {
  void trafficLight;
  const block = getBlock(day, blockKey);
  if (!block) {
    return day.primaryFocusRaw;
  }

  const labels = block.items.map((item) => item.label).filter(Boolean);
  if (labels.length === 0) {
    return block.rawText || day.primaryFocusRaw;
  }
  if (labels.length === 1) {
    return labels[0]!;
  }
  if (labels.length === 2) {
    return `${labels[0]} · ${labels[1]}`;
  }

  return `${labels[0]} · ${labels[1]} · ${labels.length - 2} more`;
}

function isBlockVisible(block: ScheduleDayBlock, trafficLight: TrafficLight) {
  return block.trafficLightPolicy[trafficLight] === "visible";
}

export function getVisibleBlockKeys(trafficLight: TrafficLight, day: ScheduleDayPlan): BlockKey[] {
  return getTrackableBlocks(day)
    .filter((block) => isBlockVisible(block, trafficLight))
    .map((block) => block.timeSlotKey);
}

export function getHiddenBlockKeys(trafficLight: TrafficLight, day: ScheduleDayPlan): BlockKey[] {
  return getTrackableBlocks(day)
    .filter((block) => !isBlockVisible(block, trafficLight))
    .map((block) => block.timeSlotKey);
}

export function getConsumedCompressionPairs(settings: AppSettings) {
  return getShiftEvents(settings).flatMap((event) => event.compressedPairs);
}

export function getAbsorptionSavings(dayNumber: number, settings: AppSettings): number {
  return getShiftEvents(settings).reduce((savings, event) => {
    if (dayNumber < event.anchorDayNumber) {
      return savings;
    }

    let eventSavings = 0;
    if (event.bufferDayUsed && dayNumber >= event.bufferDayUsed) {
      eventSavings += 1;
    }

    for (const [, hiddenDay] of event.compressedPairs) {
      if (dayNumber >= hiddenDay) {
        eventSavings += 1;
      }
    }

    return savings + eventSavings;
  }, 0);
}

export function isCompressedHiddenDay(dayNumber: number, settings: AppSettings): boolean {
  return getShiftEvents(settings).some(
    (event) => event.bufferDayUsed === dayNumber || event.compressedPairs.some(([, hiddenDay]) => hiddenDay === dayNumber),
  );
}

export function getMergedPartner(dayNumber: number, settings: AppSettings): number | null {
  const pair = getConsumedCompressionPairs(settings).find(([visibleDay]) => visibleDay === dayNumber);
  return pair ? pair[1] : null;
}

export function getShiftHiddenDayLabel(dayNumber: number, settings: AppSettings) {
  if (getShiftEvents(settings).some((event) => event.bufferDayUsed === dayNumber)) {
    return "absorbed as a buffer day";
  }

  if (isCompressedHiddenDay(dayNumber, settings)) {
    return "merged by shift compression";
  }

  return null;
}

export function getOriginalPlannedDate(dayNumber: number, settings: AppSettings): string | null {
  if (!settings.dayOneDate) {
    return null;
  }

  return addDaysToDateOnly(settings.dayOneDate, dayNumber - 1);
}

export function getMappedDate(dayNumber: number, settings: AppSettings): string | null {
  if (!settings.dayOneDate) {
    return null;
  }

  const shiftDelta = getShiftEvents(settings).reduce(
    (sum, event) => (dayNumber >= event.anchorDayNumber ? sum + event.shiftDays : sum),
    0,
  );
  const delta = dayNumber - 1 + shiftDelta - getAbsorptionSavings(dayNumber, settings);
  return addDaysToDateOnly(settings.dayOneDate, delta);
}

export function getCurrentDayNumber(settings: AppSettings, todayDate: string): number {
  if (!settings.dayOneDate) {
    return 0;
  }

  const visibleDays = ALL_DAYS
    .map((day) => day.dayNumber)
    .filter((dayNumber) => !isCompressedHiddenDay(dayNumber, settings));
  const firstVisibleDay = visibleDays.at(0);
  const firstVisibleDate = firstVisibleDay ? getMappedDate(firstVisibleDay, settings) : null;

  if (!firstVisibleDate || todayDate < firstVisibleDate) {
    return 0;
  }

  let currentDay = 0;
  let lastVisibleMappedDate: string | null = null;

  for (const dayNumber of visibleDays) {
    const mappedDate = getMappedDate(dayNumber, settings);
    if (!mappedDate) {
      continue;
    }

    if (mappedDate <= todayDate) {
      currentDay = dayNumber;
      lastVisibleMappedDate = mappedDate;
      continue;
    }

    break;
  }

  if (currentDay === 0 || !lastVisibleMappedDate) {
    return 0;
  }

  if (currentDay === visibleDays.at(-1) && todayDate > lastVisibleMappedDate) {
    return currentDay + diffDays(todayDate, lastVisibleMappedDate);
  }

  return currentDay;
}

export function getScheduleDayRelation(
  dayNumber: number,
  settings: AppSettings,
  todayDate: string,
): ScheduleDayRelation {
  const mappedDate = getMappedDate(dayNumber, settings);
  if (!mappedDate) {
    return "unmapped";
  }

  if (mappedDate < todayDate) {
    return "past";
  }

  if (mappedDate > todayDate) {
    return "future";
  }

  return "today";
}

export function getScheduleDayEditState(
  dayNumber: number,
  settings: AppSettings,
  todayDate: string,
): ScheduleDayEditState {
  const relation = getScheduleDayRelation(dayNumber, settings, todayDate);
  const isShiftHidden = Boolean(getShiftHiddenDayLabel(dayNumber, settings));
  const isPast = relation === "past";
  const isToday = relation === "today";
  const isFuture = relation === "future";
  const canAdjustToday = isToday && !isShiftHidden;
  const canRetroactivelyComplete = isPast && !isShiftHidden;

  return {
    relation,
    isPast,
    isToday,
    isFuture,
    isShiftHidden,
    isReadOnly: !canAdjustToday && !canRetroactivelyComplete,
    canAdjustToday,
    canRetroactivelyComplete,
  };
}

export function getPreviousVisibleDayNumber(dayNumber: number, settings: AppSettings) {
  for (let cursor = dayNumber - 1; cursor >= 1; cursor -= 1) {
    if (!isCompressedHiddenDay(cursor, settings)) {
      return cursor;
    }
  }

  return null;
}

export function getNextVisibleDayNumber(dayNumber: number, settings: AppSettings) {
  for (let cursor = dayNumber + 1; cursor <= 100; cursor += 1) {
    if (!isCompressedHiddenDay(cursor, settings)) {
      return cursor;
    }
  }

  return null;
}

export function createRevisionId(sourceItemId: string, revisionType: RevisionType): string;
export function createRevisionId(sourceDay: number, sourceBlockKey: BlockKey, revisionType: RevisionType): string;
export function createRevisionId(
  sourceItemIdOrDay: string | number,
  sourceBlockKeyOrRevisionType: BlockKey | RevisionType,
  maybeRevisionType?: RevisionType,
) {
  if (typeof sourceItemIdOrDay === "string" && maybeRevisionType === undefined) {
    return `${sourceItemIdOrDay}:${sourceBlockKeyOrRevisionType}`;
  }

  return `${sourceItemIdOrDay}:${sourceBlockKeyOrRevisionType}:${maybeRevisionType}`;
}

export function reconcileRevisionCompletionsForSource(
  revisionCompletions: Record<string, RevisionCompletion>,
  sourceItemId: string,
  completedAtIso: string | null,
) {
  if (!completedAtIso) {
    return;
  }

  const anchorDate = toDateOnlyInTimeZone(completedAtIso);
  for (const [revisionType, offset] of Object.entries(REVISION_INTERVALS) as Array<[RevisionType, number]>) {
    const revisionId = createRevisionId(sourceItemId, revisionType);
    const completion = revisionCompletions[revisionId];
    if (!completion) {
      continue;
    }

    const scheduledDate = addDaysToDateOnly(anchorDate, offset);
    if (toDateOnlyInTimeZone(completion.completedAt) < scheduledDate) {
      delete revisionCompletions[revisionId];
    }
  }
}

function getRevisionPriority(revisionType: RevisionType) {
  const order: Record<RevisionType, number> = {
    "D+1": 1,
    "D+3": 2,
    "D+7": 3,
    "D+14": 4,
    "D+28": 5,
  };

  return order[revisionType];
}

function getRevisionCompletion(
  completions: Record<string, RevisionCompletion>,
  sourceItemId: string,
  revisionType: RevisionType,
) {
  return completions[createRevisionId(sourceItemId, revisionType)];
}

function getRevisionEligibleItems() {
  return ALL_DAYS.flatMap((day) =>
    getTrackableBlocks(day).flatMap((block) =>
      block.items
        .filter((item) => item.revisionEligible)
        .map((item) => ({
          day,
          block,
          item,
        })),
    ),
  );
}

export function buildRevisionInventory(userState: UserState, settings: AppSettings): RevisionQueueItem[] {
  if (!settings.dayOneDate) {
    return [];
  }

  const items: RevisionQueueItem[] = [];
  for (const entry of getRevisionEligibleItems()) {
    const progress = getItemCompletion(userState, entry.item, entry.day.dayNumber, entry.block.timeSlotKey);
    if (progress.status !== "completed" || !progress.completedAt) {
      continue;
    }

    const anchorDate = toDateOnlyInTimeZone(progress.completedAt);
    const subject = getSubjectLabel(entry.item.subjectIds, getSubjectFromPrimaryFocus(entry.day.primaryFocusRaw));

    for (const [revisionType, offset] of Object.entries(REVISION_INTERVALS) as Array<[RevisionType, number]>) {
      const scheduledDate = addDaysToDateOnly(anchorDate, offset);
      const completion = getRevisionCompletion(userState.revisionCompletions, entry.item.itemId, revisionType);
      items.push({
        id: createRevisionId(entry.item.itemId, revisionType),
        sourceItemId: entry.item.itemId,
        sourceDay: entry.day.dayNumber,
        sourceBlockKey: entry.block.timeSlotKey,
        sourceBlockLabel: entry.block.displayLabel,
        sourceTopicLabel: entry.item.label,
        subject,
        topic: entry.item.label,
        revisionType,
        scheduledDate,
        sourceAnchorDate: anchorDate,
        anchorMode: "actual",
        assignedSlot: "morning_revision",
        overdueBy: 0,
        status: completion ? "completed" : "due",
      });
    }
  }

  return items.sort((left, right) => {
    if (left.scheduledDate === right.scheduledDate) {
      const priorityDelta = getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      if (left.sourceDay === right.sourceDay) {
        return left.sourceItemId.localeCompare(right.sourceItemId);
      }
      return left.sourceDay - right.sourceDay;
    }

    return left.scheduledDate.localeCompare(right.scheduledDate);
  });
}

export function groupRevisionItemsForDisplay(items: RevisionQueueItem[]): RevisionDisplayGroup[] {
  const groups = new Map<string, RevisionDisplayGroup>();

  for (const item of items) {
    const existing = groups.get(item.sourceItemId);
    if (existing) {
      existing.items.push(item);
      if (!existing.revisionTypes.includes(item.revisionType)) {
        existing.revisionTypes.push(item.revisionType);
      }
      continue;
    }

    groups.set(item.sourceItemId, {
      id: item.sourceItemId,
      sourceItemId: item.sourceItemId,
      sourceDay: item.sourceDay,
      sourceBlockKey: item.sourceBlockKey,
      sourceTopicLabel: item.sourceTopicLabel,
      subject: item.subject,
      revisionTypes: [item.revisionType],
      items: [item],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      revisionTypes: [...group.revisionTypes].sort((left, right) => getRevisionPriority(left) - getRevisionPriority(right)),
      items: [...group.items].sort((left, right) => getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType)),
    }))
    .sort((left, right) => {
      if (left.sourceDay !== right.sourceDay) {
        return left.sourceDay - right.sourceDay;
      }
      return left.sourceTopicLabel.localeCompare(right.sourceTopicLabel);
    });
}

function calculateMorningMinutesPerSession(sessionCount: number) {
  if (sessionCount <= 0) {
    return 0;
  }

  return Math.floor(75 / Math.min(sessionCount, 5));
}

function getMorningPhaseMode(day: ScheduleDayPlan | undefined, morningSessionPlanned: number): MorningPhaseMode {
  if (!day) {
    return "workbook_only";
  }

  if (getPhaseGroup(day) === "phase_1" && morningSessionPlanned > 0) {
    return "session_primary";
  }

  if (getPhaseGroup(day) === "phase_1") {
    return "workbook_only";
  }

  return "workbook_blend";
}

function buildRevisionPlanBase(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
): Omit<DailyRevisionPlan, "overflowStreakDays" | "overflowSuggestion"> {
  const inventory = buildRevisionInventory(userState, settings);
  const dueCandidates = inventory.filter((item) => diffDays(targetDate, item.scheduledDate) >= 0);

  const mainDue: RevisionQueueItem[] = [];
  const catchUpDue: RevisionQueueItem[] = [];
  const restudyDue: RevisionQueueItem[] = [];

  for (const candidate of dueCandidates) {
    const overdueBy = diffDays(targetDate, candidate.scheduledDate);
    const item = { ...candidate, overdueBy };

    if (overdueBy <= 2) {
      mainDue.push({
        ...item,
        assignedSlot: "morning_revision",
        status:
          candidate.status === "completed"
            ? "completed"
            : overdueBy === 0
              ? "due"
              : "overdue_1_2",
      });
      continue;
    }

    if (overdueBy <= 6) {
      catchUpDue.push({
        ...item,
        assignedSlot: "block_c",
        status: candidate.status === "completed" ? "completed" : "overdue_3_6",
      });
      continue;
    }

    restudyDue.push({
      ...item,
      assignedSlot: "next_revision_phase",
      status: candidate.status === "completed" ? "completed" : "overdue_7_plus",
    });
  }

  const morningBuckets = createRevisionSessionBuckets(mainDue);
  const primaryMorningBuckets = morningBuckets.slice(0, 5);
  const overflowMorningBuckets = morningBuckets.slice(5);
  const queueSessions = primaryMorningBuckets
    .map((bucket) => createRevisionSession(bucket, "due_this_morning", "morning_revision"))
    .filter((session) => session.status === "pending");
  const overflowSessions = overflowMorningBuckets
    .map((bucket, index) => {
      const assignedSlot = index === 0 ? "final_review" : BREAK_MICRO_SLOT_ORDER[(index - 1) % BREAK_MICRO_SLOT_ORDER.length];
      return createRevisionSession(bucket, "also_review_today", assignedSlot);
    })
    .filter((session) => session.status === "pending");

  const catchUpSessions = createRevisionSessionBuckets(catchUpDue)
    .map((bucket, index) => createRevisionSession(bucket, "revision_recovery", index % 2 === 0 ? "block_c" : "final_review"))
    .filter((session) => session.status === "pending");

  const restudySessions = createRevisionSessionBuckets(restudyDue)
    .map((bucket) => createRevisionSession(bucket, "needs_restudy", "next_revision_phase"))
    .filter((session) => session.status === "pending");

  const queue = queueSessions.flatMap((session) => session.items);
  const overflow: OverflowRevisionItem[] = overflowSessions.flatMap((session) => {
    const label =
      session.assignedSlot === "final_review"
        ? "20:30 final review"
        : BREAK_MICRO_SLOT_LABELS[BREAK_MICRO_SLOT_ORDER.indexOf(session.assignedSlot as typeof BREAK_MICRO_SLOT_ORDER[number])];

    return session.items.map((item) => ({
      item,
      assignedSlot: session.assignedSlot as OverflowRevisionItem["assignedSlot"],
      label,
    }));
  });
  const catchUp = catchUpSessions.flatMap((session) => session.items);
  const restudyFlags = restudySessions.flatMap((session) => session.items);

  const dayNumber = getCurrentDayNumber(settings, targetDate);
  const day = getScheduleDay(dayNumber);
  const morningSessionPlanned = primaryMorningBuckets.length;
  const morningSessionCompleted = primaryMorningBuckets.filter((bucket) => bucket.pendingItems.length === 0).length;
  const morningSessionRemaining = morningSessionPlanned - morningSessionCompleted;
  const phaseMode = getMorningPhaseMode(day, morningSessionPlanned);
  const blockStatusMode: MorningBlockStatusMode = phaseMode === "session_primary" ? "revision_sessions" : "workbook_block";

  return {
    queue,
    overflow,
    catchUp,
    restudyFlags,
    queueSessions,
    overflowSessions,
    catchUpSessions,
    restudySessions,
    phaseMode,
    blockStatusMode,
    morningSessionPlanned,
    morningSessionCompleted,
    morningSessionRemaining,
    morningMinutesPerSession: calculateMorningMinutesPerSession(primaryMorningBuckets.length),
  };
}

function getOverflowStreakDays(targetDate: string, userState: UserState, settings: AppSettings) {
  if (!settings.dayOneDate) {
    return 0;
  }

  let streak = 0;
  let cursor = targetDate;
  while (cursor >= settings.dayOneDate) {
    const plan = buildRevisionPlanBase(cursor, userState, settings);
    if (plan.overflow.length === 0) {
      break;
    }
    streak += 1;
    cursor = addDaysToDateOnly(cursor, -1);
  }

  return streak;
}

export function getRevisionAssignedSlotLabel(slot: OverflowRevisionItem["assignedSlot"] | RevisionQueueItem["assignedSlot"]) {
  switch (slot) {
    case "final_review":
      return "20:30 final review";
    case "break_07_45":
      return "07:45 quick recall";
    case "break_11_00":
      return "11:00 quick recall";
    case "break_17_45":
      return "17:45 quick recall";
    case "break_20_00":
      return "20:00 quick recall";
    case "block_c":
      return "15:00 catch-up revision";
    case "next_revision_phase":
      return "Next revision phase";
    default:
      return "06:30 morning revision";
  }
}

export function getRevisionSessionLaneLabel(lane: RevisionSessionLane) {
  switch (lane) {
    case "also_review_today":
      return "Also Review Today";
    case "revision_recovery":
      return "Revision Recovery";
    case "needs_restudy":
      return "Needs Re-Study";
    default:
      return "Due This Morning";
  }
}

export function buildDailyRevisionPlan(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
): DailyRevisionPlan {
  const basePlan = buildRevisionPlanBase(targetDate, userState, settings);
  const overflowStreakDays = getOverflowStreakDays(targetDate, userState, settings);

  return {
    ...basePlan,
    overflowStreakDays,
    overflowSuggestion:
      overflowStreakDays >= 3
        ? "Your revision queue is growing. Consider deferring low-priority items to the next revision phase."
        : null,
  };
}

export function getMorningRevisionStatsForDate(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
) {
  const inventory = buildRevisionInventory(userState, settings);
  const dueSoon = inventory.filter((item) => {
    const overdueBy = diffDays(targetDate, item.scheduledDate);
    return overdueBy >= 0 && overdueBy <= 2;
  });

  return {
    planned: dueSoon.length,
    completed: dueSoon.filter((item) => item.status === "completed").length,
  };
}

export function getBacklogCount(userState: UserState): number {
  return Object.values(userState.backlogItems).filter((item) => item.status === "pending").length;
}

export function createShiftPreviewSignature(preview: Omit<ScheduleShiftPreview, "signature">) {
  return [
    preview.anchorDayNumber,
    preview.shiftDays,
    preview.missedDays.join(","),
    preview.bufferDaysAvailable,
    preview.bufferDaysUsed,
    preview.compressedPairs.map((pair) => `${pair[0]}-${pair[1]}`).join(","),
    preview.day100,
    preview.hardBoundaryExceeded ? "1" : "0",
  ].join("|");
}

export function getShiftPreview(settings: AppSettings, missedDays: number[]): ScheduleShiftPreview | null {
  if (!settings.dayOneDate || missedDays.length < 2) {
    return null;
  }

  const orderedMissedDays = [...missedDays].sort((left, right) => left - right);
  const anchorDayNumber = orderedMissedDays[0];
  if (!anchorDayNumber) {
    return null;
  }

  const shiftDays = orderedMissedDays.length;
  const recoveries = getAvailableShiftRecoveries(settings, anchorDayNumber);
  const selectedRecoveries = recoveries.slice(0, shiftDays);
  const compressedPairs = selectedRecoveries.flatMap((recovery) =>
    recovery.kind === "compression" ? [recovery.pair] : [],
  );
  const bufferDaysAvailable = recoveries.some((recovery) => recovery.kind === "buffer") ? 1 : 0;
  const bufferDaysUsed = selectedRecoveries.some((recovery) => recovery.kind === "buffer") ? 1 : 0;
  const savings = selectedRecoveries.length;
  const shiftedDay100 = addDaysToDateOnly(
    addDaysToDateOnly(settings.dayOneDate, 99),
    shiftDays - savings,
  );

  const previewBase: Omit<ScheduleShiftPreview, "signature"> = {
    anchorDayNumber,
    shiftDays,
    missedDays: orderedMissedDays,
    bufferDaysAvailable,
    bufferDaysUsed,
    isCleanShift: shiftDays === savings && compressedPairs.length === 0,
    compressedPairs,
    mergedDays: compressedPairs.map((pair) => {
      const [leftDay, rightDay] = pair;
      const left = getScheduleDay(leftDay);
      const right = getScheduleDay(rightDay);

      return {
        originalDays: [leftDay, rightDay],
        mergedDescription: `Days ${leftDay} and ${rightDay}: ${left?.primaryFocusRaw ?? `Day ${leftDay}`} + ${right?.primaryFocusRaw ?? `Day ${rightDay}`} will be merged into a single day.`,
      } satisfies ShiftMergedDay;
    }),
    day100: shiftedDay100,
    hardBoundaryExceeded: parseDateOnly(shiftedDay100) > parseDateOnly(HARD_BOUNDARY_DATE),
  };

  return {
    ...previewBase,
    signature: createShiftPreviewSignature(previewBase),
  };
}

export function getScheduleHealth(userState: UserState, settings: AppSettings, todayDayNumber: number): ScheduleHealth {
  if (!settings.dayOneDate || todayDayNumber < 1) {
    return {
      missedDays: [],
      anchorDayNumber: null,
      suggestShift: false,
    };
  }

  const visibleProjectedDays = ALL_DAYS
    .map((day) => day.dayNumber)
    .filter((dayNumber) => !isCompressedHiddenDay(dayNumber, settings))
    .filter((dayNumber) => dayNumber <= todayDayNumber)
    .slice(-7);

  const missedDays = visibleProjectedDays.filter((dayNumber) => {
    const day = getScheduleDay(dayNumber);
    if (!day) {
      return false;
    }

    const trafficLight = getDayState(userState, dayNumber).trafficLight;
    const badBlocks = getVisibleBlockKeys(trafficLight, day).filter((blockKey) => {
      const status = getBlockProgress(userState, dayNumber, blockKey).status;
      return status === "missed" || status === "skipped" || status === "rescheduled";
    });

    return badBlocks.length >= 5;
  });

  return {
    missedDays,
    anchorDayNumber: missedDays[0] ?? null,
    suggestShift: missedDays.length >= 2,
  };
}

export function getDayCompletionState(day: ScheduleDayPlan, userState: UserState, trafficLight: TrafficLight) {
  const visibleBlocks = getVisibleBlockKeys(trafficLight, day);

  return visibleBlocks.every((blockKey) => {
    const status = getBlockProgress(userState, day.dayNumber, blockKey).status;
    return status === "completed" || status === "skipped" || status === "missed" || status === "rescheduled";
  });
}

export function getSafeDayCountLabel(dayNumber: number) {
  if (dayNumber <= 0) {
    return "Before Day 1";
  }

  if (dayNumber > 100) {
    return `Beyond Day 100`;
  }

  return `Day ${dayNumber}`;
}

export function getPhaseDayStatus(dayNumber: number, userState: UserState): BlockStatus {
  const day = getScheduleDay(dayNumber);
  if (!day) {
    return "pending";
  }

  const visibleStatuses = getTrackableBlocks(day).map((block) => getBlockProgress(userState, day.dayNumber, block.timeSlotKey).status);
  return getDerivedStatus(
    visibleStatuses.map((status) => {
      if (status === "partially_complete") {
        return "pending";
      }

      return status as TopicStatus;
    }),
  );
}

function getMacroPhaseDayStatus(dayNumber: number, userState: UserState): BlockStatus {
  const day = getScheduleDay(dayNumber);
  if (!day) {
    return "pending";
  }

  // Macro phases should reflect workbook day progress while ignoring only the derived morning revision lane.
  const visibleStatuses = getTrackableBlocks(day)
    .filter((block) => block.semanticBlockKey !== "morning_revision")
    .map((block) => getBlockProgress(userState, day.dayNumber, block.timeSlotKey).status);

  return getDerivedStatus(
    visibleStatuses.map((status) => {
      if (status === "partially_complete") {
        return "pending";
      }

      return status as TopicStatus;
    }),
  );
}

export function getPhaseStatus(phaseId: string, userState: UserState, settings: AppSettings): BlockStatus {
  void settings;
  const days = ALL_DAYS.filter((day) => getPhaseGroup(day) === phaseId);
  const statuses = days.map((day) => getMacroPhaseDayStatus(day.dayNumber, userState));

  return getDerivedStatus(
    statuses.map((status) => {
      if (status === "partially_complete") {
        return "pending";
      }

      return status as TopicStatus;
    }),
  );
}

export function getTrackableBlockOptions(dayNumber?: number) {
  if (dayNumber) {
    const day = getScheduleDay(dayNumber);
    if (day) {
      return getTrackableBlocks(day).map((block) => ({
        value: block.timeSlotKey,
        label: `${block.displayLabel} · ${block.timeSlotKey}`,
      }));
    }
  }

  return scheduleData.daywisePlan.slotCatalog
    .filter((slot) => slot.defaultTrackable)
    .map((slot) => ({
      value: slot.timeSlotKey,
      label: `${slot.start}-${slot.end}`,
    }));
}

export function getExamDate() {
  return EXAM_DATE;
}
