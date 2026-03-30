import { getStaticReferenceData } from "@/lib/data/reference-data";
import {
  BUFFER_DAY,
  EXAM_DATE,
  HARD_BOUNDARY_DATE,
  MORNING_REVISION_SLOT_PLAN,
  NO_DUE_MORNING_REVISION_NOTE,
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
  RuntimeReferenceData,
  UserState,
} from "@/lib/domain/types";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { addDaysToDateOnly, diffDays, parseDateOnly, toDateOnlyInTimeZone } from "@/lib/utils/date";

const MAX_SCHEDULE_DAY = 105;

type ReferenceScheduleIndex = {
  dayByNumber: Map<number, ScheduleDayPlan>;
  phaseGroupById: Map<string, SchedulePhaseGroup>;
  itemLookup: Map<
    string,
    {
      day: ScheduleDayPlan;
      block: ScheduleDayBlock;
      item: ScheduleDayBlockItem;
    }
  >;
  subjectLabelById: Map<string, string>;
  subjectPriorityById: Map<string, number>;
  subjectPriorityByLabel: Map<string, number>;
  subjectMatchers: Array<{ label: string; normalized: string }>;
};

const referenceScheduleIndexCache = new WeakMap<RuntimeReferenceData["scheduleData"], ReferenceScheduleIndex>();

function getReferenceData(referenceData?: RuntimeReferenceData) {
  if (referenceData) {
    return referenceData;
  }
  if (getRuntimeMode() === "supabase") {
    throw new Error("Runtime reference data is required in Supabase mode.");
  }
  return getStaticReferenceData();
}

