import {
  getBlockProgress,
  getDisplayBlockDescription,
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
