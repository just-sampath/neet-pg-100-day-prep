import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const resourcesDir = resolve(root, "resources");
const manualJsonDir = resolve(resourcesDir, "manual-json");
const generatedDir = resolve(root, "src/lib/generated");

const quotesPath = resolve(resourcesDir, "quotes.csv");

const allowedQuoteCategories = new Set(["daily", "tough_day", "celebration"]);

const phaseDescriptions = {
  orientation_baseline: "System setup, baseline capture, and note-locking before the full study arc begins.",
  first_pass: "Concept rescue, notes marking, and same-subject reinforcement anchored to the first pass.",
  grand_test_analysis: "Assessment day with structured review, weak-area targeting, and follow-up repair.",
  revision_1: "First revision pass built around notes, QBank, PYQs, and targeted reinforcement.",
  revision_1_mixed_pyq_repair: "Mixed PYQ repair block for repeat mistakes and unstable patterns.",
  revision_2_compression: "Compressed second revision with high-yield recall and selective repair.",
  revision_2_image_heavy: "Image-heavy second revision with visual and rapid-recognition focus.",
  revision_2_pyq_day: "PYQ-heavy day for pattern locking and exam-style consolidation.",
  revision_2_error_elimination: "Error elimination day for repeat wrongs, traps, and fragile recall.",
  revision_2_volatile_list_day: "Volatile-list day for formulas, programs, tables, and repeat-risk facts.",
  revision_2_buffer: "Buffer rescue day for weakest subjects and controlled spillover recovery.",
  final_assault: "Final assault for wrong-notebook repair, volatile recall, and calm endgame compression.",
  pre_exam_day: "Pre-exam calm day focused on logistics, light recall, and sleep protection.",
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

async function readJson(filename, label) {
  const source = await readFile(resolve(manualJsonDir, filename), "utf8");
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
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

function validateScheduleData(daywisePlan, subjectStrategy, gtTestPlan) {
  assert(daywisePlan.version === 1, "daywise-plan.json must use version 1");
  assert(daywisePlan.sourceSheet === "Daywise_Plan", "daywise-plan.json must declare sourceSheet Daywise_Plan");
  assert(subjectStrategy.version === 1, "subject-strategy.json must use version 1");
  assert(subjectStrategy.sourceSheet === "Subject_Strategy", "subject-strategy.json must declare sourceSheet Subject_Strategy");
  assert(gtTestPlan.version === 1, "gt-test-plan.json must use version 1");
  assert(gtTestPlan.sourceSheet === "GT_Test_Plan", "gt-test-plan.json must declare sourceSheet GT_Test_Plan");

  assert(daywisePlan.days.length === 100, "daywise-plan.json must contain exactly 100 days");
  assert(daywisePlan.slotCatalog.length === 13, "daywise-plan.json must contain exactly 13 time slots");
  assert(subjectStrategy.subjects.length === 19, "subject-strategy.json must contain exactly 19 subjects");
  assert(gtTestPlan.tests.length > 0, "gt-test-plan.json must contain GT entries");

  const slotCatalog = daywisePlan.slotCatalog;
  const gtRefs = new Map(gtTestPlan.tests.map((entry) => [entry.dayNumber, entry.gtPlanRef]));

  daywisePlan.days.forEach((day, dayIndex) => {
    assert(day.dayNumber === dayIndex + 1, `day ${dayIndex + 1} must have dayNumber ${dayIndex + 1}`);
    assert(day.blocks.length === slotCatalog.length, `day ${day.dayNumber} must contain 13 blocks`);

    day.blocks.forEach((block, blockIndex) => {
      const slot = slotCatalog[blockIndex];
      assert(block.timeSlotKey === slot.timeSlotKey, `day ${day.dayNumber} block ${blockIndex + 1} must use slot ${slot.timeSlotKey}`);

      const plannedMinutes = block.items.reduce((total, item) => total + Number(item.plannedMinutes ?? 0), 0);
      if (block.trackable) {
        assert(block.items.length > 0, `day ${day.dayNumber} slot ${block.timeSlotKey} must include items`);
        assert(
          plannedMinutes === slot.durationMinutes,
          `day ${day.dayNumber} slot ${block.timeSlotKey} items must sum to ${slot.durationMinutes} minutes`,
        );
      } else {
        assert(block.items.length === 0, `non-trackable slot ${block.timeSlotKey} on day ${day.dayNumber} must not contain items`);
      }
    });

    const expectedGtRef = gtRefs.get(day.dayNumber) ?? null;
    assert(day.gtPlanRef === expectedGtRef, `day ${day.dayNumber} gtPlanRef mismatch`);
  });
}

function buildGeneratedScheduleData(daywisePlan, subjectStrategy, gtTestPlan) {
  return {
    examDate: "2026-08-30",
    hardBoundaryDate: "2026-08-20",
    daywisePlan: {
      version: daywisePlan.version,
      source: "manual-json",
      sourceSheet: daywisePlan.sourceSheet,
      phaseCatalog: daywisePlan.phaseCatalog.map((phase) => ({
        ...phase,
        description: phaseDescriptions[phase.phaseGroup] ?? phase.phaseName,
      })),
      slotCatalog: daywisePlan.slotCatalog,
      days: daywisePlan.days,
    },
    subjectStrategy: {
      version: subjectStrategy.version,
      source: "manual-json",
      sourceSheet: subjectStrategy.sourceSheet,
      subjects: subjectStrategy.subjects,
    },
    gtTestPlan: {
      version: gtTestPlan.version,
      source: "manual-json",
      sourceSheet: gtTestPlan.sourceSheet,
      tests: gtTestPlan.tests,
    },
  };
}

async function main() {
  const [daywisePlan, subjectStrategy, gtTestPlan, quotes] = await Promise.all([
    readJson("daywise-plan.json", "daywise-plan.json"),
    readJson("subject-strategy.json", "subject-strategy.json"),
    readJson("gt-test-plan.json", "gt-test-plan.json"),
    parseQuotes(),
  ]);

  validateScheduleData(daywisePlan, subjectStrategy, gtTestPlan);

  const scheduleData = buildGeneratedScheduleData(daywisePlan, subjectStrategy, gtTestPlan);

  await mkdir(generatedDir, { recursive: true });

  const scheduleSource = `import type { ScheduleDataBundle } from "@/lib/domain/schedule-data-types";

export const scheduleData: ScheduleDataBundle = ${toArrayLiteral(scheduleData)};
`;

  const quotesSource = `import type { GeneratedQuote } from "@/lib/domain/types";

export const quotesData: GeneratedQuote[] = ${toArrayLiteral(quotes)};
`;

  await writeFile(resolve(generatedDir, "schedule-data.ts"), scheduleSource);
  await writeFile(resolve(generatedDir, "quotes-data.ts"), quotesSource);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
