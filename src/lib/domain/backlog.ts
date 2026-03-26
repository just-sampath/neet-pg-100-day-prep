import { getScheduleDay } from "@/lib/domain/schedule";
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
  visible: boolean;
  reschedulable: boolean;
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
      shiftedBlocks: Array<{
        key: BlockKey;
        label: string;
        shiftedStart: string;
        shiftedEnd: string;
      }>;
      message: string;
    }
  | {
      kind: "force_to_backlog";
      affectedBlockKeys: BlockKey[];
      firstAffectedLabel: string;
      message: string;
    };

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function shouldCreateBacklogItem(dayNumber: number, blockKey: BlockKey, sourceTag: BacklogSourceTag) {
  const day = getScheduleDay(dayNumber);
  const block = day?.blocks.find((entry) => entry.timeSlotKey === blockKey);
  if (!block || !block.trackable || !block.reschedulable) {
    return false;
  }

  if (sourceTag === "yellow_day" || sourceTag === "red_day") {
    return block.trafficLightPolicy.backlogWhenHidden;
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
}: {
  editedBlockKey: BlockKey;
  newEndTime: string;
  slots: OverrunPreviewSlot[];
  trafficLight?: TrafficLight;
}): OverrunCascadePreview {
  const visibleSlots = slots.filter((slot) => slot.visible);
  const editedIndex = visibleSlots.findIndex((slot) => slot.key === editedBlockKey);
  const editedSlot = visibleSlots[editedIndex];

  if (!editedSlot || editedIndex === -1) {
    return { kind: "none" };
  }

  if (timeValue(newEndTime) <= timeValue(editedSlot.actualEnd ?? editedSlot.end)) {
    return { kind: "none" };
  }

  let cascadeEndMinutes = timeValue(newEndTime);
  const shiftedBlocks: Array<{
    key: BlockKey;
    label: string;
    shiftedStart: string;
    shiftedEnd: string;
  }> = [];

  for (let index = editedIndex + 1; index < visibleSlots.length; index += 1) {
    const slot = visibleSlots[index]!;
    if (!slot.reschedulable) {
      continue;
    }

    if (slot.status !== "pending") {
      continue;
    }

    const baseStart = slot.actualStart ?? slot.start;
    const baseEnd = slot.actualEnd ?? slot.end;
    const scheduledStartMinutes = timeValue(baseStart);

    if (cascadeEndMinutes <= scheduledStartMinutes && shiftedBlocks.length === 0) {
      return { kind: "none" };
    }

    const shiftedStartMinutes = Math.max(cascadeEndMinutes, scheduledStartMinutes);
    const duration = timeValue(baseEnd) - scheduledStartMinutes;
    const shiftedEndMinutes = shiftedStartMinutes + duration;
    cascadeEndMinutes = shiftedEndMinutes;

    shiftedBlocks.push({
      key: slot.key,
      label: slot.label,
      shiftedStart: formatClock(shiftedStartMinutes),
      shiftedEnd: formatClock(shiftedEndMinutes),
    });

    if (shiftedEndMinutes > timeValue("23:00")) {
      return {
        kind: "force_to_backlog",
        affectedBlockKeys: visibleSlots
          .slice(index)
          .filter((candidate) => candidate.reschedulable && candidate.status === "pending")
          .map((candidate) => candidate.key),
        firstAffectedLabel: slot.label,
        message: "Remaining reschedulable work moves to recovery so the day still ends by 23:00.",
      };
    }
  }

  if (shiftedBlocks.length === 0) {
    return { kind: "none" };
  }

  const firstShift = shiftedBlocks[0]!;
  const scheduledStart = visibleSlots.find((slot) => slot.key === firstShift.key)?.actualStart
    ?? visibleSlots.find((slot) => slot.key === firstShift.key)?.start
    ?? firstShift.shiftedStart;
  const scheduledEnd = visibleSlots.find((slot) => slot.key === firstShift.key)?.actualEnd
    ?? visibleSlots.find((slot) => slot.key === firstShift.key)?.end
    ?? firstShift.shiftedEnd;

  return {
    kind: "decision",
    affectedBlockKey: firstShift.key,
    affectedLabel: firstShift.label,
    scheduledStart,
    scheduledEnd,
    shiftedStart: firstShift.shiftedStart,
    shiftedEnd: firstShift.shiftedEnd,
    shiftMinutes: timeValue(firstShift.shiftedStart) - timeValue(scheduledStart),
    shiftedBlocks,
    message:
      shiftedBlocks.length === 1
        ? `${firstShift.label} now starts at ${firstShift.shiftedStart} instead of ${scheduledStart}. Keep it visible, or move the overflow to recovery?`
        : `${firstShift.label} and the later visible blocks will shift forward. Keep the cascade visible, or move the first overflow block to recovery?`,
  };
}
