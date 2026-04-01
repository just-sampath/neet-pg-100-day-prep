import { getStaticReferenceData } from "@/lib/data/reference-data";
import { getMappedDate, getRuntimeDayNumberForDisplayDay } from "@/lib/domain/schedule";
import type { GtPlanEntry } from "@/lib/domain/schedule-data-types";
import type {
  AppSettings,
  GtDevice,
  GtLog,
  GtOverallFeeling,
  GtSectionBreakdown,
  GtTimeLostCode,
  RuntimeReferenceData,
  UserState,
} from "@/lib/domain/types";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { toDateOnly } from "@/lib/utils/date";

export const GT_DEVICE_OPTIONS: Array<{ value: GtDevice; label: string }> = [
  { value: "laptop", label: "Laptop" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
];

export const GT_FEELING_OPTIONS: Array<{ value: GtOverallFeeling; label: string; accent: "green" | "yellow" | "red" | "neutral" }> = [
  { value: "calm", label: "Calm", accent: "green" },
  { value: "rushed", label: "Rushed", accent: "yellow" },
  { value: "blank", label: "Blank", accent: "red" },
  { value: "fatigued", label: "Fatigued", accent: "neutral" },
  { value: "overthinking", label: "Overthinking", accent: "yellow" },
];

export const GT_SECTION_KEYS = ["A", "B", "C", "D", "E"] as const;
export type GtSectionKey = (typeof GT_SECTION_KEYS)[number];

export const GT_TIME_LOST_OPTIONS: Array<{ value: GtTimeLostCode; label: string }> = [
  { value: "image", label: "Image" },
  { value: "lengthy_clinical", label: "Lengthy clinical" },
  { value: "biostats", label: "Biostats" },
  { value: "algorithms", label: "Algorithms" },
];

const DEVICE_LOOKUP = new Set<GtDevice>(GT_DEVICE_OPTIONS.map((option) => option.value));
const FEELING_LOOKUP = new Set<GtOverallFeeling>(GT_FEELING_OPTIONS.map((option) => option.value));
const TIME_LOST_LOOKUP = new Set<GtTimeLostCode>(GT_TIME_LOST_OPTIONS.map((option) => option.value));

type ValidGtDraft = {
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
};

function isUserState(value: AppSettings | UserState): value is UserState {
  return typeof value === "object" && value !== null && "schedule" in value;
}

function getReferenceData(referenceData?: RuntimeReferenceData) {
  if (referenceData) {
    return referenceData;
  }
  if (getRuntimeMode() === "supabase") {
    throw new Error("Runtime reference data is required in Supabase mode.");
  }
  return getStaticReferenceData();
}

export type GtScheduleContextItem = GtPlanEntry & {
  label: string;
  mappedDate: string | null;
  isToday: boolean;
  isUpcoming: boolean;
};

export type GtScoreTrendPoint = {
  label: string;
  score: number;
  accuracy: number | null;
  air: number | null;
};

export type GtSectionPatternPoint = {
  section: GtSectionKey;
  notEnoughTime: number;
  panic: number;
  guessedTooMuch: number;
};

export type GtWrapperTrendPoint = {
  label: string;
  knowledge: number | null;
  behaviour: number | null;
  unsureRight: number | null;
};

export type GtComparisonSummary = {
  latestLabel: string | null;
  previousLabel: string | null;
  scoreDelta: number | null;
  correctDelta: number | null;
  wrongDelta: number | null;
  unattemptedDelta: number | null;
  airDelta: number | null;
  airMetricKind: "air" | "percentile" | null;
};

export function emptyGtSectionBreakdown(): GtSectionBreakdown {
  return {
    timeEnough: null,
    panicStarted: null,
    guessedTooMuch: null,
    timeLostOn: [],
  };
}

function asTrimmedString(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function isDateOnly(value: string | null | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function parseNullableInteger(value: string | null | undefined) {
  const trimmed = asTrimmedString(value);
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeSubjects(values: Array<string | null | undefined>, referenceData?: RuntimeReferenceData) {
  const allowed = new Set(getReferenceData(referenceData).scheduleData.subjectStrategy.subjects.map((entry) => entry.subjectName.trim()));
  const picked = new Set<string>();

  for (const raw of values) {
    const tokens = (raw ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const match = [...allowed].find((entry) => entry.toLowerCase() === token.toLowerCase());
      if (match) {
        picked.add(match);
      }
    }
  }

  return [...picked];
}

function normalizeTimeLost(values: Array<string | null | undefined>) {
  const picked = new Set<GtTimeLostCode>();

  for (const raw of values) {
    const tokens = (raw ?? "")
      .split(",")
      .map((token) => token.trim().toLowerCase().replace(/[\s-]+/gu, "_"))
      .filter(Boolean);

    for (const token of tokens) {
      if (TIME_LOST_LOOKUP.has(token as GtTimeLostCode)) {
        picked.add(token as GtTimeLostCode);
      }
    }
  }

  return [...picked];
}

function normalizeBooleanChoice(value: string | null | undefined) {
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  return null;
}

function normalizeDevice(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return DEVICE_LOOKUP.has(normalized as GtDevice) ? (normalized as GtDevice) : null;
}

function normalizeFeeling(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return FEELING_LOOKUP.has(normalized as GtOverallFeeling) ? (normalized as GtOverallFeeling) : null;
}

function normalizeSection(section: GtSectionBreakdown | Record<string, unknown> | null | undefined): GtSectionBreakdown {
  const candidate = section ?? {};
  return {
    timeEnough: typeof candidate.timeEnough === "boolean" ? candidate.timeEnough : null,
    panicStarted: typeof candidate.panicStarted === "boolean" ? candidate.panicStarted : null,
    guessedTooMuch: typeof candidate.guessedTooMuch === "boolean" ? candidate.guessedTooMuch : null,
    timeLostOn: normalizeTimeLost(Array.isArray(candidate.timeLostOn) ? (candidate.timeLostOn as string[]) : []),
  };
}

function normalizeRecurringTopics(raw: string | null | undefined) {
  const seen = new Set<string>();
  const topics: string[] = [];

  for (const token of (raw ?? "")
    .split(/[\n,]/u)
    .map((entry) => entry.trim().replace(/\s+/gu, " "))
    .filter(Boolean)) {
    const key = token.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    topics.push(token);
    if (topics.length === 3) {
      break;
    }
  }

  return topics;
}

function serializeRecurringTopics(values: string[]) {
  return values.length ? values.join(", ") : null;
}

function parseAirMetric(value: string | null) {
  const trimmed = asTrimmedString(value);
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/\d+(\.\d+)?/u);
  if (!match) {
    return null;
  }

  const numericValue = Number(match[0]);
  const lower = trimmed.toLowerCase();
  let kind: "air" | "percentile" | null = null;

  if (lower.includes("air")) {
    kind = "air";
  } else if (lower.includes("%") || lower.includes("percentile")) {
    kind = "percentile";
  } else if (numericValue <= 100) {
    kind = "percentile";
  } else {
    kind = "air";
  }

  return {
    value: numericValue,
    kind,
  };
}

export function normalizeStoredGtLog(log: GtLog): GtLog {
  return {
    ...log,
    gtNumber: asTrimmedString(log.gtNumber) ?? "GT",
    gtDate: isDateOnly(log.gtDate) ? log.gtDate : toDateOnly(new Date()),
    dayNumber: typeof log.dayNumber === "number" && log.dayNumber > 0 ? log.dayNumber : null,
    score: typeof log.score === "number" ? log.score : null,
    correct: typeof log.correct === "number" ? log.correct : null,
    wrong: typeof log.wrong === "number" ? log.wrong : null,
    unattempted: typeof log.unattempted === "number" ? log.unattempted : null,
    airPercentile: asTrimmedString(log.airPercentile),
    device: normalizeDevice(log.device),
    attemptedLive: typeof log.attemptedLive === "boolean" ? log.attemptedLive : null,
    overallFeeling: normalizeFeeling(log.overallFeeling),
    sectionA: normalizeSection(log.sectionA),
    sectionB: normalizeSection(log.sectionB),
    sectionC: normalizeSection(log.sectionC),
    sectionD: normalizeSection(log.sectionD),
    sectionE: normalizeSection(log.sectionE),
    errorTypes: asTrimmedString(log.errorTypes),
    recurringTopics: serializeRecurringTopics(normalizeRecurringTopics(log.recurringTopics)),
    weakestSubjects: normalizeSubjects(log.weakestSubjects ?? []),
    knowledgeVsBehaviour:
      typeof log.knowledgeVsBehaviour === "number" && log.knowledgeVsBehaviour >= 0 && log.knowledgeVsBehaviour <= 100
        ? log.knowledgeVsBehaviour
        : null,
    unsureRightCount: typeof log.unsureRightCount === "number" && log.unsureRightCount >= 0 ? log.unsureRightCount : null,
    changeBeforeNextGt: asTrimmedString(log.changeBeforeNextGt),
  };
}

export function validateGtDraft(
  input: {
    gtNumber?: string | null;
    gtDate?: string | null;
    dayNumber?: string | null;
    score?: string | null;
    correct?: string | null;
    wrong?: string | null;
    unattempted?: string | null;
    airPercentile?: string | null;
    device?: string | null;
    attemptedLive?: string | null;
    overallFeeling?: string | null;
    errorTypes?: string | null;
    recurringTopics?: string | null;
    weakestSubjects?: Array<string | null | undefined>;
    knowledgeVsBehaviour?: string | null;
    unsureRightCount?: string | null;
    changeBeforeNextGt?: string | null;
    sectionA?: Record<string, string | string[] | null | undefined>;
    sectionB?: Record<string, string | string[] | null | undefined>;
    sectionC?: Record<string, string | string[] | null | undefined>;
    sectionD?: Record<string, string | string[] | null | undefined>;
    sectionE?: Record<string, string | string[] | null | undefined>;
  },
  fallbackDate: string,
): { ok: true; value: ValidGtDraft } | { ok: false; error: string } {
  const gtNumber = asTrimmedString(input.gtNumber);
  if (!gtNumber) {
    return { ok: false, error: "GT number is required." };
  }

  const dayNumber = parseNullableInteger(input.dayNumber);
  if (input.dayNumber && asTrimmedString(input.dayNumber) && dayNumber === null) {
    return { ok: false, error: "Day number must be a whole number." };
  }

  const score = parseNullableInteger(input.score);
  const correct = parseNullableInteger(input.correct);
  const wrong = parseNullableInteger(input.wrong);
  const unattempted = parseNullableInteger(input.unattempted);

  if (
    (input.score && asTrimmedString(input.score) && score === null) ||
    (input.correct && asTrimmedString(input.correct) && correct === null) ||
    (input.wrong && asTrimmedString(input.wrong) && wrong === null) ||
    (input.unattempted && asTrimmedString(input.unattempted) && unattempted === null)
  ) {
    return { ok: false, error: "Score, correct, wrong, and unattempted must use whole numbers." };
  }

  const knowledgeVsBehaviour = parseNullableInteger(input.knowledgeVsBehaviour);
  if (
    input.knowledgeVsBehaviour &&
    asTrimmedString(input.knowledgeVsBehaviour) &&
    (knowledgeVsBehaviour === null || knowledgeVsBehaviour < 0 || knowledgeVsBehaviour > 100)
  ) {
    return { ok: false, error: "Knowledge vs behaviour must stay between 0 and 100." };
  }

  const unsureRightCount = parseNullableInteger(input.unsureRightCount);
  if (input.unsureRightCount && asTrimmedString(input.unsureRightCount) && unsureRightCount === null) {
    return { ok: false, error: "Unsure-right count must be a whole number." };
  }

  const section = (raw: Record<string, string | string[] | null | undefined> | undefined): GtSectionBreakdown => ({
    timeEnough: normalizeBooleanChoice(typeof raw?.timeEnough === "string" ? raw.timeEnough : null),
    panicStarted: normalizeBooleanChoice(typeof raw?.panicStarted === "string" ? raw.panicStarted : null),
    guessedTooMuch: normalizeBooleanChoice(typeof raw?.guessedTooMuch === "string" ? raw.guessedTooMuch : null),
    timeLostOn: normalizeTimeLost(
      Array.isArray(raw?.timeLostOn) ? raw!.timeLostOn : typeof raw?.timeLostOn === "string" ? [raw.timeLostOn] : [],
    ),
  });

  return {
    ok: true,
    value: {
      gtNumber,
      gtDate: isDateOnly(input.gtDate) ? input.gtDate! : fallbackDate,
      dayNumber,
      score,
      correct,
      wrong,
      unattempted,
      airPercentile: asTrimmedString(input.airPercentile),
      device: normalizeDevice(input.device),
      attemptedLive: normalizeBooleanChoice(input.attemptedLive),
      overallFeeling: normalizeFeeling(input.overallFeeling),
      sectionA: section(input.sectionA),
      sectionB: section(input.sectionB),
      sectionC: section(input.sectionC),
      sectionD: section(input.sectionD),
      sectionE: section(input.sectionE),
      errorTypes: asTrimmedString(input.errorTypes),
      recurringTopics: serializeRecurringTopics(normalizeRecurringTopics(input.recurringTopics)),
      weakestSubjects: normalizeSubjects(input.weakestSubjects ?? []),
      knowledgeVsBehaviour,
      unsureRightCount,
      changeBeforeNextGt: asTrimmedString(input.changeBeforeNextGt),
    },
  };
}

function getGtLabel(item: GtPlanEntry) {
  const gtMatch = item.purposeRaw.match(/^GT[\s-]*(\d+)/u);
  if (gtMatch) {
    return `GT-${gtMatch[1]}`;
  }
  if (item.testType === "Diagnostic 100Q") {
    return "Diagnostic 100Q";
  }
  if (item.testType === "120Q half-sim") {
    return "120Q half-simulation";
  }
  return item.purposeRaw;
}

export function getMappedGtSchedule(
  settings: AppSettings,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem[];
export function getMappedGtSchedule(
  userState: UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem[];
export function getMappedGtSchedule(
  stateOrSettings: AppSettings | UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem[];
export function getMappedGtSchedule(
  stateOrSettings: AppSettings | UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem[] {
  return getReferenceData(referenceData).scheduleData.gtTestPlan.tests.map((item) => {
    const runtimeDayNumber = isUserState(stateOrSettings)
      ? getRuntimeDayNumberForDisplayDay(item.dayNumber, stateOrSettings) ?? item.dayNumber
      : item.dayNumber;
    const mappedDate = isUserState(stateOrSettings)
      ? getMappedDate(runtimeDayNumber, stateOrSettings)
      : getMappedDate(item.dayNumber, stateOrSettings);
    return {
      ...item,
      label: getGtLabel(item),
      mappedDate,
      isToday: mappedDate === todayDate,
      isUpcoming: mappedDate !== null && mappedDate >= todayDate,
    };
  });
}

export function getSuggestedGtPlanItem(
  settings: AppSettings,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem | null;
export function getSuggestedGtPlanItem(
  userState: UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem | null;
export function getSuggestedGtPlanItem(
  stateOrSettings: AppSettings | UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem | null;
export function getSuggestedGtPlanItem(
  stateOrSettings: AppSettings | UserState,
  todayDate: string,
  referenceData?: RuntimeReferenceData,
): GtScheduleContextItem | null {
  const mappedPlan = getMappedGtSchedule(stateOrSettings, todayDate, referenceData);
  return mappedPlan.find((item) => item.isToday) ?? mappedPlan.find((item) => item.isUpcoming) ?? mappedPlan.at(-1) ?? null;
}

function scoreAccuracy(log: GtLog) {
  if (log.correct === null || log.wrong === null || log.unattempted === null) {
    return null;
  }
  const attempted = log.correct + log.wrong;
  if (attempted <= 0) {
    return null;
  }
  return Number(((log.correct / attempted) * 100).toFixed(1));
}

export function buildGtScoreTrend(logs: GtLog[]): GtScoreTrendPoint[] {
  return [...logs]
    .filter((log): log is GtLog & { score: number } => log.score !== null)
    .toSorted((left, right) => left.gtDate.localeCompare(right.gtDate))
    .map((log) => ({
      label: log.gtNumber,
      score: log.score,
      accuracy: scoreAccuracy(log),
      air: parseAirMetric(log.airPercentile)?.value ?? null,
    }));
}

export function buildGtSectionPatterns(logs: GtLog[]): GtSectionPatternPoint[] {
  return GT_SECTION_KEYS.map((sectionKey) => {
    const sectionName = `section${sectionKey}` as const;
    let notEnoughTime = 0;
    let panic = 0;
    let guessedTooMuch = 0;

    for (const log of logs) {
      const section = log[sectionName];
      if (section.timeEnough === false) {
        notEnoughTime += 1;
      }
      if (section.panicStarted === true) {
        panic += 1;
      }
      if (section.guessedTooMuch === true) {
        guessedTooMuch += 1;
      }
    }

    return {
      section: sectionKey,
      notEnoughTime,
      panic,
      guessedTooMuch,
    };
  });
}

export function buildGtSectionTimeLostSummary(logs: GtLog[]) {
  return GT_SECTION_KEYS.map((sectionKey) => {
    const counts = new Map<GtTimeLostCode, number>();
    const sectionName = `section${sectionKey}` as const;

    for (const log of logs) {
      for (const code of log[sectionName].timeLostOn) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }

    return {
      section: sectionKey,
      reasons: [...counts.entries()]
        .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([code, count]) => ({
          code,
          label: GT_TIME_LOST_OPTIONS.find((option) => option.value === code)?.label ?? code,
          count,
        })),
    };
  });
}

export function buildGtWrapperTrend(logs: GtLog[]): GtWrapperTrendPoint[] {
  return [...logs]
    .toSorted((left, right) => left.gtDate.localeCompare(right.gtDate))
    .map((log) => ({
      label: log.gtNumber,
      knowledge: log.knowledgeVsBehaviour,
      behaviour: log.knowledgeVsBehaviour === null ? null : 100 - log.knowledgeVsBehaviour,
      unsureRight: log.unsureRightCount,
    }));
}

export function buildGtComparisonSummary(logs: GtLog[]): GtComparisonSummary {
  const sorted = [...logs].toSorted(
    (left, right) => left.gtDate.localeCompare(right.gtDate) || left.createdAt.localeCompare(right.createdAt),
  );
  const latest = sorted.at(-1) ?? null;
  const previous = sorted.at(-2) ?? null;
  const latestAirMetric = parseAirMetric(latest?.airPercentile ?? null);
  const previousAirMetric = parseAirMetric(previous?.airPercentile ?? null);
  const airMetricKind =
    latestAirMetric && previousAirMetric && latestAirMetric.kind === previousAirMetric.kind ? latestAirMetric.kind : null;

  return {
    latestLabel: latest?.gtNumber ?? null,
    previousLabel: previous?.gtNumber ?? null,
    scoreDelta: latest && previous && latest.score !== null && previous.score !== null ? latest.score - previous.score : null,
    correctDelta:
      latest && previous && latest.correct !== null && previous.correct !== null ? latest.correct - previous.correct : null,
    wrongDelta: latest && previous && latest.wrong !== null && previous.wrong !== null ? latest.wrong - previous.wrong : null,
    unattemptedDelta:
      latest && previous && latest.unattempted !== null && previous.unattempted !== null
        ? latest.unattempted - previous.unattempted
        : null,
    airDelta:
      airMetricKind && latestAirMetric && previousAirMetric
        ? Number((latestAirMetric.value - previousAirMetric.value).toFixed(1))
        : null,
    airMetricKind,
  };
}

export function buildGtWeaknessPatterns(logs: GtLog[], limit = 6) {
  const subjectCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();

  for (const log of logs) {
    for (const subject of log.weakestSubjects) {
      subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
    }

    for (const topic of normalizeRecurringTopics(log.recurringTopics)) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  return {
    subjects: [...subjectCounts.entries()]
      .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([label, count]) => ({ label, count })),
    topics: [...topicCounts.entries()]
      .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([label, count]) => ({ label, count })),
  };
}

export function buildGtDashboardSummary(logs: GtLog[]) {
  const sorted = [...logs].toSorted((left, right) => left.gtDate.localeCompare(right.gtDate));
  const latest = sorted.at(-1) ?? null;

  return {
    totalLogs: logs.length,
    latestGt: latest?.gtNumber ?? null,
    latestScore: latest?.score ?? null,
    latestAir: latest?.airPercentile ?? null,
    avgKnowledge:
      logs.length && logs.some((log) => log.knowledgeVsBehaviour !== null)
        ? Number(
          (
            logs.filter((log) => log.knowledgeVsBehaviour !== null).reduce((sum, log) => sum + (log.knowledgeVsBehaviour ?? 0), 0) /
            logs.filter((log) => log.knowledgeVsBehaviour !== null).length
          ).toFixed(1),
        )
        : null,
  };
}
