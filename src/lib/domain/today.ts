import {
  getBlockProgress,
  getDisplayBlockDescription,
  getVisibleBlockKeys,
} from "@/lib/domain/schedule";
import type { ScheduleDayPlan } from "@/lib/domain/schedule-data-types";
import type {
  BlockKey,
  BlockProgress,
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
      label: "22:30 Check" | "22:45 Check";
      message: string;
    }
  | {
      kind: "night_recall";
      label: "23:00 Check";
      message: string;
    }
  | {
      kind: "auto_move_due";
      label: "23:15 Safety Net";
      message: string;
    }
  | {
      kind: "auto_move_done";
      label: "23:15 Safety Net";
      message: string;
    };

export function buildTodayTimeline(
  day: ScheduleDayPlan,
  userState: UserState,
  trafficLight: TrafficLight,
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
        progress: getBlockProgress(userState, day.dayNumber, blockKey),
        displayDescription: getDisplayBlockDescription(day, blockKey, trafficLight),
      };
    });
}

type WindDownStateInput = {
  minutes: number;
  incompleteVisibleBlocks: BlockKey[];
  nightRecallBlockKey: BlockKey | null;
  wrapUpDismissals: number;
  lateNightSweepProcessed: boolean;
};

export function getWindDownState({
  minutes,
  incompleteVisibleBlocks,
  nightRecallBlockKey,
  wrapUpDismissals,
  lateNightSweepProcessed,
}: WindDownStateInput): WindDownState {
  const nightRecallPending = nightRecallBlockKey
    ? incompleteVisibleBlocks.includes(nightRecallBlockKey)
    : false;
  const otherPendingBlocks = nightRecallBlockKey
    ? incompleteVisibleBlocks.filter((blockKey) => blockKey !== nightRecallBlockKey)
    : incompleteVisibleBlocks;

  if (minutes >= 23 * 60 + 15) {
    if (lateNightSweepProcessed) {
      return {
        kind: "auto_move_done",
        label: "23:15 Safety Net",
        message: "Moved to backlog. Sleep well.",
      };
    }

    if (incompleteVisibleBlocks.length > 0) {
      return {
        kind: "auto_move_due",
        label: "23:15 Safety Net",
        message: "Moving remaining blocks to backlog so the day stops here and sleep stays protected.",
      };
    }

    return { kind: "none" };
  }

  if (minutes >= 23 * 60) {
    if (nightRecallPending) {
      return {
        kind: "night_recall",
        label: "23:00 Check",
        message: "Time to rest. Do a quick 5-minute version, or skip tonight's recall?",
      };
    }

    return { kind: "none" };
  }

  if (minutes >= 22 * 60 + 30 && otherPendingBlocks.length > 0) {
    if (wrapUpDismissals === 0) {
      return {
        kind: "wrap_up",
        label: "22:30 Check",
        message: "It's getting late. Move remaining blocks to backlog and wind down?",
      };
    }

    if (wrapUpDismissals === 1 && minutes >= 22 * 60 + 45) {
      return {
        kind: "wrap_up",
        label: "22:45 Check",
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