function buildReferenceScheduleIndex(referenceData: RuntimeReferenceData): ReferenceScheduleIndex {
  const scheduleData = referenceData.scheduleData;
  const days = scheduleData.daywisePlan.days;
  const subjects = scheduleData.subjectStrategy.subjects;

  return {
    dayByNumber: new Map(days.map((day) => [day.dayNumber, day] as const)),
    phaseGroupById: new Map(
      scheduleData.daywisePlan.phaseCatalog.map((entry) => [entry.phaseId, entry.phaseGroup] as const),
    ),
    itemLookup: new Map(
      days.flatMap((day) =>
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
    ),
    subjectLabelById: new Map(subjects.map((subject) => [subject.subjectId, subject.subjectName] as const)),
    subjectPriorityById: new Map(subjects.map((subject) => [subject.subjectId, subject.priorityRank] as const)),
    subjectPriorityByLabel: new Map(subjects.map((subject) => [subject.subjectName, subject.priorityRank] as const)),
    subjectMatchers: subjects
      .flatMap((subject) => [
        { label: subject.subjectName, normalized: subject.subjectName.toLowerCase() },
        ...subject.aliases.map((alias) => ({ label: subject.subjectName, normalized: alias.toLowerCase() })),
      ])
      .sort((left, right) => right.normalized.length - left.normalized.length),
  };
}

function getReferenceScheduleIndex(referenceData?: RuntimeReferenceData) {
  const resolved = getReferenceData(referenceData);
  const cached = referenceScheduleIndexCache.get(resolved.scheduleData);
  if (cached) {
    return cached;
  }

  const index = buildReferenceScheduleIndex(resolved);
  referenceScheduleIndexCache.set(resolved.scheduleData, index);
  return index;
}

function blockTrafficPolicyFromRow(row: UserState["schedule"]["blocks"][string]) {
  return {
    green: row.trafficLightGreen,
    yellow: row.trafficLightYellow,
    red: row.trafficLightRed,
    backlogWhenHidden: row.backlogWhenHidden,
  };
}

type RuntimeBlockRow = UserState["schedule"]["blocks"][string];
type RuntimeAssignmentRow = UserState["schedule"]["topicAssignments"][string];
type RuntimeScheduleIndex = {
  blockRowsByDay: Map<number, RuntimeBlockRow[]>;
  assignmentRowsBySlot: Map<string, RuntimeAssignmentRow[]>;
};
const runtimeScheduleIndexCache = new WeakMap<UserState, RuntimeScheduleIndex>();

function buildRuntimeScheduleIndex(userState: UserState): RuntimeScheduleIndex {
  const blockRowsByDay = new Map<number, RuntimeBlockRow[]>();
  for (const row of Object.values(userState.schedule.blocks)) {
    const rows = blockRowsByDay.get(row.dayNumber) ?? [];
    rows.push(row);
    blockRowsByDay.set(row.dayNumber, rows);
  }
  for (const rows of blockRowsByDay.values()) {
    rows.sort((left, right) => left.slotOrder - right.slotOrder);
  }

  const assignmentRowsBySlot = new Map<string, RuntimeAssignmentRow[]>();
  for (const row of Object.values(userState.schedule.topicAssignments)) {
    const key = `${row.dayNumber}:${row.blockKey}`;
    const rows = assignmentRowsBySlot.get(key) ?? [];
    rows.push(row);
    assignmentRowsBySlot.set(key, rows);
  }
  for (const rows of assignmentRowsBySlot.values()) {
    rows.sort((left, right) => left.itemOrder - right.itemOrder);
  }

  return {
    blockRowsByDay,
    assignmentRowsBySlot,
  };
}

function getRuntimeScheduleIndex(userState: UserState): RuntimeScheduleIndex {
  const cached = runtimeScheduleIndexCache.get(userState);
  if (cached) {
    return cached;
  }

  const index = buildRuntimeScheduleIndex(userState);
  runtimeScheduleIndexCache.set(userState, index);
  return index;
}

export function invalidateRuntimeScheduleIndex(userState: UserState) {
  runtimeScheduleIndexCache.delete(userState);
}

function cloneTemplateItems(items: ScheduleDayBlock["items"]): ScheduleDayBlock["items"] {
  return items.map((entry) => ({
    ...entry,
    subjectIds: [...entry.subjectIds],
  }));
}

function buildRuntimeDayBlock(
  row: RuntimeBlockRow | null,
  templateBlock: ScheduleDayBlock | null,
  itemRows: RuntimeAssignmentRow[],
): ScheduleDayBlock {
  const items = itemRows.length > 0
    ? itemRows.map((entry) => ({
      itemId: entry.sourceItemId,
      order: entry.itemOrder,
      kind: entry.kind,
      label: entry.label,
      rawText: entry.rawText,
      plannedMinutes: entry.plannedMinutes,
      subjectIds: [...entry.subjectIds],
      revisionEligible: entry.revisionEligible,
      recoveryLane: entry.recoveryLane,
      phaseFence: entry.phaseFence,
      notes: entry.notes,
      revisionType: entry.revisionType,
      referenceLabel: entry.referenceLabel,
      referenceDayNumber: entry.referenceDayNumber,
    }))
    : cloneTemplateItems(templateBlock?.items ?? []);

  if (!row && templateBlock) {
    return {
      ...templateBlock,
      items,
    };
  }

  if (!row) {
    throw new Error("Runtime block row or template block is required.");
  }

  return {
    timeSlotKey: row.blockKey,
    displayLabel: row.displayLabel,
    semanticBlockKey: row.semanticBlockKey,
    blockIntent: row.blockIntent,
    trackable: row.trackable,
    rawText: row.rawText,
    items,
    recoveryLane: row.recoveryLane,
    phaseFence: row.phaseFence,
    defaultRevisionEligible: row.defaultRevisionEligible,
    reschedulable: row.reschedulable,
    trafficLightPolicy: blockTrafficPolicyFromRow(row),
  };
}

function buildRuntimeScheduleDay(
  userState: UserState,
  dayNumber: number,
  runtimeIndex: RuntimeScheduleIndex = getRuntimeScheduleIndex(userState),
  referenceData?: RuntimeReferenceData,
): ScheduleDayPlan | null {
  const dayRow = userState.schedule.days[String(dayNumber)];
  if (!dayRow) {
    return null;
  }

  const templateBlocks = getReferenceScheduleIndex(referenceData).dayByNumber.get(dayNumber)?.blocks ?? [];
  const runtimeBlockRows = runtimeIndex.blockRowsByDay.get(dayNumber) ?? [];
  const runtimeBlockRowsByKey = new Map(runtimeBlockRows.map((entry) => [entry.blockKey, entry] as const));
  const blocks = templateBlocks.map((templateBlock) =>
    buildRuntimeDayBlock(
      runtimeBlockRowsByKey.get(templateBlock.timeSlotKey) ?? null,
      templateBlock,
      runtimeIndex.assignmentRowsBySlot.get(`${dayNumber}:${templateBlock.timeSlotKey}`) ?? [],
    ),
  );

  for (const row of runtimeBlockRows) {
    if (templateBlocks.some((entry) => entry.timeSlotKey === row.blockKey)) {
      continue;
    }

    blocks.push(buildRuntimeDayBlock(
      row,
      null,
      runtimeIndex.assignmentRowsBySlot.get(`${dayNumber}:${row.blockKey}`) ?? [],
    ));
  }

  return {
    dayNumber: dayRow.dayNumber,
    phaseId: dayRow.phaseId,
    phaseName: dayRow.phaseName,
    primaryFocusRaw: dayRow.primaryFocusRaw,
    primaryFocusParts: [...dayRow.primaryFocusParts],
    primaryFocusSubjectIds: [...dayRow.primaryFocusSubjectIds],
    resourceRaw: dayRow.resourceRaw,
    resourceParts: [...dayRow.resourceParts],
    deliverableRaw: dayRow.deliverableRaw,
    notesRaw: dayRow.notesRaw,
    sourceMinutes: dayRow.sourceMinutes,
    bufferMinutes: dayRow.bufferMinutes,
    plannedStudyMinutes: dayRow.plannedStudyMinutes,
    totalStudyHours: dayRow.totalStudyHours,
    gtTestType: dayRow.gtTestType,
    gtPlanRef: dayRow.gtPlanRef,
    blocks,
  };
}

function getRuntimeScheduleDays(userState?: UserState, referenceData?: RuntimeReferenceData) {
  if (!userState || Object.keys(userState.schedule.days).length === 0) {
    return getReferenceData(referenceData).scheduleData.daywisePlan.days;
  }

  const runtimeIndex = getRuntimeScheduleIndex(userState);
  return Object.values(userState.schedule.days)
    .toSorted((left, right) => left.dayNumber - right.dayNumber)
    .flatMap((entry) => {
      const day = buildRuntimeScheduleDay(userState, entry.dayNumber, runtimeIndex, referenceData);
      return day ? [day] : [];
    });
}

function timingKey(dayNumber: number, blockKey: BlockKey) {
  return `${dayNumber}:${blockKey}`;
}

function isUserState(value: AppSettings | UserState): value is UserState {
  return typeof value === "object" && value !== null && "schedule" in value;
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

function getSubjectLabel(subjectIds: string[], fallback: string, referenceData?: RuntimeReferenceData) {
  const index = getReferenceScheduleIndex(referenceData);
  const first = subjectIds.find((subjectId) => index.subjectLabelById.has(subjectId));
  return (first ? index.subjectLabelById.get(first) : null) ?? fallback;
}

function getPhaseGroup(day: ScheduleDayPlan, referenceData?: RuntimeReferenceData): SchedulePhaseGroup {
  return getReferenceScheduleIndex(referenceData).phaseGroupById.get(day.phaseId) ?? "phase_1";
}

function getSubjectPriorityForRevisionItem(item: RevisionQueueItem, referenceData?: RuntimeReferenceData) {
  const index = getReferenceScheduleIndex(referenceData);
  const source = index.itemLookup.get(item.sourceItemId);
  const subjectId = source?.item.subjectIds.find((entry) => index.subjectPriorityById.has(entry));
  if (subjectId) {
    return index.subjectPriorityById.get(subjectId) ?? Number.MAX_SAFE_INTEGER;
  }

  return index.subjectPriorityByLabel.get(item.subject) ?? Number.MAX_SAFE_INTEGER;
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
  earliestPendingScheduledDate: string | null;
  maxOverdueBy: number;
  maxPendingOverdueBy: number;
  subjectPriority: number;
};

function sortRevisionQueueItems(left: RevisionQueueItem, right: RevisionQueueItem) {
  if (left.overdueBy !== right.overdueBy) {
    return right.overdueBy - left.overdueBy;
  }

  if (left.scheduledDate !== right.scheduledDate) {
    return left.scheduledDate.localeCompare(right.scheduledDate);
  }

  const subjectDelta = getSubjectPriorityForRevisionItem(left) - getSubjectPriorityForRevisionItem(right);
  if (subjectDelta !== 0) {
    return subjectDelta;
  }

  if (left.sourceDay !== right.sourceDay) {
    return left.sourceDay - right.sourceDay;
  }

  const topicDelta = left.sourceTopicLabel.localeCompare(right.sourceTopicLabel);
  if (topicDelta !== 0) {
    return topicDelta;
  }

  const revisionDelta = getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType);
  if (revisionDelta !== 0) {
    return revisionDelta;
  }

  return left.sourceItemId.localeCompare(right.sourceItemId);
}

function sortMorningQueueItems(left: RevisionQueueItem, right: RevisionQueueItem) {
  const revisionDelta = getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType);
  if (revisionDelta !== 0) {
    return revisionDelta;
  }

  if (left.overdueBy !== right.overdueBy) {
    return right.overdueBy - left.overdueBy;
  }

  if (left.sourceDay !== right.sourceDay) {
    return left.sourceDay - right.sourceDay;
  }

  const topicDelta = left.sourceTopicLabel.localeCompare(right.sourceTopicLabel);
  if (topicDelta !== 0) {
    return topicDelta;
  }

  return left.sourceItemId.localeCompare(right.sourceItemId);
}

