import { scheduleData } from "@/lib/generated/schedule-data";
import {
  BREAK_MICRO_SLOT_ORDER,
  BREAK_MICRO_SLOT_LABELS,
  BUFFER_DAY,
  EXAM_DATE,
  HARD_BOUNDARY_DATE,
  RED_VISIBLE_BLOCKS,
  REVISION_SOURCE_BLOCKS,
  REVISION_INTERVALS,
  SHIFT_COMPRESSION_PAIRS,
  TRACKABLE_BLOCK_ORDER,
  YELLOW_VISIBLE_BLOCKS,
} from "@/lib/domain/constants";
import type {
  AppSettings,
  BacklogItem,
  BlockKey,
  BlockProgress,
  DailyRevisionPlan,
  DayState,
  GeneratedScheduleDay,
  OverflowRevisionItem,
  RevisionCompletion,
  RevisionDisplayGroup,
  RevisionSourceBlockKey,
  RevisionQueueItem,
  TrafficLight,
  UserState,
} from "@/lib/domain/types";
import { addDaysToDateOnly, diffDays, parseDateOnly, timeValue, toDateOnlyInTimeZone } from "@/lib/utils/date";

export function getScheduleDay(dayNumber: number): GeneratedScheduleDay | undefined {
  return scheduleData.days.find((day) => day.dayNumber === dayNumber);
}

export function getConsumedCompressionPairs(settings: AppSettings) {
  return SHIFT_COMPRESSION_PAIRS.slice(0, Math.max(0, settings.scheduleShiftDays - 1));
}

export function getAbsorptionSavings(dayNumber: number, settings: AppSettings): number {
  let savings = 0;

  if (settings.scheduleShiftDays >= 1 && dayNumber >= BUFFER_DAY) {
    savings += 1;
  }

  for (const [, hiddenDay] of getConsumedCompressionPairs(settings)) {
    if (dayNumber >= hiddenDay) {
      savings += 1;
    }
  }

  return savings;
}

export function isCompressedHiddenDay(dayNumber: number, settings: AppSettings): boolean {
  return getConsumedCompressionPairs(settings).some(([, hiddenDay]) => hiddenDay === dayNumber);
}

export function getMergedPartner(dayNumber: number, settings: AppSettings): number | null {
  const pair = getConsumedCompressionPairs(settings).find(([visibleDay]) => visibleDay === dayNumber);
  return pair ? pair[1] : null;
}

export function getMappedDate(dayNumber: number, settings: AppSettings): string | null {
  if (!settings.dayOneDate) {
    return null;
  }

  const delta = dayNumber - 1 + settings.scheduleShiftDays - getAbsorptionSavings(dayNumber, settings);
  return addDaysToDateOnly(settings.dayOneDate, delta);
}

export function getCurrentDayNumber(settings: AppSettings, todayDate: string): number {
  if (!settings.dayOneDate) {
    return 0;
  }

  return diffDays(todayDate, settings.dayOneDate) + 1;
}

export function getVisibleBlockKeys(trafficLight: TrafficLight): BlockKey[] {
  if (trafficLight === "yellow") {
    return [...YELLOW_VISIBLE_BLOCKS];
  }
  if (trafficLight === "red") {
    return [...RED_VISIBLE_BLOCKS];
  }
  return [...TRACKABLE_BLOCK_ORDER];
}

export function getHiddenBlockKeys(trafficLight: TrafficLight): BlockKey[] {
  const visible = new Set(getVisibleBlockKeys(trafficLight));
  return TRACKABLE_BLOCK_ORDER.filter((block) => !visible.has(block));
}

export function getDayState(userState: UserState, dayNumber: number): DayState {
  return (
    userState.dayStates[String(dayNumber)] ?? {
      dayNumber,
      trafficLight: "green",
      updatedAt: new Date().toISOString(),
    }
  );
}

export function getBlockProgress(
  userState: UserState,
  dayNumber: number,
  blockKey: BlockKey,
): BlockProgress {
  return (
    userState.blockProgress[`${dayNumber}:${blockKey}`] ?? {
      dayNumber,
      blockKey,
      status: "pending",
      actualStart: null,
      actualEnd: null,
      completedAt: null,
      sourceTag: null,
      note: null,
    }
  );
}

export function getTrackableBlocks(day: GeneratedScheduleDay) {
  return day.slots.filter((slot) => slot.trackable);
}

export function getSubjectFromPrimaryFocus(primaryFocus: string): string {
  const sortedSubjects = [...scheduleData.subjects].sort((left, right) => right.subject.length - left.subject.length);
  const match = sortedSubjects.find((subject) => primaryFocus.toLowerCase().includes(subject.subject.toLowerCase()));
  if (match) {
    return match.subject;
  }

  return primaryFocus.split(" ")[0] ?? primaryFocus;
}

