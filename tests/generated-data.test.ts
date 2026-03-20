import { describe, expect, it } from "vitest";
import XLSX from "xlsx";

import { scheduleData } from "@/lib/generated/schedule-data";

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
});
