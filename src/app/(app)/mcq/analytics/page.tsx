import {
  McqBreakdownPanel,
  McqSubjectAccuracyPanel,
  McqTrendPanel,
} from "@/components/app/mcq-analytics-panels";
import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getMcqAnalyticsData } from "@/lib/data/app-state";
import { readActivityPageData } from "@/lib/data/local-store";

export default async function McqAnalyticsPage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const data = await readActivityPageData((store) => getMcqAnalyticsData(store, user.id));
  const hasMcqData = data.summary.totalSolved > 0;

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero p-6">
        <div className="eyebrow">MCQ Analytics</div>
        <h1 className="display mt-3 text-3xl md:text-4xl">Volume, accuracy, and what keeps going wrong.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-(--text-secondary)">
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
        <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
          Bars show how much got solved. The line tracks accuracy without inventing a target streak.
        </p>
        <div className="mt-6">
          {hasMcqData ? (
            <McqTrendPanel data={data.trendData} />
          ) : (
            <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
              No MCQ activity has been logged yet. Once the first batch or detailed entry lands, the daily trend will appear here.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="panel p-6">
          <div className="eyebrow">Right vs Wrong</div>
          <h2 className="mt-3 text-2xl font-semibold">Result breakdown</h2>
          <div className="mt-6">
            {hasMcqData ? (
              <McqBreakdownPanel data={data.breakdownData} />
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
                There is no result mix to chart yet. Log a few questions first, then come back to see right, guessed-right, and wrong proportions.
              </div>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">Subject Accuracy</div>
          <h2 className="mt-3 text-2xl font-semibold">When subject tags exist, accuracy becomes comparable.</h2>
          <div className="mt-6">
            {data.accuracyBySubject.length ? (
              <McqSubjectAccuracyPanel
                data={data.accuracyBySubject.map((entry) => ({ subject: entry.subject, accuracy: entry.accuracy }))}
              />
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
                Subject-accuracy comparison unlocks after a few entries carry subject tags.
              </div>
            )}
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
              <p className="text-sm leading-7 text-(--text-secondary)">No tagged wrong-subject pattern yet.</p>
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
              <p className="text-sm leading-7 text-(--text-secondary)">No cause-code signal yet.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