function getRevisionBlockLabel(day: GeneratedScheduleDay, blockKey: RevisionSourceBlockKey) {
  return day.slots.find((slot) => slot.key === blockKey)?.label ?? blockKey;
}

function getRevisionTopic(day: GeneratedScheduleDay, blockKey: RevisionSourceBlockKey) {
  const slot = day.slots.find((entry) => entry.key === blockKey);
  const description = slot?.description ?? day.primaryFocus;
  return description.replace(/^Block [AB]\s+—\s+/u, "").trim() || day.primaryFocus;
}

function isCompletedRevisionSource(progress: BlockProgress) {
  return (progress.status === "completed" || progress.status === "partial") && Boolean(progress.completedAt);
}

function getAnchorDateForRevisionSource(
  day: GeneratedScheduleDay,
  blockKey: RevisionSourceBlockKey,
  settings: AppSettings,
  userState: UserState,
) {
  const progress = getBlockProgress(userState, day.dayNumber, blockKey);
  if (isCompletedRevisionSource(progress) && progress.completedAt) {
    return {
      anchorDate: toDateOnlyInTimeZone(progress.completedAt),
      anchorMode: "actual" as const,
    };
  }

  const mappedDate = getMappedDate(day.dayNumber, settings);
  if (!mappedDate) {
    return null;
  }

  return {
    anchorDate: mappedDate,
    anchorMode: "planned" as const,
  };
}

export function createRevisionId(
  sourceDay: number,
  sourceBlockKey: RevisionSourceBlockKey,
  revisionType: RevisionQueueItem["revisionType"],
) {
  return `${sourceDay}:${sourceBlockKey}:${revisionType}`;
}

