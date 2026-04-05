import { addDaysToDateOnly, diffDays } from "@/lib/utils/date";
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

/** Total number of template items across all days/blocks — used for fast repair short-circuit. */
const templateItemCount = scheduleData.daywisePlan.days.reduce(
  (sum, day) => sum + day.blocks.reduce((bSum, block) => bSum + block.items.length, 0),
  0,
);
const REPACK_ELIGIBLE_BLOCK_INTENTS = new Set(["core_study", "consolidation"]);
const templateItemPlacementById = new Map(
  scheduleData.daywisePlan.days.flatMap((day) =>
    day.blocks.flatMap((block) =>
      block.items.map((item) => [
        item.itemId,
        {
          dayNumber: day.dayNumber,
          blockKey: block.timeSlotKey,
          itemOrder: item.order,
          blockIntent: block.blockIntent,
        },
      ] as const),
    ),
  ),
);

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

/** Fingerprint of the inputs that drive schedule mappings. */
function scheduleMappingFingerprint(settings: AppSettings): string {
  return `${settings.dayOneDate}:${(settings.shiftEvents ?? []).length}:${(settings.shiftEvents ?? []).map((e) => e.appliedAt).join(",")}`;
}

const mappingFingerprintCache = new WeakMap<UserScheduleState, string>();

