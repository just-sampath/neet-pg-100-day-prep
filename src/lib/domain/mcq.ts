import { getStaticReferenceData } from "@/lib/data/reference-data";
import type {
  McqBulkLog,
  McqCauseCode,
  McqFixCode,
  McqItemLog,
  McqPriority,
  McqResult,
  McqTag,
  RuntimeReferenceData,
  UserState,
} from "@/lib/domain/types";
import { getRuntimeMode } from "@/lib/runtime/mode";
import { toDateOnly } from "@/lib/utils/date";

export const MCQ_RESULT_OPTIONS: Array<{ value: McqResult; label: string }> = [
  { value: "right", label: "Right" },
  { value: "wrong", label: "Wrong" },
  { value: "guessed_right", label: "Guessed Right" },
];

export const MCQ_CAUSE_CODE_OPTIONS: Array<{ value: McqCauseCode; label: string }> = [
  { value: "R", label: "Recall" },
  { value: "C", label: "Concept" },
  { value: "A", label: "Application" },
  { value: "D", label: "Discriminator" },
  { value: "I", label: "Interpretation" },
  { value: "M", label: "Management / Algorithm" },
  { value: "V", label: "Visual / Image" },
  { value: "B", label: "Biostats / Formula" },
  { value: "T", label: "Time / Panic" },
  { value: "K", label: "Careless Mark" },
];

export const MCQ_PRIORITY_OPTIONS: Array<{ value: McqPriority; label: string }> = [
  { value: "P1", label: "Must fix" },
  { value: "P2", label: "Important" },
  { value: "P3", label: "If repeats" },
];

export const MCQ_FIX_CODE_OPTIONS: Array<{ value: McqFixCode; label: string }> = [
  { value: "N", label: "Notes repair" },
  { value: "Q20", label: "20 focused MCQs" },
  { value: "Q40M", label: "40 mixed MCQs" },
  { value: "A1", label: "Algorithm once" },
  { value: "A3", label: "Algorithm 3 days" },
  { value: "T2", label: "Compare table" },
  { value: "I10", label: "Image drill 10" },
  { value: "F5", label: "5 formula recalls" },
  { value: "E", label: "Self-explain" },
  { value: "AI", label: "AI quiz" },
  { value: "G", label: "GT behaviour fix" },
];

export const MCQ_TAG_OPTIONS: McqTag[] = [
  "protocol",
  "volatile",
  "management",
  "image",
  "emergency",
  "screening",
  "staging",
];

const CAUSE_LOOKUP = new Set<McqCauseCode>(MCQ_CAUSE_CODE_OPTIONS.map((option) => option.value));
const PRIORITY_LOOKUP = new Set<McqPriority>(MCQ_PRIORITY_OPTIONS.map((option) => option.value));
const FIX_LOOKUP = new Set<McqFixCode>(MCQ_FIX_CODE_OPTIONS.map((option) => option.value));
const TAG_LOOKUP = new Set<McqTag>(MCQ_TAG_OPTIONS);
const RESULT_LOOKUP = new Set<McqResult>(MCQ_RESULT_OPTIONS.map((option) => option.value));

function getReferenceData(referenceData?: RuntimeReferenceData) {
  if (referenceData) {
    return referenceData;
  }
  if (getRuntimeMode() === "supabase") {
    throw new Error("Runtime reference data is required in Supabase mode.");
  }
  return getStaticReferenceData();
}

function getSubjectOptions(referenceData?: RuntimeReferenceData) {
  return [...getReferenceData(referenceData).scheduleData.subjectStrategy.subjects]
    .map((entry) => entry.subjectName.trim())
    .filter(Boolean)
    .toSorted((left, right) => left.localeCompare(right));
}

function getSubjectLookup(referenceData?: RuntimeReferenceData) {
  return new Map(getSubjectOptions(referenceData).map((subject) => [subject.toLowerCase(), subject] as const));
}

export type McqTrendPoint = {
  label: string;
  attempted: number;
  correct: number;
  wrong: number;
  guessedRight: number;
  accuracy: number;
};

export type McqBreakdownPoint = {
  label: "Right" | "Guessed Right" | "Wrong";
  value: number;
};

export type McqSubjectAccuracyPoint = {
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number;
};

export type McqDashboardSummary = {
  totalSolved: number;
  totalCorrect: number;
  totalWrong: number;
  guessedRight: number;
  detailedEntries: number;
  accuracy: number | null;
};

