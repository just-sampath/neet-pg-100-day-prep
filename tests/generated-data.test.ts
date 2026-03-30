import { describe, expect, it } from "vitest";

import { getStaticReferenceData } from "@/lib/data/reference-data";

const { scheduleData, quotes } = getStaticReferenceData();

function getDay(dayNumber: number) {
  return scheduleData.daywisePlan.days.find((day) => day.dayNumber === dayNumber)!;
}

function getBlock(dayNumber: number, semanticBlockKey: string) {
  return getDay(dayNumber).blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!;
}

describe("generated schedule data", () => {
  it("uses the final workbook as the only generated schedule source", () => {
    expect(scheduleData.daywisePlan.source).toBe("workbook");
    expect(scheduleData.daywisePlan.sourceWorkbook).toBe("NEET_PG_FINAL_SCHEDULE.xlsx");
    expect(scheduleData.daywisePlan.sourceSheet).toBe("Daywise_Plan");
    expect(scheduleData.subjectStrategy.sourceSheet).toBe("Subject_Tiering");
    expect(scheduleData.gtTestPlan.sourceSheet).toBe("Daywise_Plan");

    expect(scheduleData.daywisePlan.days).toHaveLength(100);
    expect(scheduleData.daywisePlan.slotCatalog).toHaveLength(12);
    expect(scheduleData.subjectStrategy.subjects).toHaveLength(19);
    expect(scheduleData.gtTestPlan.tests).toHaveLength(9);
  });

  it("validates seed row counts for the DB migration contract", () => {
    const totalBlocks = scheduleData.daywisePlan.days.reduce(
      (sum, day) => sum + day.blocks.length, 0,
    );
    const totalAssignments = scheduleData.daywisePlan.days.reduce(
      (sum, day) => sum + day.blocks.reduce((bs, block) => bs + block.items.length, 0), 0,
    );
    const phase1Days = scheduleData.daywisePlan.days.filter((d) => d.dayNumber <= 63);
    const revisionEligiblePhase1 = phase1Days.reduce(
      (sum, day) => sum + day.blocks.reduce((bs, block) => bs + block.items.filter((i) => i.revisionEligible).length, 0), 0,
    );

    expect(totalBlocks).toBe(1200);
    expect(totalAssignments).toBe(1151);
    expect(revisionEligiblePhase1).toBe(271);
    expect(quotes).toHaveLength(200);
    expect(scheduleData.revisionMap.days).toHaveLength(100);
  });

  it("locks the new phase catalog to the 3 workbook spans", () => {
    expect(scheduleData.daywisePlan.phaseCatalog).toEqual([
      expect.objectContaining({
        phaseId: "phase_1",
        phaseName: "Phase 1 - First pass",
        startDay: 1,
        endDay: 63,
      }),
      expect.objectContaining({
        phaseId: "phase_2",
        phaseName: "Phase 2 - Revision 1 (Marrow + selective BTR)",
        startDay: 64,
        endDay: 82,
      }),
      expect.objectContaining({
        phaseId: "phase_3",
        phaseName: "Phase 3 - Revision 2 / Compression",
        startDay: 83,
        endDay: 100,
      }),
    ]);
  });

  it("keeps exact WOR timings in Phase 1 source blocks", () => {
    const day1BlockA = getBlock(1, "block_a");
    const day1BlockB = getBlock(1, "block_b");
    const day1BlockC = getBlock(1, "block_c");

    expect(day1BlockA.blockIntent).toBe("core_study");
    expect(day1BlockA.defaultRevisionEligible).toBe(true);
    expect(day1BlockA.items.map((item) => [item.label, item.plannedMinutes, item.revisionEligible])).toEqual([
      ["Introduction to Pathology Revision", 33, true],
      ["Haematology: WBC Disorders and Leukemias", 104, true],
    ]);
    expect(day1BlockB.items.map((item) => item.plannedMinutes)).toEqual([98]);
    expect(day1BlockC.items.map((item) => item.plannedMinutes)).toEqual([123]);
    expect(day1BlockB.items.every((item) => item.revisionEligible)).toBe(true);
    expect(day1BlockC.items.every((item) => item.revisionEligible)).toBe(true);
  });

  it("equal-splits later phases across the new stable block model", () => {
    const day64BlockA = getBlock(64, "block_a");
    const day64BlockB = getBlock(64, "block_b");
    const day64BlockC = getBlock(64, "block_c");

    expect(day64BlockA.blockIntent).toBe("revision");
    expect(day64BlockA.defaultRevisionEligible).toBe(false);
    expect(day64BlockA.items.map((item) => item.plannedMinutes)).toEqual([60, 60, 60]);
    expect(day64BlockB.items.map((item) => item.plannedMinutes)).toEqual([60, 60, 60]);
    expect(day64BlockC.items.map((item) => item.plannedMinutes)).toEqual([83, 82]);
    expect(day64BlockA.items.some((item) => item.revisionEligible)).toBe(false);
  });

  it("emits the new traffic-light and rescheduling semantics", () => {
    const morning = getBlock(2, "morning_revision");
    const blockB = getBlock(2, "block_b");
    const blockC = getBlock(2, "block_c");
    const finalReview = getBlock(2, "final_review");
    const wrapUpLog = getBlock(2, "wrap_up_log");

    expect(morning.reschedulable).toBe(false);
    expect(morning.phaseFence).toBe("not_reschedulable");

    expect(blockB.trafficLightPolicy).toEqual({
      green: "visible",
      yellow: "visible",
      red: "hidden",
      backlogWhenHidden: true,
    });
    expect(blockC.trafficLightPolicy).toEqual({
      green: "visible",
      yellow: "hidden",
      red: "hidden",
      backlogWhenHidden: true,
    });
    expect(finalReview.trafficLightPolicy).toEqual({
      green: "visible",
      yellow: "hidden",
      red: "hidden",
      backlogWhenHidden: true,
    });
    expect(wrapUpLog.reschedulable).toBe(false);
    expect(wrapUpLog.trafficLightPolicy.backlogWhenHidden).toBe(false);
  });

  it("keeps morning revision as a single workbook guide item instead of surfaced revision refs", () => {
    const morning = getBlock(2, "morning_revision");

    expect(morning.items).toHaveLength(1);
    expect(morning.items[0]).toMatchObject({
      kind: "task",
      plannedMinutes: 75,
      revisionType: null,
      revisionEligible: false,
    });
  });

  it("derives GT context from workbook GT days only", () => {
    expect(scheduleData.gtTestPlan.tests.map((test) => [test.dayNumber, test.testType, test.gtPlanRef])).toEqual([
      [66, "Full GT", "gt_1"],
      [72, "Full GT", "gt_2"],
      [78, "Full GT", "gt_3"],
      [82, "Full GT", "gt_4"],
      [86, "Full GT", "gt_5"],
      [90, "Full GT", "gt_6"],
      [93, "Full GT", "gt_7"],
      [95, "120Q half-sim", "half_sim_120q"],
      [96, "Full GT", "gt_8"],
    ]);

    for (const day of scheduleData.daywisePlan.days) {
      const matchingGt = scheduleData.gtTestPlan.tests.find((test) => test.dayNumber === day.dayNumber);
      expect(day.gtPlanRef).toBe(matchingGt?.gtPlanRef ?? null);
    }
  });
});
