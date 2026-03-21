export type ThemeMode = "dark" | "light";

export type TrafficLight = "green" | "yellow" | "red";

export type BlockKey =
  | "morning_revision"
  | "block_a"
  | "block_b"
  | "consolidation"
  | "mcq"
  | "pyq_image"
  | "night_recall";

export type RevisionType = "D+1" | "D+3" | "D+7" | "D+14" | "D+28";
export type RevisionSourceBlockKey = "block_a" | "block_b";
export type RevisionAssignedSlot =
  | "morning_revision"
  | "night_recall"
  | "break_08_00"
  | "break_10_45"
  | "break_16_45"
  | "break_21_45"
  | "consolidation"
  | "pyq_image"
  | "next_revision_phase";

export type GtTestType = "No" | "Diagnostic 100Q" | "Full GT" | "120Q half-sim";

export type BlockStatus =
  | "pending"
  | "completed"
  | "partial"
  | "skipped"
  | "missed"
  | "rescheduled";

export type BacklogSourceTag =
  | "missed"
  | "skipped"
  | "yellow_day"
  | "red_day"
  | "overrun_cascade";

export type BacklogStatus = "pending" | "rescheduled" | "completed" | "dismissed";
export type BacklogViewFilter = BacklogStatus | "all";
export type BacklogSortMode = "priority" | "oldest" | "newest" | "subject";
export type BacklogBulkScope = "all_pending" | "missed_skipped" | "yellow_red" | "overrun";
export type BacklogMoveDirection = "up" | "down";

export type QuoteCategory = "daily" | "tough_day" | "celebration";

export type McqResult = "right" | "wrong" | "guessed_right";

export type McqCauseCode = "R" | "C" | "A" | "D" | "I" | "M" | "V" | "B" | "T" | "K";

export type McqPriority = "P1" | "P2" | "P3";
export type McqFixCode = "N" | "Q20" | "Q40M" | "A1" | "A3" | "T2" | "I10" | "F5" | "E" | "AI" | "G";
export type McqTag = "protocol" | "volatile" | "management" | "image" | "emergency" | "screening" | "staging";
export type GtDevice = "laptop" | "mobile" | "tablet";
export type GtOverallFeeling = "calm" | "rushed" | "blank" | "fatigued" | "overthinking";
export type GtTimeLostCode = "image" | "lengthy_clinical" | "biostats" | "algorithms";
export type TimelineSlotKind = "study" | "break" | "meal";

export interface GeneratedQuote {
  id: string;
  quote: string;
  author: string;
  category: QuoteCategory;
}

export interface GeneratedWorkbookNote {
  section: string;
  details: string;
}

export interface GeneratedSubjectStrategy {
  subject: string;
  worHours: number;
  firstPassDays: number;
  priorityTier: string;
  resourceDecision: string;
  mustFocusTopics: string[];
}

export interface GeneratedGtPlanItem {
  dayNumber: number;
  testType: GtTestType;
  purpose: string;
  whatToMeasure: string;
  mustOutputAfterTest: string;
}

export interface GeneratedTimelineTemplate {
  key: BlockKey | string;
  label: string;
  column?: string;
  start: string;
  end: string;
  durationHours?: number;
  description?: string;
  trackable: boolean;
  order: number;
  kind?: TimelineSlotKind;
}

export interface GeneratedTimelineSlot extends GeneratedTimelineTemplate {
  description: string;
}

export interface GeneratedScheduleDay {
  dayNumber: number;
  phase: string;
  primaryFocus: string;
  resource: string;
  originalMorningItems: string[];
  gtTest: GtTestType;
  deliverable: string;
  plannedHours: number;
  slots: GeneratedTimelineSlot[];
}

export interface GeneratedPhaseSummary {
  name: string;
  startDay: number;
  endDay: number;
  days: number;
  description: string;
}

export interface GeneratedScheduleBundle {
  examDate: string;
  hardBoundaryDate: string;
  trackableBlockOrder: BlockKey[];
  blockTemplates?: GeneratedTimelineTemplate[];
  workbookReadme?: GeneratedWorkbookNote[];
  days: GeneratedScheduleDay[];
  phases: GeneratedPhaseSummary[];
  gtPlan: GeneratedGtPlanItem[];
  subjects: GeneratedSubjectStrategy[];
}

export interface AppSettings {
  dayOneDate: string | null;
  theme: ThemeMode;
  scheduleShiftDays: number;
  shiftAppliedAt: string | null;
  shiftEvents: ScheduleShiftEvent[];
}

