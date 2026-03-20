import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import XLSX from "xlsx";

const root = resolve(process.cwd());
const resourcesDir = resolve(root, "resources");
const generatedDir = resolve(root, "src/lib/generated");

const workbookPath = resolve(resourcesDir, "neet_pg_2026_100_day_schedule.xlsx");
const quotesPath = resolve(resourcesDir, "quotes.csv");

const trackableMappings = [
  { key: "morning_revision", label: "Morning Revision", column: "06:30-08:00", start: "06:30", end: "08:00", order: 1, trackable: true },
  { key: "break_1", label: "Break", column: "08:00-08:15", start: "08:00", end: "08:15", order: 2, trackable: false },
  { key: "block_a", label: "Block A", column: "08:15-10:45", start: "08:15", end: "10:45", order: 3, trackable: true },
  { key: "break_2", label: "Break", column: "10:45-11:00", start: "10:45", end: "11:00", order: 4, trackable: false },
  { key: "block_b", label: "Block B", column: "11:00-13:30", start: "11:00", end: "13:30", order: 5, trackable: true },
  { key: "lunch", label: "Lunch", column: "13:30-14:15", start: "13:30", end: "14:15", order: 6, trackable: false },
  { key: "consolidation", label: "Consolidation", column: "14:15-16:45", start: "14:15", end: "16:45", order: 7, trackable: true },
  { key: "break_3", label: "Break", column: "16:45-17:00", start: "16:45", end: "17:00", order: 8, trackable: false },
  { key: "mcq", label: "MCQ Block", column: "17:00-19:30", start: "17:00", end: "19:30", order: 9, trackable: true },
  { key: "dinner", label: "Dinner", column: "19:30-20:15", start: "19:30", end: "20:15", order: 10, trackable: false },
  { key: "pyq_image", label: "PYQ / Image Block", column: "20:15-21:45", start: "20:15", end: "21:45", order: 11, trackable: true },
  { key: "break_4", label: "Break", column: "21:45-22:00", start: "21:45", end: "22:00", order: 12, trackable: false },
  { key: "night_recall", label: "Night Recall", column: "22:00-23:00", start: "22:00", end: "23:00", order: 13, trackable: true },
];

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

function readWorkbook() {
  return XLSX.readFile(workbookPath);
}

function readWorkbookSheet(name) {
  const workbook = readWorkbook();
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    throw new Error(`Missing sheet: ${name}`);
  }

  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function toArrayLiteral(value) {
  return JSON.stringify(value, null, 2);
}

async function main() {
  const dayRows = readWorkbookSheet("Daywise_Plan");
  const subjectRows = readWorkbookSheet("Subject_Strategy");
  const gtRows = readWorkbookSheet("GT_Test_Plan");

  const days = dayRows.map((row) => ({
    dayNumber: Number(row.Day),
    phase: String(row.Phase),
    primaryFocus: String(row["Primary Focus"]),
    resource: String(row.Resource),
    originalMorningItems: String(row["06:30-08:00"])
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
    gtTest: String(row["GT/Test"]),
    deliverable: String(row.Deliverable),
    plannedHours: Number(row.Planned_Hours),
    slots: trackableMappings.map((slot) => ({
      key: slot.key,
      label: slot.label,
      start: slot.start,
      end: slot.end,
      description: String(row[slot.column] ?? ""),
      trackable: slot.trackable,
      order: slot.order,
    })),
  }));

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

  const phases = [...phaseMap.values()].map((phase) => ({
    ...phase,
    description: phaseDescriptions[phase.name] ?? "Study phase",
  }));

  const subjects = subjectRows.map((row) => ({
    subject: String(row.Subject),
    worHours: Number(row.WoR_hours),
    firstPassDays: Number(row.First_pass_days),
    priorityTier: String(row.Priority_tier),
    resourceDecision: String(row.Resource_decision),
    mustFocusTopics: String(row.Must_focus_topics)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  }));

  const gtPlan = gtRows.map((row) => ({
    dayNumber: Number(row.Day),
    testType: String(row.Test_type),
    purpose: String(row.Purpose),
    whatToMeasure: String(row.What_to_measure),
    mustOutputAfterTest: String(row.Must_output_after_test),
  }));

  const quotesWorkbook = XLSX.readFile(quotesPath, { type: "string" });
  const quotesSheet = quotesWorkbook.Sheets[quotesWorkbook.SheetNames[0]];
  const quotes = XLSX.utils.sheet_to_json(quotesSheet, { defval: "" }).map((row, index) => ({
    id: `quote-${index + 1}`,
    quote: row.quote,
    author: row.author,
    category: row.category,
  }));

  await mkdir(generatedDir, { recursive: true });

  const scheduleSource = `import type { GeneratedScheduleBundle } from "@/lib/domain/types";

export const scheduleData: GeneratedScheduleBundle = ${toArrayLiteral({
    examDate: "2026-08-30",
    hardBoundaryDate: "2026-08-20",
    trackableBlockOrder: ["morning_revision", "block_a", "block_b", "consolidation", "mcq", "pyq_image", "night_recall"],
    days,
    phases,
    gtPlan,
    subjects,
  })};
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
