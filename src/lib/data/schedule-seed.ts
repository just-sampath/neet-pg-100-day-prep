import { addDaysToDateOnly } from "@/lib/utils/date";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { invalidateRuntimeScheduleIndex } from "@/lib/domain/schedule";
import type {
  AppSettings,
  BlockTiming,
  DayState,
  PhaseConfigRow,
  ScheduleBlockRow,
  ScheduleDayRow,
  ScheduleShiftHiddenReason,
  ScheduleTopicAssignmentRow,
  TopicProgress,
  UserScheduleState,
  UserState,
} from "@/lib/domain/types";

const staticReferenceData = getStaticReferenceData();
const scheduleData = staticReferenceData.scheduleData;
const quotesData = staticReferenceData.quotes;

export const SCHEDULE_SEED_VERSION = scheduleData.seedVersion;

export function createEmptyScheduleState(): UserScheduleState {
  return {
    days: {},
    blocks: {},
    topicAssignments: {},
    phaseConfig: {},
  };
}

function getSortedShiftEvents(settings: AppSettings) {
  return [...(settings.shiftEvents ?? [])].sort((left, right) => left.appliedAt.localeCompare(right.appliedAt));
}

function getConsumedCompressionPairs(settings: AppSettings) {
  return getSortedShiftEvents(settings).flatMap((event) => event.compressedPairs);
}

function getAbsorptionSavings(dayNumber: number, settings: AppSettings): number {
  return getSortedShiftEvents(settings).reduce((savings, event) => {
    if (dayNumber < event.anchorDayNumber) {
      return savings;
    }

    let eventSavings = 0;
    if (event.bufferDayUsed && dayNumber >= event.bufferDayUsed) {
      eventSavings += 1;
    }

    for (const [, hiddenDay] of event.compressedPairs) {
      if (dayNumber >= hiddenDay) {
        eventSavings += 1;
      }
    }

    return savings + eventSavings;
  }, 0);
}

function computeMappedDate(dayNumber: number, settings: AppSettings) {
  if (!settings.dayOneDate) {
    return null;
  }

  const shiftDelta = getSortedShiftEvents(settings).reduce(
    (sum, event) => (dayNumber >= event.anchorDayNumber ? sum + event.shiftDays : sum),
    0,
  );
  const delta = dayNumber - 1 + shiftDelta - getAbsorptionSavings(dayNumber, settings);
  return addDaysToDateOnly(settings.dayOneDate, delta);
}

function getShiftHiddenReason(dayNumber: number, settings: AppSettings): ScheduleShiftHiddenReason | null {
  if (getSortedShiftEvents(settings).some((event) => event.bufferDayUsed === dayNumber)) {
    return "buffer_absorbed";
  }

  if (getConsumedCompressionPairs(settings).some(([, hiddenDay]) => hiddenDay === dayNumber)) {
    return "compression_merged";
  }

  return null;
}

function getMergedPartnerDay(dayNumber: number, settings: AppSettings) {
  const pair = getConsumedCompressionPairs(settings).find(([visibleDay]) => visibleDay === dayNumber);
  return pair ? pair[1] : null;
}

export function applyLegacyScheduleStateToSchedule(
  schedule: UserScheduleState,
  legacy: {
    dayStates: Record<string, DayState>;
    blockTiming: Record<string, BlockTiming>;
    topicProgress: Record<string, TopicProgress>;
  },
  updatedAt = new Date().toISOString(),
) {
  for (const [dayKey, state] of Object.entries(legacy.dayStates)) {
    const row = schedule.days[dayKey];
    if (!row) {
      continue;
    }
    row.trafficLight = state.trafficLight;
    row.trafficLightUpdatedAt = state.updatedAt ?? updatedAt;
    row.updatedAt = updatedAt;
  }

  for (const timing of Object.values(legacy.blockTiming)) {
    const row = schedule.blocks[`${timing.dayNumber}:${timing.blockKey}`];
    if (!row) {
      continue;
    }
    row.actualStart = timing.actualStart;
    row.actualEnd = timing.actualEnd;
    row.timingNote = timing.note;
    row.timingUpdatedAt = timing.updatedAt ?? updatedAt;
    row.updatedAt = updatedAt;
  }

  for (const progress of Object.values(legacy.topicProgress)) {
    const row = schedule.topicAssignments[progress.itemId];
    if (!row) {
      continue;
    }
    row.dayNumber = progress.dayNumber;
    row.blockKey = progress.blockKey;
    row.status = progress.status;
    row.completedAt = progress.completedAt;
    row.sourceTag = progress.sourceTag;
    row.note = progress.note;
    row.updatedAt = progress.updatedAt ?? updatedAt;
  }
}

