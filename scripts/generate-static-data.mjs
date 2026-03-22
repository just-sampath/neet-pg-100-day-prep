import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import XLSX from "xlsx";

const root = resolve(process.cwd());
const resourcesDir = resolve(root, "resources");
const manualJsonDir = resolve(resourcesDir, "manual-json");
const generatedDir = resolve(root, "src/lib/generated");

const workbookPath = resolve(resourcesDir, "neet_pg_2026_100_day_schedule.xlsx");
const quotesPath = resolve(resourcesDir, "quotes.csv");

const REQUIRED_SHEETS = ["Readme", "Daywise_Plan", "Block_Hours", "Subject_Strategy", "GT_Test_Plan"];

const TIMELINE_COLUMNS = [
  "06:30-08:00",
  "08:00-08:15",
  "08:15-10:45",
  "10:45-11:00",
  "11:00-13:30",
  "13:30-14:15",
  "14:15-16:45",
  "16:45-17:00",
  "17:00-19:30",
  "19:30-20:15",
  "20:15-21:45",
  "21:45-22:00",
  "22:00-23:00",
];

const DAYWISE_REQUIRED_COLUMNS = [
  "Day",
  "Phase",
  "Primary Focus",
  "Resource",
  ...TIMELINE_COLUMNS,
  "GT/Test",
  "Deliverable",
  "Planned_Hours",
];

const TRACKABLE_TEMPLATE_META = {
  "06:30-08:00": { key: "morning_revision", label: "Morning Revision" },
  "08:15-10:45": { key: "block_a", label: "Block A" },
  "11:00-13:30": { key: "block_b", label: "Block B" },
  "14:15-16:45": { key: "consolidation", label: "Consolidation" },
  "17:00-19:30": { key: "mcq", label: "MCQ Block" },
  "20:15-21:45": { key: "pyq_image", label: "PYQ / Image Block" },
  "22:00-23:00": { key: "night_recall", label: "Night Recall" },
};

const SEPARATOR_TEMPLATE_META = {
  "08:00-08:15": { key: "break_1", label: "Break", kind: "break" },
  "10:45-11:00": { key: "break_2", label: "Break", kind: "break" },
  "13:30-14:15": { key: "lunch", label: "Lunch", kind: "meal" },
  "16:45-17:00": { key: "break_3", label: "Break", kind: "break" },
  "19:30-20:15": { key: "dinner", label: "Dinner", kind: "meal" },
  "21:45-22:00": { key: "break_4", label: "Break", kind: "break" },
};

const SUBJECT_ALIAS_OVERRIDES = {
  "Community Medicine": ["PSM", "CM"],
  "Forensic Medicine": ["FMT"],
  Ophthalmology: ["Ophthal"],
  Anaesthesia: ["Anesthesia"],
  Dermatology: ["Derm"],
  Psychiatry: ["Psych"],
  Orthopaedics: ["Orthopedics", "Ortho"],
  Paediatrics: ["Pediatrics", "Paeds"],
  "Obstetrics & Gynaecology": ["OBG", "OB/GYN"],
};

const phaseDescriptions = {
  "Orientation + baseline": "System setup, diagnostic baseline, and source locking.",
  "First pass (concept rescue + notes marking)": "Marrow-led topic rescue with same-day note consolidation and MCQs.",
  "Grand test + analysis": "Timed test day with structured review and next-step targeting.",
  "Revision 1 (notes + QBank + PYQ)": "First revision pass focused on notes, question banks, and PYQs.",
  "Revision 1 (mixed PYQ repair)": "Mixed PYQ repair day for patching repeat mistakes.",
  "Revision 2 (compression phase)": "Compressed revision with high-yield recall and selective repair.",
  "Revision 2 (image-heavy)": "Image and visual-heavy revision pass.",
  "Revision 2 (PYQ day)": "Full-spectrum PYQ consolidation across subjects.",
  "Revision 2 (error elimination)": "Wrong-notebook and bookmarked-question cleanup.",
  "Revision 2 (volatile list day)": "Latest updates, volatile tables, programs, antidotes, and repeat-risk facts.",
  "Revision 2 (buffer)": "Buffer rescue day for weakest subjects and spillover.",
  "Final assault": "Endgame consolidation, super-revision, and final confidence-building passes.",
  "Pre-exam day": "Calm recall, logistics, and sleep protection.",
};

const allowedGtTestTypes = new Set(["No", "Diagnostic 100Q", "Full GT", "120Q half-sim"]);
const allowedQuoteCategories = new Set(["daily", "tough_day", "celebration"]);

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

