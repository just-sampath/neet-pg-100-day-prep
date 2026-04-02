import {
  getBlockProgress,
  getDisplayBlockDescription,
  getTopicProgress,
  getVisibleBlockKeys,
} from "@/lib/domain/schedule";
import type { ScheduleDayPlan } from "@/lib/domain/schedule-data-types";
import type {
  BlockKey,
  BlockProgress,
  RuntimeReferenceData,
  TimelineSlotKind,
  TrafficLight,
  UserState,
} from "@/lib/domain/types";
import { getMinutesInTimeZone, IST_TIME_ZONE, timeValue } from "@/lib/utils/date";

export type TodayTimelineEntry =
  | {
    kind: "separator";
    id: string;
    slotKey: string;
    label: string;
    slotKind: Exclude<TimelineSlotKind, "study">;
    start: string;
    end: string;
  }
  | {
    kind: "block";
    id: string;
    blockKey: BlockKey;
    label: string;
    start: string;
    end: string;
    mode: "visible" | "hidden";
    progress: BlockProgress;
    displayDescription: string;
  };

export type WindDownState =
  | {
    kind: "none";
  }
  | {
    kind: "wrap_up";
    label: "21:45 Check" | "22:00 Check";
    message: string;
  }
  | {
    kind: "final_review";
    label: "22:15 Check";
    message: string;
  }
  | {
    kind: "auto_move_due";
    label: "22:45 Safety Net";
    message: string;
  }
  | {
    kind: "auto_move_done";
    label: "22:45 Safety Net";
    message: string;
  };

export function buildTodayTimeline(
  day: ScheduleDayPlan,
  userState: UserState,
  trafficLight: TrafficLight,
  referenceData?: RuntimeReferenceData,
): TodayTimelineEntry[] {
  const visibleBlocks = new Set(getVisibleBlockKeys(trafficLight, day));

  return [...day.blocks]
    .sort((left, right) => left.timeSlotKey.localeCompare(right.timeSlotKey))
    .map((block) => {
      const [start, end] = block.timeSlotKey.split("-");
      if (!block.trackable) {
        return {
          kind: "separator" as const,
          id: `${day.dayNumber}:${block.timeSlotKey}`,
          slotKey: block.timeSlotKey,
          label: block.displayLabel,
          slotKind: (block.blockIntent === "meal" ? "meal" : "break") as Exclude<TimelineSlotKind, "study">,
          start,
          end,
        };
      }

      const blockKey = block.timeSlotKey as BlockKey;
      return {
        kind: "block" as const,
        id: `${day.dayNumber}:${blockKey}`,
        blockKey,
        label: block.displayLabel,
        start,
        end,
        mode: visibleBlocks.has(blockKey) ? "visible" : "hidden",
        progress: getBlockProgress(userState, day.dayNumber, blockKey, referenceData),
        displayDescription: getDisplayBlockDescription(day, blockKey, trafficLight),
      };
    });
}

type WindDownStateInput = {
  minutes: number;
  incompleteVisibleBlocks: BlockKey[];
  finalReviewBlockKey: BlockKey | null;
  wrapUpDismissals: number;
  lateNightSweepProcessed: boolean;
};