export function applyScheduleMappingsFromSettings(
  schedule: UserScheduleState,
  settings: AppSettings,
  updatedAt = new Date().toISOString(),
) {
  if (!settings.dayOneDate) {
    return;
  }

  for (const row of Object.values(schedule.days)) {
    const originalMappedDate = row.dayNumber <= 100 ? addDaysToDateOnly(settings.dayOneDate, row.dayNumber - 1) : row.originalMappedDate;
    row.originalMappedDate = originalMappedDate;
    row.mappedDate = computeMappedDate(row.dayNumber, settings) ?? row.mappedDate;
    row.shiftHiddenReason = getShiftHiddenReason(row.dayNumber, settings);
    row.mergedPartnerDay = getMergedPartnerDay(row.dayNumber, settings);
    row.isExtensionDay = row.dayNumber > 100;
    row.updatedAt = updatedAt;
  }
}

export function buildSeededScheduleState(dayOneDate: string, seededAt = new Date().toISOString()): UserScheduleState {
  const schedule = createEmptyScheduleState();

  for (const phase of scheduleData.phaseConfig.phases) {
    const row: PhaseConfigRow = {
      phaseNumber: phase.phaseNumber,
      phaseId: phase.phaseId,
      originalStartDay: phase.originalStartDay,
      originalEndDay: phase.originalEndDay,
      extensionBudget: phase.extensionBudget,
      extensionsUsed: 0,
      currentStartDay: phase.originalStartDay,
      currentEndDay: phase.originalEndDay,
      createdAt: seededAt,
      updatedAt: seededAt,
    };
    schedule.phaseConfig[String(row.phaseNumber)] = row;
  }

  for (const day of scheduleData.daywisePlan.days) {
    const mappedDate = addDaysToDateOnly(dayOneDate, day.dayNumber - 1);
    const dayRow: ScheduleDayRow = {
      dayNumber: day.dayNumber,
      phaseId: day.phaseId,
      phaseName: day.phaseName,
      phaseGroup: scheduleData.daywisePlan.phaseCatalog.find((entry) => entry.phaseId === day.phaseId)?.phaseGroup ?? "phase_1",
      primaryFocusRaw: day.primaryFocusRaw,
      primaryFocusParts: [...day.primaryFocusParts],
      primaryFocusSubjectIds: [...day.primaryFocusSubjectIds],
      resourceRaw: day.resourceRaw,
      resourceParts: [...day.resourceParts],
      deliverableRaw: day.deliverableRaw,
      notesRaw: day.notesRaw,
      sourceMinutes: day.sourceMinutes,
      bufferMinutes: day.bufferMinutes,
      plannedStudyMinutes: day.plannedStudyMinutes,
      totalStudyHours: day.totalStudyHours,
      gtTestType: day.gtTestType,
      gtPlanRef: day.gtPlanRef,
      mappedDate,
      originalMappedDate: mappedDate,
      trafficLight: "green",
      trafficLightUpdatedAt: seededAt,
      isExtensionDay: false,
      shiftHiddenReason: null,
      mergedPartnerDay: null,
      createdAt: seededAt,
      updatedAt: seededAt,
    };
    schedule.days[String(day.dayNumber)] = dayRow;

    for (const block of day.blocks) {
      const slot = scheduleData.daywisePlan.slotCatalog.find((entry) => entry.timeSlotKey === block.timeSlotKey);
      const blockRow: ScheduleBlockRow = {
        dayNumber: day.dayNumber,
        blockKey: block.timeSlotKey,
        slotOrder: slot?.order ?? 0,
        startTime: slot?.start ?? block.timeSlotKey.split("-")[0] ?? "",
        endTime: slot?.end ?? block.timeSlotKey.split("-")[1] ?? "",
        durationMinutes: slot?.durationMinutes ?? 0,
        timelineKind: slot?.timelineKind ?? "study",
        displayLabel: block.displayLabel,
        semanticBlockKey: block.semanticBlockKey,
        blockIntent: block.blockIntent,
        trackable: block.trackable,
        rawText: block.rawText,
        recoveryLane: block.recoveryLane,
        phaseFence: block.phaseFence,
        defaultRevisionEligible: block.defaultRevisionEligible,
        reschedulable: block.reschedulable,
        trafficLightGreen: block.trafficLightPolicy.green,
        trafficLightYellow: block.trafficLightPolicy.yellow,
        trafficLightRed: block.trafficLightPolicy.red,
        backlogWhenHidden: block.trafficLightPolicy.backlogWhenHidden,
        actualStart: null,
        actualEnd: null,
        timingNote: null,
        timingUpdatedAt: null,
        createdAt: seededAt,
        updatedAt: seededAt,
      };
      schedule.blocks[`${day.dayNumber}:${block.timeSlotKey}`] = blockRow;

      for (const item of block.items) {
        const assignmentRow: ScheduleTopicAssignmentRow = {
          sourceItemId: item.itemId,
          dayNumber: day.dayNumber,
          blockKey: block.timeSlotKey,
          itemOrder: item.order,
          kind: item.kind,
          label: item.label,
          rawText: item.rawText,
          plannedMinutes: item.plannedMinutes,
          subjectIds: [...item.subjectIds],
          revisionEligible: item.revisionEligible,
          recoveryLane: item.recoveryLane,
          phaseFence: item.phaseFence,
          notes: item.notes,
          revisionType: item.revisionType ?? null,
          referenceLabel: item.referenceLabel ?? null,
          referenceDayNumber: item.referenceDayNumber ?? null,
          status: "pending",
          completedAt: null,
          sourceTag: null,
          note: null,
          isPinned: false,
          isRecovery: false,
          originalDayNumber: null,
          originalBlockKey: null,
          createdAt: seededAt,
          updatedAt: seededAt,
        };
        schedule.topicAssignments[item.itemId] = assignmentRow;
      }
    }
  }

  return schedule;
}

