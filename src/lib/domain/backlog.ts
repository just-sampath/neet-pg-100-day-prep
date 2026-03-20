import { RED_VISIBLE_BLOCKS, TRACKABLE_BLOCK_ORDER, YELLOW_VISIBLE_BLOCKS } from "@/lib/domain/constants";
import type { BacklogSourceTag, BlockKey, BlockStatus, TrafficLight } from "@/lib/domain/types";
import { timeValue } from "@/lib/utils/date";

export interface OverrunPreviewSlot {
  key: BlockKey;
  label: string;
  start: string;
  end: string;
  status: BlockStatus;
  actualStart: string | null;
  actualEnd: string | null;
}

export type OverrunCascadePreview =
  | { kind: "none" }
  | {
      kind: "decision";
      affectedBlockKey: BlockKey;
      affectedLabel: string;
      scheduledStart: string;
      scheduledEnd: string;
      shiftedStart: string;
      shiftedEnd: string;
      shiftMinutes: number;
      message: string;
    }
  | {
      kind: "force_to_backlog";
      affectedBlockKeys: BlockKey[];
      firstAffectedLabel: string;
      message: string;
    };

function getVisibleBlocks(trafficLight: TrafficLight) {
  if (trafficLight === "yellow") {
    return YELLOW_VISIBLE_BLOCKS;
  }
  if (trafficLight === "red") {
    return RED_VISIBLE_BLOCKS;
  }
  return TRACKABLE_BLOCK_ORDER;
}

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function shouldCreateBacklogItem(blockKey: BlockKey, sourceTag: BacklogSourceTag) {
  if (blockKey === "morning_revision" && (sourceTag === "missed" || sourceTag === "skipped" || sourceTag === "overrun_cascade")) {
    return false;
  }

  return true;
}

export function getTrafficLightBacklogSourceTag(trafficLight: Exclude<TrafficLight, "green">): BacklogSourceTag {
  return trafficLight === "yellow" ? "yellow_day" : "red_day";
}

export function previewOverrunCascade({
  editedBlockKey,
  newEndTime,
  slots,
  trafficLight,
}: {
  editedBlockKey: BlockKey;
  newEndTime: string;
  slots: OverrunPreviewSlot[];
  trafficLight: TrafficLight;
}): OverrunCascadePreview {
  const visibleOrder = getVisibleBlocks(trafficLight);
  const editedIndex = visibleOrder.indexOf(editedBlockKey);
  const editedSlot = slots.find((slot) => slot.key === editedBlockKey);

  if (editedIndex === -1 || !editedSlot) {
    return { kind: "none" };
  }

  if (timeValue(newEndTime) <= timeValue(editedSlot.end)) {
    return { kind: "none" };
  }

  const visibleSlots = visibleOrder
    .map((key) => slots.find((slot) => slot.key === key))
    .filter((slot): slot is OverrunPreviewSlot => Boolean(slot));

  const currentEnd = timeValue(newEndTime);
  for (let index = editedIndex + 1; index < visibleSlots.length; index += 1) {
    const slot = visibleSlots[index]!;

    if (slot.status !== "pending") {
      return { kind: "none" };
    }

    const baseStart = slot.actualStart ?? slot.start;
    const baseEnd = slot.actualEnd ?? slot.end;
    const scheduledStart = timeValue(baseStart);

    if (currentEnd <= scheduledStart) {
      return { kind: "none" };
    }

    const duration = timeValue(baseEnd) - scheduledStart;
    const shiftedStartMinutes = currentEnd;
    const shiftedEndMinutes = shiftedStartMinutes + duration;

    if (shiftedEndMinutes > timeValue("23:00")) {
      const affectedBlockKeys = visibleSlots
        .slice(index)
        .filter((candidate) => candidate.status === "pending")
        .map((candidate) => candidate.key);

      return {
        kind: "force_to_backlog",
        affectedBlockKeys,
        firstAffectedLabel: slot.label,
        message: "Remaining blocks moved to backlog to protect sleep.",
      };
    }

    return {
      kind: "decision",
      affectedBlockKey: slot.key,
      affectedLabel: slot.label,
      scheduledStart: baseStart,
      scheduledEnd: baseEnd,
      shiftedStart: formatClock(shiftedStartMinutes),
      shiftedEnd: formatClock(shiftedEndMinutes),
      shiftMinutes: shiftedStartMinutes - scheduledStart,
      message: `${slot.label} now starts at ${formatClock(shiftedStartMinutes)} instead of ${baseStart}. Keep it visible, or move the overflow to backlog?`,
    };
  }

  return { kind: "none" };
}
