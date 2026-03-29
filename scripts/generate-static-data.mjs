import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const root = resolve(process.cwd());
const resourcesDir = resolve(root, "resources");
const generatedDir = resolve(root, "src/lib/generated");

const workbookPath = resolve(resourcesDir, "NEET_PG_FINAL_SCHEDULE.xlsx");
const quotesPath = resolve(resourcesDir, "quotes.csv");

const WORKBOOK_NAME = "NEET_PG_FINAL_SCHEDULE.xlsx";
const allowedQuoteCategories = new Set(["daily", "tough_day", "celebration"]);

const SLOT_CONFIG = [
  {
    timeSlotKey: "06:30-07:45",
    start: "06:30",
    end: "07:45",
    durationMinutes: 75,
    timelineKind: "study",
    defaultTrackable: true,
    order: 1,
    displayLabel: "Morning Revision",
    semanticBlockKey: "morning_revision",
  },
  {
    timeSlotKey: "07:45-08:00",
    start: "07:45",
    end: "08:00",
    durationMinutes: 15,
    timelineKind: "break",
    defaultTrackable: false,
    order: 2,
    displayLabel: "Breakfast Buffer",
    semanticBlockKey: "breakfast_buffer",
  },
  {
    timeSlotKey: "08:00-11:00",
    start: "08:00",
    end: "11:00",
    durationMinutes: 180,
    timelineKind: "study",
    defaultTrackable: true,
    order: 3,
    displayLabel: "Block A",
    semanticBlockKey: "block_a",
  },
  {
    timeSlotKey: "11:00-11:15",
    start: "11:00",
    end: "11:15",
    durationMinutes: 15,
    timelineKind: "break",
    defaultTrackable: false,
    order: 4,
    displayLabel: "Break 1",
    semanticBlockKey: "break_1",
  },
  {
    timeSlotKey: "11:15-14:15",
    start: "11:15",
    end: "14:15",
    durationMinutes: 180,
    timelineKind: "study",
    defaultTrackable: true,
    order: 5,
    displayLabel: "Block B",
    semanticBlockKey: "block_b",
  },
  {
    timeSlotKey: "14:15-15:00",
    start: "14:15",
    end: "15:00",
    durationMinutes: 45,
    timelineKind: "meal",
    defaultTrackable: false,
    order: 6,
    displayLabel: "Lunch",
    semanticBlockKey: "lunch",
  },
  {
    timeSlotKey: "15:00-17:45",
    start: "15:00",
    end: "17:45",
    durationMinutes: 165,
    timelineKind: "study",
    defaultTrackable: true,
    order: 7,
    displayLabel: "Block C",
    semanticBlockKey: "block_c",
  },
  {
    timeSlotKey: "17:45-18:00",
    start: "17:45",
    end: "18:00",
    durationMinutes: 15,
    timelineKind: "break",
    defaultTrackable: false,
    order: 8,
    displayLabel: "Break 2",
    semanticBlockKey: "break_2",
  },
  {
    timeSlotKey: "18:00-20:00",
    start: "18:00",
    end: "20:00",
    durationMinutes: 120,
    timelineKind: "study",
    defaultTrackable: true,
    order: 9,
    displayLabel: "MCQ Practice",
    semanticBlockKey: "mcq_practice",
  },
  {
    timeSlotKey: "20:00-20:30",
    start: "20:00",
    end: "20:30",
    durationMinutes: 30,
    timelineKind: "meal",
    defaultTrackable: false,
    order: 10,
    displayLabel: "Dinner",
    semanticBlockKey: "dinner",
  },
  {
    timeSlotKey: "20:30-22:15",
    start: "20:30",
    end: "22:15",
    durationMinutes: 105,
    timelineKind: "study",
    defaultTrackable: true,
    order: 11,
    displayLabel: "Final Review",
    semanticBlockKey: "final_review",
  },
  {
    timeSlotKey: "22:15-22:45",
    start: "22:15",
    end: "22:45",
    durationMinutes: 30,
    timelineKind: "study",
    defaultTrackable: true,
    order: 12,
    displayLabel: "Wrap-Up Log",
    semanticBlockKey: "wrap_up_log",
  },
];