export function ensureUserScheduleSeeded(userState: UserState, seededAt = new Date().toISOString()) {
  if (!userState.settings.dayOneDate) {
    return false;
  }

  const hasSeededSchedule = Object.keys(userState.schedule.days).length > 0;
  if (!hasSeededSchedule || userState.settings.scheduleSeedVersion !== SCHEDULE_SEED_VERSION) {
    userState.schedule = buildSeededScheduleState(userState.settings.dayOneDate, seededAt);
    userState.settings.scheduleSeedVersion = SCHEDULE_SEED_VERSION;
    userState.settings.scheduleSeededAt = seededAt;
    invalidateRuntimeScheduleIndex(userState);
  }

  applyScheduleMappingsFromSettings(userState.schedule, userState.settings, seededAt);
  return true;
}

export function getReferenceSeedRows() {
  return {
    quotes: quotesData,
    subjectTiers: scheduleData.subjectStrategy.subjects,
    gtPlanItems: scheduleData.gtTestPlan.tests,
    revisionMapDays: scheduleData.revisionMap.days,
    phaseConfig: scheduleData.phaseConfig.phases,
  };
}

// ---------------------------------------------------------------------------
// Extension Day Builder
// ---------------------------------------------------------------------------

/**
 * Build a full extension day (ScheduleDayRow + all 12 ScheduleBlockRows).
 *
 * Extension days are structurally identical to regular study days — same
 * blocks, same times, same traffic-light defaults. The only differences:
 * - `isExtensionDay = true`
 * - No workbook content (primary_focus_raw etc. are empty/null)
 * - Topics are placed entirely by the repack engine
 *
 * Block attributes are cloned from Day 1 of the generated schedule to
 * guarantee consistency with the slot catalog.
 */
