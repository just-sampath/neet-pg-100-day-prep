import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/session";
import { getWeeklyDetailData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

function percent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function trendLabel(trend: "up" | "down" | "stable") {
  if (trend === "up") return "Up vs previous week";
  if (trend === "down") return "Down vs previous week";
  return "Stable vs previous week";
}

function trendTone(trend: "up" | "down" | "stable") {
  if (trend === "up") return "success";
  if (trend === "down") return "warning";
  return "neutral";
}

function generatedAtLabel(iso: string) {
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

export default async function WeeklyDetailPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const user = await requireCurrentUser();
  const { week } = await params;
  const summary = await mutateStore((store) => getWeeklyDetailData(store, user.id, week));

  if (!summary) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <section className="panel panel-hero p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">
              {summary.weekStartDate} → {summary.weekEndDate}
            </div>
            <h1 className="display mt-3 text-3xl md:text-4xl">Weekly review</h1>
            <p className="lead mt-4 max-w-3xl text-sm md:text-base">
              {summary.isPartialWeek
                ? `Snapshot through ${summary.coveredThroughDate}. This week is still in progress.`
                : "Final Monday-to-Sunday review, stored exactly as it was generated."}
            </p>
          </div>
          <div className="grid gap-3">
            <span className="status-badge" data-tone={summary.scheduleStatusKind === "days_behind" ? "warning" : "neutral"}>
              {summary.scheduleStatus}
            </span>
            <div className="note-card p-4 text-sm text-[var(--text-secondary)]">
              <div className="eyebrow">Generated</div>
              <p className="mt-3">{generatedAtLabel(summary.generatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="metric-slab">
            <div className="metric-label">Schedule</div>
            <div className="metric-value text-3xl">
              {summary.blocksCompleted}/{summary.blocksPlanned}
            </div>
            <p className="mt-2 text-sm text-[var(--text-dim)]">{percent(summary.blocksCompletedRate)} visible blocks completed</p>
          </article>
          <article className="metric-slab">
            <div className="metric-label">Revision</div>
            <div className="metric-value text-3xl">
              {summary.morningRevisionCompleted}/{summary.morningRevisionPlanned}
            </div>
            <p className="mt-2 text-sm text-[var(--text-dim)]">{percent(summary.morningRevisionCompletionRate)} morning queue cleared</p>
          </article>
          <article className="metric-slab">
            <div className="metric-label">MCQ</div>
            <div className="metric-value text-3xl">{summary.totalMcqsSolved}</div>
            <p className="mt-2 text-sm text-[var(--text-dim)]">Accuracy {percent(summary.overallAccuracy)}</p>
          </article>
          <article className="metric-slab">
            <div className="metric-label">Backlog</div>
            <div className="metric-value text-3xl">{summary.backlogCount}</div>
            <p className="mt-2 text-sm text-[var(--text-dim)]">Pending at weekly snapshot</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="panel p-6">
          <div className="eyebrow">Schedule Adherence</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="note-card p-4">
              <div className="metric-label">Traffic Lights</div>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                {summary.greenDays} Green
                <br />
                {summary.yellowDays} Yellow
                <br />
                {summary.redDays} Red
              </p>
            </div>
            <div className="note-card p-4">
              <div className="metric-label">Revision Health</div>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                Overflow days {summary.revisionOverflowDays}
                <br />
                Catch-up items {summary.revisionCatchUpCount}
                <br />
                Restudy flags {summary.revisionRestudyCount}
              </p>
            </div>
            <div className="note-card p-4">
              <div className="metric-label">Overruns</div>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">Total overrun blocks {summary.overrunBlockCount}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="eyebrow">Blocks That Ran Over</div>
            {summary.overrunBlocks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">No tracked study block crossed its planned end time this week.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {summary.overrunBlocks.map((item) => (
                  <div key={item.label} className="note-card flex items-center justify-between gap-3 p-4 text-sm text-[var(--text-secondary)]">
                    <span>{item.label}</span>
                    <span className="status-badge" data-tone="warning">
                      x{item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="eyebrow">Schedule Health</div>
          <div className="mt-4 grid gap-3">
            <div className="note-card p-4">
              <div className="metric-label">Status</div>
              <p className="mt-3 text-base text-[var(--text-secondary)]">{summary.scheduleStatus}</p>
              <p className="mt-2 text-sm text-[var(--text-dim)]">
                {summary.daysBehind > 0
                  ? `${summary.daysBehind} recent heavy-miss day${summary.daysBehind === 1 ? "" : "s"} still need schedule recovery.`
                  : `${summary.bufferDaysUsed} buffer day${summary.bufferDaysUsed === 1 ? "" : "s"} used so far.`}
              </p>
            </div>
            <div className="note-card p-4">
              <div className="metric-label">Backlog Breakdown</div>
              <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
                {summary.backlogSummary.fromMissed} from missed/skipped
                <br />
                {summary.backlogSummary.fromYellowRed} from yellow/red reshapes
                <br />
                {summary.backlogSummary.fromOverrun} from overruns
              </p>
            </div>
            <div className="note-card p-4">
              <div className="metric-label">Subjects Studied</div>
              {summary.subjectsStudied.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">No fully completed study days were captured in this snapshot yet.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {summary.subjectsStudied.map((subject) => (
                    <span key={subject} className="status-badge" data-tone="neutral">
                      {subject}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="eyebrow">MCQ Readout</div>
            <span className="status-badge" data-tone={trendTone(summary.accuracyVsPrevious)}>
              {trendLabel(summary.accuracyVsPrevious)}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="note-card p-4">
              <div className="metric-label">Top Wrong Subjects</div>
              {summary.topWrongSubjects.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">No tagged wrong-entry subject signal yet.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {summary.topWrongSubjects.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="note-card p-4">
              <div className="metric-label">Top Cause Codes</div>
              {summary.topCauseCodes.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">No tagged cause-code signal yet.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {summary.topCauseCodes.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>

        <article className="panel p-6">
          <div className="eyebrow">GT Review</div>
          {summary.gtNumber ? (
            <div className="mt-4 grid gap-3">
              <div className="note-card p-4">
                <div className="metric-label">Latest GT In Week</div>
                <p className="mt-3 text-xl font-semibold">{summary.gtNumber}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Score {summary.gtScore ?? "—"} · {summary.gtAir ?? "AIR / percentile not logged"}
                </p>
              </div>
              <div className="note-card p-4">
                <div className="metric-label">Wrapper Summary</div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{summary.gtWrapperSummary ?? "No wrapper summary recorded."}</p>
              </div>
            </div>
          ) : (
            <div className="note-card mt-4 p-4">
              <div className="metric-label">No GT Logged</div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                No GT entry landed inside this weekly window, so the summary keeps the GT section intentionally quiet.
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
