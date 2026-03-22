import { describe, expect, it } from "vitest";
import XLSX from "xlsx";

import { scheduleData } from "@/lib/generated/schedule-data";
import { workbookSemanticData } from "@/lib/generated/workbook-semantic-data";

const workbook = XLSX.readFile("resources/neet_pg_2026_100_day_schedule.xlsx");
const dayRows = XLSX.utils.sheet_to_json(workbook.Sheets.Daywise_Plan, { defval: "" });
const blockHourRows = XLSX.utils.sheet_to_json(workbook.Sheets.Block_Hours, { defval: "" });
const subjectRows = XLSX.utils.sheet_to_json(workbook.Sheets.Subject_Strategy, { defval: "" });
const gtRows = XLSX.utils.sheet_to_json(workbook.Sheets.GT_Test_Plan, { defval: "" });
const readmeRows = XLSX.utils.sheet_to_json(workbook.Sheets.Readme, { defval: "" });

describe("generated schedule data", () => {
  it("derives trackable templates directly from Block_Hours", () => {
    expect(scheduleData.blockTemplates).toBeDefined();
    const generatedTrackables = scheduleData.blockTemplates?.filter((template) => template.trackable) ?? [];

    expect(generatedTrackables).toHaveLength(blockHourRows.length);
    expect(scheduleData.trackableBlockOrder).toEqual(generatedTrackables.map((template) => template.key));

    generatedTrackables.forEach((template, index) => {
      const workbookRow = blockHourRows[index] as { Block: string; Hours: number };
      expect(template.column).toBe(workbookRow.Block);
      expect(template.durationHours).toBe(Number(workbookRow.Hours));
      expect(`${template.start}-${template.end}`).toBe(workbookRow.Block);
    });
  });

  it("keeps the 100-day plan complete and slot-aligned with the workbook", () => {
    expect(scheduleData.days).toHaveLength(100);
    expect(scheduleData.days).toHaveLength(dayRows.length);

    scheduleData.days.forEach((day, index) => {
      const workbookDay = dayRows[index] as Record<string, string | number>;
      expect(day.dayNumber).toBe(Number(workbookDay.Day));
      expect(day.phase).toBe(String(workbookDay.Phase));
      expect(day.primaryFocus).toBe(String(workbookDay["Primary Focus"]));
      expect(day.gtTest).toBe(String(workbookDay["GT/Test"]));
      expect(day.plannedHours).toBe(Number(workbookDay.Planned_Hours));
      expect(day.slots).toHaveLength(scheduleData.blockTemplates?.length ?? 13);
      day.slots.forEach((slot) => {
        expect(slot.column).toBeDefined();
        expect(slot.description).toBe(String(workbookDay[slot.column as string]));
      });
    });
  });

  it("keeps workbook metadata, subject metadata, and GT plan aligned", () => {
    expect(scheduleData.workbookReadme).toHaveLength(readmeRows.length);
    expect(scheduleData.subjects).toHaveLength(subjectRows.length);
    expect(scheduleData.gtPlan).toHaveLength(gtRows.length);

    scheduleData.subjects.forEach((subject, index) => {
      const workbookSubject = subjectRows[index] as Record<string, string | number>;
      expect(subject.subject).toBe(String(workbookSubject.Subject));
      expect(subject.worHours).toBe(Number(workbookSubject.WoR_hours));
    });

    scheduleData.gtPlan.forEach((gtEntry, index) => {
      const workbookGt = gtRows[index] as Record<string, string | number>;
      const matchingDay = scheduleData.days.find((day) => day.dayNumber === gtEntry.dayNumber);

      expect(gtEntry.dayNumber).toBe(Number(workbookGt.Day));
      expect(gtEntry.testType).toBe(String(workbookGt.Test_type));
      expect(matchingDay?.gtTest).toBe(gtEntry.testType);
    });
  });

  it("keeps the manual workbook semantic bundle aligned with the workbook", () => {
    expect(workbookSemanticData.daywisePlan.days).toHaveLength(dayRows.length);
    expect(workbookSemanticData.daywisePlan.slotCatalog).toHaveLength(13);
    expect(workbookSemanticData.subjectStrategy.subjects).toHaveLength(subjectRows.length);
    expect(workbookSemanticData.gtTestPlan.tests).toHaveLength(gtRows.length);

    workbookSemanticData.daywisePlan.days.forEach((day, index) => {
      const workbookDay = dayRows[index] as Record<string, string | number>;
      expect(day.dayNumber).toBe(Number(workbookDay.Day));
      expect(day.phaseName).toBe(String(workbookDay.Phase));
      expect(day.primaryFocusRaw).toBe(String(workbookDay["Primary Focus"]));
      expect(day.blocks).toHaveLength(13);

      day.blocks.forEach((block, blockIndex) => {
        const timeSlotKey = workbookSemanticData.daywisePlan.slotCatalog[blockIndex]!.timeSlotKey;
        expect(block.timeSlotKey).toBe(timeSlotKey);
        expect(block.rawText).toBe(String(workbookDay[timeSlotKey]));
      });
    });
  });

  it("captures the phase-aware semantics needed for later queue and revision logic", () => {
    const day1 = workbookSemanticData.daywisePlan.days.find((day) => day.dayNumber === 1)!;
    const day2 = workbookSemanticData.daywisePlan.days.find((day) => day.dayNumber === 2)!;
    const day41 = workbookSemanticData.daywisePlan.days.find((day) => day.dayNumber === 41)!;
    const day95 = workbookSemanticData.daywisePlan.days.find((day) => day.dayNumber === 95)!;
    const day100 = workbookSemanticData.daywisePlan.days.find((day) => day.dayNumber === 100)!;

    const day1Diagnostic = day1.blocks.find((block) => block.timeSlotKey === "08:15-10:45")!;
    expect(day1Diagnostic.blockIntent).toBe("assessment");
    expect(day1Diagnostic.defaultRevisionEligible).toBe(false);
    expect(day1Diagnostic.reschedulable).toBe(false);

    const day2StudyBlock = day2.blocks.find((block) => block.timeSlotKey === "08:15-10:45")!;
    expect(day2StudyBlock.blockIntent).toBe("core_study");
    expect(day2StudyBlock.defaultRevisionEligible).toBe(true);
    expect(day2StudyBlock.phaseFence).toBe("same_phase_only");
    expect(day2StudyBlock.items.length).toBeGreaterThan(1);
    expect(day2StudyBlock.items.every((item) => item.revisionEligible)).toBe(true);

    const day41Gt = day41.blocks.find((block) => block.timeSlotKey === "08:15-10:45")!;
    expect(day41Gt.blockIntent).toBe("assessment");
    expect(day41Gt.recoveryLane).toBe("assessment_recovery");
    expect(day41Gt.reschedulable).toBe(false);

    const day95CalmRecall = day95.blocks.find((block) => block.timeSlotKey === "20:15-21:45")!;
    expect(day95CalmRecall.blockIntent).toBe("recall");
    expect(day95CalmRecall.reschedulable).toBe(false);
    expect(day95CalmRecall.phaseFence).toBe("not_reschedulable");

    const day100Midday = day100.blocks.find((block) => block.timeSlotKey === "11:00-13:30")!;
    expect(day100Midday.blockIntent).toBe("logistics");
    expect(day100Midday.reschedulable).toBe(false);
  });
});