const TRACKABLE_SEMANTIC_KEYS = new Set(
  SLOT_CONFIG.filter((slot) => slot.defaultTrackable).map((slot) => slot.semanticBlockKey),
);

const SUBJECT_ALIASES = {
  Pathology: ["pathology", "path"],
  Pharmacology: ["pharmacology", "pharma"],
  Microbiology: ["microbiology", "micro"],
  Physiology: ["physiology", "physio"],
  Anatomy: ["anatomy", "anat"],
  Biochemistry: ["biochemistry", "biochem"],
  "Community Medicine (PSM)": ["community medicine psm", "community medicine", "psm"],
  Medicine: ["medicine"],
  Surgery: ["surgery"],
  "Obstetrics & Gynaecology": [
    "obstetrics and gynaecology",
    "obstetrics and gynecology",
    "obstetrics gynaecology",
    "obg",
    "gynaecology",
    "gynecology",
    "obstetrics",
  ],
  Paediatrics: ["paediatrics", "pediatrics", "peds"],
  ENT: ["ent"],
  Ophthalmology: ["ophthalmology", "ophthal"],
  "Forensic Medicine": ["forensic medicine", "fmt", "forensic"],
  Orthopaedics: ["orthopaedics", "orthopedics", "ortho"],
  Anaesthesia: ["anaesthesia", "anesthesia", "anaesth"],
  Radiology: ["radiology", "radio"],
  Dermatology: ["dermatology", "derm"],
  Psychiatry: ["psychiatry", "psych"],
};

const PHASE_CONFIG = {
  "Phase 1 - First pass": {
    phaseId: "phase_1",
    phaseName: "Phase 1 - First pass",
    phaseGroup: "phase_1",
    description: "First-pass source learning driven by WOR topics and accurate planned minutes.",
  },
  "Phase 2 - Revision 1 (Marrow + selective BTR)": {
    phaseId: "phase_2",
    phaseName: "Phase 2 - Revision 1 (Marrow + selective BTR)",
    phaseGroup: "phase_2",
    description: "First revision phase with Marrow-led repair, embedded GTs, and bounded BTR support.",
  },
  "Phase 3 - Revision 2 / Compression": {
    phaseId: "phase_3",
    phaseName: "Phase 3 - Revision 2 / Compression",
    phaseGroup: "phase_3",
    description: "Compression phase with embedded GTs, weak-cluster repair, and final volatile passes.",
  },
};

const GT_MEASURE_ITEMS = {
  "Full GT": [
    "score and accuracy drift",
    "blind guesses and section behaviour",
    "repeated weak subjects and recurring topics",
  ],
  "120Q half-sim": [
    "speed drift across the timed half-simulation",
    "recurring weak clusters",
    "confidence calibration before the next full GT",
  ],
};

const GT_OUTPUT_ITEMS = {
  "Full GT": [
    "update the GT register",
    "identify the weakest 2 subjects",
    "define the first repair move for the next day",
  ],
  "120Q half-sim": [
    "log the weak cluster",
    "capture confidence drift",
    "define the next correction set",
  ],
};