type McqBulkDraft = {
  entryDate: string;
  totalAttempted: number;
  correct: number;
  wrong: number;
  subject: string | null;
  source: string | null;
};

type McqItemDraft = {
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
};

export function normalizeStoredMcqBulkLog(log: McqBulkLog, referenceData?: RuntimeReferenceData): McqBulkLog {
  return {
    ...log,
    subject: normalizeMcqSubject(log.subject, referenceData),
    source: asTrimmedString(log.source),
  };
}

export function normalizeStoredMcqItemLog(log: McqItemLog, referenceData?: RuntimeReferenceData): McqItemLog {
  return {
    ...log,
    result: normalizeMcqResult(log.result) ?? "wrong",
    subject: normalizeMcqSubject(log.subject, referenceData),
    topic: asTrimmedString(log.topic),
    source: asTrimmedString(log.source),
    causeCode: normalizeMcqCauseCode(log.causeCode),
    priority: normalizeMcqPriority(log.priority),
    correctRule: asTrimmedString(log.correctRule),
    whatFooledMe: asTrimmedString(log.whatFooledMe),
    fixCodes: normalizeMcqFixCodes(log.fixCodes),
    tags: normalizeMcqTags(log.tags),
  };
}

export function getMcqSubjectOptions(referenceData?: RuntimeReferenceData) {
  return getSubjectOptions(referenceData);
}

