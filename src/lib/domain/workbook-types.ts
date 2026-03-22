import type { GtTestType, TimelineSlotKind } from "@/lib/domain/types";

export type WorkbookPhaseGroup =
  | "orientation_baseline"
  | "first_pass"
  | "grand_test_analysis"
  | "revision_1"
  | "revision_1_mixed_pyq_repair"
  | "revision_2_compression"
  | "revision_2_image_heavy"
  | "revision_2_pyq_day"
  | "revision_2_error_elimination"
  | "revision_2_volatile_list_day"
  | "revision_2_buffer"
  | "final_assault"
  | "pre_exam_day";

export type WorkbookBlockIntent =
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

export type WorkbookRecoveryLane = "none" | "core_recovery" | "soft_carry" | "assessment_recovery";

export type WorkbookPhaseFence =
  | "same_phase_only"
  | "current_phase_preferred"
  | "no_auto_cross_phase"
  | "not_reschedulable";

export type WorkbookBlockItemKind = "topic" | "task" | "revision_ref" | "gt_step";

export type WorkbookItemRevisionType = "D+1" | "D+3" | "D+7" | "D+14" | "D+28";

export type WorkbookVisibilityState = "visible" | "hidden";

export interface WorkbookTrafficLightPolicy {
  green: WorkbookVisibilityState;
  yellow: WorkbookVisibilityState;
  red: WorkbookVisibilityState;
  backlogWhenHidden: boolean;
}

export interface WorkbookPhaseCatalogItem {
  phaseId: string;
  phaseName: string;
  phaseGroup: WorkbookPhaseGroup;
  startDay: number;
  endDay: number;
}

export interface WorkbookSlotCatalogItem {
  timeSlotKey: string;
  start: string;
  end: string;
  durationMinutes: number;
  timelineKind: TimelineSlotKind;
  defaultTrackable: boolean;
  order: number;
}

export interface WorkbookDayBlockItem {
  itemId: string;
  order: number;
  kind: WorkbookBlockItemKind;
  label: string;
  rawText: string;
  plannedMinutes: number;
  subjectIds: string[];
  revisionEligible: boolean;
  recoveryLane: WorkbookRecoveryLane;
  phaseFence: WorkbookPhaseFence;
  notes: string | null;
  revisionType?: WorkbookItemRevisionType | null;
  referenceLabel?: string | null;
  referenceDayNumber?: number | null;
}

export interface WorkbookDayBlock {
  timeSlotKey: string;
  displayLabel: string;
  semanticBlockKey: string;
  blockIntent: WorkbookBlockIntent;
  trackable: boolean;
  rawText: string;
  items: WorkbookDayBlockItem[];
  recoveryLane: WorkbookRecoveryLane;
  phaseFence: WorkbookPhaseFence;
  defaultRevisionEligible: boolean;
  reschedulable: boolean;
  trafficLightPolicy: WorkbookTrafficLightPolicy;
}

export interface WorkbookDayPlan {
  dayNumber: number;
  phaseId: string;
  phaseName: string;
  primaryFocusRaw: string;
  primaryFocusParts: string[];
  primaryFocusSubjectIds: string[];
  resourceRaw: string;
  resourceParts: string[];
  deliverableRaw: string;
  gtTestType: GtTestType;
  gtPlanRef: string | null;
  blocks: WorkbookDayBlock[];
}

export interface WorkbookDaywisePlanData {
  version: number;
  sourceWorkbook: string;
  sourceSheet: "Daywise_Plan";
  phaseCatalog: WorkbookPhaseCatalogItem[];
  slotCatalog: WorkbookSlotCatalogItem[];
  days: WorkbookDayPlan[];
}

export interface WorkbookSubjectStrategyEntry {
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

export interface WorkbookSubjectStrategyData {
  version: number;
  sourceWorkbook: string;
  sourceSheet: "Subject_Strategy";
  subjects: WorkbookSubjectStrategyEntry[];
}

export interface WorkbookGtPlanEntry {
  gtPlanRef: string;
  dayNumber: number;
  testType: GtTestType;
  purposeRaw: string;
  whatToMeasureRaw: string;
  whatToMeasureItems: string[];
  mustOutputRaw: string;
  mustOutputItems: string[];
}

export interface WorkbookGtPlanData {
  version: number;
  sourceWorkbook: string;
  sourceSheet: "GT_Test_Plan";
  tests: WorkbookGtPlanEntry[];
}

export interface WorkbookSemanticBundle {
  daywisePlan: WorkbookDaywisePlanData;
  subjectStrategy: WorkbookSubjectStrategyData;
  gtTestPlan: WorkbookGtPlanData;
}
