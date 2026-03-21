import Link from "next/link";

import { McqBulkEntryForm } from "@/components/app/mcq-bulk-entry-form";
import { McqDetailedEntryForm } from "@/components/app/mcq-detailed-entry-form";
import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getMcqPageData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export default async function McqPage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const data = await mutateStore((store) => getMcqPageData(store, user.id));

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="eyebrow">MCQ Tracker</div>
            <h1 className="display mt-3 text-3xl md:text-4xl">Rapid logging for volume. Enough detail for pattern repair.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-(--text-secondary)">
              Use the left rail when a whole module is done. Use the right rail when a single question deserves a memory trace, a cause code,
              and a fix plan.
            </p>
          </div>
          <Link className="button-secondary" href="/mcq/analytics">
            View analytics
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="metric-slab">
            <div className="metric-label">Total solved</div>
            <div className="metric-value">{data.summary.totalSolved}</div>
            <p className="metric-note">Bulk and one-by-one entries combined.</p>
          </article>
          <article className="metric-slab">
            <div className="metric-label">Accuracy</div>
            <div className="metric-value">{data.summary.accuracy ?? "—"}{data.summary.accuracy !== null ? "%" : ""}</div>
            <p className="metric-note">No target, only trend and pattern visibility.</p>
          </article>
          <article className="metric-slab">
            <div className="metric-label">Wrong</div>
            <div className="metric-value">{data.summary.totalWrong}</div>
            <p className="metric-note">Questions that still need a better anchor.</p>
          </article>
          <article className="metric-slab">
            <div className="metric-label">Detailed entries</div>
            <div className="metric-value">{data.summary.detailedEntries}</div>
            <p className="metric-note">Single-question records for cause and fix patterns.</p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <section className="panel p-6" id="bulk-entry">
          <div className="eyebrow">Bulk Entry</div>
          <h2 className="mt-3 text-2xl font-semibold">Module finished. Log it in one pass.</h2>
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            This is the fast lane the Today quick-log button lands on. Keep it minimal unless the batch needs a subject label or source trace.
          </p>
          <McqBulkEntryForm todayDate={data.todayDate} subjects={data.subjects} recentSources={data.recentSources} />
        </section>

        <section className="panel p-6" id="detailed-entry">
          <div className="eyebrow">One-by-One Entry</div>
          <h2 className="mt-3 text-2xl font-semibold">MCQ ID, result tap, done.</h2>
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            The result buttons are the submit action. Expand details only when a question needs a cause code, a repair plan, or a note you want
            surfaced again later.
          </p>
          <McqDetailedEntryForm
            todayDate={data.todayDate}
            subjects={data.subjects}
            recentTopics={data.recentTopics}
            recentSources={data.recentSources}
          />
        </section>
      </section>

      {data.recentDetailedEntries.length ? (
        <section className="panel p-6">
          <div className="eyebrow">Recent Detailed Trail</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.recentDetailedEntries.map((entry) => (
              <article key={entry.id} className="note-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-badge" data-tone={entry.result === "wrong" ? "red" : entry.result === "guessed_right" ? "yellow" : "green"}>
                    {entry.result.replace("_", " ")}
                  </span>
                  {entry.subject ? (
                    <span className="status-badge" data-tone="neutral">
                      {entry.subject}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 font-semibold">{entry.mcqId}</div>
                <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                  {entry.topic || "No topic note yet."}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {entry.source || "Untagged source"} · {entry.entryDate}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