export interface ScheduleShiftEvent {
  id: string;
  anchorDayNumber: number;
  shiftDays: number;
  appliedAt: string;
  missedDays: number[];
  bufferDayUsed: number | null;
  compressedPairs: Array<[number, number]>;
}

export interface ShiftMergedDay {
  originalDays: number[];
  mergedDescription: string;
}

export interface ScheduleHealth {
  missedDays: number[];
  anchorDayNumber: number | null;
  suggestShift: boolean;
}

export interface ScheduleShiftPreview {
  anchorDayNumber: number;
  shiftDays: number;
  missedDays: number[];
  bufferDaysAvailable: number;
  bufferDaysUsed: number;
  isCleanShift: boolean;
  compressedPairs: Array<[number, number]>;
  mergedDays: ShiftMergedDay[];
  day100: string;
  hardBoundaryExceeded: boolean;
  signature: string;
}

export type ScheduleDayRelation = "past" | "today" | "future" | "unmapped";

export interface ScheduleDayEditState {
  relation: ScheduleDayRelation;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  isShiftHidden: boolean;
  isReadOnly: boolean;
  canAdjustToday: boolean;
  canRetroactivelyComplete: boolean;
}

export interface DayState {
  dayNumber: number;
  trafficLight: TrafficLight;
  updatedAt: string;
}

export interface BlockProgress {
  dayNumber: number;
  blockKey: BlockKey;
  status: BlockStatus;
  actualStart: string | null;
  actualEnd: string | null;
  completedAt: string | null;
  sourceTag: BacklogSourceTag | null;
  note: string | null;
}

export interface RevisionCompletion {
  revisionId: string;
  sourceDay: number;
  sourceBlockKey: RevisionSourceBlockKey;
  revisionType: RevisionType;
  completedAt: string;
}

export interface BacklogItem {
  id: string;
  originalDay: number;
  originalBlockKey: BlockKey;
  originalStart: string | null;
  originalEnd: string | null;
  priorityOrder: number;
  topicDescription: string;
  subject: string;
  sourceTag: BacklogSourceTag;
  status: BacklogStatus;
  suggestedDay: number | null;
  suggestedBlockKey: BlockKey | null;
  suggestedNote: string | null;
  rescheduledToDay: number | null;
  rescheduledToBlockKey: BlockKey | null;
  createdAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
}

export interface BacklogQueueSummary {
  totalPending: number;
  fromMissed: number;
  fromYellowRed: number;
  fromOverrun: number;
}

export interface BacklogQueueViewItem extends BacklogItem {
  daysInBacklog: number;
  sourceLabel: string;
  originalMappedDate: string | null;
  suggestionLabel: string | null;
  rescheduledLabel: string | null;
}

export interface ScheduledRecoveryItem {
  id: string;
  sourceDay: number;
  sourceMappedDate: string | null;
  subject: string;
  topicDescription: string;
  sourceTag: BacklogSourceTag;
  targetDay: number;
  targetBlockKey: BlockKey;
  targetBlockLabel: string;
  daysInBacklog: number;
  priorityOrder: number;
}

export interface McqBulkLog {
  id: string;
  entryDate: string;
  totalAttempted: number;
  correct: number;
  wrong: number;
  subject: string | null;
  source: string | null;
  createdAt: string;
}

export interface McqItemLog {
  id: string;
  entryDate: string;
  mcqId: string;
  result: McqResult;
  subject: string | null;
  topic: string | null;
  source: string | null;
  causeCode: McqCauseCode | null;
  priority: McqPriority | null;
  correctRule: string | null;
  whatFooledMe: string | null;
  fixCodes: McqFixCode[];
  tags: McqTag[];
  createdAt: string;
}

export interface GtSectionBreakdown {
  timeEnough: boolean | null;
  panicStarted: boolean | null;
  guessedTooMuch: boolean | null;
  timeLostOn: GtTimeLostCode[];
}

