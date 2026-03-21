import {
  GtScorePanel,
  GtSectionPatternPanel,
  GtWrapperTrendPanel,
} from "@/components/app/gt-analytics-panels";
import { requireCurrentUser } from "@/lib/auth/session";
import { getGtAnalyticsData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

function getGtDeltaTone(
  label: "score" | "correct" | "wrong" | "unattempted" | "air",
  value: number | null,
  airMetricKind: "air" | "percentile" | null,
) {
  if (value === null || value === 0) {
    return "neutral";
  }

  if (label === "wrong" || label === "unattempted") {
    return value < 0 ? "green" : "red";
  }

  if (label === "air") {
    if (airMetricKind === "air") {
      return value < 0 ? "green" : "red";
    }
    if (airMetricKind === "percentile") {
      return value > 0 ? "green" : "red";
    }
    return "neutral";
  }

  return value > 0 ? "green" : "red";
}

function getGtDeltaLabel(airMetricKind: "air" | "percentile" | null) {
  if (airMetricKind === "air") {
    return "AIR delta";
  }
  if (airMetricKind === "percentile") {
    return "Percentile delta";
  }
  return "AIR / percentile delta";
}

export default async function GtAnalyticsPage() {
  const user = await requireCurrentUser();
  const data = await mutateStore((store) => getGtAnalyticsData(store, user.id));
  const hasGtData = data.summary.totalLogs > 0;

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero p-6">
        <div className="eyebrow">GT Analytics</div>
        <h1 className="display mt-3 text-3xl md:text-4xl">Trend the paper. Trace the section failures. Keep the wrapper honest.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          This is where GT logs turn into patterns: score movement, where panic starts, whether time loss clusters in the same section, and which
          subjects or topics keep returning as weaknesses.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-slab">
          <div className="metric-label">GT logs</div>
          <div className="metric-value">{data.summary.totalLogs}</div>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Latest GT</div>
          <div className="metric-value">{data.summary.latestGt ?? "—"}</div>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Latest score</div>
          <div className="metric-value">{data.summary.latestScore ?? "—"}</div>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Latest AIR</div>
          <div className="metric-value">{data.summary.latestAir ?? "—"}</div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="eyebrow">GT Trend</div>
        <h2 className="mt-3 text-2xl font-semibold">Score and accuracy across completed GTs</h2>
        <div className="mt-6">
          {hasGtData ? (
            <GtScorePanel data={data.scoreTrend} />
          ) : (
            <div className="note-card p-5 text-sm leading-7 text-[var(--text-secondary)]">
              No GT entries exist yet. Once the first full paper is logged, the score and accuracy trend will appear here.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="panel p-6">
          <div className="eyebrow">GT-over-GT</div>
          <h2 className="mt-3 text-2xl font-semibold">Latest vs previous</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {data.comparison.latestLabel && data.comparison.previousLabel
              ? `${data.comparison.latestLabel} compared with ${data.comparison.previousLabel}.`
              : "Log at least two GTs to unlock comparison deltas."}
          </p>
          <div className="mt-4 grid gap-3">
            {[
              { label: "Score delta", value: data.comparison.scoreDelta, metric: "score" as const },
              { label: "Correct delta", value: data.comparison.correctDelta, metric: "correct" as const },
              { label: "Wrong delta", value: data.comparison.wrongDelta, metric: "wrong" as const },
              { label: "Unattempted delta", value: data.comparison.unattemptedDelta, metric: "unattempted" as const },
              { label: getGtDeltaLabel(data.comparison.airMetricKind), value: data.comparison.airDelta, metric: "air" as const },
            ].map((entry) => (
              <article key={entry.label} className="note-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">{entry.label}</span>
                  <span
                    className="status-badge"
                    data-tone={getGtDeltaTone(entry.metric, entry.value, data.comparison.airMetricKind)}
                  >
                    {entry.value === null ? "—" : entry.value > 0 ? `+${entry.value}` : entry.value}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Section Patterns</div>
          <h2 className="mt-3 text-2xl font-semibold">Where pressure keeps hitting</h2>
          <div className="mt-6">
            {hasGtData ? (
              <GtSectionPatternPanel data={data.sectionPatterns} />
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-[var(--text-secondary)]">
                Section-pattern comparisons unlock after the first GT log with structured section A-E data.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-6">
          <div className="eyebrow">Wrapper Trend</div>
          <h2 className="mt-3 text-2xl font-semibold">Knowledge vs behaviour drift</h2>
          <div className="mt-6">
            {hasGtData ? (
              <GtWrapperTrendPanel data={data.wrapperTrend} />
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-[var(--text-secondary)]">
                The wrapper trend appears after GT logs record both knowledge and behaviour splits.
              </div>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Section Time Loss</div>
          <h2 className="mt-3 text-2xl font-semibold">What keeps stealing time</h2>
          <div className="mt-4 grid gap-3">
            {data.sectionTimeLost.map((entry) => (
              <article key={entry.section} className="note-card p-4">
                <div className="font-semibold">Section {entry.section}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {entry.reasons.length
                    ? entry.reasons.map((reason) => `${reason.label} (${reason.count})`).join(" · ")
                    : "No repeated time-loss tag yet."}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="eyebrow">Weakness Subjects</div>
          <h2 className="mt-3 text-2xl font-semibold">Subjects that keep returning as weak</h2>
          <div className="mt-4 grid gap-3">
            {data.weaknesses.subjects.length ? (
              data.weaknesses.subjects.map((entry) => (
                <article key={entry.label} className="note-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">{entry.label}</span>
                    <span className="status-badge" data-tone="red">
                      {entry.count} GTs
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-[var(--text-secondary)]">No repeated weak-subject signal yet.</p>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Recurring Topics</div>
          <h2 className="mt-3 text-2xl font-semibold">Topics repeating across wrappers</h2>
          <div className="mt-4 grid gap-3">
            {data.weaknesses.topics.length ? (
              data.weaknesses.topics.map((entry) => (
                <article key={entry.label} className="note-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">{entry.label}</span>
                    <span className="status-badge" data-tone="yellow">
                      {entry.count} GTs
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-[var(--text-secondary)]">No recurring-topic pattern yet.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