function sortRevisionBuckets(left: RevisionSessionBucket, right: RevisionSessionBucket) {
  const leftEarliestDate = left.earliestPendingScheduledDate ?? left.earliestScheduledDate;
  const rightEarliestDate = right.earliestPendingScheduledDate ?? right.earliestScheduledDate;
  if (leftEarliestDate !== rightEarliestDate) {
    return leftEarliestDate.localeCompare(rightEarliestDate);
  }

  const leftMaxOverdue = left.earliestPendingScheduledDate ? left.maxPendingOverdueBy : left.maxOverdueBy;
  const rightMaxOverdue = right.earliestPendingScheduledDate ? right.maxPendingOverdueBy : right.maxOverdueBy;
  if (leftMaxOverdue !== rightMaxOverdue) {
    return rightMaxOverdue - leftMaxOverdue;
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
      if (item.status !== "completed") {
        if (!existing.earliestPendingScheduledDate || item.scheduledDate < existing.earliestPendingScheduledDate) {
          existing.earliestPendingScheduledDate = item.scheduledDate;
        }
        if (item.overdueBy > existing.maxPendingOverdueBy) {
          existing.maxPendingOverdueBy = item.overdueBy;
        }
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
      earliestPendingScheduledDate: item.status === "completed" ? null : item.scheduledDate,
      maxOverdueBy: item.overdueBy,
      maxPendingOverdueBy: item.status === "completed" ? 0 : item.overdueBy,
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
  allocatedMinutes = 0,
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
    allocatedMinutes,
    status: bucket.pendingItems.length === 0 ? "completed" : "pending",
  };
}

function getRevisionDurationMinutes(revisionType: RevisionType) {
  return MORNING_REVISION_SLOT_PLAN.find((slot) => slot.revisionType === revisionType)?.durationMinutes ?? 0;
}

function getBucketPendingMinutes(bucket: RevisionSessionBucket) {
  return bucket.pendingItems.reduce((sum, item) => sum + getRevisionDurationMinutes(item.revisionType), 0);
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
  const assignment = userState.schedule.topicAssignments[item.itemId];
  if (!assignment) {
    return defaultTopicProgress(item, dayNumber, blockKey);
  }

  return {
    itemId: assignment.sourceItemId,
    dayNumber: assignment.dayNumber,
    blockKey: assignment.blockKey,
    status: assignment.status,
    completedAt: assignment.completedAt,
    sourceTag: assignment.sourceTag,
    note: assignment.note,
    updatedAt: assignment.updatedAt,
  };
}

export function getScheduleDay(dayNumber: number, userState?: UserState, referenceData?: RuntimeReferenceData): ScheduleDayPlan | undefined {
  return userState
    ? buildRuntimeScheduleDay(userState, dayNumber, undefined, referenceData) ?? getReferenceScheduleIndex(referenceData).dayByNumber.get(dayNumber)
    : getReferenceScheduleIndex(referenceData).dayByNumber.get(dayNumber);
}

export function getScheduleDays(userState?: UserState, referenceData?: RuntimeReferenceData) {
  return getRuntimeScheduleDays(userState, referenceData);
}

export function getScheduleItemById(itemId: string, userState?: UserState, referenceData?: RuntimeReferenceData) {
  if (userState) {
    const assignment = userState.schedule.topicAssignments[itemId];
    if (assignment) {
      const day = getScheduleDay(assignment.dayNumber, userState, referenceData);
      const block = day?.blocks.find((entry) => entry.timeSlotKey === assignment.blockKey) ?? null;
      const item = block?.items.find((entry) => entry.itemId === itemId) ?? null;
      if (day && block && item) {
        return { day, block, item };
      }
    }
  }

  return getReferenceScheduleIndex(referenceData).itemLookup.get(itemId) ?? null;
}

export function getTrackableBlocks(day: ScheduleDayPlan) {
  return day.blocks.filter((block) => block.trackable);
}

export function getDayState(userState: UserState, dayNumber: number): DayState {
  const row = userState.schedule.days[String(dayNumber)];
  if (!row) {
    return defaultDayState(dayNumber);
  }

  return {
    dayNumber: row.dayNumber,
    trafficLight: row.trafficLight,
    updatedAt: row.trafficLightUpdatedAt,
  };
}

export function getBlockTiming(userState: UserState, dayNumber: number, blockKey: BlockKey) {
  const row = userState.schedule.blocks[timingKey(dayNumber, blockKey)];
  if (!row) {
    return defaultBlockTiming(dayNumber, blockKey);
  }

  return {
    dayNumber: row.dayNumber,
    blockKey: row.blockKey,
    actualStart: row.actualStart,
    actualEnd: row.actualEnd,
    note: row.timingNote,
    updatedAt: row.timingUpdatedAt,
  };
}

export function getTopicProgress(userState: UserState, item: ScheduleDayBlockItem, dayNumber: number, blockKey: BlockKey) {
  return getItemCompletion(userState, item, dayNumber, blockKey);
}

export function getBlockProgress(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
  referenceData?: RuntimeReferenceData,
): BlockProgress {
  const day = getScheduleDay(dayNumber, userState);
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
    const mappedDate = getMappedDate(dayNumber, userState);
    if (mappedDate) {
      const revisionPlan = buildDailyRevisionPlan(mappedDate, userState, userState.settings, referenceData);
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
          revisionPlan.morningSessionPlanned === 0
            ? timing.note === NO_DUE_MORNING_REVISION_NOTE
              ? "completed"
              : "pending"
            : revisionPlan.morningSessionRemaining === 0
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
          completedAt: status === "completed" ? timing.updatedAt : null,
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

export function getSubjectFromPrimaryFocus(primaryFocus: string, referenceData?: RuntimeReferenceData): string {
  const normalized = primaryFocus.toLowerCase();
  const match = getReferenceScheduleIndex(referenceData).subjectMatchers.find((candidate) => normalized.includes(candidate.normalized));
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

export function getMergedPartner(dayNumber: number, settings: AppSettings, userState?: UserState): number | null {
  if (userState) {
    return userState.schedule.days[String(dayNumber)]?.mergedPartnerDay ?? null;
  }

  const pair = getConsumedCompressionPairs(settings).find(([visibleDay]) => visibleDay === dayNumber);
  return pair ? pair[1] : null;
}

export function getShiftHiddenDayLabel(dayNumber: number, settings: AppSettings, userState?: UserState) {
  if (userState) {
    const reason = userState.schedule.days[String(dayNumber)]?.shiftHiddenReason ?? null;
    if (reason === "buffer_absorbed") {
      return "absorbed as a buffer day";
    }
    if (reason === "compression_merged") {
      return "merged by shift compression";
    }
  }

  if (getShiftEvents(settings).some((event) => event.bufferDayUsed === dayNumber)) {
    return "absorbed as a buffer day";
  }

  if (isCompressedHiddenDay(dayNumber, settings)) {
    return "merged by shift compression";
  }

  return null;
}

export function getOriginalPlannedDate(dayNumber: number, settings: AppSettings): string | null;
export function getOriginalPlannedDate(dayNumber: number, userState: UserState): string | null;
export function getOriginalPlannedDate(dayNumber: number, stateOrSettings: AppSettings | UserState): string | null {
  if (isUserState(stateOrSettings)) {
    return stateOrSettings.schedule.days[String(dayNumber)]?.originalMappedDate ?? null;
  }

  if (!stateOrSettings.dayOneDate) {
    return null;
  }

  return addDaysToDateOnly(stateOrSettings.dayOneDate, dayNumber - 1);
}

export function getMappedDate(dayNumber: number, settings: AppSettings): string | null;
export function getMappedDate(dayNumber: number, userState: UserState): string | null;
export function getMappedDate(dayNumber: number, stateOrSettings: AppSettings | UserState): string | null {
  if (isUserState(stateOrSettings)) {
    return stateOrSettings.schedule.days[String(dayNumber)]?.mappedDate ?? null;
  }

  if (!stateOrSettings.dayOneDate) {
    return null;
  }

  const shiftDelta = getShiftEvents(stateOrSettings).reduce(
    (sum, event) => (dayNumber >= event.anchorDayNumber ? sum + event.shiftDays : sum),
    0,
  );
  const delta = dayNumber - 1 + shiftDelta - getAbsorptionSavings(dayNumber, stateOrSettings);
  return addDaysToDateOnly(stateOrSettings.dayOneDate, delta);
}

export function getCurrentDayNumber(settings: AppSettings, todayDate: string, referenceData?: RuntimeReferenceData): number;
export function getCurrentDayNumber(userState: UserState, todayDate: string, referenceData?: RuntimeReferenceData): number;
export function getCurrentDayNumber(
  stateOrSettings: AppSettings | UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): number {
  const settings = isUserState(stateOrSettings) ? stateOrSettings.settings : stateOrSettings;
  if (!settings.dayOneDate) {
    return 0;
  }

  const visibleDays = (isUserState(stateOrSettings) ? getScheduleDays(stateOrSettings, referenceData) : getReferenceData(referenceData).scheduleData.daywisePlan.days)
    .map((day) => day.dayNumber)
    .filter((dayNumber) => !isCompressedHiddenDay(dayNumber, settings));
  const firstVisibleDay = visibleDays.at(0);
  const firstVisibleDate = firstVisibleDay
    ? isUserState(stateOrSettings)
      ? getMappedDate(firstVisibleDay, stateOrSettings)
      : getMappedDate(firstVisibleDay, settings)
    : null;

  if (!firstVisibleDate || todayDate < firstVisibleDate) {
    return 0;
  }

  let currentDay = 0;
  let lastVisibleMappedDate: string | null = null;

  for (const dayNumber of visibleDays) {
    const mappedDate = isUserState(stateOrSettings)
      ? getMappedDate(dayNumber, stateOrSettings)
      : getMappedDate(dayNumber, settings);
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
  userState?: UserState,
): ScheduleDayRelation {
  const mappedDate = userState ? getMappedDate(dayNumber, userState) : getMappedDate(dayNumber, settings);
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
  userState?: UserState,
): ScheduleDayEditState {
  const relation = getScheduleDayRelation(dayNumber, settings, todayDate, userState);
  const isShiftHidden = Boolean(getShiftHiddenDayLabel(dayNumber, settings, userState));
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
  for (let cursor = dayNumber + 1; cursor <= MAX_SCHEDULE_DAY; cursor += 1) {
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

function buildRevisionEligibleItemFromAssignmentRow(
  row: RuntimeAssignmentRow,
  userState: UserState,
  referenceData?: RuntimeReferenceData,
) {
  const day =
    getScheduleDay(row.dayNumber, userState, referenceData) ??
    getReferenceScheduleIndex(referenceData).itemLookup.get(row.sourceItemId)?.day ??
    null;
  if (!day || getPhaseGroup(day, referenceData) === "phase_3") {
    return null;
  }

  const templateBlock =
    day.blocks.find((entry) => entry.timeSlotKey === row.blockKey) ??
    getReferenceScheduleIndex(referenceData).itemLookup.get(row.sourceItemId)?.block ??
    null;
  const item = {
    itemId: row.sourceItemId,
    order: row.itemOrder,
    kind: row.kind,
    label: row.label,
    rawText: row.rawText,
    plannedMinutes: row.plannedMinutes,
    subjectIds: [...row.subjectIds],
    revisionEligible: row.revisionEligible,
    recoveryLane: row.recoveryLane,
    phaseFence: row.phaseFence,
    notes: row.notes,
    revisionType: row.revisionType,
    referenceLabel: row.referenceLabel,
    referenceDayNumber: row.referenceDayNumber,
  } satisfies ScheduleDayBlockItem;
  const block = templateBlock ?? {
    timeSlotKey: row.blockKey,
    displayLabel: row.referenceLabel ?? row.blockKey,
    semanticBlockKey: row.blockKey,
    blockIntent: "core_study",
    trackable: true,
    rawText: row.rawText,
    items: [item],
    recoveryLane: row.recoveryLane,
    phaseFence: row.phaseFence,
    defaultRevisionEligible: row.revisionEligible,
    reschedulable: row.phaseFence !== "not_reschedulable",
    trafficLightPolicy: {
      green: "visible",
      yellow: "visible",
      red: "visible",
      backlogWhenHidden: false,
    },
  } satisfies ScheduleDayBlock;

  return {
    day,
    block,
    item,
  };
}

function getRevisionEligibleItems(userState?: UserState, referenceData?: RuntimeReferenceData) {
  if (userState && Object.keys(userState.schedule.topicAssignments).length > 0) {
    return Object.values(userState.schedule.topicAssignments)
      .filter((row) => row.revisionEligible)
      .flatMap((row) => {
        const entry = buildRevisionEligibleItemFromAssignmentRow(row, userState, referenceData);
        return entry ? [entry] : [];
      });
  }

  return getScheduleDays(userState, referenceData).filter((day) => getPhaseGroup(day, referenceData) !== "phase_3")
    .flatMap((day) =>
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

export function buildRevisionInventory(
  userState: UserState,
  settings: AppSettings,
  referenceData?: RuntimeReferenceData,
): RevisionQueueItem[] {
  if (!settings.dayOneDate) {
    return [];
  }

  const items: RevisionQueueItem[] = [];
  for (const entry of getRevisionEligibleItems(userState, referenceData)) {
    const progress = getItemCompletion(userState, entry.item, entry.day.dayNumber, entry.block.timeSlotKey);
    if (progress.status !== "completed" || !progress.completedAt) {
      continue;
    }

    const anchorDate = toDateOnlyInTimeZone(progress.completedAt);
    const subject = getSubjectLabel(
      entry.item.subjectIds,
      getSubjectFromPrimaryFocus(entry.day.primaryFocusRaw, referenceData),
      referenceData,
    );

    for (const [revisionType, offset] of Object.entries(REVISION_INTERVALS) as Array<[RevisionType, number]>) {
      const scheduledDate = addDaysToDateOnly(anchorDate, offset);
      const completion = getRevisionCompletion(userState.revisionCompletions, entry.item.itemId, revisionType);
      const completionDate = completion ? toDateOnlyInTimeZone(completion.completedAt) : null;
      const isCompletionValid = completionDate !== null && completionDate >= scheduledDate;
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
        status: isCompletionValid ? "completed" : "due",
        completedAt: isCompletionValid ? completion?.completedAt ?? null : null,
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

function buildDueRevisionItems(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
  referenceData?: RuntimeReferenceData,
) {
  return buildRevisionInventory(userState, settings, referenceData)
    .filter((item) => diffDays(targetDate, item.scheduledDate) >= 0)
    .map((candidate) => {
      const overdueBy = diffDays(targetDate, candidate.scheduledDate);

      return {
        ...candidate,
        overdueBy,
        status:
          candidate.status === "completed"
            ? "completed"
            : overdueBy === 0
              ? "due"
              : overdueBy <= 2
                ? "overdue_1_2"
                : overdueBy <= 6
                  ? "overdue_3_6"
                  : "overdue_7_plus",
      } satisfies RevisionQueueItem;
    })
    .sort(sortRevisionQueueItems);
}

function isQueuedRevisionItemCandidate(item: RevisionQueueItem, targetDate: string) {
  if (item.status !== "completed") {
    return true;
  }

  return item.completedAt !== null && toDateOnlyInTimeZone(item.completedAt) === targetDate;
}

function selectMorningQueueItems(items: RevisionQueueItem[]) {
  let remainingMinutes = MORNING_REVISION_SLOT_PLAN.reduce((sum, slot) => sum + slot.durationMinutes, 0);
  const pool = [...items].sort(sortMorningQueueItems);
  const selected: RevisionQueueItem[] = [];
  const usedIndices = new Set<number>();

  function pickFromPool(predicate?: (item: RevisionQueueItem) => boolean): RevisionQueueItem | null {
    for (let i = 0; i < pool.length; i++) {
      if (usedIndices.has(i)) continue;
      const candidate = pool[i]!;
      const duration = getRevisionDurationMinutes(candidate.revisionType);
      if (duration > remainingMinutes) continue;
      if (predicate && !predicate(candidate)) continue;
      usedIndices.add(i);
      remainingMinutes -= duration;
      return candidate;
    }
    return null;
  }

  // Phase 1: Walk each slot type in order (D+1, D+3, D+7, D+14, D+28).
  // Pick one item of the matching type first; fall back to any available item.
  for (const { revisionType } of MORNING_REVISION_SLOT_PLAN) {
    if (remainingMinutes <= 0) break;
    const picked =
      pickFromPool((item) => item.revisionType === revisionType) ??
      pickFromPool();
    if (picked) {
      selected.push(picked);
    }
  }

  // Phase 2: Fill remaining budget from any available items.
  while (remainingMinutes > 0) {
    const picked = pickFromPool();
    if (!picked) break;
    selected.push(picked);
  }

  return selected;
}

function getMorningPhaseMode(day: ScheduleDayPlan | undefined): MorningPhaseMode {
  return day ? "session_primary" : "workbook_only";
}

function getSecondaryLaneForBucket(bucket: RevisionSessionBucket): Exclude<RevisionSessionLane, "due_this_morning"> {
  if (bucket.maxPendingOverdueBy >= 7) {
    return "needs_restudy";
  }

  if (bucket.maxPendingOverdueBy >= 3) {
    return "revision_recovery";
  }

  return "also_review_today";
}

function buildRevisionPlanBase(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
  referenceData?: RuntimeReferenceData,
): Omit<DailyRevisionPlan, "overflowStreakDays" | "overflowSuggestion"> {
  const dueItems = buildDueRevisionItems(targetDate, userState, settings, referenceData);
  const candidates = dueItems.filter((item) => isQueuedRevisionItemCandidate(item, targetDate));

  const storedSelection = userState.morningRevisionSelections?.[targetDate];
  let morningQueueItems: RevisionQueueItem[];

  if (storedSelection && storedSelection.length > 0) {
    const storedSet = new Set(storedSelection);
    morningQueueItems = candidates.filter((item) => storedSet.has(item.id));

    // Re-select when the stored selection no longer matches any current candidates
    // (e.g., after reconciliation moved anchors or IDs became stale).
    if (morningQueueItems.length === 0 && candidates.length > 0) {
      morningQueueItems = selectMorningQueueItems(candidates);
      userState.morningRevisionSelections[targetDate] = morningQueueItems.map((item) => item.id);
    }
  } else {
    morningQueueItems = selectMorningQueueItems(candidates);
    if (morningQueueItems.length > 0) {
      if (!userState.morningRevisionSelections) {
        userState.morningRevisionSelections = {};
      }
      userState.morningRevisionSelections[targetDate] = morningQueueItems.map((item) => item.id);
    }
  }

  const queuedRevisionIds = new Set(morningQueueItems.map((item) => item.id));

  const morningSessionsAll = createRevisionSessionBuckets(morningQueueItems).map((bucket) =>
    createRevisionSession(
      bucket,
      "due_this_morning",
      "morning_revision",
      getBucketPendingMinutes(bucket),
    ),
  );
  const queueSessions = morningSessionsAll.filter((session) => session.status === "pending");

  const secondaryBuckets = createRevisionSessionBuckets(
    dueItems.filter((item) => item.status !== "completed" && !queuedRevisionIds.has(item.id)),
  ).filter((bucket) => bucket.pendingItems.length > 0);

  const overflowSessions = secondaryBuckets
    .filter((bucket) => getSecondaryLaneForBucket(bucket) === "also_review_today")
    .map((bucket) => createRevisionSession(bucket, "also_review_today", "morning_revision", getBucketPendingMinutes(bucket)));
  const catchUpSessions = secondaryBuckets
    .filter((bucket) => getSecondaryLaneForBucket(bucket) === "revision_recovery")
    .map((bucket) => createRevisionSession(bucket, "revision_recovery", "morning_revision", getBucketPendingMinutes(bucket)));
  const restudySessions = secondaryBuckets
    .filter((bucket) => getSecondaryLaneForBucket(bucket) === "needs_restudy")
    .map((bucket) => createRevisionSession(bucket, "needs_restudy", "morning_revision", getBucketPendingMinutes(bucket)));

  const queue = queueSessions.flatMap((session) => session.items);
  const overflow = overflowSessions.flatMap((session) => session.items).map((item) => ({ item }));
  const catchUp = catchUpSessions.flatMap((session) => session.items);
  const restudyFlags = restudySessions.flatMap((session) => session.items);

  const dayNumber = getCurrentDayNumber(settings, targetDate, referenceData);
  const day = getScheduleDay(dayNumber, userState, referenceData);
  const morningSessionPlanned = morningSessionsAll.length;
  const morningSessionCompleted = morningSessionsAll.filter((session) => session.status === "completed").length;
  const morningSessionRemaining = morningSessionPlanned - morningSessionCompleted;
  const phaseMode = getMorningPhaseMode(day);
  const blockStatusMode: MorningBlockStatusMode = day ? "revision_sessions" : "workbook_block";

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
    morningAllocatedMinutes: queueSessions.reduce((sum, session) => sum + session.allocatedMinutes, 0),
    autoAddNotice: userState.morningRevisionAutoAddNotice?.[targetDate] ?? null,
  };
}

function getOverflowStreakDays(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
  referenceData?: RuntimeReferenceData,
) {
  if (!settings.dayOneDate) {
    return 0;
  }

  let streak = 0;
  let cursor = targetDate;
  while (cursor >= settings.dayOneDate) {
    const plan = buildRevisionPlanBase(cursor, userState, settings, referenceData);
    if (plan.overflow.length === 0) {
      break;
    }
    streak += 1;
    cursor = addDaysToDateOnly(cursor, -1);
  }

  return streak;
}

export function getRevisionAssignedSlotLabel(slot: RevisionQueueItem["assignedSlot"]) {
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
      return "Also Due Today";
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
  referenceData?: RuntimeReferenceData,
): DailyRevisionPlan {
  const basePlan = buildRevisionPlanBase(targetDate, userState, settings, referenceData);
  const overflowStreakDays = getOverflowStreakDays(targetDate, userState, settings, referenceData);

  return {
    ...basePlan,
    overflowStreakDays,
    overflowSuggestion:
      overflowStreakDays >= 3
        ? "The revision queue is spilling past the 75-minute morning window. Clear one extra topic when possible."
        : null,
  };
}

export function getMorningRevisionStatsForDate(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
  referenceData?: RuntimeReferenceData,
) {
  const plan = buildRevisionPlanBase(targetDate, userState, settings, referenceData);

  return {
    planned: plan.morningSessionPlanned,
    completed: plan.morningSessionCompleted,
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

export function getShiftPreview(
  settings: AppSettings,
  missedDays: number[],
  referenceData?: RuntimeReferenceData,
): ScheduleShiftPreview | null {
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
      const left = getScheduleDay(leftDay, undefined, referenceData);
      const right = getScheduleDay(rightDay, undefined, referenceData);

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

export function getScheduleHealth(
  userState: UserState,
  settings: AppSettings,
  todayDayNumber: number,
  referenceData?: RuntimeReferenceData,
): ScheduleHealth {
  if (!settings.dayOneDate || todayDayNumber < 1) {
    return {
      missedDays: [],
      anchorDayNumber: null,
      suggestShift: false,
    };
  }

  const visibleProjectedDays = getScheduleDays(userState)
    .map((day) => day.dayNumber)
    .filter((dayNumber) => !isCompressedHiddenDay(dayNumber, settings))
    .filter((dayNumber) => dayNumber <= todayDayNumber)
    .slice(-7);

  const missedDays = visibleProjectedDays.filter((dayNumber) => {
    const day = getScheduleDay(dayNumber, userState);
    if (!day) {
      return false;
    }

    const trafficLight = getDayState(userState, dayNumber).trafficLight;
    const badBlocks = getVisibleBlockKeys(trafficLight, day).filter((blockKey) => {
      const status = getBlockProgress(userState, dayNumber, blockKey, referenceData).status;
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

export function getDayCompletionState(
  day: ScheduleDayPlan,
  userState: UserState,
  trafficLight: TrafficLight,
  referenceData?: RuntimeReferenceData,
) {
  const visibleBlocks = getVisibleBlockKeys(trafficLight, day);

  return visibleBlocks.every((blockKey) => {
    const progress = getBlockProgress(userState, day.dayNumber, blockKey, referenceData);
    if (progress.status === "pending" && progress.totalItemCount === 0 && progress.unresolvedItemCount === 0) {
      return true;
    }

    return (
      progress.status === "completed" ||
      progress.status === "skipped" ||
      progress.status === "missed" ||
      progress.status === "rescheduled"
    );
  });
}

export function getSafeDayCountLabel(dayNumber: number) {
  if (dayNumber <= 0) {
    return "Before Day 1";
  }

  if (dayNumber > MAX_SCHEDULE_DAY) {
    return `Beyond Day ${MAX_SCHEDULE_DAY}`;
  }

  return `Day ${dayNumber}`;
}

export function getPhaseDayStatus(dayNumber: number, userState: UserState, referenceData?: RuntimeReferenceData): BlockStatus {
  const day = getScheduleDay(dayNumber, userState);
  if (!day) {
    return "pending";
  }

  const visibleStatuses = getTrackableBlocks(day).map((block) => getBlockProgress(userState, day.dayNumber, block.timeSlotKey, referenceData).status);
  return getDerivedStatus(
    visibleStatuses.map((status) => {
      if (status === "partially_complete") {
        return "pending";
      }

      return status as TopicStatus;
    }),
  );
}

function getMacroPhaseDayStatus(dayNumber: number, userState: UserState, referenceData?: RuntimeReferenceData): BlockStatus {
  const day = getScheduleDay(dayNumber, userState);
  if (!day) {
    return "pending";
  }

  // Macro phases should reflect workbook day progress while ignoring only the derived morning revision lane.
  const visibleStatuses = getTrackableBlocks(day)
    .filter((block) => block.semanticBlockKey !== "morning_revision")
    .map((block) => getBlockProgress(userState, day.dayNumber, block.timeSlotKey, referenceData).status);

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
  const days = getScheduleDays(userState).filter((day) => getPhaseGroup(day) === phaseId);
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

export function getTrackableBlockOptions(dayNumber?: number, referenceData?: RuntimeReferenceData) {
  if (dayNumber) {
    const day = getScheduleDay(dayNumber, undefined, referenceData);
    if (day) {
      return getTrackableBlocks(day).map((block) => ({
        value: block.timeSlotKey,
        label: `${block.displayLabel} · ${block.timeSlotKey}`,
      }));
    }
  }

  return getReferenceData(referenceData).scheduleData.daywisePlan.slotCatalog
    .filter((slot) => slot.defaultTrackable)
    .map((slot) => ({
      value: slot.timeSlotKey,
      label: `${slot.start}-${slot.end}`,
    }));
}

export function getExamDate() {
  return EXAM_DATE;
}
