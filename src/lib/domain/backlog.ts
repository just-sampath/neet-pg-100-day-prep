import { getScheduleDay } from "@/lib/domain/schedule";
import type { BacklogSourceTag, BlockKey, BlockStatus, RuntimeReferenceData, SubjectTier, TrafficLight, UserState } from "@/lib/domain/types";
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

const BACKLOG_QUALIFYING_INTENTS = new Set<string>(["core_study", "consolidation"]);

export function shouldCreateBacklogItem(dayNumber: number, blockKey: BlockKey, sourceTag: BacklogSourceTag, referenceData?: RuntimeReferenceData) {
  const day = getScheduleDay(dayNumber, undefined, referenceData);
  const block = day?.blocks.find((entry) => entry.timeSlotKey === blockKey);
  if (!block || !block.trackable || !block.reschedulable) {
    return false;
  }

  if (!BACKLOG_QUALIFYING_INTENTS.has(block.blockIntent)) {
    return false;
  }

  if (sourceTag === "yellow_day" || sourceTag === "red_day" || sourceTag === "traffic_light") {
    return block.trafficLightPolicy.backlogWhenHidden;
  }

  return true;
}

export function getTrafficLightBacklogSourceTag(): BacklogSourceTag {
  return "traffic_light";
}

export function resolveSubjectTier(
  subjectIds: string[],
  referenceData?: RuntimeReferenceData,
): { subject: string; subjectTier: SubjectTier | null } {
  if (!referenceData || subjectIds.length === 0) {
    return { subject: "General", subjectTier: null };
  }

  const subjects = referenceData.scheduleData.subjectStrategy.subjects;
  let bestRank = Infinity;
  let bestName = "";
  let bestTier: SubjectTier | null = null;

  for (const sid of subjectIds) {
    const entry = subjects.find((s) => s.subjectId === sid);
    if (entry && entry.priorityRank < bestRank) {
      bestRank = entry.priorityRank;
      bestName = entry.subjectName;
      bestTier = rankToTier(entry.priorityRank);
    }
  }

  if (!bestTier) {
    return { subject: subjectIds[0]?.replaceAll("_", " ") ?? "General", subjectTier: null };
  }

  return { subject: bestName, subjectTier: bestTier };
}

function rankToTier(rank: number): SubjectTier | null {
  if (rank === 1) return "A";
  if (rank === 2) return "B";
  if (rank === 3) return "C";
  return null;
}

export function resolvePhase(dayNumber: number, userState: UserState): number | null {
  for (const phase of Object.values(userState.schedule.phaseConfig)) {
    if (dayNumber >= phase.currentStartDay && dayNumber <= phase.currentEndDay) {
      return phase.phaseNumber;
    }
  }
  return null;
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
