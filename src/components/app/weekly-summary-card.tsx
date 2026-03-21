import Link from "next/link";

import type { WeeklySummary } from "@/lib/domain/types";

function metricValue(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export function WeeklySummaryCard({
  summary,
  isCurrentWeek,
}: {
  summary: WeeklySummary;
  isCurrentWeek: boolean;
}) {
  return (
    <Link className="list-card p-5" href={`/weekly/${summary.weekKey}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">
            {summary.weekStartDate} → {summary.weekEndDate}
          </div>
          <h2 className="mt-2 text-xl font-semibold">
            {summary.isPartialWeek ? `Week in progress through ${summary.coveredThroughDate}` : "Final weekly review"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isCurrentWeek ? (
            <span className="status-badge" data-tone="neutral">
              current week
            </span>
          ) : null}
          <span className="status-badge" data-tone={summary.scheduleStatusKind === "days_behind" ? "warning" : "neutral"}>
            {summary.scheduleStatus}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <article className="metric-slab">
          <div className="metric-label">Schedule</div>
          <div className="metric-value text-2xl">
            {summary.blocksCompleted}/{summary.blocksPlanned}
          </div>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{metricValue(summary.blocksCompletedRate)} visible blocks cleared</p>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Revision</div>
          <div className="metric-value text-2xl">
            {summary.morningRevisionCompleted}/{summary.morningRevisionPlanned}
          </div>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{metricValue(summary.morningRevisionCompletionRate)} morning queue done</p>
        </article>
        <article className="metric-slab">
          <div className="metric-label">MCQ</div>
          <div className="metric-value text-2xl">{summary.totalMcqsSolved}</div>
          <p className="mt-2 text-sm text-[var(--text-dim)]">Accuracy {metricValue(summary.overallAccuracy)}</p>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Backlog</div>
          <div className="metric-value text-2xl">{summary.backlogCount}</div>
          <p className="mt-2 text-sm text-[var(--text-dim)]">Pending at snapshot</p>
        </article>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-(--text-secondary) md:grid-cols-[1.2fr_0.8fr]">
        <div className="note-card p-4">
          <div className="eyebrow">Traffic + Revision Pressure</div>
          <p className="mt-3 leading-7">
            {summary.greenDays} Green · {summary.yellowDays} Yellow · {summary.redDays} Red
          </p>
          <p className="mt-2 leading-7">
            Overflow days {summary.revisionOverflowDays} · Catch-up items {summary.revisionCatchUpCount} · Restudy flags{" "}
            {summary.revisionRestudyCount}
          </p>
        </div>
        <div className="note-card p-4">
          <div className="eyebrow">GT + Overruns</div>
          <p className="mt-3 leading-7">GT {summary.gtNumber ?? "None"}</p>
          <p className="mt-2 leading-7">Overrun blocks {summary.overrunBlockCount}</p>
        </div>
      </div>
    </Link>
  );
}