function readWorkbook() {
  const workbook = XLSX.readFile(workbookPath);
  const missingSheets = REQUIRED_SHEETS.filter((sheetName) => !workbook.Sheets[sheetName]);
  assert(missingSheets.length === 0, `Missing workbook sheet(s): ${missingSheets.join(", ")}`);
  return workbook;
}

function readWorkbookSheet(workbook, name) {
  const sheet = workbook.Sheets[name];
  assert(sheet, `Missing sheet: ${name}`);
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  assert(rows.length > 0, `Sheet ${name} is empty`);
  return rows;
}

function ensureColumns(rows, sheetName, requiredColumns) {
  const available = new Set(Object.keys(rows[0] ?? {}));
  const missing = requiredColumns.filter((column) => !available.has(column));
  assert(missing.length === 0, `${sheetName} is missing required column(s): ${missing.join(", ")}`);
}

function requireString(value, label) {
  const result = String(value ?? "").trim();
  assert(result.length > 0, `${label} is required`);
  return result;
}

function requireFiniteNumber(value, label) {
  const result = Number(value);
  assert(Number.isFinite(result), `${label} must be a finite number, received: ${String(value)}`);
  return result;
}

function requireInteger(value, label) {
  const result = requireFiniteNumber(value, label);
  assert(Number.isInteger(result), `${label} must be an integer, received: ${String(value)}`);
  return result;
}

function parseTimeRange(range, label) {
  const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(range);
  assert(match, `${label} must be a time range like HH:MM-HH:MM, received: ${range}`);
  return { start: match[1], end: match[2] };
}