export function getWindDownState({
  minutes,
  incompleteVisibleBlocks,
  finalReviewBlockKey,
  wrapUpDismissals,
  lateNightSweepProcessed,
}: WindDownStateInput): WindDownState {
  const finalReviewPending = finalReviewBlockKey
    ? incompleteVisibleBlocks.includes(finalReviewBlockKey)
    : false;
  const otherPendingBlocks = finalReviewBlockKey
    ? incompleteVisibleBlocks.filter((blockKey) => blockKey !== finalReviewBlockKey)
    : incompleteVisibleBlocks;

  if (minutes >= 22 * 60 + 45) {
    if (lateNightSweepProcessed) {
      return {
        kind: "auto_move_done",
        label: "22:45 Safety Net",
        message: "Moved to backlog. Sleep well.",
      };
    }

    if (incompleteVisibleBlocks.length > 0) {
      return {
        kind: "auto_move_due",
        label: "22:45 Safety Net",
        message: "Moving remaining blocks to backlog so the day stops here and sleep stays protected.",
      };
    }

    return { kind: "none" };
  }

  if (minutes >= 22 * 60 + 15) {
    if (finalReviewPending) {
      return {
        kind: "final_review",
        label: "22:15 Check",
        message: "Close the day with the essentials. Do a quick 5-minute version, or skip the final review and move to the log?",
      };
    }

    return { kind: "none" };
  }

  if (minutes >= 21 * 60 + 45 && otherPendingBlocks.length > 0) {
    if (wrapUpDismissals === 0) {
      return {
        kind: "wrap_up",
        label: "21:45 Check",
        message: "It's getting late. Move remaining blocks to backlog and wind down?",
      };
    }

    if (wrapUpDismissals === 1 && minutes >= 22 * 60) {
      return {
        kind: "wrap_up",
        label: "22:00 Check",
        message: "One more chance to close the day gently. Move the remaining blocks to backlog and wind down?",
      };
    }
  }

  return { kind: "none" };
}

export function getRevisionMinutesLabel(morningMinutesPerItem: number) {
  return morningMinutesPerItem > 0 ? `~${morningMinutesPerItem} min each` : null;
}

export function getBacklogIndicatorLabel(backlogCount: number) {
  return `${backlogCount} ${backlogCount === 1 ? "block" : "blocks"} in backlog`;
}

export function getVisibleBlocksNote(hiddenBlockCount: number) {
  return hiddenBlockCount > 0
    ? `${hiddenBlockCount} queued for overnight redistribution.`
    : "Full day still intact.";
}

export function getHiddenBlockSupportMessage(completed: boolean) {
  if (completed) {
    return "Already completed before the pace dial tightened. Kept on record.";
  }

  return "Queued for overnight redistribution. At midnight — or on first open after a time jump — it slides into the next realistic study slots.";
}

export function getRecoveryModeExplanation(trafficLight: TrafficLight) {
  if (trafficLight === "green") {
    return null;
  }

  if (trafficLight === "yellow") {
    return "Yellow only decides what leaves today. Redistribution happens overnight — or on first open after a time jump — so the day stays lighter without being scrambled.";
  }

  return "Red keeps only the essential spine. Hidden work goes to backlog now; redistribution happens overnight or on first open after a time jump.";
}

// ---------------------------------------------------------------------------
// Early Finish Suggestion
// ---------------------------------------------------------------------------

const EARLY_FINISH_MIN_MINUTES = 10;

/** Only Block A, Block B, and Block C may trigger or supply early-finish suggestions. */
const EARLY_FINISH_ELIGIBLE_BLOCKS = new Set(["block_a", "block_b", "block_c"]);

export interface EarlyFinishSuggestion {
  sourceItemId: string;
  label: string;
  subject: string;
  plannedMinutes: number;
  remainingMinutes: number;
  sourceDayNumber: number;
  sourceBlockKey: BlockKey;
  isRecovery: boolean;
  originalDayNumber: number | null;
}

