import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import XLSX from "xlsx";

const root = resolve(process.cwd());
const workbookPath = resolve(root, "resources", "neet_pg_2026_100_day_schedule.xlsx");
const outDir = resolve(root, "resources", "manual-json");

const VERSION = 1;
const WORKBOOK_NAME = "neet_pg_2026_100_day_schedule.xlsx";

const SLOT_COLUMNS = [
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

const SLOT_KIND = {
  "06:30-08:00": { timelineKind: "study", defaultTrackable: true },
  "08:00-08:15": { timelineKind: "break", defaultTrackable: false },
  "08:15-10:45": { timelineKind: "study", defaultTrackable: true },
  "10:45-11:00": { timelineKind: "break", defaultTrackable: false },
  "11:00-13:30": { timelineKind: "study", defaultTrackable: true },
  "13:30-14:15": { timelineKind: "meal", defaultTrackable: false },
  "14:15-16:45": { timelineKind: "study", defaultTrackable: true },
  "16:45-17:00": { timelineKind: "break", defaultTrackable: false },
  "17:00-19:30": { timelineKind: "study", defaultTrackable: true },
  "19:30-20:15": { timelineKind: "meal", defaultTrackable: false },
  "20:15-21:45": { timelineKind: "study", defaultTrackable: true },
  "21:45-22:00": { timelineKind: "break", defaultTrackable: false },
  "22:00-23:00": { timelineKind: "study", defaultTrackable: true },
};

const PHASE_GROUPS = {
  "Orientation + baseline": "orientation_baseline",
  "First pass (concept rescue + notes marking)": "first_pass",
  "Grand test + analysis": "grand_test_analysis",
  "Revision 1 (notes + QBank + PYQ)": "revision_1",
  "Revision 1 (mixed PYQ repair)": "revision_1_mixed_pyq_repair",
  "Revision 2 (compression phase)": "revision_2_compression",
  "Revision 2 (image-heavy)": "revision_2_image_heavy",
  "Revision 2 (PYQ day)": "revision_2_pyq_day",
  "Revision 2 (error elimination)": "revision_2_error_elimination",
  "Revision 2 (volatile list day)": "revision_2_volatile_list_day",
  "Revision 2 (buffer)": "revision_2_buffer",
  "Final assault": "final_assault",
  "Pre-exam day": "pre_exam_day",
};

const SUBJECTS = [
  ["anatomy", "Anatomy", ["anat"]],
  ["biochemistry", "Biochemistry", ["biochem"]],
  ["physiology", "Physiology", ["physio"]],
  ["pharmacology", "Pharmacology", ["pharm"]],
  ["microbiology", "Microbiology", ["micro"]],
  ["pathology", "Pathology", ["path"]],
  ["community_medicine", "Community Medicine", ["psm", "cm"]],
  ["forensic_medicine", "Forensic Medicine", ["fmt"]],
  ["ophthalmology", "Ophthalmology", ["ophthal"]],
  ["ent", "ENT", []],
  ["anaesthesia", "Anaesthesia", ["anesthesia"]],
  ["dermatology", "Dermatology", ["derm"]],
  ["psychiatry", "Psychiatry", ["psych"]],
  ["radiology", "Radiology", ["radio"]],
  ["medicine", "Medicine", []],
  ["surgery", "Surgery", []],
  ["orthopaedics", "Orthopaedics", ["orthopedics", "ortho"]],
  ["paediatrics", "Paediatrics", ["pediatrics", "paeds", "peds"]],
  ["obstetrics_gynaecology", "Obstetrics & Gynaecology", ["obg", "obs", "gynae", "obstetrics", "gynaecology"]],
];

const subjectMatchers = SUBJECTS.map(([id, name, aliases]) => ({
  id,
  name,
  aliases: [name, ...aliases].map((entry) => entry.toLowerCase()),
})).sort((left, right) => right.name.length - left.name.length);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function parseRange(range) {
  const [start, end] = range.split("-");
  return { start, end };
}

function toMinutes(clock) {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesForRange(range) {
  const { start, end } = parseRange(range);
  return toMinutes(end) - toMinutes(start);
}

function splitOn(text, delimiter) {
  return String(text)
    .split(delimiter)
    .map((entry) => clean(entry))
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSubjectIds(text, fallback = []) {
  const normalized = clean(text).toLowerCase();
  const ids = new Set();

  for (const subject of subjectMatchers) {
    for (const alias of subject.aliases) {
      const pattern = new RegExp(`(^|[^a-z])${escapeRegExp(alias)}(?=[^a-z]|$)`, "i");
      if (pattern.test(normalized)) {
        ids.add(subject.id);
        break;
      }
    }
  }

  if (ids.size === 0) {
    for (const id of fallback) {
      ids.add(id);
    }
  }

  return [...ids];
}

function distributeMinutes(total, count) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function toPriorityRank(tier) {
  const match = clean(tier).match(/Tier\s*(\d+)/i);
  return match ? Number(match[1]) : 99;
}

function buildPhaseCatalog(dayRows) {
  const phaseCatalog = [];

  for (const row of dayRows) {
    const phaseName = clean(row.Phase);
    const phaseGroup = PHASE_GROUPS[phaseName];
    if (!phaseGroup) {
      throw new Error(`Unknown phase: ${phaseName}`);
    }

    const previous = phaseCatalog.at(-1);
    if (!previous || previous.phaseName !== phaseName) {
      phaseCatalog.push({
        phaseId: phaseGroup,
        phaseName,
        phaseGroup,
        startDay: Number(row.Day),
        endDay: Number(row.Day),
      });
      continue;
    }

    previous.endDay = Number(row.Day);
  }

  return phaseCatalog;
}

function buildSlotCatalog() {
  return SLOT_COLUMNS.map((timeSlotKey, index) => {
    const { start, end } = parseRange(timeSlotKey);
    return {
      timeSlotKey,
      start,
      end,
      durationMinutes: minutesForRange(timeSlotKey),
      timelineKind: SLOT_KIND[timeSlotKey].timelineKind,
      defaultTrackable: SLOT_KIND[timeSlotKey].defaultTrackable,
      order: index + 1,
    };
  });
}

function buildReferenceDayMap(dayRows, gtRows) {
  const byLabel = new Map(dayRows.map((row) => [clean(row["Primary Focus"]), Number(row.Day)]));

  for (const row of gtRows) {
    byLabel.set(clean(row.Purpose), Number(row.Day));
  }

  byLabel.set("Diagnostic baseline + system setup", 1);
  byLabel.set("GT-1", 41);
  byLabel.set("GT-2", 48);
  byLabel.set("GT-3", 58);
  byLabel.set("GT-4", 63);
  byLabel.set("GT-5", 66);
  byLabel.set("GT-6", 73);
  byLabel.set("GT-7", 78);
  byLabel.set("GT-8", 82);
  byLabel.set("GT-9", 87);

  return byLabel;
}

function buildGtRefMap(gtRows) {
  return new Map(
    gtRows.map((row) => [Number(row.Day), `gt_d${String(row.Day).padStart(3, "0")}_${slugify(row.Test_type)}`]),
  );
}

function parseMorningItems(rawText, fallbackSubjects, referenceDayMap) {
  const value = clean(rawText);
  if (/^D\+\d+/u.test(value)) {
    return splitOn(value, "|").map((entry) => {
      const match = entry.match(/^(D\+\d+):\s*(.+)$/u);
      const revisionType = match ? match[1] : null;
      const label = match ? clean(match[2]) : entry;

      return {
        kind: "revision_ref",
        label,
        rawText: entry,
        subjectIds: detectSubjectIds(label, fallbackSubjects),
        revisionEligible: false,
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        notes: null,
        revisionType,
        referenceLabel: label,
        referenceDayNumber: referenceDayMap.get(label) ?? null,
      };
    });
  }

  return [
    {
      kind: "task",
      label: value,
      rawText: value,
      subjectIds: detectSubjectIds(value, fallbackSubjects),
      revisionEligible: false,
      recoveryLane: "none",
      phaseFence: "not_reschedulable",
      notes: null,
      revisionType: null,
      referenceLabel: null,
      referenceDayNumber: null,
    },
  ];
}

function parseFirstPassCore(rawText) {
  const value = clean(rawText).replace(/^Block\s+[AB]\s+—\s+/u, "");

  if (value.includes(";")) {
    return splitOn(value, ";").map((entry) => ({
      label: entry,
      rawText: entry,
    }));
  }

  const colonIndex = value.indexOf(":");
  if (colonIndex !== -1) {
    const prefix = clean(value.slice(0, colonIndex));
    const remainder = clean(value.slice(colonIndex + 1));
    const delimiter = remainder.includes(",") ? "," : remainder.includes(" + ") ? /\s+\+\s+/u : null;

    if (delimiter) {
      return splitOn(remainder, delimiter).map((entry) => ({
        label: `${prefix}: ${entry}`,
        rawText: entry,
      }));
    }
  }

  return [
    {
      label: value,
      rawText: value,
    },
  ];
}

function parseStructuredList(rawText, options = {}) {
  const value = clean(rawText);
  if (!value) {
    return [];
  }

  const semicolons = splitOn(value, ";");
  if (semicolons.length > 1) {
    return semicolons.map((entry) => ({ label: entry, rawText: entry }));
  }

  const pluses = splitOn(value, /\s+\+\s+/u);
  if (pluses.length > 1) {
    return pluses.map((entry) => ({ label: entry, rawText: entry }));
  }

  const colonIndex = value.indexOf(":");
  if (colonIndex !== -1) {
    const prefix = clean(value.slice(0, colonIndex));
    const remainder = clean(value.slice(colonIndex + 1));

    const plusSegments = splitOn(remainder, /\s+\+\s+/u);
    if (plusSegments.length > 1) {
      return plusSegments.map((entry) => ({
        label: `${prefix}: ${entry}`,
        rawText: entry,
      }));
    }

    const commaSegments = splitOn(remainder, ",");
    if (commaSegments.length > 1) {
      return commaSegments.map((entry) => ({
        label: `${prefix}: ${entry}`,
        rawText: entry,
      }));
    }
  }

  if (options.allowCommaSplit) {
    const commaSegments = splitOn(value, ",");
    if (commaSegments.length > 2) {
      return commaSegments.map((entry) => ({ label: entry, rawText: entry }));
    }
  }

  return [{ label: value, rawText: value }];
}

function buildNonTrackableBlock(timeSlotKey) {
  if (SLOT_KIND[timeSlotKey].timelineKind === "meal") {
    return {
      displayLabel: timeSlotKey === "13:30-14:15" ? "Lunch" : "Dinner",
      semanticBlockKey: timeSlotKey === "13:30-14:15" ? "lunch" : "dinner",
      blockIntent: "meal",
      recoveryLane: "none",
      phaseFence: "not_reschedulable",
      reschedulable: false,
      trackable: false,
      trafficLightPolicy: {
        green: "visible",
        yellow: "visible",
        red: "visible",
        backlogWhenHidden: false,
      },
    };
  }

  return {
    displayLabel: "Break",
    semanticBlockKey: `break_${timeSlotKey.replace(/[:\-]/g, "_")}`,
    blockIntent: "break",
    recoveryLane: "none",
    phaseFence: "not_reschedulable",
    reschedulable: false,
    trackable: false,
    trafficLightPolicy: {
      green: "visible",
      yellow: "visible",
      red: "visible",
      backlogWhenHidden: false,
    },
  };
}

function buildTrackableBlockBase({ phaseGroup, dayNumber, timeSlotKey, rawText }) {
  const firstPass = phaseGroup === "first_pass";
  const revisionLike = phaseGroup.startsWith("revision_");
  const finalAssault = phaseGroup === "final_assault";
  const preExam = phaseGroup === "pre_exam_day";
  const gtDay = phaseGroup === "grand_test_analysis";
  const orientation = phaseGroup === "orientation_baseline";
  const lower = clean(rawText).toLowerCase();

  if (timeSlotKey === "06:30-08:00") {
    if (orientation) {
      return {
        displayLabel: "Setup Block",
        semanticBlockKey: "setup_block",
        blockIntent: "setup",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "Warm-Up",
        semanticBlockKey: "gt_warmup",
        blockIntent: "recall",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    return {
      displayLabel: "Morning Revision",
      semanticBlockKey: "morning_revision",
      blockIntent: "revision",
      recoveryLane: "none",
      phaseFence: "not_reschedulable",
      reschedulable: false,
    };
  }

  if (timeSlotKey === "08:15-10:45") {
    if (orientation) {
      return {
        displayLabel: "Diagnostic Block",
        semanticBlockKey: "diagnostic_block",
        blockIntent: "assessment",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (firstPass) {
      return {
        displayLabel: "Study Block 1",
        semanticBlockKey: "study_block_1",
        blockIntent: "core_study",
        recoveryLane: "core_recovery",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "GT Block 1",
        semanticBlockKey: "gt_block_1",
        blockIntent: "assessment",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (revisionLike) {
      return {
        displayLabel: "Revision Block 1",
        semanticBlockKey: "revision_block_1",
        blockIntent: "revision",
        recoveryLane: "core_recovery",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (finalAssault) {
      const notReschedulable = dayNumber >= 94;
      return {
        displayLabel: "Final Block 1",
        semanticBlockKey: "final_block_1",
        blockIntent: lower.includes("wrong notebook") || lower.includes("image") || lower.includes("algorithm")
          ? "repair"
          : "revision",
        recoveryLane: notReschedulable ? "none" : "core_recovery",
        phaseFence: notReschedulable ? "not_reschedulable" : "same_phase_only",
        reschedulable: !notReschedulable,
      };
    }

    if (preExam) {
      return {
        displayLabel: "Light Recall",
        semanticBlockKey: "pre_exam_recall",
        blockIntent: "recall",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }
  }

  if (timeSlotKey === "11:00-13:30") {
    if (orientation) {
      return {
        displayLabel: "Diagnostic Review",
        semanticBlockKey: "diagnostic_review",
        blockIntent: "analysis",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (firstPass) {
      return {
        displayLabel: "Study Block 2",
        semanticBlockKey: "study_block_2",
        blockIntent: "core_study",
        recoveryLane: "core_recovery",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "GT Block 2",
        semanticBlockKey: "gt_block_2",
        blockIntent: "assessment",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (revisionLike) {
      return {
        displayLabel: "Revision Block 2",
        semanticBlockKey: "revision_block_2",
        blockIntent: "revision",
        recoveryLane: "core_recovery",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (finalAssault) {
      const notReschedulable = dayNumber >= 94;
      return {
        displayLabel: "Final Block 2",
        semanticBlockKey: "final_block_2",
        blockIntent: lower.includes("logistics") ? "logistics" : "revision",
        recoveryLane: notReschedulable ? "none" : "core_recovery",
        phaseFence: notReschedulable ? "not_reschedulable" : "same_phase_only",
        reschedulable: !notReschedulable,
      };
    }

    if (preExam) {
      return {
        displayLabel: "Midday Calm",
        semanticBlockKey: "pre_exam_midday",
        blockIntent: "logistics",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }
  }

  if (timeSlotKey === "14:15-16:45") {
    if (orientation) {
      return {
        displayLabel: "Plan Lock",
        semanticBlockKey: "plan_lock_block",
        blockIntent: "setup",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (firstPass) {
      return {
        displayLabel: "Consolidation",
        semanticBlockKey: "consolidation_block",
        blockIntent: "consolidation",
        recoveryLane: "soft_carry",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "GT Analysis",
        semanticBlockKey: "gt_analysis",
        blockIntent: "analysis",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (revisionLike) {
      return {
        displayLabel: "Practice Block",
        semanticBlockKey: "practice_block",
        blockIntent: "practice",
        recoveryLane: "soft_carry",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (finalAssault) {
      const intent = /rest|logistics|stop studying|sleep on time/u.test(lower) ? "logistics" : "practice";
      const reschedulable = dayNumber < 94 && intent === "practice";
      return {
        displayLabel: intent === "practice" ? "Final Practice" : "Final Logistics",
        semanticBlockKey: intent === "practice" ? "final_practice_block" : "final_logistics_block",
        blockIntent: intent,
        recoveryLane: reschedulable ? "soft_carry" : "none",
        phaseFence: reschedulable ? "same_phase_only" : "not_reschedulable",
        reschedulable,
      };
    }

    if (preExam) {
      return {
        displayLabel: "Rest & Logistics",
        semanticBlockKey: "pre_exam_logistics",
        blockIntent: "logistics",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }
  }

  if (timeSlotKey === "17:00-19:30") {
    if (orientation) {
      return {
        displayLabel: "Orientation Prep",
        semanticBlockKey: "orientation_prep",
        blockIntent: "setup",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (firstPass) {
      return {
        displayLabel: "MCQ Block",
        semanticBlockKey: "mcq_block",
        blockIntent: "practice",
        recoveryLane: "soft_carry",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "GT Repair",
        semanticBlockKey: "gt_repair",
        blockIntent: "repair",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (revisionLike) {
      return {
        displayLabel: "Repair Block",
        semanticBlockKey: "repair_block",
        blockIntent: /mcq|questions/u.test(lower) ? "practice" : "repair",
        recoveryLane: "soft_carry",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (finalAssault) {
      const intent = /mcq|questions/u.test(lower) ? "practice" : "repair";
      const reschedulable = dayNumber < 94;
      return {
        displayLabel: intent === "practice" ? "Final Practice" : "Final Repair",
        semanticBlockKey: intent === "practice" ? "final_practice_block_2" : "final_repair_block",
        blockIntent: intent,
        recoveryLane: reschedulable ? "soft_carry" : "none",
        phaseFence: reschedulable ? "same_phase_only" : "not_reschedulable",
        reschedulable,
      };
    }

    if (preExam) {
      return {
        displayLabel: "Shutdown Buffer",
        semanticBlockKey: "pre_exam_shutdown_buffer",
        blockIntent: "shutdown",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }
  }

  if (timeSlotKey === "20:15-21:45") {
    if (orientation) {
      return {
        displayLabel: "Rules Sheet",
        semanticBlockKey: "rules_sheet_block",
        blockIntent: "setup",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (firstPass) {
      return {
        displayLabel: "PYQ / Image Block",
        semanticBlockKey: "pyq_image_block",
        blockIntent: "pyq_image",
        recoveryLane: "soft_carry",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "GT Follow-Up",
        semanticBlockKey: "gt_follow_up",
        blockIntent: "repair",
        recoveryLane: "assessment_recovery",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (revisionLike) {
      return {
        displayLabel: "PYQ / Image Block",
        semanticBlockKey: "pyq_image_block",
        blockIntent: "pyq_image",
        recoveryLane: "soft_carry",
        phaseFence: "same_phase_only",
        reschedulable: true,
      };
    }

    if (finalAssault || preExam) {
      return {
        displayLabel: "Calm Recall",
        semanticBlockKey: finalAssault ? "calm_recall_block" : "pre_exam_calm_recall",
        blockIntent: "recall",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }
  }

  if (timeSlotKey === "22:00-23:00") {
    if (orientation) {
      return {
        displayLabel: "Sleep Reset",
        semanticBlockKey: "sleep_reset",
        blockIntent: "shutdown",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (firstPass) {
      return {
        displayLabel: "Night Recall",
        semanticBlockKey: "night_recall",
        blockIntent: "recall",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (gtDay) {
      return {
        displayLabel: "GT Reflection",
        semanticBlockKey: "gt_reflection",
        blockIntent: "analysis",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (revisionLike) {
      return {
        displayLabel: "Wrong Notebook",
        semanticBlockKey: "wrong_notebook_block",
        blockIntent: "recall",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }

    if (finalAssault || preExam) {
      return {
        displayLabel: "Calm Shutdown",
        semanticBlockKey: "calm_shutdown",
        blockIntent: "shutdown",
        recoveryLane: "none",
        phaseFence: "not_reschedulable",
        reschedulable: false,
      };
    }
  }

  throw new Error(`Unhandled trackable block mapping for ${phaseGroup} day ${dayNumber} slot ${timeSlotKey}`);
}

function buildTrafficLightPolicy({ phaseGroup, timeSlotKey, blockIntent, reschedulable }) {
  if (timeSlotKey === "06:30-08:00") {
    return {
      green: "visible",
      yellow: "visible",
      red: "visible",
      backlogWhenHidden: false,
    };
  }

  if (timeSlotKey === "22:00-23:00") {
    if (phaseGroup === "first_pass" || phaseGroup.startsWith("revision_")) {
      return {
        green: "visible",
        yellow: "visible",
        red: "hidden",
        backlogWhenHidden: false,
      };
    }

    if (phaseGroup === "grand_test_analysis") {
      return {
        green: "visible",
        yellow: "hidden",
        red: "hidden",
        backlogWhenHidden: false,
      };
    }

    return {
      green: "visible",
      yellow: "visible",
      red: "visible",
      backlogWhenHidden: false,
    };
  }

  if (!reschedulable) {
    return {
      green: "visible",
      yellow: "visible",
      red: "visible",
      backlogWhenHidden: false,
    };
  }

  if (phaseGroup === "first_pass") {
    switch (timeSlotKey) {
      case "08:15-10:45":
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: true };
      case "11:00-13:30":
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: true };
      case "14:15-16:45":
        return { green: "visible", yellow: "hidden", red: "hidden", backlogWhenHidden: true };
      case "17:00-19:30":
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: true };
      case "20:15-21:45":
        return { green: "visible", yellow: "hidden", red: "hidden", backlogWhenHidden: true };
      default:
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: false };
    }
  }

  if (phaseGroup.startsWith("revision_")) {
    switch (timeSlotKey) {
      case "08:15-10:45":
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: true };
      case "11:00-13:30":
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: true };
      case "14:15-16:45":
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: true };
      case "17:00-19:30":
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: true };
      case "20:15-21:45":
        return { green: "visible", yellow: "hidden", red: "hidden", backlogWhenHidden: true };
      default:
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: false };
    }
  }

  if (phaseGroup === "final_assault") {
    if (blockIntent === "recall" || blockIntent === "shutdown" || blockIntent === "logistics") {
      return {
        green: "visible",
        yellow: "visible",
        red: "visible",
        backlogWhenHidden: false,
      };
    }

    switch (timeSlotKey) {
      case "08:15-10:45":
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: true };
      case "11:00-13:30":
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: true };
      case "14:15-16:45":
        return { green: "visible", yellow: "visible", red: "hidden", backlogWhenHidden: true };
      case "17:00-19:30":
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: true };
      default:
        return { green: "visible", yellow: "visible", red: "visible", backlogWhenHidden: false };
    }
  }

  return {
    green: "visible",
    yellow: "visible",
    red: "visible",
    backlogWhenHidden: false,
  };
}

function buildItems({ row, dayNumber, phaseGroup, timeSlotKey, blockBase, fallbackSubjects, referenceDayMap }) {
  const rawText = clean(row[timeSlotKey]);
  if (!rawText || !blockBase.trackable) {
    return [];
  }

  let parsedItems;

  if (timeSlotKey === "06:30-08:00") {
    parsedItems = parseMorningItems(rawText, fallbackSubjects, referenceDayMap);
  } else if (phaseGroup === "first_pass" && (timeSlotKey === "08:15-10:45" || timeSlotKey === "11:00-13:30")) {
    parsedItems = parseFirstPassCore(rawText).map((entry) => ({
      kind: "topic",
      label: entry.label,
      rawText: entry.rawText,
      subjectIds: detectSubjectIds(entry.label, fallbackSubjects),
      revisionEligible: true,
      recoveryLane: "core_recovery",
      phaseFence: "same_phase_only",
      notes: null,
      revisionType: null,
      referenceLabel: null,
      referenceDayNumber: null,
    }));
  } else {
    const allowCommaSplit =
      timeSlotKey === "08:15-10:45" ||
      timeSlotKey === "11:00-13:30" ||
      phaseGroup === "final_assault" ||
      phaseGroup === "pre_exam_day";

    const defaultKind = phaseGroup === "grand_test_analysis"
      ? "gt_step"
      : blockBase.blockIntent === "revision" || blockBase.blockIntent === "core_study"
        ? "topic"
        : "task";

    parsedItems = parseStructuredList(rawText, { allowCommaSplit }).map((entry) => ({
      kind: defaultKind,
      label: entry.label,
      rawText: entry.rawText,
      subjectIds: detectSubjectIds(entry.label, fallbackSubjects),
      revisionEligible: false,
      recoveryLane: blockBase.recoveryLane,
      phaseFence: blockBase.phaseFence,
      notes: null,
      revisionType: null,
      referenceLabel: null,
      referenceDayNumber: null,
    }));
  }

  const minutes = distributeMinutes(minutesForRange(timeSlotKey), Math.max(parsedItems.length, 1));

  return parsedItems.map((entry, index) => ({
    itemId: `d${String(dayNumber).padStart(3, "0")}-${timeSlotKey.slice(0, 5).replace(":", "")}-${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    ...entry,
    plannedMinutes: minutes[index],
  }));
}

async function main() {
  const workbook = XLSX.readFile(workbookPath);
  const dayRows = XLSX.utils.sheet_to_json(workbook.Sheets.Daywise_Plan, { defval: "" });
  const subjectRows = XLSX.utils.sheet_to_json(workbook.Sheets.Subject_Strategy, { defval: "" });
  const gtRows = XLSX.utils.sheet_to_json(workbook.Sheets.GT_Test_Plan, { defval: "" });

  const referenceDayMap = buildReferenceDayMap(dayRows, gtRows);
  const gtRefMap = buildGtRefMap(gtRows);

  const daywisePlan = {
    version: VERSION,
    sourceWorkbook: WORKBOOK_NAME,
    sourceSheet: "Daywise_Plan",
    phaseCatalog: buildPhaseCatalog(dayRows),
    slotCatalog: buildSlotCatalog(),
    days: dayRows.map((row) => {
      const dayNumber = Number(row.Day);
      const phaseName = clean(row.Phase);
      const phaseId = PHASE_GROUPS[phaseName];
      const primaryFocusRaw = clean(row["Primary Focus"]);
      const primaryFocusSubjectIds = detectSubjectIds(primaryFocusRaw, []);
      const gtPlanRef = gtRefMap.get(dayNumber) ?? null;

      const blocks = SLOT_COLUMNS.map((timeSlotKey) => {
        const rawText = clean(row[timeSlotKey]);
        const blockBase = SLOT_KIND[timeSlotKey].defaultTrackable
          ? buildTrackableBlockBase({ phaseGroup: phaseId, dayNumber, timeSlotKey, rawText })
          : buildNonTrackableBlock(timeSlotKey);

        const trafficLightPolicy = buildTrafficLightPolicy({
          phaseGroup: phaseId,
          timeSlotKey,
          blockIntent: blockBase.blockIntent,
          reschedulable: blockBase.reschedulable,
        });

        const items = buildItems({
          row,
          dayNumber,
          phaseGroup: phaseId,
          timeSlotKey,
          blockBase: { ...blockBase, trackable: blockBase.trackable ?? SLOT_KIND[timeSlotKey].defaultTrackable },
          fallbackSubjects: primaryFocusSubjectIds,
          referenceDayMap,
        });

        return {
          timeSlotKey,
          displayLabel: blockBase.displayLabel,
          semanticBlockKey: blockBase.semanticBlockKey,
          blockIntent: blockBase.blockIntent,
          trackable: blockBase.trackable ?? SLOT_KIND[timeSlotKey].defaultTrackable,
          rawText,
          items,
          recoveryLane: blockBase.recoveryLane,
          phaseFence: blockBase.phaseFence,
          defaultRevisionEligible:
            phaseId === "first_pass" && (timeSlotKey === "08:15-10:45" || timeSlotKey === "11:00-13:30"),
          reschedulable: blockBase.reschedulable,
          trafficLightPolicy,
        };
      });

      return {
        dayNumber,
        phaseId,
        phaseName,
        primaryFocusRaw,
        primaryFocusParts: splitOn(primaryFocusRaw, /\s+\+\s+/u),
        primaryFocusSubjectIds,
        resourceRaw: clean(row.Resource),
        resourceParts: splitOn(clean(row.Resource), /\s+\+\s+/u),
        deliverableRaw: clean(row.Deliverable),
        gtTestType: clean(row["GT/Test"]),
        gtPlanRef,
        blocks,
      };
    }),
  };

  const subjectStrategy = {
    version: VERSION,
    sourceWorkbook: WORKBOOK_NAME,
    sourceSheet: "Subject_Strategy",
    subjects: subjectRows.map((row) => {
      const subjectName = clean(row.Subject);
      const match = SUBJECTS.find((entry) => entry[1] === subjectName);
      if (!match) {
        throw new Error(`Unknown subject strategy row: ${subjectName}`);
      }

      const [subjectId, stableName, aliases] = match;
      return {
        subjectId,
        subjectName: stableName,
        aliases,
        worHours: Number(row.WoR_hours),
        firstPassDays: Number(row.First_pass_days),
        priorityTier: clean(row.Priority_tier),
        priorityRank: toPriorityRank(row.Priority_tier),
        resourceDecisionRaw: clean(row.Resource_decision),
        mustFocusTopics: splitOn(clean(row.Must_focus_topics), ","),
      };
    }),
  };

  const gtTestPlan = {
    version: VERSION,
    sourceWorkbook: WORKBOOK_NAME,
    sourceSheet: "GT_Test_Plan",
    tests: gtRows.map((row) => {
      const mustOutputRaw = clean(row.Must_output_after_test);
      let mustOutputItems = splitOn(mustOutputRaw, ";");
      if (mustOutputItems.length === 1) {
        mustOutputItems = splitOn(mustOutputRaw, ",");
      }

      return {
        gtPlanRef: gtRefMap.get(Number(row.Day)),
        dayNumber: Number(row.Day),
        testType: clean(row.Test_type),
        purposeRaw: clean(row.Purpose),
        whatToMeasureRaw: clean(row.What_to_measure),
        whatToMeasureItems: splitOn(clean(row.What_to_measure), ","),
        mustOutputRaw,
        mustOutputItems,
      };
    }),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, "daywise-plan.json"), `${JSON.stringify(daywisePlan, null, 2)}\n`);
  await writeFile(resolve(outDir, "subject-strategy.json"), `${JSON.stringify(subjectStrategy, null, 2)}\n`);
  await writeFile(resolve(outDir, "gt-test-plan.json"), `${JSON.stringify(gtTestPlan, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