export function buildExtensionDayRows(
  dayNumber: number,
  phaseId: string,
  phaseGroup: "phase_1" | "phase_2" | "phase_3",
  phaseName: string,
  mappedDate: string,
  seededAt = new Date().toISOString(),
): { dayRow: ScheduleDayRow; blockRows: ScheduleBlockRow[] } {
  const referenceDay = scheduleData.daywisePlan.days[0]!;

  const dayRow: ScheduleDayRow = {
    dayNumber,
    phaseId,
    phaseName,
    phaseGroup,
    primaryFocusRaw: "",
    primaryFocusParts: [],
    primaryFocusSubjectIds: [],
    resourceRaw: "",
    resourceParts: [],
    deliverableRaw: "",
    notesRaw: null,
    sourceMinutes: null,
    bufferMinutes: null,
    plannedStudyMinutes: null,
    totalStudyHours: null,
    gtTestType: "No",
    gtPlanRef: null,
    mappedDate,
    originalMappedDate: mappedDate,
    trafficLight: "green",
    trafficLightUpdatedAt: seededAt,
    isExtensionDay: true,
    shiftHiddenReason: null,
    mergedPartnerDay: null,
    createdAt: seededAt,
    updatedAt: seededAt,
  };

  const blockRows: ScheduleBlockRow[] = [];

  for (const refBlock of referenceDay.blocks) {
    const slot = scheduleData.daywisePlan.slotCatalog.find(
      (entry) => entry.timeSlotKey === refBlock.timeSlotKey,
    );

    blockRows.push({
      dayNumber,
      blockKey: refBlock.timeSlotKey,
      slotOrder: slot?.order ?? 0,
      startTime: slot?.start ?? refBlock.timeSlotKey.split("-")[0] ?? "",
      endTime: slot?.end ?? refBlock.timeSlotKey.split("-")[1] ?? "",
      durationMinutes: slot?.durationMinutes ?? 0,
      timelineKind: slot?.timelineKind ?? "study",
      displayLabel: refBlock.displayLabel,
      semanticBlockKey: refBlock.semanticBlockKey,
      blockIntent: refBlock.blockIntent,
      trackable: refBlock.trackable,
      rawText: "Extension day — topics placed by repack",
      recoveryLane: refBlock.recoveryLane,
      phaseFence: refBlock.phaseFence,
      defaultRevisionEligible: refBlock.defaultRevisionEligible,
      reschedulable: refBlock.reschedulable,
      trafficLightGreen: refBlock.trafficLightPolicy.green,
      trafficLightYellow: refBlock.trafficLightPolicy.yellow,
      trafficLightRed: refBlock.trafficLightPolicy.red,
      backlogWhenHidden: refBlock.trafficLightPolicy.backlogWhenHidden,
      actualStart: null,
      actualEnd: null,
      timingNote: null,
      timingUpdatedAt: null,
      createdAt: seededAt,
      updatedAt: seededAt,
    });
  }

  return { dayRow, blockRows };
}

/**
 * Returns the number of blocks (all slot types) that a reference day has.
 * Derived from seed data, not hardcoded.
 */
export function getReferenceDayBlockCount(): number {
  return scheduleData.daywisePlan.days[0]!.blocks.length;
}

/**
 * Returns the block capacity template for a single extension day.
 * Only core_study and consolidation blocks (Block A, B, C) are included
 * since those are the only blocks the repack algorithm fills.
 *
 * dayNumber is set to 0 as a placeholder — the algorithm replaces it.
 */
export function getExtensionDayCapacityTemplate(): import("@/lib/domain/repack").BlockCapacity[] {
  const referenceDay = scheduleData.daywisePlan.days[0]!;
  const REPACK_INTENTS = new Set(["core_study", "consolidation"]);
  const template: import("@/lib/domain/repack").BlockCapacity[] = [];

  for (const refBlock of referenceDay.blocks) {
    const slot = scheduleData.daywisePlan.slotCatalog.find(
      (entry) => entry.timeSlotKey === refBlock.timeSlotKey,
    );
    if (!slot) continue;
    if (!REPACK_INTENTS.has(refBlock.blockIntent)) continue;

    template.push({
      dayNumber: 0,
      blockKey: refBlock.timeSlotKey as import("@/lib/domain/types").BlockKey,
      durationMinutes: slot.durationMinutes,
      slotOrder: slot.order,
    });
  }

  template.sort((a, b) => a.slotOrder - b.slotOrder);
  return template;
}