export interface GtLog {
  id: string;
  gtNumber: string;
  gtDate: string;
  dayNumber: number | null;
  score: number | null;
  correct: number | null;
  wrong: number | null;
  unattempted: number | null;
  airPercentile: string | null;
  device: GtDevice | null;
  attemptedLive: boolean | null;
  overallFeeling: GtOverallFeeling | null;
  sectionA: GtSectionBreakdown;
  sectionB: GtSectionBreakdown;
  sectionC: GtSectionBreakdown;
  sectionD: GtSectionBreakdown;
  sectionE: GtSectionBreakdown;
  errorTypes: string | null;
  recurringTopics: string | null;
  weakestSubjects: string[];
  knowledgeVsBehaviour: number | null;
  unsureRightCount: number | null;
  changeBeforeNextGt: string | null;
  createdAt: string;
}

export interface WeeklySummary {
  id: string;
  weekKey: string;
  weekStartDate: string;
  weekEndDate: string;
  coveredThroughDate: string;
  isPartialWeek: boolean;
  blocksCompleted: number;
  blocksPlanned: number;
  blocksCompletedRate: number | null;
  greenDays: number;
  yellowDays: number;
  redDays: number;
  morningRevisionCompleted: number;
  morningRevisionPlanned: number;
  morningRevisionCompletionRate: number | null;
  revisionOverflowDays: number;
  revisionCatchUpCount: number;
  revisionRestudyCount: number;
  overrunBlockCount: number;
  overrunBlocks: { label: string; count: number }[];
  totalMcqsSolved: number;
  overallAccuracy: number | null;
  accuracyVsPrevious: "up" | "down" | "stable";
  topWrongSubjects: { label: string; count: number }[];
  topCauseCodes: { label: string; count: number }[];
  gtNumber: string | null;
  gtScore: number | null;
  gtAir: string | null;
  gtWrapperSummary: string | null;
  scheduleStatusKind: "on_track" | "days_behind" | "buffer_used";
  scheduleStatus: string;
  daysBehind: number;
  backlogCount: number;
  backlogSummary: BacklogQueueSummary;
  bufferDaysUsed: number;
  subjectsStudied: string[];
  generatedAt: string;
}

export interface LocalUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LocalSession {
  id: string;
  userId: string;
  createdAt: string;
}

export interface UserState {
  settings: AppSettings;
  dayStates: Record<string, DayState>;
  blockProgress: Record<string, BlockProgress>;
  revisionCompletions: Record<string, RevisionCompletion>;
  backlogItems: Record<string, BacklogItem>;
  mcqBulkLogs: Record<string, McqBulkLog>;
  mcqItemLogs: Record<string, McqItemLog>;
  gtLogs: Record<string, GtLog>;
  weeklySummaries: Record<string, WeeklySummary>;
  processedDates: {
    lateNightSweepDates: string[];
    midnightDates: string[];
    weeklySummaryDates: string[];
  };
}

export interface LocalStore {
  version: number;
  users: Record<string, LocalUser>;
  sessions: Record<string, LocalSession>;
  userState: Record<string, UserState>;
  dev: {
    simulatedNowIso: string | null;
  };
}

export interface RevisionQueueItem {
  id: string;
  sourceDay: number;
  sourceBlockKey: RevisionSourceBlockKey;
  sourceBlockLabel: string;
  sourceTopicLabel: string;
  subject: string;
  topic: string;
  revisionType: RevisionType;
  scheduledDate: string;
  sourceAnchorDate: string;
  anchorMode: "actual" | "planned";
  assignedSlot: RevisionAssignedSlot;
  overdueBy: number;
  status: "due" | "completed" | "overdue_1_2" | "overdue_3_6" | "overdue_7_plus";
}

export interface OverflowRevisionItem {
  item: RevisionQueueItem;
  assignedSlot: "night_recall" | "break_08_00" | "break_10_45" | "break_16_45" | "break_21_45";
  label: string;
}

export interface RevisionDisplayGroup {
  id: string;
  sourceDay: number;
  sourceTopicLabel: string;
  subject: string;
  revisionTypes: RevisionType[];
  items: RevisionQueueItem[];
}

export interface DailyRevisionPlan {
  queue: RevisionQueueItem[];
  overflow: OverflowRevisionItem[];
  catchUp: RevisionQueueItem[];
  restudyFlags: RevisionQueueItem[];
  morningMinutesPerItem: number;
  overflowStreakDays: number;
  overflowSuggestion: string | null;
}

export interface DayViewModel {
  scheduleDay: GeneratedScheduleDay;
  mappedDate: string | null;
  trafficLight: TrafficLight;
  isToday: boolean;
  visibleBlocks: BlockKey[];
  hiddenBlocks: BlockKey[];
  revisionPlan: DailyRevisionPlan;
  backlogCount: number;
}
