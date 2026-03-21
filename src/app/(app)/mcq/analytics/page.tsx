import { McqBreakdownChart } from "@/components/charts/mcq-breakdown-chart";
import { McqSubjectAccuracyChart } from "@/components/charts/mcq-subject-accuracy-chart";
import { McqTrendChart } from "@/components/charts/mcq-trend-chart";
import { requireCurrentUser } from "@/lib/auth/session";
import { getMcqAnalyticsData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export default async function McqAnalyticsPage() {
  const user = await requireCurrentUser();
  const data = await mutateStore((store) => getMcqAnalyticsData(store, user.id));

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero p-6">
        <div className="eyebrow">MCQ Analytics</div>
        <h1 className="display mt-3 text-3xl md:text-4xl">Volume, accuracy, and what keeps going wrong.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          This screen is deliberately diagnostic, not motivational. It should answer three things quickly: how much got solved, where accuracy is
          slipping, and whether the same subjects or cause codes keep repeating.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-slab">
          <div className="metric-label">Solved</div>
          <div className="metric-value">{data.summary.totalSolved}</div>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Accuracy</div>
          <div className="metric-value">{data.summary.accuracy ?? "—"}{data.summary.accuracy !== null ? "%" : ""}</div>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Wrong</div>
          <div className="metric-value">{data.summary.totalWrong}</div>
        </article>
        <article className="metric-slab">
          <div className="metric-label">Guessed Right</div>
          <div className="metric-value">{data.summary.guessedRight}</div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="eyebrow">Trend Over Time</div>
        <h2 className="mt-3 text-2xl font-semibold">Daily volume and accuracy</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Bars show how much got solved. The line tracks accuracy without inventing a target streak.
        </p>
        <div className="mt-6">
          <McqTrendChart data={data.trendData} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="panel p-6">
          <div className="eyebrow">Right vs Wrong</div>
          <h2 className="mt-3 text-2xl font-semibold">Result breakdown</h2>
          <div className="mt-6">
            <McqBreakdownChart data={data.breakdownData} />
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Subject Accuracy</div>
          <h2 className="mt-3 text-2xl font-semibold">When subject tags exist, accuracy becomes comparable.</h2>
          <div className="mt-6">
            <McqSubjectAccuracyChart data={data.accuracyBySubject.map((entry) => ({ subject: entry.subject, accuracy: entry.accuracy }))} />
          </div>
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="eyebrow">Weak Subjects</div>
          <h2 className="mt-3 text-2xl font-semibold">Top wrong subjects</h2>
          <div className="mt-4 grid gap-3">
            {data.wrongSubjects.length ? (
              data.wrongSubjects.map((entry) => (
                <article key={entry.label} className="note-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">{entry.label}</span>
                    <span className="status-badge" data-tone="red">
                      {entry.count} wrong
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-[var(--text-secondary)]">No tagged wrong-subject pattern yet.</p>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Cause Codes</div>
          <h2 className="mt-3 text-2xl font-semibold">Repeated mistake types</h2>
          <div className="mt-4 grid gap-3">
            {data.causeCodes.length ? (
              data.causeCodes.map((entry) => (
                <article key={entry.label} className="note-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">{entry.label}</span>
                    <span className="status-badge" data-tone="yellow">
                      {entry.count} entries
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-[var(--text-secondary)]">No cause-code signal yet.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
