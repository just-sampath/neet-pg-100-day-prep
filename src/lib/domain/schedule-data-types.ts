import type { GtTestType, TimelineSlotKind } from "@/lib/domain/types";

export type SchedulePhaseGroup = "phase_1" | "phase_2" | "phase_3";

export type ScheduleBlockIntent =
  | "setup"
  | "revision"
  | "core_study"
  | "consolidation"
  | "practice"
  | "pyq_image"
  | "recall"
  | "assessment"
  | "analysis"
  | "repair"
  | "logistics"
  | "shutdown"
  | "break"
  | "meal";

export type RecoveryLane = "none" | "core_recovery" | "soft_carry" | "assessment_recovery";

export type PhaseFence =
  | "same_phase_only"
  | "current_phase_preferred"
  | "no_auto_cross_phase"
  | "not_reschedulable";

export type ScheduleItemKind = "topic" | "task" | "revision_ref" | "gt_step";

export type ScheduleItemRevisionType = "D+1" | "D+3" | "D+7" | "D+14" | "D+28";

export type VisibilityState = "visible" | "hidden";

export interface ScheduleTrafficLightPolicy {
  green: VisibilityState;
  yellow: VisibilityState;
  red: VisibilityState;
  backlogWhenHidden: boolean;
}

export interface SchedulePhaseCatalogItem {
  phaseId: string;
  phaseName: string;
  phaseGroup: SchedulePhaseGroup;
  startDay: number;
  endDay: number;
  description: string;
}

export interface ScheduleSlotCatalogItem {
  timeSlotKey: string;
  start: string;
  end: string;
  durationMinutes: number;
  timelineKind: TimelineSlotKind;
  defaultTrackable: boolean;
  order: number;
}

export interface ScheduleDayBlockItem {
  itemId: string;
  order: number;
  kind: ScheduleItemKind;
  label: string;
  rawText: string;
  plannedMinutes: number;
  subjectIds: string[];
  revisionEligible: boolean;
  recoveryLane: RecoveryLane;
  phaseFence: PhaseFence;
  notes: string | null;
  revisionType?: ScheduleItemRevisionType | null;
  referenceLabel?: string | null;
  referenceDayNumber?: number | null;
  isRecovery?: boolean;
  originalDayNumber?: number | null;
  originalBlockKey?: string | null;
}

export interface ScheduleDayBlock {
  timeSlotKey: string;
  displayLabel: string;
  semanticBlockKey: string;
  blockIntent: ScheduleBlockIntent;
  trackable: boolean;
  rawText: string;
  items: ScheduleDayBlockItem[];
  recoveryLane: RecoveryLane;
  phaseFence: PhaseFence;
  defaultRevisionEligible: boolean;
  reschedulable: boolean;
  trafficLightPolicy: ScheduleTrafficLightPolicy;
}

export interface ScheduleDayPlan {
  dayNumber: number;
  phaseId: string;
  phaseName: string;
  primaryFocusRaw: string;
  primaryFocusParts: string[];
  primaryFocusSubjectIds: string[];
  resourceRaw: string;
  resourceParts: string[];
  deliverableRaw: string;
  notesRaw: string | null;
  sourceMinutes: number | null;
  bufferMinutes: number | null;
  plannedStudyMinutes: number | null;
  totalStudyHours: number | null;
  gtTestType: GtTestType;
  gtPlanRef: string | null;
  blocks: ScheduleDayBlock[];
}

export interface ScheduleDaywisePlanData {
  version: number;
  source: "workbook";
  sourceWorkbook: "NEET_PG_FINAL_SCHEDULE.xlsx";
  sourceSheet: "Daywise_Plan";
  phaseCatalog: SchedulePhaseCatalogItem[];
  slotCatalog: ScheduleSlotCatalogItem[];
  days: ScheduleDayPlan[];
}

export interface SubjectStrategyEntry {
  subjectId: string;
  subjectName: string;
  aliases: string[];
  worHours: number;
  firstPassDays: number;
  priorityTier: string;
  priorityRank: number;
  resourceDecisionRaw: string;
  mustFocusTopics: string[];
}

export interface SubjectStrategyData {
  version: number;
  source: "workbook";
  sourceWorkbook: "NEET_PG_FINAL_SCHEDULE.xlsx";
  sourceSheet: "Subject_Tiering";
  subjects: SubjectStrategyEntry[];
}

export interface GtPlanEntry {
  gtPlanRef: string;
  dayNumber: number;
  testType: GtTestType;
  purposeRaw: string;
  whatToMeasureRaw: string;
  whatToMeasureItems: string[];
  mustOutputRaw: string;
  mustOutputItems: string[];
  resourceRaw: string;
  reviewRaw: string;
  wrapUpRaw: string;
  notesRaw: string | null;
}

export interface GtPlanData {
  version: number;
  source: "workbook";
  sourceWorkbook: "NEET_PG_FINAL_SCHEDULE.xlsx";
  sourceSheet: "Daywise_Plan";
  tests: GtPlanEntry[];
}

export interface RevisionMapDayEntry {
  dayNumber: number;
  d1DueTopics: string | null;
  d3DueTopics: string | null;
  d7DueTopics: string | null;
  d14DueTopics: string | null;
  d28DueTopics: string | null;
  morningQueueRule: string;
}

export interface RevisionMapData {
  version: number;
  source: "workbook";
  sourceWorkbook: "NEET_PG_FINAL_SCHEDULE.xlsx";
  sourceSheet: "Revision_Map";
  days: RevisionMapDayEntry[];
}

export interface PhaseConfigSeedEntry {
  phaseNumber: 1 | 2 | 3;
  phaseId: string;
  originalStartDay: number;
  originalEndDay: number;
  extensionBudget: number;
}

export interface PhaseConfigSeedData {
  version: number;
  source: "workbook";
  sourceWorkbook: "NEET_PG_FINAL_SCHEDULE.xlsx";
  sourceSheet: "Daywise_Plan";
  phases: PhaseConfigSeedEntry[];
}

export interface ScheduleDataBundle {
  seedVersion: number;
  examDate: string;
  hardBoundaryDate: string;
  daywisePlan: ScheduleDaywisePlanData;
  subjectStrategy: SubjectStrategyData;
  gtTestPlan: GtPlanData;
  revisionMap: RevisionMapData;
  phaseConfig: PhaseConfigSeedData;
}
