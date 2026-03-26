import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scheduleData } from "@/lib/generated/schedule-data";

const daywisePlan = JSON.parse(
  readFileSync(join(process.cwd(), "resources/manual-json/daywise-plan.json"), "utf8"),
) as typeof scheduleData.daywisePlan;
const subjectStrategy = JSON.parse(
  readFileSync(join(process.cwd(), "resources/manual-json/subject-strategy.json"), "utf8"),
) as typeof scheduleData.subjectStrategy;
const gtTestPlan = JSON.parse(
  readFileSync(join(process.cwd(), "resources/manual-json/gt-test-plan.json"), "utf8"),
) as typeof scheduleData.gtTestPlan;

function getDay(dayNumber: number) {
  return scheduleData.daywisePlan.days.find((day) => day.dayNumber === dayNumber)!;
}

function getBlock(dayNumber: number, semanticBlockKey: string) {
  return getDay(dayNumber).blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!;
}

describe("generated schedule data", () => {
  it("uses the manual JSON files as the only generated schedule source", () => {
    expect(scheduleData.daywisePlan.source).toBe("manual-json");
    expect(scheduleData.daywisePlan.sourceSheet).toBe(daywisePlan.sourceSheet);
    expect(scheduleData.subjectStrategy.source).toBe("manual-json");
    expect(scheduleData.gtTestPlan.source).toBe("manual-json");

    expect(scheduleData.daywisePlan.days).toHaveLength(100);
    expect(scheduleData.daywisePlan.slotCatalog).toHaveLength(13);
    expect(scheduleData.subjectStrategy.subjects).toHaveLength(19);
    expect(scheduleData.gtTestPlan.tests).toHaveLength(gtTestPlan.tests.length);
  });

  it("keeps every day and block aligned with the curated JSON source", () => {
    expect(scheduleData.daywisePlan.phaseCatalog).toEqual(
      daywisePlan.phaseCatalog.map((phase) => ({
        ...phase,
        description: expect.any(String),
      })),
    );

    scheduleData.daywisePlan.days.forEach((day, dayIndex) => {
      const sourceDay = daywisePlan.days[dayIndex]!;
      expect(day.dayNumber).toBe(sourceDay.dayNumber);
      expect(day.phaseId).toBe(sourceDay.phaseId);
      expect(day.phaseName).toBe(sourceDay.phaseName);
      expect(day.primaryFocusRaw).toBe(sourceDay.primaryFocusRaw);
      expect(day.resourceRaw).toBe(sourceDay.resourceRaw);
      expect(day.deliverableRaw).toBe(sourceDay.deliverableRaw);
      expect(day.blocks).toHaveLength(13);

      day.blocks.forEach((block, blockIndex) => {
        const sourceBlock = sourceDay.blocks[blockIndex]!;
        const slot = scheduleData.daywisePlan.slotCatalog[blockIndex]!;

        expect(block.timeSlotKey).toBe(sourceBlock.timeSlotKey);
        expect(block.timeSlotKey).toBe(slot.timeSlotKey);
        expect(block.rawText).toBe(sourceBlock.rawText);
        expect(block.displayLabel).toBe(sourceBlock.displayLabel);
        expect(block.semanticBlockKey).toBe(sourceBlock.semanticBlockKey);

        const itemMinutes = block.items.reduce((total, item) => total + item.plannedMinutes, 0);
        expect(itemMinutes).toBe(block.trackable ? slot.durationMinutes : 0);
      });
    });
  });

  it("locks revision eligibility to first-pass core-study topics only", () => {
    const revisionEligibleItems = scheduleData.daywisePlan.days.flatMap((day) =>
      day.blocks.flatMap((block) =>
        block.items
          .filter((item) => item.revisionEligible)
          .map((item) => ({ day, block, item })),
      ),
    );

    expect(revisionEligibleItems.length).toBeGreaterThan(0);
    expect(
      revisionEligibleItems.every(
        ({ day, block }) => day.phaseId === "first_pass" && block.blockIntent === "core_study",
      ),
    ).toBe(true);
  });

  it("captures the representative phase semantics needed by the new runtime", () => {
    const day1Diagnostic = getBlock(1, "diagnostic_block");
    expect(day1Diagnostic.blockIntent).toBe("assessment");
    expect(day1Diagnostic.reschedulable).toBe(false);
    expect(day1Diagnostic.defaultRevisionEligible).toBe(false);

    const day2StudyBlock1 = getBlock(2, "study_block_1");
    expect(day2StudyBlock1.blockIntent).toBe("core_study");
    expect(day2StudyBlock1.defaultRevisionEligible).toBe(true);
    expect(day2StudyBlock1.phaseFence).toBe("same_phase_only");
    expect(day2StudyBlock1.items.every((item) => item.revisionEligible)).toBe(true);

    const day41GtBlock1 = getBlock(41, "gt_block_1");
    expect(day41GtBlock1.blockIntent).toBe("assessment");
    expect(day41GtBlock1.recoveryLane).toBe("assessment_recovery");
    expect(day41GtBlock1.reschedulable).toBe(false);

    const day42RevisionBlock1 = getBlock(42, "revision_block_1");
    expect(day42RevisionBlock1.blockIntent).toBe("revision");
    expect(day42RevisionBlock1.defaultRevisionEligible).toBe(false);

    const day84Rescue = getBlock(84, "revision_block_1");
    expect(day84Rescue.phaseFence).toBe("same_phase_only");
    expect(day84Rescue.reschedulable).toBe(true);

    const day95CalmRecall = getBlock(95, "calm_recall_block");
    expect(day95CalmRecall.blockIntent).toBe("recall");
    expect(day95CalmRecall.reschedulable).toBe(false);
    expect(day95CalmRecall.phaseFence).toBe("not_reschedulable");

    const day100Midday = getBlock(100, "pre_exam_midday");
    expect(day100Midday.blockIntent).toBe("logistics");
    expect(day100Midday.reschedulable).toBe(false);
    expect(day100Midday.trafficLightPolicy.red).toBe("visible");
  });

  it("keeps subject strategy and GT plan aligned with generated references", () => {
    expect(scheduleData.subjectStrategy.subjects).toEqual(subjectStrategy.subjects);
    expect(scheduleData.gtTestPlan.tests).toEqual(gtTestPlan.tests);

    const gtRefs = new Map(scheduleData.gtTestPlan.tests.map((test) => [test.dayNumber, test.gtPlanRef]));
    for (const day of scheduleData.daywisePlan.days) {
      expect(day.gtPlanRef).toBe(gtRefs.get(day.dayNumber) ?? null);
    }
  });
});