function fail(message) {
  throw new Error(`[generate:data] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function toArrayLiteral(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/gu, "\n")
    .replace(/[ \t]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function normalizeMatchText(value) {
  return ` ${String(value ?? "")
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()} `;
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/gu, " and ")
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

function splitLines(value) {
  return normalizeWhitespace(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitTextParts(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n|[|/]/u)
    .flatMap((part) => part.split(/\s+\+\s+/u))
    .map((part) => part.trim())
    .filter(Boolean);
}

function toNullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distributeMinutes(totalMinutes, count) {
  if (count <= 0) {
    return [];
  }

  const safeTotal = Math.max(0, totalMinutes);
  const base = Math.floor(safeTotal / count);
  const remainder = safeTotal % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.length > 0));
}

async function parseQuotes() {
  const source = await readFile(quotesPath, "utf8");
  const rows = parseCsv(source);
  assert(rows.length > 1, "quotes.csv must contain a header and at least one quote");

  const [header, ...records] = rows;
  assert(header[0] === "quote" && header[1] === "author" && header[2] === "category", "quotes.csv header must be quote,author,category");

  return records.map((record, index) => {
    const quote = String(record[0] ?? "").trim();
    const author = String(record[1] ?? "").trim();
    const category = String(record[2] ?? "").trim();

    assert(quote.length > 0, `quotes.csv row ${index + 2} quote is required`);
    assert(author.length > 0, `quotes.csv row ${index + 2} author is required`);
    assert(
      allowedQuoteCategories.has(category),
      `quotes.csv row ${index + 2} category must be one of ${[...allowedQuoteCategories].join(", ")}`,
    );

    return {
      id: `quote-${index + 1}`,
      quote,
      author,
      category,
    };
  });
}

function readWorkbookSheet(sheetName) {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[sheetName];
  assert(sheet, `Missing workbook sheet ${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function buildSubjectStrategy(subjectTierRows, worRows) {
  const worBySubject = worRows.reduce((map, row) => {
    const subject = normalizeWhitespace(row.Subject);
    const entries = map.get(subject) ?? [];
    entries.push(row);
    map.set(subject, entries);
    return map;
  }, new Map());

  return [...subjectTierRows]
    .sort((left, right) => Number(left["First-pass Order"]) - Number(right["First-pass Order"]))
    .map((row) => {
      const subjectName = normalizeWhitespace(row.Subject);
      const subjectId = slugify(subjectName);
      const worEntries = worBySubject.get(subjectName) ?? [];
      const sourceMinutes = worEntries.reduce((total, entry) => total + Number(entry["Source Minutes"] ?? 0), 0);
      const firstPassDays = new Set(worEntries.map((entry) => Number(entry["First-pass Day"]))).size;
      const mustFocusTopics = [...worEntries]
        .sort((left, right) => Number(right["Planned Minutes"] ?? 0) - Number(left["Planned Minutes"] ?? 0))
        .slice(0, 5)
        .map((entry) => normalizeWhitespace(entry.Topic));
      const tier = normalizeWhitespace(row.Tier);

      return {
        subjectId,
        subjectName,
        aliases: [...new Set(SUBJECT_ALIASES[subjectName] ?? [])],
        worHours: Number((sourceMinutes / 60).toFixed(2)),
        firstPassDays,
        priorityTier: tier,
        priorityRank: tier.includes("Tier A") ? 1 : tier.includes("Tier B") ? 2 : 3,
        resourceDecisionRaw: normalizeWhitespace(row["Revision frequency target"]),
        mustFocusTopics,
      };
    });
}

function buildSubjectMatchers(subjects) {
  return subjects.flatMap((subject) =>
    [subject.subjectName, ...subject.aliases]
      .map((alias) => normalizeMatchText(alias).trim())
      .filter(Boolean)
      .map((alias) => ({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        alias,
      })),
  );
}

function findSubjectIds(text, subjectMatchers, fallbackSubjectIds = []) {
  const haystack = normalizeMatchText(text);
  const subjectIds = new Set();

  for (const matcher of subjectMatchers) {
    if (haystack.includes(` ${matcher.alias} `)) {
      subjectIds.add(matcher.subjectId);
    }
  }

  if (subjectIds.size === 0) {
    fallbackSubjectIds.forEach((subjectId) => subjectIds.add(subjectId));
  }

  return [...subjectIds];
}

function findPrimarySubjectIds(primaryFocusRaw, subjectMatchers) {
  const direct = findSubjectIds(primaryFocusRaw, subjectMatchers);
  if (direct.length > 0) {
    return direct;
  }

  if (/obg/iu.test(primaryFocusRaw)) {
    return [slugify("Obstetrics & Gynaecology")];
  }

  return [];
}

function getGtTestType(dayRow) {
  const primaryFocus = normalizeWhitespace(dayRow["Primary Focus"]);
  const blockA = normalizeWhitespace(dayRow["08:00-11:00"]);

  if (/half simulation 120q|120q mixed half-simulation/iu.test(primaryFocus) || /120q mixed half-simulation/iu.test(blockA)) {
    return "120Q half-sim";
  }

  if (/^gt\s*\d+$/iu.test(primaryFocus) || /^full marrow gt\s*\d+/iu.test(blockA)) {
    return "Full GT";
  }

  return "No";
}

function getGtPlanRef(dayRow) {
  const primaryFocus = normalizeWhitespace(dayRow["Primary Focus"]);
  const gtMatch = primaryFocus.match(/^GT\s*(\d+)$/iu);
  if (gtMatch) {
    return `gt_${gtMatch[1]}`;
  }

  if (/half simulation 120q/iu.test(primaryFocus)) {
    return "half_sim_120q";
  }

  return null;
}

function buildGtPlan(days) {
  return days
    .filter((day) => day.gtTestType !== "No" && day.gtPlanRef)
    .map((day) => {
      const measureItems = GT_MEASURE_ITEMS[day.gtTestType] ?? [];
      const outputItems = GT_OUTPUT_ITEMS[day.gtTestType] ?? [];

      return {
        gtPlanRef: day.gtPlanRef,
        dayNumber: day.dayNumber,
        testType: day.gtTestType,
        purposeRaw: day.primaryFocusRaw,
        whatToMeasureRaw: measureItems.join("; "),
        whatToMeasureItems: measureItems,
        mustOutputRaw: outputItems.join("; "),
        mustOutputItems: outputItems,
        resourceRaw: day.resourceRaw,
        reviewRaw: day.blocks.find((block) => block.semanticBlockKey === "final_review")?.rawText ?? "",
        wrapUpRaw: day.blocks.find((block) => block.semanticBlockKey === "wrap_up_log")?.rawText ?? "",
        notesRaw: day.notesRaw,
      };
    });
}

function buildPhaseCatalog(dayRows) {
  return Object.entries(
    dayRows.reduce((map, row) => {
      const phaseName = normalizeWhitespace(row.Phase);
      const phase = PHASE_CONFIG[phaseName];
      assert(phase, `Unsupported phase label ${phaseName}`);

      const dayNumber = Number(row.Day);
      const existing = map[phase.phaseId];
      if (!existing) {
        map[phase.phaseId] = {
          ...phase,
          startDay: dayNumber,
          endDay: dayNumber,
        };
      } else {
        existing.startDay = Math.min(existing.startDay, dayNumber);
        existing.endDay = Math.max(existing.endDay, dayNumber);
      }

      return map;
    }, {}),
  ).map(([, value]) => value);
}

function buildWorTopicsByDayBlock(worRows) {
  return worRows.reduce((map, row) => {
    const dayNumber = Number(row["First-pass Day"]);
    const blockLetter = normalizeWhitespace(row.Block);
    const key = `${dayNumber}:${blockLetter}`;
    const entries = map.get(key) ?? [];
    entries.push({
      subjectName: normalizeWhitespace(row.Subject),
      subjectId: slugify(row.Subject),
      topic: normalizeWhitespace(row.Topic),
      plannedMinutes: Number(row["Planned Minutes"] ?? 0),
    });
    map.set(key, entries);
    return map;
  }, new Map());
}

function getTrafficLightPolicy(semanticBlockKey) {
  switch (semanticBlockKey) {
    case "block_b":
      return {
        green: "visible",
        yellow: "visible",
        red: "hidden",
        backlogWhenHidden: true,
      };
    case "block_c":
    case "final_review":
      return {
        green: "visible",
        yellow: "hidden",
        red: "hidden",
        backlogWhenHidden: true,
      };
    case "morning_revision":
    case "wrap_up_log":
      return {
        green: "visible",
        yellow: "visible",
        red: "visible",
        backlogWhenHidden: false,
      };
    default:
      return {
        green: "visible",
        yellow: "visible",
        red: "visible",
        backlogWhenHidden: true,
      };
  }
}

function buildItemId(dayNumber, slotKey, index) {
  const start = slotKey.split("-")[0]?.replace(":", "") ?? "0000";
  return `d${String(dayNumber).padStart(3, "0")}-${start}-${String(index + 1).padStart(2, "0")}`;
}

function combineContextLabel(context, value) {
  if (!context) {
    return value;
  }

  const normalizedContext = normalizeWhitespace(context);
  const normalizedValue = normalizeWhitespace(value);
  if (!normalizedContext || !normalizedValue || normalizedValue.toLowerCase().startsWith(normalizedContext.toLowerCase())) {
    return normalizedValue;
  }

  return `${normalizedContext}: ${normalizedValue}`;
}

function parseTaskLines(rawText) {
  const lines = splitLines(rawText);
  const items = [];
  let context = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const bulletText = line.replace(/^[•*-]\s*/u, "").trim();
    const isBullet = /^[•*-]\s*/u.test(line);
    const nextLine = lines[index + 1] ?? null;
    const nextIsBullet = nextLine ? /^[•*-]\s*/u.test(nextLine) : false;

    if (isBullet) {
      items.push(combineContextLabel(context, bulletText));
      continue;
    }

    if (nextIsBullet) {
      context = bulletText;
      continue;
    }

    context = null;
    items.push(bulletText);
  }

  return items.filter(Boolean);
}

function buildWorkbookMorningItems({
  dayNumber,
  rawText,
  primaryFocusSubjectIds,
  subjectMatchers,
  slotKey,
}) {
  const label = normalizeWhitespace(rawText);

  return [{
    itemId: buildItemId(dayNumber, slotKey, 0),
    order: 1,
    kind: "task",
    label,
    rawText: label,
    plannedMinutes: 75,
    subjectIds: findSubjectIds(label, subjectMatchers, primaryFocusSubjectIds),
    revisionEligible: false,
    recoveryLane: "none",
    phaseFence: "not_reschedulable",
    notes: null,
    revisionType: null,
    referenceLabel: null,
    referenceDayNumber: null,
  }];
}

function isGtLikeBlock(gtTestType, rawText) {
  return gtTestType !== "No" || /gt|simulation/iu.test(rawText);
}

function getBlockIntent({ phaseId, semanticBlockKey, rawText, gtTestType, hasWorTopics }) {
  if (semanticBlockKey === "morning_revision") {
    return "revision";
  }
  if (semanticBlockKey === "mcq_practice") {
    return "practice";
  }
  if (semanticBlockKey === "final_review") {
    return "recall";
  }
  if (semanticBlockKey === "wrap_up_log") {
    return "shutdown";
  }

  if (semanticBlockKey === "block_a" && isGtLikeBlock(gtTestType, rawText)) {
    return "assessment";
  }
  if (semanticBlockKey === "block_b" && /finish gt|immediate dump|half-sim wrong|analysis/iu.test(rawText)) {
    return "analysis";
  }
  if (semanticBlockKey === "block_c" && isGtLikeBlock(gtTestType, rawText)) {
    return "repair";
  }

  if (phaseId === "phase_1" && hasWorTopics) {
    return "core_study";
  }

  return "revision";
}

function getRecoveryLane({ semanticBlockKey, rawText, gtTestType }) {
  if (semanticBlockKey === "morning_revision" || semanticBlockKey === "wrap_up_log") {
    return "none";
  }

  if (semanticBlockKey === "mcq_practice") {
    return isGtLikeBlock(gtTestType, rawText) ? "assessment_recovery" : "soft_carry";
  }

  if (semanticBlockKey === "final_review") {
    return "soft_carry";
  }

  return isGtLikeBlock(gtTestType, rawText) ? "assessment_recovery" : "core_recovery";
}

function buildTrackableItems({
  dayNumber,
  slot,
  rawText,
  phaseId,
  primaryFocusSubjectIds,
  subjectMatchers,
  worTopics,
  gtTestType,
}) {
  const slotDuration = slot.durationMinutes;

  if (slot.semanticBlockKey === "morning_revision") {
    return [];
  }

  if (phaseId === "phase_1" && ["block_a", "block_b", "block_c"].includes(slot.semanticBlockKey) && worTopics.length > 0) {
    return worTopics.map((entry, index) => ({
      itemId: buildItemId(dayNumber, slot.timeSlotKey, index),
      order: index + 1,
      kind: "topic",
      label: entry.topic,
      rawText: entry.topic,
      plannedMinutes: entry.plannedMinutes,
      subjectIds: [entry.subjectId],
      revisionEligible: true,
      recoveryLane: "core_recovery",
      phaseFence: "same_phase_only",
      notes: null,
      revisionType: null,
      referenceLabel: null,
      referenceDayNumber: null,
    }));
  }

  const labels = parseTaskLines(rawText);
  const safeLabels = labels.length ? labels : [normalizeWhitespace(rawText)];
  const plannedMinutes = distributeMinutes(slotDuration, safeLabels.length);
  const recoveryLane = getRecoveryLane({
    semanticBlockKey: slot.semanticBlockKey,
    rawText,
    gtTestType,
  });
  const itemKind = isGtLikeBlock(gtTestType, rawText) ? "gt_step" : "task";
  const phaseFence = slot.semanticBlockKey === "wrap_up_log" ? "not_reschedulable" : "same_phase_only";

  return safeLabels.map((label, index) => ({
    itemId: buildItemId(dayNumber, slot.timeSlotKey, index),
    order: index + 1,
    kind: itemKind,
    label,
    rawText: label,
    plannedMinutes: plannedMinutes[index] ?? 0,
    subjectIds: findSubjectIds(label, subjectMatchers, primaryFocusSubjectIds),
    revisionEligible: false,
    recoveryLane,
    phaseFence,
    notes: null,
    revisionType: null,
    referenceLabel: null,
    referenceDayNumber: null,
  }));
}

function buildDayPlan(dayRow, revisionRow, subjectMatchers, worTopicsByDayBlock) {
  const dayNumber = Number(dayRow.Day);
  const phase = PHASE_CONFIG[normalizeWhitespace(dayRow.Phase)];
  assert(phase, `Unknown phase on day ${dayNumber}`);

  const primaryFocusRaw = normalizeWhitespace(dayRow["Primary Focus"]);
  const resourceRaw = normalizeWhitespace(dayRow.Resource);
  const primaryFocusSubjectIds = findPrimarySubjectIds(primaryFocusRaw, subjectMatchers);
  const gtTestType = getGtTestType(dayRow);
  const gtPlanRef = getGtPlanRef(dayRow);

  const blocks = SLOT_CONFIG.map((slot) => {
    const rawText = normalizeWhitespace(dayRow[slot.timeSlotKey]);

    if (!slot.defaultTrackable) {
      return {
        timeSlotKey: slot.timeSlotKey,
        displayLabel: slot.displayLabel,
        semanticBlockKey: slot.semanticBlockKey,
        blockIntent: slot.timelineKind === "meal" ? "meal" : "break",
        trackable: false,
        rawText,
        items: [],
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        defaultRevisionEligible: false,
        reschedulable: false,
        trafficLightPolicy: {
          green: "visible",
          yellow: "visible",
          red: "visible",
          backlogWhenHidden: false,
        },
      };
    }

    const worTopics =
      phase.phaseId === "phase_1" && ["block_a", "block_b", "block_c"].includes(slot.semanticBlockKey)
        ? worTopicsByDayBlock.get(`${dayNumber}:${slot.semanticBlockKey.at(-1)?.toUpperCase()}`) ?? []
        : [];

    let items;
    if (slot.semanticBlockKey === "morning_revision") {
      items = buildWorkbookMorningItems({
        dayNumber,
        rawText,
        revisionRow,
        phaseId: phase.phaseId,
        primaryFocusSubjectIds,
        subjectMatchers,
        slotKey: slot.timeSlotKey,
      });
    } else {
      items = buildTrackableItems({
        dayNumber,
        slot,
        rawText,
        phaseId: phase.phaseId,
        primaryFocusSubjectIds,
        subjectMatchers,
        worTopics,
        gtTestType,
      });
    }

    const reschedulable = slot.semanticBlockKey !== "morning_revision" && slot.semanticBlockKey !== "wrap_up_log";
    const blockIntent = getBlockIntent({
      phaseId: phase.phaseId,
      semanticBlockKey: slot.semanticBlockKey,
      rawText,
      gtTestType,
      hasWorTopics: worTopics.length > 0,
    });
    const recoveryLane = slot.semanticBlockKey === "morning_revision"
      ? "none"
      : getRecoveryLane({
          semanticBlockKey: slot.semanticBlockKey,
          rawText,
          gtTestType,
        });

    return {
      timeSlotKey: slot.timeSlotKey,
      displayLabel: slot.displayLabel,
      semanticBlockKey: slot.semanticBlockKey,
      blockIntent,
      trackable: true,
      rawText,
      items,
      recoveryLane,
      phaseFence: reschedulable ? "same_phase_only" : "not_reschedulable",
      defaultRevisionEligible: items.some((item) => item.revisionEligible),
      reschedulable,
      trafficLightPolicy: getTrafficLightPolicy(slot.semanticBlockKey),
    };
  });

  return {
    dayNumber,
    phaseId: phase.phaseId,
    phaseName: phase.phaseName,
    primaryFocusRaw,
    primaryFocusParts: splitTextParts(primaryFocusRaw),
    primaryFocusSubjectIds,
    resourceRaw,
    resourceParts: splitTextParts(resourceRaw),
    deliverableRaw: normalizeWhitespace(dayRow.Notes) || normalizeWhitespace(dayRow["22:15-22:45"]) || primaryFocusRaw,
    notesRaw: normalizeWhitespace(dayRow.Notes) || null,
    sourceMinutes: toNullableNumber(dayRow["New content source mins"]),
    bufferMinutes: toNullableNumber(dayRow["Buffer mins inside study blocks"]),
    plannedStudyMinutes: toNullableNumber(dayRow["Planned study mins (study blocks only)"]),
    totalStudyHours: toNullableNumber(dayRow["Total study hours/day"]),
    gtTestType,
    gtPlanRef,
    blocks,
  };
}

function validateWorkbook(dayRows, worRows, subjectRows, revisionRows, phaseCatalog, days) {
  assert(dayRows.length === 100, "Daywise_Plan must contain exactly 100 days");
  assert(worRows.length === 271, "WOR_Topic_Map must contain exactly 271 topics");
  assert(subjectRows.length === 19, "Subject_Tiering must contain exactly 19 subjects");
  assert(revisionRows.length === 100, "Revision_Map must contain exactly 100 rows");
  assert(SLOT_CONFIG.length === 12, "slot configuration must contain exactly 12 slots");
  assert(phaseCatalog.length === 3, "phase catalog must contain exactly 3 phases");

  const phase1 = phaseCatalog.find((phase) => phase.phaseId === "phase_1");
  const phase2 = phaseCatalog.find((phase) => phase.phaseId === "phase_2");
  const phase3 = phaseCatalog.find((phase) => phase.phaseId === "phase_3");
  assert(phase1?.startDay === 1 && phase1.endDay === 63, "Phase 1 span must be days 1-63");
  assert(phase2?.startDay === 64 && phase2.endDay === 82, "Phase 2 span must be days 64-82");
  assert(phase3?.startDay === 83 && phase3.endDay === 100, "Phase 3 span must be days 83-100");

  days.forEach((day, index) => {
    assert(day.dayNumber === index + 1, `day ${index + 1} must have dayNumber ${index + 1}`);
    assert(day.blocks.length === SLOT_CONFIG.length, `day ${day.dayNumber} must contain ${SLOT_CONFIG.length} blocks`);
  });

  const phase1Wor = worRows.map((row) => ({
    dayNumber: Number(row["First-pass Day"]),
    blockLetter: normalizeWhitespace(row.Block),
    topic: normalizeWhitespace(row.Topic),
    plannedMinutes: Number(row["Planned Minutes"] ?? 0),
  }));

  for (const entry of phase1Wor) {
    const semanticBlockKey = `block_${entry.blockLetter.toLowerCase()}`;
    const day = days.find((candidate) => candidate.dayNumber === entry.dayNumber);
    const block = day?.blocks.find((candidate) => candidate.semanticBlockKey === semanticBlockKey);
    const item = block?.items.find((candidate) => candidate.label === entry.topic);

    assert(item, `Missing Phase 1 WOR topic ${entry.topic} on day ${entry.dayNumber} ${entry.blockLetter}`);
    assert(
      item.plannedMinutes === entry.plannedMinutes,
      `Phase 1 WOR topic ${entry.topic} on day ${entry.dayNumber} ${entry.blockLetter} must keep planned minutes ${entry.plannedMinutes}`,
    );
  }
}

function buildGeneratedScheduleData(dayRows, worRows, subjectRows, revisionRows) {
  const subjectStrategy = buildSubjectStrategy(subjectRows, worRows);
  const subjectMatchers = buildSubjectMatchers(subjectStrategy);
  const worTopicsByDayBlock = buildWorTopicsByDayBlock(worRows);
  const revisionRowByDay = new Map(revisionRows.map((row) => [Number(row.Day), row]));
  const phaseCatalog = buildPhaseCatalog(dayRows);
  const days = [...dayRows]
    .sort((left, right) => Number(left.Day) - Number(right.Day))
    .map((row) => buildDayPlan(row, revisionRowByDay.get(Number(row.Day)) ?? null, subjectMatchers, worTopicsByDayBlock));
  const gtTestPlan = buildGtPlan(days);

  validateWorkbook(dayRows, worRows, subjectRows, revisionRows, phaseCatalog, days);

  return {
    examDate: "2026-08-30",
    hardBoundaryDate: "2026-08-20",
    daywisePlan: {
      version: 2,
      source: "workbook",
      sourceWorkbook: WORKBOOK_NAME,
      sourceSheet: "Daywise_Plan",
      phaseCatalog,
      slotCatalog: SLOT_CONFIG.map((slot) => ({
        timeSlotKey: slot.timeSlotKey,
        start: slot.start,
        end: slot.end,
        durationMinutes: slot.durationMinutes,
        timelineKind: slot.timelineKind,
        defaultTrackable: slot.defaultTrackable,
        order: slot.order,
      })),
      days,
    },
    subjectStrategy: {
      version: 2,
      source: "workbook",
      sourceWorkbook: WORKBOOK_NAME,
      sourceSheet: "Subject_Tiering",
      subjects: subjectStrategy,
    },
    gtTestPlan: {
      version: 2,
      source: "workbook",
      sourceWorkbook: WORKBOOK_NAME,
      sourceSheet: "Daywise_Plan",
      tests: gtTestPlan,
    },
  };
}

async function main() {
  const [quotes] = await Promise.all([parseQuotes()]);
  const dayRows = readWorkbookSheet("Daywise_Plan");
  const worRows = readWorkbookSheet("WOR_Topic_Map");
  const subjectRows = readWorkbookSheet("Subject_Tiering");
  const revisionRows = readWorkbookSheet("Revision_Map");

  const scheduleData = buildGeneratedScheduleData(dayRows, worRows, subjectRows, revisionRows);

  await mkdir(generatedDir, { recursive: true });

  const scheduleSource = `import type { ScheduleDataBundle } from "@/lib/domain/schedule-data-types";

export const scheduleData: ScheduleDataBundle = ${toArrayLiteral(scheduleData)};
`;

  const quotesSource = `import type { GeneratedQuote } from "@/lib/domain/types";

export const quotesData: GeneratedQuote[] = ${toArrayLiteral(quotes)};
`;

  await writeFile(resolve(generatedDir, "schedule-data.ts"), scheduleSource);
  await writeFile(resolve(generatedDir, "quotes-data.ts"), quotesSource);

  const trackableCount = SLOT_CONFIG.filter((slot) => TRACKABLE_SEMANTIC_KEYS.has(slot.semanticBlockKey)).length;
  assert(trackableCount === 7, "expected exactly 7 trackable blocks");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