function asTrimmedString(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function isDateOnly(value: string | null | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function parsePositiveInteger(value: string | null | undefined) {
  if (!value?.trim()) {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeListValue<T extends string>(
  values: Array<string | null | undefined>,
  lookup: Set<T>,
  normalizeToken: (token: string) => string = (token) => token,
): T[] {
  const picked = new Set<T>();

  for (const raw of values) {
    const tokens = (raw ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const normalizedToken = normalizeToken(token);
      if (lookup.has(normalizedToken as T)) {
        picked.add(normalizedToken as T);
      }
    }
  }

  return [...picked];
}

export function normalizeMcqSubject(value: string | null | undefined, referenceData?: RuntimeReferenceData) {
  const trimmed = asTrimmedString(value);
  if (!trimmed) {
    return null;
  }

  return getSubjectLookup(referenceData).get(trimmed.toLowerCase()) ?? null;
}

export function normalizeMcqResult(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  return RESULT_LOOKUP.has(normalized as McqResult) ? (normalized as McqResult) : null;
}

export function normalizeMcqCauseCode(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();
  return CAUSE_LOOKUP.has(normalized as McqCauseCode) ? (normalized as McqCauseCode) : null;
}

export function normalizeMcqPriority(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();
  return PRIORITY_LOOKUP.has(normalized as McqPriority) ? (normalized as McqPriority) : null;
}

export function normalizeMcqFixCodes(values: Array<string | null | undefined>) {
  return normalizeListValue(values, FIX_LOOKUP, (token) => token.toUpperCase());
}

export function normalizeMcqTags(values: Array<string | null | undefined>) {
  return normalizeListValue(values, TAG_LOOKUP, (token) => token.toLowerCase());
}

export function validateMcqBulkDraft(
  input: {
    entryDate?: string | null;
    totalAttempted?: string | null;
    correct?: string | null;
    wrong?: string | null;
    subject?: string | null;
    source?: string | null;
  },
  fallbackDate: string,
  referenceData?: RuntimeReferenceData,
): { ok: true; value: McqBulkDraft } | { ok: false; error: string } {
  const totalAttempted = parsePositiveInteger(input.totalAttempted);
  const correct = parsePositiveInteger(input.correct);
  const providedWrong = asTrimmedString(input.wrong);
  const wrong = parsePositiveInteger(input.wrong);

  if (totalAttempted === null || correct === null || wrong === null) {
    return { ok: false, error: "Use whole numbers for attempted, correct, and wrong." };
  }

  if (totalAttempted <= 0) {
    return { ok: false, error: "Total attempted must be at least 1." };
  }

  if (correct > totalAttempted) {
    return { ok: false, error: "Correct cannot exceed total attempted." };
  }

  const resolvedWrong = providedWrong === null ? totalAttempted - correct : wrong;

  if (correct + resolvedWrong !== totalAttempted) {
    return { ok: false, error: "Correct and wrong must add up exactly to total attempted." };
  }

  const entryDate = isDateOnly(input.entryDate) ? input.entryDate! : fallbackDate;
  const subject = normalizeMcqSubject(input.subject, referenceData);
  if (input.subject && !subject && asTrimmedString(input.subject)) {
    return { ok: false, error: "Use a valid schedule subject for bulk entry." };
  }

  return {
    ok: true,
    value: {
      entryDate,
      totalAttempted,
      correct,
      wrong: resolvedWrong,
      subject,
      source: asTrimmedString(input.source),
    },
  };
}

export function validateMcqItemDraft(
  input: {
    entryDate?: string | null;
    mcqId?: string | null;
    result?: string | null;
    subject?: string | null;
    topic?: string | null;
    source?: string | null;
    causeCode?: string | null;
    priority?: string | null;
    correctRule?: string | null;
    whatFooledMe?: string | null;
    fixCodes?: Array<string | null | undefined>;
    tags?: Array<string | null | undefined>;
  },
  fallbackDate: string,
  referenceData?: RuntimeReferenceData,
): { ok: true; value: McqItemDraft } | { ok: false; error: string } {
  const mcqId = asTrimmedString(input.mcqId);
  if (!mcqId) {
    return { ok: false, error: "MCQ ID is required." };
  }

  const result = normalizeMcqResult(input.result);
  if (!result) {
    return { ok: false, error: "Pick Right, Wrong, or Guessed Right." };
  }

  const subject = normalizeMcqSubject(input.subject, referenceData);
  if (input.subject && !subject && asTrimmedString(input.subject)) {
    return { ok: false, error: "Use one of the 19 schedule subjects." };
  }

  const causeCode = normalizeMcqCauseCode(input.causeCode);
  if (input.causeCode && !causeCode && asTrimmedString(input.causeCode)) {
    return { ok: false, error: "Cause code is not recognized." };
  }

  const priority = normalizeMcqPriority(input.priority);
  if (input.priority && !priority && asTrimmedString(input.priority)) {
    return { ok: false, error: "Priority must be P1, P2, or P3." };
  }

  return {
    ok: true,
    value: {
      entryDate: isDateOnly(input.entryDate) ? input.entryDate! : fallbackDate,
      mcqId,
      result,
      subject,
      topic: asTrimmedString(input.topic),
      source: asTrimmedString(input.source),
      causeCode,
      priority,
      correctRule: asTrimmedString(input.correctRule),
      whatFooledMe: asTrimmedString(input.whatFooledMe),
      fixCodes: normalizeMcqFixCodes(input.fixCodes ?? []),
      tags: normalizeMcqTags(input.tags ?? []),
    },
  };
}

export function getMcqRecentTopics(itemLogs: McqItemLog[], limit = 12) {
  const recent = new Set<string>();

  for (const log of [...itemLogs].toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))) {
    if (log.topic) {
      recent.add(log.topic);
    }
    if (recent.size >= limit) {
      break;
    }
  }

  return [...recent];
}

export function getMcqRecentSources(bulkLogs: McqBulkLog[], itemLogs: McqItemLog[], limit = 10) {
  const recent = new Set<string>();

  const combined = [
    ...bulkLogs.map((log) => ({ createdAt: log.createdAt, source: log.source })),
    ...itemLogs.map((log) => ({ createdAt: log.createdAt, source: log.source })),
  ].toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));

  for (const entry of combined) {
    if (entry.source) {
      recent.add(entry.source);
    }
    if (recent.size >= limit) {
      break;
    }
  }

  return [...recent];
}

export function buildMcqDashboardSummary(userState: UserState): McqDashboardSummary {
  const bulkLogs = Object.values(userState.mcqBulkLogs);
  const itemLogs = Object.values(userState.mcqItemLogs);
  const bulkSolved = bulkLogs.reduce((sum, log) => sum + log.totalAttempted, 0);
  const bulkCorrect = bulkLogs.reduce((sum, log) => sum + log.correct, 0);
  const bulkWrong = bulkLogs.reduce((sum, log) => sum + log.wrong, 0);
  const itemRight = itemLogs.filter((log) => log.result === "right").length;
  const itemGuessed = itemLogs.filter((log) => log.result === "guessed_right").length;
  const itemWrong = itemLogs.filter((log) => log.result === "wrong").length;
  const totalSolved = bulkSolved + itemLogs.length;
  const totalCorrect = bulkCorrect + itemRight + itemGuessed;
  const totalWrong = bulkWrong + itemWrong;

  return {
    totalSolved,
    totalCorrect,
    totalWrong,
    guessedRight: itemGuessed,
    detailedEntries: itemLogs.length,
    accuracy: totalSolved ? Number(((totalCorrect / totalSolved) * 100).toFixed(1)) : null,
  };
}