function timeToMinutes(value, label) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  assert(match, `${label} must be in HH:MM format, received: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function durationHoursFromRange(range) {
  const { start, end } = parseTimeRange(range, `Range ${range}`);
  return (timeToMinutes(end, `Range ${range} end`) - timeToMinutes(start, `Range ${range} start`)) / 60;
}

function durationMinutesFromRange(range) {
  const { start, end } = parseTimeRange(range, `Range ${range}`);
  return timeToMinutes(end, `Range ${range} end`) - timeToMinutes(start, `Range ${range} start`);
}

function nearlyEqual(left, right) {
  return Math.abs(left - right) < 0.001;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTrackableTemplates(blockHourRows) {
  ensureColumns(blockHourRows, "Block_Hours", ["Block", "Hours"]);
  assert(
    blockHourRows.length === Object.keys(TRACKABLE_TEMPLATE_META).length,
    `Block_Hours must contain ${Object.keys(TRACKABLE_TEMPLATE_META).length} rows`,
  );

  const templates = blockHourRows.map((row, index) => {
    const column = requireString(row.Block, `Block_Hours row ${index + 1} Block`);
    const meta = TRACKABLE_TEMPLATE_META[column];
    assert(meta, `Unexpected trackable block range in Block_Hours: ${column}`);

    const durationHours = requireFiniteNumber(row.Hours, `Block_Hours ${column} Hours`);
    const expectedHours = durationHoursFromRange(column);
    assert(
      nearlyEqual(durationHours, expectedHours),
      `Block_Hours ${column} must equal ${expectedHours}h, received ${durationHours}`,
    );

    const { start, end } = parseTimeRange(column, `Block_Hours ${column}`);

    return {
      key: meta.key,
      label: meta.label,
      column,
      start,
      end,
      durationHours,
      trackable: true,
      order: TIMELINE_COLUMNS.indexOf(column) + 1,
      kind: "study",
    };
  });

  const seenColumns = new Set(templates.map((template) => template.column));
  const missingTrackables = Object.keys(TRACKABLE_TEMPLATE_META).filter((column) => !seenColumns.has(column));
  assert(missingTrackables.length === 0, `Block_Hours is missing trackable ranges: ${missingTrackables.join(", ")}`);

  return templates.sort((left, right) => left.order - right.order);
}

function buildTimelineTemplates(trackableTemplates) {
  const trackableByColumn = new Map(trackableTemplates.map((template) => [template.column, template]));

  return TIMELINE_COLUMNS.map((column, index) => {
    const trackableTemplate = trackableByColumn.get(column);
    if (trackableTemplate) {
      return { ...trackableTemplate, order: index + 1 };
    }

    const separator = SEPARATOR_TEMPLATE_META[column];
    assert(separator, `No timeline template metadata configured for non-trackable slot ${column}`);
    const { start, end } = parseTimeRange(column, `Timeline column ${column}`);
    return {
      key: separator.key,
      label: separator.label,
      column,
      start,
      end,
      durationHours: durationHoursFromRange(column),
      trackable: false,
      order: index + 1,
      kind: separator.kind,
    };
  });
}

function parseReadmeRows(readmeRows) {
  ensureColumns(readmeRows, "Readme", ["Section", "Details"]);
  return readmeRows.map((row, index) => ({
    section: requireString(row.Section, `Readme row ${index + 1} Section`),
    details: requireString(row.Details, `Readme row ${index + 1} Details`),
  }));
}

function parseSubjects(subjectRows) {
  ensureColumns(subjectRows, "Subject_Strategy", [
    "Subject",
    "WoR_hours",
    "First_pass_days",
    "Priority_tier",
    "Resource_decision",
    "Must_focus_topics",
  ]);

  const seenSubjects = new Set();
  const subjects = subjectRows.map((row, index) => {
    const subject = requireString(row.Subject, `Subject_Strategy row ${index + 1} Subject`);
    assert(!seenSubjects.has(subject), `Subject_Strategy contains duplicate subject: ${subject}`);
    seenSubjects.add(subject);

    const worHours = requireFiniteNumber(row.WoR_hours, `Subject_Strategy ${subject} WoR_hours`);
    const firstPassDays = requireFiniteNumber(row.First_pass_days, `Subject_Strategy ${subject} First_pass_days`);
    assert(firstPassDays > 0, `Subject_Strategy ${subject} First_pass_days must be positive`);

    const mustFocusTopics = requireString(row.Must_focus_topics, `Subject_Strategy ${subject} Must_focus_topics`)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    assert(mustFocusTopics.length > 0, `Subject_Strategy ${subject} must list at least one focus topic`);

    return {
      subject,
      worHours,
      firstPassDays,
      priorityTier: requireString(row.Priority_tier, `Subject_Strategy ${subject} Priority_tier`),
      resourceDecision: requireString(row.Resource_decision, `Subject_Strategy ${subject} Resource_decision`),
      mustFocusTopics,
    };
  });

  assert(subjects.length === 19, `Subject_Strategy must contain 19 subjects, received ${subjects.length}`);
  return subjects;
}

function parseGtTestType(value, label) {
  const result = requireString(value, label);
  assert(allowedGtTestTypes.has(result), `${label} must be one of ${[...allowedGtTestTypes].join(", ")}, received ${result}`);
  return result;
}

function parseDays(dayRows, timelineTemplates, trackableTemplates) {
  ensureColumns(dayRows, "Daywise_Plan", DAYWISE_REQUIRED_COLUMNS);
  assert(dayRows.length === 100, `Daywise_Plan must contain 100 days, received ${dayRows.length}`);

  const trackablePlannedHours = trackableTemplates.reduce((total, template) => total + template.durationHours, 0);
  const seenDays = new Set();

  return dayRows.map((row, index) => {
    const dayNumber = requireInteger(row.Day, `Daywise_Plan row ${index + 1} Day`);
    assert(dayNumber === index + 1, `Daywise_Plan day order must be consecutive from 1..100; expected ${index + 1}, received ${dayNumber}`);
    assert(!seenDays.has(dayNumber), `Daywise_Plan contains duplicate day number ${dayNumber}`);
    seenDays.add(dayNumber);

    const plannedHours = requireFiniteNumber(row.Planned_Hours, `Day ${dayNumber} Planned_Hours`);
    assert(
      nearlyEqual(plannedHours, trackablePlannedHours),
      `Day ${dayNumber} Planned_Hours must equal the Block_Hours total of ${trackablePlannedHours}, received ${plannedHours}`,
    );

    const slots = timelineTemplates.map((template) => ({
      ...template,
      description: requireString(row[template.column], `Day ${dayNumber} ${template.column}`),
    }));

    const originalMorningItems = requireString(row["06:30-08:00"], `Day ${dayNumber} morning revision`)
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

    assert(originalMorningItems.length > 0, `Day ${dayNumber} must include at least one morning revision item`);

    return {
      dayNumber,
      phase: requireString(row.Phase, `Day ${dayNumber} Phase`),
      primaryFocus: requireString(row["Primary Focus"], `Day ${dayNumber} Primary Focus`),
      resource: requireString(row.Resource, `Day ${dayNumber} Resource`),
      originalMorningItems,
      gtTest: parseGtTestType(row["GT/Test"], `Day ${dayNumber} GT/Test`),
      deliverable: requireString(row.Deliverable, `Day ${dayNumber} Deliverable`),
      plannedHours,
      slots,
    };
  });
}

function buildPhases(days) {
  const phaseMap = new Map();

  for (const day of days) {
    const existing = phaseMap.get(day.phase);
    if (!existing) {
      phaseMap.set(day.phase, {
        name: day.phase,
        startDay: day.dayNumber,
        endDay: day.dayNumber,
        days: 1,
      });
      continue;
    }

    existing.endDay = day.dayNumber;
    existing.days += 1;
  }

  return [...phaseMap.values()].map((phase) => ({
    ...phase,
    description: phaseDescriptions[phase.name] ?? "Study phase",
  }));
}

function getSubjectAliases(subject) {
  return [subject, ...(SUBJECT_ALIAS_OVERRIDES[subject] ?? [])];
}

function validateSubjectCoverage(subjects, days) {
  const scheduleCorpus = days
    .map((day) => [day.primaryFocus, ...day.slots.map((slot) => slot.description)].join(" "))
    .join("\n");

  const missingSubjects = subjects
    .filter((subject) =>
      !getSubjectAliases(subject.subject).some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(scheduleCorpus)),
    )
    .map((subject) => subject.subject);

  assert(
    missingSubjects.length === 0,
    `Subject_Strategy subjects not referenced anywhere in Daywise_Plan: ${missingSubjects.join(", ")}`,
  );
}

function parseGtPlan(gtRows, days) {
  ensureColumns(gtRows, "GT_Test_Plan", ["Day", "Test_type", "Purpose", "What_to_measure", "Must_output_after_test"]);
  const dayMap = new Map(days.map((day) => [day.dayNumber, day]));
  const seenDays = new Set();

  const gtPlan = gtRows.map((row, index) => {
    const dayNumber = requireInteger(row.Day, `GT_Test_Plan row ${index + 1} Day`);
    assert(dayMap.has(dayNumber), `GT_Test_Plan references unknown day ${dayNumber}`);
    assert(!seenDays.has(dayNumber), `GT_Test_Plan contains duplicate day ${dayNumber}`);
    seenDays.add(dayNumber);

    const testType = parseGtTestType(row.Test_type, `GT_Test_Plan day ${dayNumber} Test_type`);
    assert(testType !== "No", `GT_Test_Plan day ${dayNumber} cannot use Test_type "No"`);

    const matchingDay = dayMap.get(dayNumber);
    assert(
      matchingDay.gtTest === testType,
      `GT_Test_Plan day ${dayNumber} (${testType}) does not match Daywise_Plan GT/Test (${matchingDay.gtTest})`,
    );

    return {
      dayNumber,
      testType,
      purpose: requireString(row.Purpose, `GT_Test_Plan day ${dayNumber} Purpose`),
      whatToMeasure: requireString(row.What_to_measure, `GT_Test_Plan day ${dayNumber} What_to_measure`),
      mustOutputAfterTest: requireString(
        row.Must_output_after_test,
        `GT_Test_Plan day ${dayNumber} Must_output_after_test`,
      ),
    };
  });

  const plannedGtDays = days
    .filter((day) => day.gtTest !== "No")
    .map((day) => day.dayNumber)
    .sort((left, right) => left - right);

  const gtPlanDays = gtPlan.map((item) => item.dayNumber).sort((left, right) => left - right);

  assert(
    JSON.stringify(gtPlanDays) === JSON.stringify(plannedGtDays),
    `GT_Test_Plan days ${gtPlanDays.join(", ")} do not match GT/Test days ${plannedGtDays.join(", ")}`,
  );

  return gtPlan;
}

function parseQuotes() {
  const workbook = XLSX.readFile(quotesPath, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  assert(sheet, "quotes.csv is empty");

  return XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => {
    const quote = requireString(row.quote, `quotes.csv row ${index + 1} quote`);
    const author = requireString(row.author, `quotes.csv row ${index + 1} author`);
    const category = requireString(row.category, `quotes.csv row ${index + 1} category`);

    assert(
      allowedQuoteCategories.has(category),
      `quotes.csv row ${index + 1} category must be one of ${[...allowedQuoteCategories].join(", ")}, received ${category}`,
    );

    return {
      id: `quote-${index + 1}`,
      quote,
      author,
      category,
    };
  });
}

async function readManualJson(filename, label) {
  const source = await readFile(resolve(manualJsonDir, filename), "utf8");
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateManualJson(daywisePlan, subjectStrategy, gtTestPlan, dayRows, subjectRows, gtRows) {
  assert(daywisePlan.version === 1, "manual Daywise_Plan JSON must use version 1");
  assert(daywisePlan.sourceSheet === "Daywise_Plan", "manual Daywise_Plan JSON must declare sourceSheet Daywise_Plan");
  assert(subjectStrategy.version === 1, "manual Subject_Strategy JSON must use version 1");
  assert(
    subjectStrategy.sourceSheet === "Subject_Strategy",
    "manual Subject_Strategy JSON must declare sourceSheet Subject_Strategy",
  );
  assert(gtTestPlan.version === 1, "manual GT_Test_Plan JSON must use version 1");
  assert(gtTestPlan.sourceSheet === "GT_Test_Plan", "manual GT_Test_Plan JSON must declare sourceSheet GT_Test_Plan");

  assert(daywisePlan.days.length === dayRows.length, `manual Daywise_Plan JSON must contain ${dayRows.length} days`);
  assert(subjectStrategy.subjects.length === subjectRows.length, `manual Subject_Strategy JSON must contain ${subjectRows.length} subjects`);
  assert(gtTestPlan.tests.length === gtRows.length, `manual GT_Test_Plan JSON must contain ${gtRows.length} rows`);
  assert(daywisePlan.slotCatalog.length === TIMELINE_COLUMNS.length, "manual slotCatalog must contain all 13 workbook slots");

  daywisePlan.slotCatalog.forEach((slot, index) => {
    const expectedColumn = TIMELINE_COLUMNS[index];
    assert(slot.timeSlotKey === expectedColumn, `manual slotCatalog row ${index + 1} must use ${expectedColumn}`);
  });

  const gtRefByDay = new Map(gtTestPlan.tests.map((entry) => [entry.dayNumber, entry.gtPlanRef]));

  daywisePlan.days.forEach((day, index) => {
    const workbookDay = dayRows[index];
    assert(day.dayNumber === Number(workbookDay.Day), `manual Daywise_Plan day ${index + 1} dayNumber mismatch`);
    assert(day.phaseName === String(workbookDay.Phase), `manual Daywise_Plan day ${day.dayNumber} phase mismatch`);
    assert(
      day.primaryFocusRaw === String(workbookDay["Primary Focus"]).trim(),
      `manual Daywise_Plan day ${day.dayNumber} primary focus mismatch`,
    );
    assert(day.resourceRaw === String(workbookDay.Resource).trim(), `manual Daywise_Plan day ${day.dayNumber} resource mismatch`);
    assert(
      day.deliverableRaw === String(workbookDay.Deliverable).trim(),
      `manual Daywise_Plan day ${day.dayNumber} deliverable mismatch`,
    );
    assert(day.gtTestType === String(workbookDay["GT/Test"]).trim(), `manual Daywise_Plan day ${day.dayNumber} GT/Test mismatch`);
    assert(day.blocks.length === TIMELINE_COLUMNS.length, `manual Daywise_Plan day ${day.dayNumber} must contain 13 blocks`);

    day.blocks.forEach((block, blockIndex) => {
      const expectedColumn = TIMELINE_COLUMNS[blockIndex];
      assert(
        block.timeSlotKey === expectedColumn,
        `manual Daywise_Plan day ${day.dayNumber} block ${blockIndex + 1} must use ${expectedColumn}`,
      );
      assert(
        block.rawText === String(workbookDay[expectedColumn]).trim(),
        `manual Daywise_Plan day ${day.dayNumber} block ${expectedColumn} rawText mismatch`,
      );
      const slotDuration = durationMinutesFromRange(expectedColumn) * 60;
      const plannedSeconds = block.items.reduce((total, item) => total + Number(item.plannedMinutes ?? 0) * 60, 0);
      if (block.trackable) {
        assert(block.items.length > 0, `manual Daywise_Plan day ${day.dayNumber} block ${expectedColumn} must contain items`);
        assert(
          plannedSeconds === slotDuration,
          `manual Daywise_Plan day ${day.dayNumber} block ${expectedColumn} items must sum to ${durationMinutesFromRange(expectedColumn)} minutes`,
        );
      } else {
        assert(block.items.length === 0, `manual Daywise_Plan day ${day.dayNumber} block ${expectedColumn} must not contain items`);
      }
    });

    const expectedGtRef = gtRefByDay.get(day.dayNumber) ?? null;
    assert(day.gtPlanRef === expectedGtRef, `manual Daywise_Plan day ${day.dayNumber} gtPlanRef mismatch`);
  });

  subjectStrategy.subjects.forEach((subject, index) => {
    const workbookSubject = subjectRows[index];
    assert(
      subject.subjectName === String(workbookSubject.Subject).trim(),
      `manual Subject_Strategy row ${index + 1} subject mismatch`,
    );
    assert(
      subject.worHours === Number(workbookSubject.WoR_hours),
      `manual Subject_Strategy ${subject.subjectName} WoR_hours mismatch`,
    );
    assert(
      subject.firstPassDays === Number(workbookSubject.First_pass_days),
      `manual Subject_Strategy ${subject.subjectName} First_pass_days mismatch`,
    );
    assert(
      subject.resourceDecisionRaw === String(workbookSubject.Resource_decision).trim(),
      `manual Subject_Strategy ${subject.subjectName} resource decision mismatch`,
    );
  });

  gtTestPlan.tests.forEach((test, index) => {
    const workbookGt = gtRows[index];
    assert(test.dayNumber === Number(workbookGt.Day), `manual GT_Test_Plan row ${index + 1} day mismatch`);
    assert(test.testType === String(workbookGt.Test_type).trim(), `manual GT_Test_Plan day ${test.dayNumber} test type mismatch`);
    assert(test.purposeRaw === String(workbookGt.Purpose).trim(), `manual GT_Test_Plan day ${test.dayNumber} purpose mismatch`);
    assert(
      test.whatToMeasureRaw === String(workbookGt.What_to_measure).trim(),
      `manual GT_Test_Plan day ${test.dayNumber} measure mismatch`,
    );
    assert(
      test.mustOutputRaw === String(workbookGt.Must_output_after_test).trim(),
      `manual GT_Test_Plan day ${test.dayNumber} output mismatch`,
    );
  });
}

async function main() {
  const workbook = readWorkbook();
  const readmeRows = readWorkbookSheet(workbook, "Readme");
  const dayRows = readWorkbookSheet(workbook, "Daywise_Plan");
  const blockHourRows = readWorkbookSheet(workbook, "Block_Hours");
  const subjectRows = readWorkbookSheet(workbook, "Subject_Strategy");
  const gtRows = readWorkbookSheet(workbook, "GT_Test_Plan");

  const workbookReadme = parseReadmeRows(readmeRows);
  const blockTemplates = buildTimelineTemplates(buildTrackableTemplates(blockHourRows));
  const days = parseDays(dayRows, blockTemplates, blockTemplates.filter((template) => template.trackable));
  const subjects = parseSubjects(subjectRows);
  validateSubjectCoverage(subjects, days);
  const gtPlan = parseGtPlan(gtRows, days);
  const phases = buildPhases(days);
  const quotes = parseQuotes();
  const daywisePlan = await readManualJson("daywise-plan.json", "manual Daywise_Plan JSON");
  const subjectStrategy = await readManualJson("subject-strategy.json", "manual Subject_Strategy JSON");
  const gtTestPlan = await readManualJson("gt-test-plan.json", "manual GT_Test_Plan JSON");
  validateManualJson(daywisePlan, subjectStrategy, gtTestPlan, dayRows, subjectRows, gtRows);

  await mkdir(generatedDir, { recursive: true });

  const scheduleSource = `import type { GeneratedScheduleBundle } from "@/lib/domain/types";

export const scheduleData: GeneratedScheduleBundle = ${toArrayLiteral({
    examDate: "2026-08-30",
    hardBoundaryDate: "2026-08-20",
    trackableBlockOrder: blockTemplates.filter((template) => template.trackable).map((template) => template.key),
    blockTemplates,
    workbookReadme,
    days,
    phases,
    gtPlan,
    subjects,
  })};
`;

  const quotesSource = `import type { GeneratedQuote } from "@/lib/domain/types";

export const quotesData: GeneratedQuote[] = ${toArrayLiteral(quotes)};
`;

  const workbookSemanticSource = `import type { WorkbookSemanticBundle } from "@/lib/domain/workbook-types";

export const workbookSemanticData: WorkbookSemanticBundle = ${toArrayLiteral({
    daywisePlan,
    subjectStrategy,
    gtTestPlan,
  })};
`;

  await writeFile(resolve(generatedDir, "schedule-data.ts"), scheduleSource);
  await writeFile(resolve(generatedDir, "quotes-data.ts"), quotesSource);
  await writeFile(resolve(generatedDir, "workbook-semantic-data.ts"), workbookSemanticSource);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