export function applyScheduleMappingsFromSettings(
  schedule: UserScheduleState,
  settings: AppSettings,
  updatedAt = new Date().toISOString(),
) {
  if (!settings.dayOneDate) {
    return;
  }

  const fp = scheduleMappingFingerprint(settings);
  if (mappingFingerprintCache.get(schedule) === fp) {
    return;
  }
  mappingFingerprintCache.set(schedule, fp);

  for (const row of Object.values(schedule.days)) {
    const inferredOriginalDayNumber = row.originalDayNumber ?? (
      row.isExtensionDay
        ? null
        : scheduleData.daywisePlan.days.find(
          (day) =>
            day.phaseId === row.phaseId &&
            day.primaryFocusRaw === row.primaryFocusRaw &&
            day.resourceRaw === row.resourceRaw &&
            day.deliverableRaw === row.deliverableRaw,
        )?.dayNumber ?? (row.dayNumber <= 100 ? row.dayNumber : null)
    );
    const originalMappedDate = inferredOriginalDayNumber
      ? addDaysToDateOnly(settings.dayOneDate, inferredOriginalDayNumber - 1)
      : row.originalMappedDate;
    row.originalDayNumber = inferredOriginalDayNumber;
    row.originalMappedDate = originalMappedDate;
    row.mappedDate = computeMappedDate(row.dayNumber, settings) ?? row.mappedDate;
    row.shiftHiddenReason = getShiftHiddenReason(row.dayNumber, settings);
    row.mergedPartnerDay = getMergedPartnerDay(row.dayNumber, settings);
    row.isExtensionDay = row.isExtensionDay || (row.originalDayNumber === null && row.dayNumber > 100);
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
      originalDayNumber: day.dayNumber,
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

/** Fill in any topicAssignment rows that exist in the template but are missing from the store. Idempotent — never overwrites existing rows. */
function repairMissingTopicAssignments(schedule: UserScheduleState, seededAt: string) {
  // Quick check: if the count matches, skip the expensive iteration.
  if (Object.keys(schedule.topicAssignments).length >= templateItemCount) {
    return 0;
  }
  let repaired = 0;
  for (const day of scheduleData.daywisePlan.days) {
    for (const block of day.blocks) {
      for (const item of block.items) {
        if (schedule.topicAssignments[item.itemId]) continue;
        schedule.topicAssignments[item.itemId] = {
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
        repaired++;
      }
    }
  }
  return repaired;
}

/** Restore anchored non-study topic assignments to their template slot if prior repack logic displaced them. */
function repairAnchoredTopicAssignments(schedule: UserScheduleState, seededAt: string) {
  let repaired = 0;

  for (const row of Object.values(schedule.topicAssignments)) {
    const templatePlacement = templateItemPlacementById.get(row.sourceItemId);
    if (!templatePlacement) {
      continue;
    }

    if (REPACK_ELIGIBLE_BLOCK_INTENTS.has(templatePlacement.blockIntent)) {
      continue;
    }

    const placementChanged =
      row.dayNumber !== templatePlacement.dayNumber ||
      row.blockKey !== templatePlacement.blockKey ||
      row.itemOrder !== templatePlacement.itemOrder;
    const recoveryMetadataChanged = row.isRecovery || row.originalDayNumber !== null || row.originalBlockKey !== null;

    if (!placementChanged && !recoveryMetadataChanged) {
      continue;
    }

    row.dayNumber = templatePlacement.dayNumber;
    row.blockKey = templatePlacement.blockKey;
    row.itemOrder = templatePlacement.itemOrder;
    row.isRecovery = false;
    row.originalDayNumber = null;
    row.originalBlockKey = null;
    row.updatedAt = seededAt;
    repaired += 1;
  }

  return repaired;
}

export function ensureUserScheduleSeeded(
  userState: UserState,
  seededAt = new Date().toISOString(),
  options?: {
    allowRepair?: boolean;
  },
) {
  const allowRepair = options?.allowRepair ?? true;
  if (!userState.settings.dayOneDate) {
    return false;
  }

  const hasSeededSchedule = Object.keys(userState.schedule.days).length > 0;
  if (!hasSeededSchedule || userState.settings.scheduleSeedVersion !== SCHEDULE_SEED_VERSION) {
    userState.schedule = buildSeededScheduleState(userState.settings.dayOneDate, seededAt);
    userState.settings.scheduleSeedVersion = SCHEDULE_SEED_VERSION;
    userState.settings.scheduleSeededAt = seededAt;
    invalidateRuntimeScheduleIndex(userState);
  } else if (allowRepair) {
    // Repair missing topicAssignments (e.g. corrupted store recovered from backup)
    const repairedMissingAssignments = repairMissingTopicAssignments(userState.schedule, seededAt);
    const repairedAnchoredAssignments = repairAnchoredTopicAssignments(userState.schedule, seededAt);
    if (repairedMissingAssignments > 0 || repairedAnchoredAssignments > 0) {
      invalidateRuntimeScheduleIndex(userState);
    }
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
    originalDayNumber: null,
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

// ---------------------------------------------------------------------------
// Legacy → canonical schedule layout migration
// ---------------------------------------------------------------------------

function inferOriginalDayNumber(
  day: UserState["schedule"]["days"][string],
  dayOneDate: string | null,
): number | null {
  if (day.originalDayNumber !== null) {
    return day.originalDayNumber;
  }

  if (!dayOneDate) {
    return null;
  }

  const inferred = diffDays(day.originalMappedDate, dayOneDate) + 1;
  if (!Number.isFinite(inferred) || inferred <= 0) {
    return null;
  }

  return inferred;
}

export function detectLegacyScheduleLayout(userState: UserState): boolean {
  let maxWorkbookDay = 0;

  for (const day of Object.values(userState.schedule.days)) {
    if (day.isExtensionDay) {
      if (day.originalDayNumber !== null) {
        return true;
      }
      continue;
    }

    const inferredOriginalDayNumber = inferOriginalDayNumber(day, userState.settings.dayOneDate);
    if (inferredOriginalDayNumber !== null) {
      maxWorkbookDay = Math.max(maxWorkbookDay, inferredOriginalDayNumber);
    }

    // Missing originalDayNumber on non-extension rows indicates
    // an old/corrupted layout that should be normalized.
    if (day.originalDayNumber === null) {
      return true;
    }

    if (inferredOriginalDayNumber !== null && day.dayNumber !== inferredOriginalDayNumber) {
      return true;
    }
  }

  for (const day of Object.values(userState.schedule.days)) {
    // Canonical layout reserves workbook span for non-extension rows.
    if (day.isExtensionDay && maxWorkbookDay > 0 && day.dayNumber <= maxWorkbookDay) {
      return true;
    }
  }

  return false;
}

/**
 * Migrate a legacy schedule layout to the canonical layout where:
 * - Workbook days occupy dayNumber 1–N (matching their originalDayNumber)
 * - Extension days are renumbered sequentially from N+1
 *
 * Builds a remapTable and applies it across all schedule data structures.
 * Idempotent: if layout is already canonical, this is a no-op.
 *
 * Returns true if any changes were made.
 */
export function migrateToCanonicalLayout(userState: UserState): boolean {
  if (!detectLegacyScheduleLayout(userState)) {
    return false;
  }

  const now = new Date().toISOString();
  const schedule = userState.schedule;

  // Build remap table: old dayNumber → new dayNumber
  const remapTable = new Map<number, number>();
  const workbookDays: typeof schedule.days[string][] = [];
  const extensionDays: typeof schedule.days[string][] = [];

  for (const day of Object.values(schedule.days)) {
    if (day.isExtensionDay) {
      extensionDays.push(day);
    } else {
      if (day.originalDayNumber === null) {
        const inferred = inferOriginalDayNumber(day, userState.settings.dayOneDate);
        day.originalDayNumber = inferred ?? day.dayNumber;
        if (userState.settings.dayOneDate) {
          day.originalMappedDate = addDaysToDateOnly(userState.settings.dayOneDate, day.originalDayNumber - 1);
        }
      }
      workbookDays.push(day);
    }
  }

  // Workbook days go back to their originalDayNumber
  for (const day of workbookDays) {
    if (day.originalDayNumber !== null && day.dayNumber !== day.originalDayNumber) {
      remapTable.set(day.dayNumber, day.originalDayNumber);
    }
  }

  // Find the highest workbook day number (typically 100)
  const maxWorkbookDay = Math.max(
    ...workbookDays.map((d) => d.originalDayNumber ?? d.dayNumber),
    0,
  );

  // Extension days get sequential numbers from maxWorkbookDay + 1
  extensionDays.sort((a, b) => a.dayNumber - b.dayNumber);
  for (let i = 0; i < extensionDays.length; i++) {
    const newDay = maxWorkbookDay + 1 + i;
    if (extensionDays[i]!.dayNumber !== newDay) {
      remapTable.set(extensionDays[i]!.dayNumber, newDay);
    }
  }

  if (remapTable.size === 0) {
    return false;
  }

  const remap = (dayNumber: number): number => remapTable.get(dayNumber) ?? dayNumber;

  // --- 1) Remap schedule.days ---
  const newDays: Record<string, typeof schedule.days[string]> = {};
  for (const day of Object.values(schedule.days)) {
    const oldDay = day.dayNumber;
    day.dayNumber = remap(oldDay);
    // Recalculate mappedDate for workbook days from their canonical position
    if (!day.isExtensionDay && day.originalDayNumber !== null) {
      const dayOneDate = userState.settings.dayOneDate;
      if (dayOneDate) {
        day.mappedDate = addDaysToDateOnly(dayOneDate, day.dayNumber - 1);
      }
    }
    // Extension days: recalculate from the last workbook day's mapped date
    if (day.isExtensionDay) {
      const dayOneDate = userState.settings.dayOneDate;
      if (dayOneDate) {
        day.mappedDate = addDaysToDateOnly(dayOneDate, day.dayNumber - 1);
        day.originalMappedDate = day.mappedDate;
      }
    }
    day.updatedAt = now;
    newDays[String(day.dayNumber)] = day;
  }
  schedule.days = newDays;

  // --- 2) Remap schedule.blocks ---
  const newBlocks: Record<string, typeof schedule.blocks[string]> = {};
  for (const block of Object.values(schedule.blocks)) {
    block.dayNumber = remap(block.dayNumber);
    block.updatedAt = now;
    newBlocks[`${block.dayNumber}:${block.blockKey}`] = block;
  }
  schedule.blocks = newBlocks;

  // --- 3) Remap topicAssignments ---
  for (const topic of Object.values(schedule.topicAssignments)) {
    topic.dayNumber = remap(topic.dayNumber);
    if (topic.originalDayNumber !== null) {
      topic.originalDayNumber = remap(topic.originalDayNumber);
    }
    if (topic.referenceDayNumber !== null) {
      topic.referenceDayNumber = remap(topic.referenceDayNumber);
    }
    topic.updatedAt = now;
  }

  // --- 4) Remap backlogItems ---
  for (const item of Object.values(userState.backlogItems)) {
    item.originalDay = remap(item.originalDay);
    if (item.suggestedDay !== null) {
      item.suggestedDay = remap(item.suggestedDay);
    }
    if (item.rescheduledToDay !== null) {
      item.rescheduledToDay = remap(item.rescheduledToDay);
    }
    item.updatedAt = now;
  }

  // --- 5) Remap revisionCompletions ---
  for (const rc of Object.values(userState.revisionCompletions)) {
    rc.sourceDay = remap(rc.sourceDay);
  }

  // --- 6) Remap phaseConfig (currentStartDay, currentEndDay only) ---
  for (const phase of Object.values(schedule.phaseConfig)) {
    phase.currentStartDay = remap(phase.currentStartDay);
    phase.currentEndDay = remap(phase.currentEndDay);
    // Extend Phase 3 end to cover extension days
    if (phase.phaseNumber === 3 && extensionDays.length > 0) {
      const maxExtDay = maxWorkbookDay + extensionDays.length;
      if (phase.currentEndDay < maxExtDay) {
        phase.currentEndDay = maxExtDay;
      }
    }
    phase.updatedAt = now;
  }

  // DO NOT remap: gtLogs (store display day numbers), mcqLogs (dates), weeklySummaries (dates)

  // Schedule shape changed without changing mapping inputs.
  // Force one mapping recompute so mapped dates/hidden flags stay coherent.
  mappingFingerprintCache.delete(schedule);
  applyScheduleMappingsFromSettings(schedule, userState.settings, now);

  invalidateRuntimeScheduleIndex(userState);

  return true;
}