export function reconcileRevisionCompletionsForSource(
  revisionCompletions: Record<string, RevisionCompletion>,
  dayNumber: number,
  blockKey: BlockKey,
  completedAtIso: string | null,
) {
  if (!completedAtIso || (blockKey !== "block_a" && blockKey !== "block_b")) {
    return;
  }

  const anchorDate = toDateOnlyInTimeZone(completedAtIso);
  for (const [revisionType, offset] of Object.entries(REVISION_INTERVALS) as Array<
    [RevisionQueueItem["revisionType"], number]
  >) {
    const revisionId = createRevisionId(dayNumber, blockKey, revisionType);
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

function getRevisionCompletion(
  completions: Record<string, RevisionCompletion>,
  sourceDay: number,
  sourceBlockKey: RevisionSourceBlockKey,
  revisionType: RevisionQueueItem["revisionType"],
) {
  return completions[createRevisionId(sourceDay, sourceBlockKey, revisionType)];
}

function getRevisionPriority(revisionType: RevisionQueueItem["revisionType"]) {
  const order: Record<RevisionQueueItem["revisionType"], number> = {
    "D+1": 1,
    "D+3": 2,
    "D+7": 3,
    "D+14": 4,
    "D+28": 5,
  };

  return order[revisionType];
}

export function buildRevisionInventory(userState: UserState, settings: AppSettings): RevisionQueueItem[] {
  if (!settings.dayOneDate) {
    return [];
  }

  const items: RevisionQueueItem[] = [];
  for (const day of scheduleData.days) {
    const subject = getSubjectFromPrimaryFocus(day.primaryFocus);

    for (const blockKey of REVISION_SOURCE_BLOCKS) {
      const anchor = getAnchorDateForRevisionSource(day, blockKey, settings, userState);
      if (!anchor) {
        continue;
      }

      const topic = getRevisionTopic(day, blockKey);
      const sourceBlockLabel = getRevisionBlockLabel(day, blockKey);
      for (const [revisionType, offset] of Object.entries(REVISION_INTERVALS) as Array<
        [RevisionQueueItem["revisionType"], number]
      >) {
        const scheduledDate = addDaysToDateOnly(anchor.anchorDate, offset);
        const completion = getRevisionCompletion(userState.revisionCompletions, day.dayNumber, blockKey, revisionType);
        items.push({
          id: createRevisionId(day.dayNumber, blockKey, revisionType),
          sourceDay: day.dayNumber,
          sourceBlockKey: blockKey,
          sourceBlockLabel,
          sourceTopicLabel: day.primaryFocus,
          subject,
          topic,
          revisionType,
          scheduledDate,
          sourceAnchorDate: anchor.anchorDate,
          anchorMode: anchor.anchorMode,
          assignedSlot: "morning_revision",
          overdueBy: 0,
          status: completion ? "completed" : "due",
        });
      }
    }
  }

  return items.sort((left, right) => {
    if (left.scheduledDate === right.scheduledDate) {
      const priorityDelta = getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      if (left.sourceDay === right.sourceDay) {
        return left.sourceBlockKey.localeCompare(right.sourceBlockKey);
      }
      return left.sourceDay - right.sourceDay;
    }
    return left.scheduledDate.localeCompare(right.scheduledDate);
  });
}

export function groupRevisionItemsForDisplay(items: RevisionQueueItem[]): RevisionDisplayGroup[] {
  const groups = new Map<string, RevisionDisplayGroup>();

  for (const item of items) {
    const groupKey = `${item.sourceDay}`;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.items.push(item);
      if (!existing.revisionTypes.includes(item.revisionType)) {
        existing.revisionTypes.push(item.revisionType);
      }
      continue;
    }

    groups.set(groupKey, {
      id: groupKey,
      sourceDay: item.sourceDay,
      sourceTopicLabel: item.sourceTopicLabel,
      subject: item.subject,
      revisionTypes: [item.revisionType],
      items: [item],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      revisionTypes: [...group.revisionTypes].sort(
        (left, right) => getRevisionPriority(left) - getRevisionPriority(right),
      ),
      items: [...group.items].sort((left, right) => {
        const priorityDelta = getRevisionPriority(left.revisionType) - getRevisionPriority(right.revisionType);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return left.sourceBlockKey.localeCompare(right.sourceBlockKey);
      }),
    }))
    .sort((left, right) => left.sourceDay - right.sourceDay);
}

function calculateMorningMinutesPerItem(itemCount: number) {
  if (itemCount <= 0) {
    return 0;
  }

  return Math.floor(90 / Math.min(itemCount, 5));
}

function buildRevisionPlanBase(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
): Omit<DailyRevisionPlan, "overflowStreakDays" | "overflowSuggestion"> {
  const inventory = buildRevisionInventory(userState, settings);
  const queueCandidates = inventory.filter((item) => {
    if (item.status === "completed") {
      return false;
    }
    const overdueBy = diffDays(targetDate, item.scheduledDate);
    return overdueBy >= 0;
  });

  const mainQueue: RevisionQueueItem[] = [];
  const catchUp: RevisionQueueItem[] = [];
  const restudyFlags: RevisionQueueItem[] = [];

  for (const candidate of queueCandidates) {
    const item = {
      ...candidate,
      overdueBy: diffDays(targetDate, candidate.scheduledDate),
    };

    const overdueBy = diffDays(targetDate, item.scheduledDate);
    if (overdueBy <= 2) {
      mainQueue.push({
        ...item,
        assignedSlot: "morning_revision",
        status: overdueBy === 0 ? "due" : "overdue_1_2",
      });
      continue;
    }
    if (overdueBy <= 6) {
      catchUp.push({
        ...item,
        assignedSlot: catchUp.length % 2 === 0 ? "consolidation" : "pyq_image",
        status: "overdue_3_6",
      });
      continue;
    }
    restudyFlags.push({
      ...item,
      assignedSlot: "next_revision_phase",
      status: "overdue_7_plus",
    });
  }

  const queue = mainQueue.slice(0, 5);
  const overflowItems = mainQueue.slice(5);
  const overflow: OverflowRevisionItem[] = overflowItems.map((item, index) => ({
    item: {
      ...item,
      assignedSlot: index === 0 ? "night_recall" : BREAK_MICRO_SLOT_ORDER[(index - 1) % BREAK_MICRO_SLOT_ORDER.length],
    },
    assignedSlot: index === 0 ? "night_recall" : BREAK_MICRO_SLOT_ORDER[(index - 1) % BREAK_MICRO_SLOT_ORDER.length],
    label: index === 0 ? "22:00 night recall" : BREAK_MICRO_SLOT_LABELS[(index - 1) % BREAK_MICRO_SLOT_LABELS.length],
  }));

  return {
    queue,
    overflow,
    catchUp,
    restudyFlags,
    morningMinutesPerItem: calculateMorningMinutesPerItem(queue.length),
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
    case "night_recall":
      return "22:00 night recall";
    case "break_08_00":
      return "08:00 quick recall";
    case "break_10_45":
      return "10:45 quick recall";
    case "break_16_45":
      return "16:45 quick recall";
    case "break_21_45":
      return "21:45 quick recall";
    case "consolidation":
      return "14:15 catch-up revision";
    case "pyq_image":
      return "20:15 catch-up revision";
    case "next_revision_phase":
      return "Next revision phase";
    default:
      return "06:30 morning revision";
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
        ? "Your revision queue is growing. Consider deferring low-priority items to next revision phase."
        : null,
  };
}

export function getBacklogCount(userState: UserState): number {
  return Object.values(userState.backlogItems).filter((item) => item.status === "pending").length;
}

export function getSuggestedBacklogTarget(originalDay: number, blockKey: BlockKey) {
  const suggestedDay = Math.min(100, originalDay + 1);
  switch (blockKey) {
    case "block_a":
    case "block_b":
      return {
        suggestedDay,
        suggestedBlockKey: "consolidation" as const,
        suggestedNote: "Recover this in the next consolidation slot for a calm catch-up.",
      };
    case "mcq":
      return {
        suggestedDay,
        suggestedBlockKey: "mcq" as const,
        suggestedNote: "Merge with the next MCQ session and increase the target slightly.",
      };
    case "pyq_image":
      return {
        suggestedDay,
        suggestedBlockKey: "pyq_image" as const,
        suggestedNote: "Roll this into the next PYQ/image slot.",
      };
    case "night_recall":
      return {
        suggestedDay,
        suggestedBlockKey: "night_recall" as const,
        suggestedNote: "Stack this on the next night recall block.",
      };
    default:
      return {
        suggestedDay,
        suggestedBlockKey: "consolidation" as const,
        suggestedNote: "Use the next calm revision slot rather than stretching the day.",
      };
  }
}

export function getShiftPreview(settings: AppSettings, additionalDays: number) {
  if (!settings.dayOneDate || additionalDays <= 0) {
    return null;
  }

  const proposedShiftDays = settings.scheduleShiftDays + additionalDays;
  const availablePairs = SHIFT_COMPRESSION_PAIRS.slice(0, Math.max(0, proposedShiftDays - 1));
  const day100 = getMappedDate(100, { ...settings, scheduleShiftDays: proposedShiftDays });
  if (!day100) {
    return null;
  }

  const hardBoundaryExceeded = parseDateOnly(day100) >= parseDateOnly(HARD_BOUNDARY_DATE);
  return {
    additionalDays,
    proposedShiftDays,
    bufferUsed: proposedShiftDays >= 1 ? 1 : 0,
    compressedPairs: availablePairs,
    day100,
    hardBoundaryExceeded,
  };
}

export function getScheduleHealth(userState: UserState, settings: AppSettings, todayDayNumber: number) {
  const fullMissDays = scheduleData.days
    .filter((day) => day.dayNumber < todayDayNumber)
    .filter((day) => {
      const missedCount = TRACKABLE_BLOCK_ORDER.filter((block) => {
        const progress = getBlockProgress(userState, day.dayNumber, block);
        return progress.status === "missed" || progress.status === "skipped" || progress.status === "rescheduled";
      }).length;
      return missedCount >= 5;
    });

  return {
    missedDays: fullMissDays.map((day) => day.dayNumber),
    suggestShift: fullMissDays.length >= 2,
  };
}

export function getDisplayBlockDescription(day: GeneratedScheduleDay, blockKey: BlockKey, trafficLight: TrafficLight): string {
  const slot = day.slots.find((item) => item.key === blockKey);
  const original = slot?.description ?? "";

  if (trafficLight === "red") {
    if (blockKey === "morning_revision") {
      return "Volatile notebook review and gentle recall only.";
    }
    if (blockKey === "block_a") {
      return "One high-confidence subject review. Keep it calm and finite.";
    }
    if (blockKey === "mcq") {
      return "25 easy MCQs with explanation review only.";
    }
  }

  if (trafficLight === "yellow") {
    if (blockKey === "mcq") {
      return `${original} Reduced target: 40 MCQs.`;
    }
  }

  return original;
}

export function getDayCompletionState(day: GeneratedScheduleDay, userState: UserState, trafficLight: TrafficLight) {
  const visibleBlocks = getVisibleBlockKeys(trafficLight);
  return visibleBlocks.every((block) => {
    const progress = getBlockProgress(userState, day.dayNumber, block);
    return progress.status === "completed" || progress.status === "partial";
  });
}

export function getBlockDurationLabel(day: GeneratedScheduleDay, blockKey: BlockKey, userState: UserState) {
  const slot = day.slots.find((item) => item.key === blockKey);
  const progress = getBlockProgress(userState, day.dayNumber, blockKey);
  const start = progress.actualStart ?? slot?.start ?? "";
  const end = progress.actualEnd ?? slot?.end ?? "";
  return `${start} - ${end}`;
}

export function getBacklogByDay(userState: UserState, dayNumber: number): BacklogItem[] {
  return Object.values(userState.backlogItems)
    .filter((item) => item.status === "pending" && item.originalDay === dayNumber)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function isEndTimeBeyondSleep(end: string) {
  return timeValue(end) > timeValue("23:00");
}

export function isStartTimeBeforeSleep(start: string) {
  return timeValue(start) < timeValue("06:30");
}

export function getSafeDayCountLabel(todayDayNumber: number) {
  if (todayDayNumber <= 0) {
    return "Before Day 1";
  }
  if (todayDayNumber > 100) {
    return "Post plan";
  }
  return `Day ${todayDayNumber} / 100`;
}

export function getExamCountdown(todayDate: string) {
  return diffDays(EXAM_DATE, todayDate);
}
