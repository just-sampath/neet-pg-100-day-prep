import {
  getBlockProgress,
  getDisplayBlockDescription,
  getVisibleBlockKeys,
} from "@/lib/domain/schedule";
import type {
  BlockKey,
  BlockProgress,
  GeneratedScheduleDay,
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
  day: GeneratedScheduleDay,
  userState: UserState,
  trafficLight: TrafficLight,
): TodayTimelineEntry[] {
  const visibleBlocks = new Set(getVisibleBlockKeys(trafficLight));

  return [...day.slots]
    .sort((left, right) => left.order - right.order)
    .map((slot) => {
      if (!slot.trackable) {
        return {
          kind: "separator" as const,
          id: `${day.dayNumber}:${slot.key}`,
          slotKey: slot.key,
          label: slot.label,
          slotKind: (slot.kind ?? "break") as Exclude<TimelineSlotKind, "study">,
          start: slot.start,
          end: slot.end,
        };
      }

      const blockKey = slot.key as BlockKey;
      return {
        kind: "block" as const,
        id: `${day.dayNumber}:${blockKey}`,
        blockKey,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        mode: visibleBlocks.has(blockKey) ? "visible" : "hidden",
        progress: getBlockProgress(userState, day.dayNumber, blockKey),
        displayDescription: getDisplayBlockDescription(day, blockKey, trafficLight),
      };
    });
}

type WindDownStateInput = {
  minutes: number;
  incompleteVisibleBlocks: BlockKey[];
  wrapUpDismissals: number;
  lateNightSweepProcessed: boolean;
};

export function getWindDownState({
  minutes,
  incompleteVisibleBlocks,
  wrapUpDismissals,
  lateNightSweepProcessed,
}: WindDownStateInput): WindDownState {
  const nightRecallPending = incompleteVisibleBlocks.includes("night_recall");
  const otherPendingBlocks = incompleteVisibleBlocks.filter((blockKey) => blockKey !== "night_recall");

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
