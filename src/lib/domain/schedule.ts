import { scheduleData } from "@/lib/generated/schedule-data";
import {
  BREAK_MICRO_SLOT_LABELS,
  BUFFER_DAY,
  EXAM_DATE,
  HARD_BOUNDARY_DATE,
  RED_VISIBLE_BLOCKS,
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
  RevisionQueueItem,
  TrafficLight,
  UserState,
} from "@/lib/domain/types";
import { addDaysToDateOnly, diffDays, parseDateOnly, timeValue, toDateOnly } from "@/lib/utils/date";

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

function getAnchorDateForDay(dayNumber: number, settings: AppSettings, userState: UserState): string | null {
  const relevantBlocks = TRACKABLE_BLOCK_ORDER.filter((block) => block !== "morning_revision");
  const completions = relevantBlocks
    .map((block) => getBlockProgress(userState, dayNumber, block))
    .filter((progress) => progress.completedAt && (progress.status === "completed" || progress.status === "partial"))
    .map((progress) => toDateOnly(progress.completedAt!))
    .sort();

  return completions[0] ?? getMappedDate(dayNumber, settings);
}

function getRevisionCompletion(
  completions: Record<string, RevisionCompletion>,
  sourceDay: number,
  revisionType: RevisionQueueItem["revisionType"],
) {
  return completions[`${sourceDay}:${revisionType}`];
}

export function buildRevisionInventory(userState: UserState, settings: AppSettings): RevisionQueueItem[] {
  if (!settings.dayOneDate) {
    return [];
  }

  const items: RevisionQueueItem[] = [];
  for (const day of scheduleData.days) {
    const anchor = getAnchorDateForDay(day.dayNumber, settings, userState);
    if (!anchor) {
      continue;
    }

    const subject = getSubjectFromPrimaryFocus(day.primaryFocus);
    for (const [revisionType, offset] of Object.entries(REVISION_INTERVALS) as Array<
      [RevisionQueueItem["revisionType"], number]
    >) {
      const scheduledDate = addDaysToDateOnly(anchor, offset);
      const completion = getRevisionCompletion(userState.revisionCompletions, day.dayNumber, revisionType);
      items.push({
        id: `${day.dayNumber}:${revisionType}`,
        sourceDay: day.dayNumber,
        subject,
        topic: day.primaryFocus,
        revisionType,
        scheduledDate,
        status: completion ? "completed" : "due",
      });
    }
  }

  return items.sort((left, right) => {
    if (left.scheduledDate === right.scheduledDate) {
      return left.sourceDay - right.sourceDay;
    }
    return left.scheduledDate.localeCompare(right.scheduledDate);
  });
}

export function buildDailyRevisionPlan(
  targetDate: string,
  userState: UserState,
  settings: AppSettings,
): DailyRevisionPlan {
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

  for (const item of queueCandidates) {
    const overdueBy = diffDays(targetDate, item.scheduledDate);
    if (overdueBy <= 2) {
      mainQueue.push({
        ...item,
        status: overdueBy === 0 ? "due" : "overdue_1_2",
      });
      continue;
    }
    if (overdueBy <= 6) {
      catchUp.push({
        ...item,
        status: "overdue_3_6",
      });
      continue;
    }
    restudyFlags.push({
      ...item,
      status: "overdue_7_plus",
    });
  }

  const queue = mainQueue.slice(0, 5);
  const overflowItems = mainQueue.slice(5);
  const overflow: OverflowRevisionItem[] = overflowItems.map((item, index) => ({
    item,
    assignedSlot: index === 0 ? "night_recall" : "break_micro",
    label: index === 0 ? "Night recall overflow" : BREAK_MICRO_SLOT_LABELS[(index - 1) % BREAK_MICRO_SLOT_LABELS.length],
  }));

  return {
    queue,
    overflow,
    catchUp,
    restudyFlags,
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
