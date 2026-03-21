"use client";

import dynamic from "next/dynamic";

import { ChartPlaceholder } from "@/components/charts/chart-placeholder";

const McqTrendChart = dynamic(
  () => import("@/components/charts/mcq-trend-chart").then((mod) => mod.McqTrendChart),
  {
    ssr: false,
    loading: () => (
      <ChartPlaceholder
        title="Daily volume and accuracy are still loading."
        body="This route defers chart code until it is needed so the analytics screen can settle faster on mobile."
      />
    ),
  },
);

const McqBreakdownChart = dynamic(
  () => import("@/components/charts/mcq-breakdown-chart").then((mod) => mod.McqBreakdownChart),
  {
    ssr: false,
    loading: () => (
      <ChartPlaceholder
        title="Result breakdown is still loading."
        body="The counts are already available above. The chart fills in once its bundle arrives."
      />
    ),
  },
);

const McqSubjectAccuracyChart = dynamic(
  () => import("@/components/charts/mcq-subject-accuracy-chart").then((mod) => mod.McqSubjectAccuracyChart),
  {
    ssr: false,
    loading: () => (
      <ChartPlaceholder
        title="Subject accuracy is still loading."
        body="This is deferred because the charting layer is secondary to the core study routes."
      />
    ),
  },
);

export function McqTrendPanel({
  data,
}: {
  data: { label: string; attempted: number; accuracy: number }[];
}) {
  return <McqTrendChart data={data} />;
}

export function McqBreakdownPanel({
  data,
}: {
  data: { label: "Right" | "Guessed Right" | "Wrong"; value: number }[];
}) {
  return <McqBreakdownChart data={data} />;
}

export function McqSubjectAccuracyPanel({
  data,
}: {
  data: { subject: string; accuracy: number }[];
}) {
  return <McqSubjectAccuracyChart data={data} />;
}