export function buildMcqTrendData(userState: UserState): McqTrendPoint[] {
  const grouped = new Map<string, Omit<McqTrendPoint, "label" | "accuracy">>();

  for (const log of Object.values(userState.mcqBulkLogs)) {
    const current = grouped.get(log.entryDate) ?? { attempted: 0, correct: 0, wrong: 0, guessedRight: 0 };
    current.attempted += log.totalAttempted;
    current.correct += log.correct;
    current.wrong += log.wrong;
    grouped.set(log.entryDate, current);
  }

  for (const log of Object.values(userState.mcqItemLogs)) {
    const current = grouped.get(log.entryDate) ?? { attempted: 0, correct: 0, wrong: 0, guessedRight: 0 };
    current.attempted += 1;
    if (log.result === "wrong") {
      current.wrong += 1;
    } else if (log.result === "guessed_right") {
      current.correct += 1;
      current.guessedRight += 1;
    } else {
      current.correct += 1;
    }
    grouped.set(log.entryDate, current);
  }

  return [...grouped.entries()]
    .toSorted((left, right) => left[0].localeCompare(right[0]))
    .map(([label, value]) => ({
      label,
      attempted: value.attempted,
      correct: value.correct,
      wrong: value.wrong,
      guessedRight: value.guessedRight,
      accuracy: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(1)) : 0,
    }));
}

export function buildMcqBreakdownData(userState: UserState): McqBreakdownPoint[] {
  const bulkRight = Object.values(userState.mcqBulkLogs).reduce((sum, log) => sum + log.correct, 0);
  const bulkWrong = Object.values(userState.mcqBulkLogs).reduce((sum, log) => sum + log.wrong, 0);
  const itemRight = Object.values(userState.mcqItemLogs).filter((log) => log.result === "right").length;
  const itemGuessed = Object.values(userState.mcqItemLogs).filter((log) => log.result === "guessed_right").length;
  const itemWrong = Object.values(userState.mcqItemLogs).filter((log) => log.result === "wrong").length;

  return [
    { label: "Right", value: bulkRight + itemRight },
    { label: "Guessed Right", value: itemGuessed },
    { label: "Wrong", value: bulkWrong + itemWrong },
  ];
}

export function buildMcqAccuracyBySubject(userState: UserState): McqSubjectAccuracyPoint[] {
  const grouped = new Map<string, { attempted: number; correct: number }>();

  for (const log of Object.values(userState.mcqBulkLogs)) {
    if (!log.subject) {
      continue;
    }

    const current = grouped.get(log.subject) ?? { attempted: 0, correct: 0 };
    current.attempted += log.totalAttempted;
    current.correct += log.correct;
    grouped.set(log.subject, current);
  }

  for (const log of Object.values(userState.mcqItemLogs)) {
    if (!log.subject) {
      continue;
    }

    const current = grouped.get(log.subject) ?? { attempted: 0, correct: 0 };
    current.attempted += 1;
    if (log.result !== "wrong") {
      current.correct += 1;
    }
    grouped.set(log.subject, current);
  }

  return [...grouped.entries()]
    .map(([subject, value]) => ({
      subject,
      attempted: value.attempted,
      correct: value.correct,
      accuracy: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(1)) : 0,
    }))
    .toSorted((left, right) => {
      const accuracyDelta = right.accuracy - left.accuracy;
      if (accuracyDelta !== 0) {
        return accuracyDelta;
      }
      return left.subject.localeCompare(right.subject);
    });
}

export function getMcqTopWrongSubjects(userState: UserState, limit = 5) {
  const wrongSubjects = new Map<string, number>();

  for (const log of Object.values(userState.mcqItemLogs)) {
    if (log.result === "wrong" && log.subject) {
      wrongSubjects.set(log.subject, (wrongSubjects.get(log.subject) ?? 0) + 1);
    }
  }

  return [...wrongSubjects.entries()]
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function getMcqTopCauseCodes(userState: UserState, limit = 5) {
  const causeCodes = new Map<McqCauseCode, number>();

  for (const log of Object.values(userState.mcqItemLogs)) {
    if (log.result === "wrong" && log.causeCode) {
      causeCodes.set(log.causeCode, (causeCodes.get(log.causeCode) ?? 0) + 1);
    }
  }

  return [...causeCodes.entries()]
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function createTodayDateFallback() {
  return toDateOnly(new Date());
}
