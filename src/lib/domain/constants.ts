import type { BlockKey, RevisionType } from "@/lib/domain/types";

export const APP_NAME = "Beside You";
export const EXAM_DATE = "2026-08-30";
export const HARD_BOUNDARY_DATE = "2026-08-20";

export const TRACKABLE_BLOCK_ORDER: BlockKey[] = [
  "morning_revision",
  "block_a",
  "block_b",
  "consolidation",
  "mcq",
  "pyq_image",
  "night_recall",
];

export const REVISION_INTERVALS: Record<RevisionType, number> = {
  "D+1": 1,
  "D+3": 3,
  "D+7": 7,
  "D+14": 14,
  "D+28": 28,
};

export const BREAK_MICRO_SLOT_LABELS = [
  "08:00 break recall",
  "10:45 break recall",
  "16:45 break recall",
  "21:45 break recall",
] as const;

export const YELLOW_VISIBLE_BLOCKS: BlockKey[] = [
  "morning_revision",
  "block_a",
  "block_b",
  "mcq",
  "night_recall",
];

export const RED_VISIBLE_BLOCKS: BlockKey[] = [
  "morning_revision",
  "block_a",
  "mcq",
];

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
