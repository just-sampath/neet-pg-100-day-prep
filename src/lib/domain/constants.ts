import type { RevisionAssignedSlot, RevisionType } from "@/lib/domain/types";

export const APP_NAME = "Beside You";
export const EXAM_DATE = "2026-08-30";
export const HARD_BOUNDARY_DATE = "2026-08-20";

export const REVISION_INTERVALS: Record<RevisionType, number> = {
  "D+1": 1,
  "D+3": 3,
  "D+7": 7,
  "D+14": 14,
  "D+28": 28,
};

export const BREAK_MICRO_SLOT_LABELS = [
  "07:45 quick recall",
  "11:00 quick recall",
  "17:45 quick recall",
  "20:00 quick recall",
] as const;

export const BREAK_MICRO_SLOT_ORDER: Exclude<
  RevisionAssignedSlot,
  "morning_revision" | "final_review" | "block_c" | "next_revision_phase"
>[] = ["break_07_45", "break_11_00", "break_17_45", "break_20_00"];

export const SHIFT_COMPRESSION_PAIRS = [
  [95, 96],
  [97, 98],
  [91, 92],
] as const;

export const BUFFER_DAY = 84;

export const DEFAULT_LOCAL_USER = {
  email: "aspirant@beside-you.local",
  password: "beside-you-2026",
  displayName: "Aspirant",
};
