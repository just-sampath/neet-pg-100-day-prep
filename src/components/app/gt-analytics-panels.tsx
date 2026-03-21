"use client";

import dynamic from "next/dynamic";

import { ChartPlaceholder } from "@/components/charts/chart-placeholder";

const GtScoreChart = dynamic(
  () => import("@/components/charts/gt-score-chart").then((mod) => mod.GtScoreChart),
  {
    ssr: false,
    loading: () => (
      <ChartPlaceholder
        title="GT score trend is still loading."
        body="Heavy chart code is deferred here so the analytics shell reaches usable state faster."
      />
    ),
  },
);

const GtSectionPatternChart = dynamic(
  () => import("@/components/charts/gt-section-pattern-chart").then((mod) => mod.GtSectionPatternChart),
  {
    ssr: false,
    loading: () => (
      <ChartPlaceholder
        title="Section pattern chart is still loading."
        body="The surrounding comparison and weakness summaries stay readable while the chart bundle arrives."
        heightClassName="h-80"
      />
    ),
  },
);

const GtWrapperTrendChart = dynamic(
  () => import("@/components/charts/gt-wrapper-trend-chart").then((mod) => mod.GtWrapperTrendChart),
  {
    ssr: false,
    loading: () => (
      <ChartPlaceholder
        title="Wrapper trend is still loading."
        body="This route defers the chart layer because GT analytics is secondary to the core Today workflow."
      />
    ),
  },
);

export function GtScorePanel({
  data,
}: {
  data: { label: string; score: number; accuracy: number | null }[];
}) {
  return <GtScoreChart data={data} />;
}

export function GtSectionPatternPanel({
  data,
}: {
  data: { section: string; notEnoughTime: number; panic: number; guessedTooMuch: number }[];
}) {
  return <GtSectionPatternChart data={data} />;
}

export function GtWrapperTrendPanel({
  data,
}: {
  data: { label: string; knowledge: number | null; behaviour: number | null; unsureRight: number | null }[];
}) {
  return <GtWrapperTrendChart data={data} />;
}
