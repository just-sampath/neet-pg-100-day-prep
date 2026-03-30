import type { BacklogQueueSummary, WeeklySummary } from "@/lib/domain/types";

export const WEEKLY_AUTOMATION_MINUTES = 23 * 60 + 30;

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asSummaryList(
  value: unknown,
): Array<{
  label: string;
  count: number;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const label = typeof entry.label === "string" ? entry.label : "";
    const count = asNumber((entry as { count?: unknown }).count, 0);
    return label ? [{ label, count }] : [];
  });
}

function asBacklogSummary(value: unknown): BacklogQueueSummary {
  if (!value || typeof value !== "object") {
    return {
      totalPending: 0,
      fromMissed: 0,
      fromYellowRed: 0,
      fromOverrun: 0,
      fromEndOfDay: 0,
      fromOverrun2245: 0,
      phaseClosed: 0,
    };
  }

  return {
    totalPending: asNumber((value as { totalPending?: unknown }).totalPending, 0),
    fromMissed: asNumber((value as { fromMissed?: unknown }).fromMissed, 0),
    fromYellowRed: asNumber((value as { fromYellowRed?: unknown }).fromYellowRed, 0),
    fromOverrun: asNumber((value as { fromOverrun?: unknown }).fromOverrun, 0),
    fromEndOfDay: asNumber((value as { fromEndOfDay?: unknown }).fromEndOfDay, 0),
    fromOverrun2245: asNumber((value as { fromOverrun2245?: unknown }).fromOverrun2245, 0),
    phaseClosed: asNumber((value as { phaseClosed?: unknown }).phaseClosed, 0),
  };
}

function asSubjects(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => (typeof entry === "string" && entry ? [entry] : []));
}

export function normalizeStoredWeeklySummary(summary: WeeklySummary): WeeklySummary {
  const coveredThroughDate =
    typeof summary.coveredThroughDate === "string" && summary.coveredThroughDate ? summary.coveredThroughDate : summary.weekEndDate;
  const generatedAt =
    typeof summary.generatedAt === "string" && summary.generatedAt ? summary.generatedAt : `${coveredThroughDate}T00:00:00.000Z`;
  const blocksCompleted = asNumber(summary.blocksCompleted, 0);
  const blocksPlanned = asNumber(summary.blocksPlanned, 0);
  const morningRevisionCompleted = asNumber(summary.morningRevisionCompleted, 0);
  const morningRevisionPlanned = asNumber(summary.morningRevisionPlanned, 0);
  const backlogSummary = asBacklogSummary(summary.backlogSummary);
  const topWrongSubjects = asSummaryList(summary.topWrongSubjects);
  const topCauseCodes = asSummaryList(summary.topCauseCodes);
  const overrunBlocks = asSummaryList(summary.overrunBlocks);
  const overrunBlockCount =
    typeof summary.overrunBlockCount === "number" ? summary.overrunBlockCount : overrunBlocks.reduce((sum, entry) => sum + entry.count, 0);
  const daysBehind = asNumber(summary.daysBehind, 0);
  const bufferDaysUsed = asNumber(summary.bufferDaysUsed, 0);
  const scheduleStatus = getWeeklyScheduleStatus(daysBehind, bufferDaysUsed);

  return {
    ...summary,
    coveredThroughDate,
    isPartialWeek: typeof summary.isPartialWeek === "boolean" ? summary.isPartialWeek : coveredThroughDate < summary.weekEndDate,
    blocksCompleted,
    blocksPlanned,
    blocksCompletedRate:
      typeof summary.blocksCompletedRate === "number"
        ? summary.blocksCompletedRate
        : blocksPlanned > 0
          ? Number(((blocksCompleted / blocksPlanned) * 100).toFixed(1))
          : null,
    greenDays: asNumber(summary.greenDays, 0),
    yellowDays: asNumber(summary.yellowDays, 0),
    redDays: asNumber(summary.redDays, 0),
    morningRevisionCompleted,
    morningRevisionPlanned,
    morningRevisionCompletionRate:
      typeof summary.morningRevisionCompletionRate === "number"
        ? summary.morningRevisionCompletionRate
        : morningRevisionPlanned > 0
          ? Number(((morningRevisionCompleted / morningRevisionPlanned) * 100).toFixed(1))
          : null,
    revisionOverflowDays: asNumber(summary.revisionOverflowDays, 0),
    revisionCatchUpCount: asNumber(summary.revisionCatchUpCount, 0),
    revisionRestudyCount: asNumber(summary.revisionRestudyCount, 0),
    overrunBlockCount,
    overrunBlocks,
    totalMcqsSolved: asNumber(summary.totalMcqsSolved, 0),
    overallAccuracy: typeof summary.overallAccuracy === "number" ? summary.overallAccuracy : null,
    accuracyVsPrevious: summary.accuracyVsPrevious ?? "stable",
    topWrongSubjects,
    topCauseCodes,
    gtNumber: summary.gtNumber ?? null,
    gtScore: typeof summary.gtScore === "number" ? summary.gtScore : null,
    gtAir: summary.gtAir ?? null,
    gtWrapperSummary: summary.gtWrapperSummary ?? null,
    scheduleStatusKind: summary.scheduleStatusKind ?? scheduleStatus.kind,
    scheduleStatus: summary.scheduleStatus ?? scheduleStatus.label,
    daysBehind,
    backlogCount: asNumber(summary.backlogCount, backlogSummary.totalPending),
    backlogSummary,
    bufferDaysUsed,
    subjectsStudied: asSubjects(summary.subjectsStudied).sort((left, right) => left.localeCompare(right)),
    generatedAt,
  };
}

export function findWeeklySummaryByWeekKey(summaries: Record<string, WeeklySummary>, weekKey: string): WeeklySummary | null {
  return Object.values(summaries)
    .filter((entry) => entry.weekKey === weekKey)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
    .at(0) ?? null;
}

export function getWeeklyScheduleStatus(daysBehind: number, bufferDaysUsed: number) {
  if (daysBehind > 0) {
    return {
      kind: "days_behind" as const,
      label: `${daysBehind} ${daysBehind === 1 ? "day" : "days"} behind`,
    };
  }

  if (bufferDaysUsed > 0) {
    return {
      kind: "buffer_used" as const,
      label: `${bufferDaysUsed} ${bufferDaysUsed === 1 ? "buffer day" : "buffer days"} used`,
    };
  }

  return {
    kind: "on_track" as const,
    label: "On track",
  };
}
