import scheduleSeed from "@/lib/generated/schedule.json";
import tieringSeed from "@/lib/generated/tiering.json";
import type { ScheduleDataBundle } from "@/lib/domain/schedule-data-types";

export const scheduleData = {
  ...scheduleSeed,
  subjectStrategy: tieringSeed,
} as ScheduleDataBundle;

export const scheduleSeedData = scheduleSeed;
export const subjectTieringData = tieringSeed;
