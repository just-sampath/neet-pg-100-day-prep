import quotesSeed from "@/lib/generated/quotes.json";
import scheduleSeed from "@/lib/generated/schedule.json";
import tieringSeed from "@/lib/generated/tiering.json";
import type {
  GtPlanEntry,
  RevisionMapDayEntry,
  ScheduleDataBundle,
  SubjectStrategyEntry,
} from "@/lib/domain/schedule-data-types";
import type { GeneratedQuote, RuntimeReferenceData } from "@/lib/domain/types";

const staticScheduleData = {
  ...scheduleSeed,
  subjectStrategy: tieringSeed,
} as ScheduleDataBundle;

const staticQuotes = quotesSeed as GeneratedQuote[];

export function getStaticReferenceData(): RuntimeReferenceData {
  return {
    scheduleData: staticScheduleData,
    quotes: staticQuotes,
  };
}

type ReferenceRows = {
  subjectTiers: Array<{
    subject_id: string;
    subject_name: string;
    aliases: string[] | null;
    wor_hours: number;
    first_pass_days: number;
    priority_tier: string;
    priority_rank: number;
    resource_decision_raw: string;
    must_focus_topics: string[] | null;
  }>;
  quoteCatalog: Array<{
    quote_id: string;
    quote_text: string;
    author: string;
    category: GeneratedQuote["category"];
  }>;
  gtPlanItems: Array<{
    gt_plan_ref: string;
    source_day_number: number;
    test_type: GtPlanEntry["testType"];
    purpose_raw: string;
    what_to_measure_raw: string;
    what_to_measure_items: string[] | null;
    must_output_raw: string;
    must_output_items: string[] | null;
    resource_raw: string;
    review_raw: string;
    wrap_up_raw: string;
    notes_raw: string | null;
  }>;
  revisionMapDays: Array<{
    day_number: number;
    d1_due_topics: string | null;
    d3_due_topics: string | null;
    d7_due_topics: string | null;
    d14_due_topics: string | null;
    d28_due_topics: string | null;
    morning_queue_rule: string;
  }>;
};

function toSubjectStrategyEntry(row: ReferenceRows["subjectTiers"][number]): SubjectStrategyEntry {
  return {
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    aliases: row.aliases ?? [],
    worHours: row.wor_hours,
    firstPassDays: row.first_pass_days,
    priorityTier: row.priority_tier,
    priorityRank: row.priority_rank,
    resourceDecisionRaw: row.resource_decision_raw,
    mustFocusTopics: row.must_focus_topics ?? [],
  };
}

function toGeneratedQuote(row: ReferenceRows["quoteCatalog"][number]): GeneratedQuote {
  return {
    id: row.quote_id,
    quote: row.quote_text,
    author: row.author,
    category: row.category,
  };
}

function toGtPlanEntry(row: ReferenceRows["gtPlanItems"][number]): GtPlanEntry {
  return {
    gtPlanRef: row.gt_plan_ref,
    dayNumber: row.source_day_number,
    testType: row.test_type,
    purposeRaw: row.purpose_raw,
    whatToMeasureRaw: row.what_to_measure_raw,
    whatToMeasureItems: row.what_to_measure_items ?? [],
    mustOutputRaw: row.must_output_raw,
    mustOutputItems: row.must_output_items ?? [],
    resourceRaw: row.resource_raw,
    reviewRaw: row.review_raw,
    wrapUpRaw: row.wrap_up_raw,
    notesRaw: row.notes_raw ?? null,
  };
}

function toRevisionMapDayEntry(row: ReferenceRows["revisionMapDays"][number]): RevisionMapDayEntry {
  return {
    dayNumber: row.day_number,
    d1DueTopics: row.d1_due_topics,
    d3DueTopics: row.d3_due_topics,
    d7DueTopics: row.d7_due_topics,
    d14DueTopics: row.d14_due_topics,
    d28DueTopics: row.d28_due_topics,
    morningQueueRule: row.morning_queue_rule,
  };
}

export function buildReferenceDataFromRows(rows: ReferenceRows): RuntimeReferenceData {
  return {
    scheduleData: {
      ...staticScheduleData,
      subjectStrategy: {
        ...staticScheduleData.subjectStrategy,
        subjects: rows.subjectTiers.map(toSubjectStrategyEntry),
      },
      gtTestPlan: {
        ...staticScheduleData.gtTestPlan,
        tests: rows.gtPlanItems.map(toGtPlanEntry),
      },
      revisionMap: {
        ...staticScheduleData.revisionMap,
        days: rows.revisionMapDays.map(toRevisionMapDayEntry),
      },
    },
    quotes: rows.quoteCatalog.map(toGeneratedQuote),
  };
}

export function getReferenceSummary(referenceData: RuntimeReferenceData) {
  return {
    scheduleDayCount: referenceData.scheduleData.daywisePlan.days.length,
    subjectCount: referenceData.scheduleData.subjectStrategy.subjects.length,
    gtPlanCount: referenceData.scheduleData.gtTestPlan.tests.length,
  };
}

export function getQuotePools(referenceData: RuntimeReferenceData) {
  return {
    daily: referenceData.quotes.filter((quote) => quote.category === "daily"),
    tough_day: referenceData.quotes.filter((quote) => quote.category === "tough_day"),
    celebration: referenceData.quotes.filter((quote) => quote.category === "celebration"),
  };
}