export function getEarlyFinishSuggestion({
  block,
  blockKey,
  blockEndTime,
  effectiveNowIso,
  todayDayNumber,
  todayScheduleDay,
  tomorrowScheduleDay,
  userState,
  referenceData,
}: {
  block: ScheduleDayPlan["blocks"][number];
  blockKey: BlockKey;
  blockEndTime: string;
  effectiveNowIso: string;
  todayDayNumber: number;
  todayScheduleDay: ScheduleDayPlan;
  tomorrowScheduleDay: ScheduleDayPlan | null;
  userState: UserState;
  referenceData?: RuntimeReferenceData;
}): EarlyFinishSuggestion | null {
  // Guard: only for theory study blocks (Block A, B, C)
  if (!EARLY_FINISH_ELIGIBLE_BLOCKS.has(block.semanticBlockKey)) {
    return null;
  }

  // Guard: all items in the block must be completed
  const allCompleted = block.items.length > 0 && block.items.every((item) => {
    const progress = getTopicProgress(userState, item, todayDayNumber, blockKey);
    return progress.status === "completed";
  });
  if (!allCompleted) {
    return null;
  }

  // Calculate remaining time
  const nowMinutes = getMinutesInTimeZone(effectiveNowIso, IST_TIME_ZONE);
  const blockEndMinutes = timeValue(blockEndTime);

  // Guard: block end time is in the past
  if (blockEndMinutes <= nowMinutes) {
    return null;
  }

  const remainingMinutes = blockEndMinutes - nowMinutes;

  // Guard: not enough time
  if (remainingMinutes < EARLY_FINISH_MIN_MINUTES) {
    return null;
  }

  // Build candidate list: later blocks today + tomorrow's blocks
  const candidates = collectEarlyFinishCandidates(
    todayScheduleDay,
    tomorrowScheduleDay,
    blockKey,
    userState,
    referenceData,
  );

  // Find first fitting topic
  for (const candidate of candidates) {
    if (candidate.plannedMinutes <= remainingMinutes) {
      return {
        ...candidate,
        remainingMinutes,
      };
    }
  }

  return null;
}

interface EarlyFinishCandidate {
  sourceItemId: string;
  label: string;
  subject: string;
  plannedMinutes: number;
  sourceDayNumber: number;
  sourceBlockKey: BlockKey;
  isRecovery: boolean;
  originalDayNumber: number | null;
}

function collectEarlyFinishCandidates(
  todayScheduleDay: ScheduleDayPlan,
  tomorrowScheduleDay: ScheduleDayPlan | null,
  currentBlockKey: BlockKey,
  userState: UserState,
  referenceData?: RuntimeReferenceData,
): EarlyFinishCandidate[] {
  const candidates: EarlyFinishCandidate[] = [];

  // Collect from today's later blocks
  const currentBlockIndex = todayScheduleDay.blocks.findIndex(
    (b) => b.timeSlotKey === currentBlockKey,
  );
  for (let i = currentBlockIndex + 1; i < todayScheduleDay.blocks.length; i++) {
    const laterBlock = todayScheduleDay.blocks[i];
    if (!laterBlock.trackable) continue;
    if (!EARLY_FINISH_ELIGIBLE_BLOCKS.has(laterBlock.semanticBlockKey)) continue;
    addPendingItems(candidates, laterBlock, todayScheduleDay.dayNumber, userState, referenceData);
  }

  // Collect from tomorrow's blocks
  if (tomorrowScheduleDay) {
    for (const tomorrowBlock of tomorrowScheduleDay.blocks) {
      if (!tomorrowBlock.trackable) continue;
      if (!EARLY_FINISH_ELIGIBLE_BLOCKS.has(tomorrowBlock.semanticBlockKey)) continue;
      addPendingItems(candidates, tomorrowBlock, tomorrowScheduleDay.dayNumber, userState, referenceData);
    }
  }

  return candidates;
}

function addPendingItems(
  candidates: EarlyFinishCandidate[],
  block: ScheduleDayPlan["blocks"][number],
  dayNumber: number,
  userState: UserState,
  referenceData?: RuntimeReferenceData,
): void {
  const blockKey = block.timeSlotKey as BlockKey;
  for (const item of block.items) {
    const progress = getTopicProgress(userState, item, dayNumber, blockKey);
    if (progress.status !== "pending") continue;
    const subjectLabel =
      item.subjectIds.length > 0 ? item.subjectIds[0] : "";
    candidates.push({
      sourceItemId: item.itemId,
      label: item.label,
      subject: subjectLabel,
      plannedMinutes: item.plannedMinutes,
      sourceDayNumber: dayNumber,
      sourceBlockKey: blockKey,
      isRecovery: item.isRecovery === true,
      originalDayNumber: item.originalDayNumber ?? null,
    });
  }
}
