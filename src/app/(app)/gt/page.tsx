import Link from "next/link";

import { GtEntryForm } from "@/components/app/gt-entry-form";
import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getGtPageData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export default async function GtPage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const data = await mutateStore((store) => getGtPageData(store, user.id));

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="eyebrow">GT Tracker</div>
            <h1 className="display mt-3 text-3xl md:text-4xl">Log the score, the behaviour drift, and what changes before the next paper.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-(--text-secondary)">
              The wrapper is structured on purpose. By GT-3 or GT-4, the app should already show whether time loss, panic, or the same weak
              subjects keep repeating.
            </p>
          </div>
          <Link className="button-secondary" href="/gt/analytics">
            View analytics
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
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
            <div className="metric-label">Knowledge average</div>
            <div className="metric-value">{data.summary.avgKnowledge ?? "—"}{data.summary.avgKnowledge !== null ? "%" : ""}</div>
          </article>
        </div>
      </section>

      <section className="panel p-6">
        <div className="eyebrow">Schedule Context</div>
        <h2 className="mt-3 text-2xl font-semibold">Derived GT windows, mapped to the live shifted schedule.</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.schedule.map((item) => (
            <article key={item.dayNumber} className="note-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Day {item.dayNumber}</span>
                {item.isToday ? (
                  <span className="status-badge" data-tone="blue">
                    Today
                  </span>
                ) : item.isUpcoming ? (
                  <span className="status-badge" data-tone="neutral">
                    Upcoming
                  </span>
              ) : (
                <span className="status-badge" data-tone="neutral">
                  Logged window
                </span>
              )}
              </div>
              <div className="mt-3 text-lg font-semibold">{item.label}</div>
              {item.purposeRaw !== item.label ? (
                <p className="mt-2 text-sm leading-7 text-(--text-secondary)">{item.purposeRaw}</p>
              ) : null}
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">{item.mappedDate ?? "No mapped date yet"}</p>
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">{item.resourceRaw}</p>
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">{item.reviewRaw}</p>
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">{item.whatToMeasureRaw}</p>
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">{item.mustOutputRaw}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="eyebrow">GT Log</div>
        <h2 className="mt-3 text-2xl font-semibold">Capture the full paper, not just the score.</h2>
        <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
          If today is not a GT day, you can still log retroactively. The suggested GT number and day come from the schedule plan after schedule
          shifts are applied.
        </p>
        <GtEntryForm todayDate={data.todayDate} subjectOptions={data.subjectOptions} suggestedPlanItem={data.suggestedPlanItem} />
      </section>

      <section className="panel p-6">
        <div className="eyebrow">Recent GT Trail</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentLogs.length ? (
            data.recentLogs.map((log) => (
              <article key={log.id} className="note-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{log.gtNumber}</span>
                  <span className="status-badge" data-tone="neutral">
                    {log.gtDate}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                  Score {log.score ?? "—"} · AIR {log.airPercentile ?? "—"} · {log.overallFeeling ?? "No feeling tag"}
                </p>
                <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                  {log.changeBeforeNextGt ?? "No wrapper note yet."}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-(--text-secondary)">No GT log yet. The first serious pattern usually shows up by GT-3 or GT-4.</p>
          )}
        </div>
      </section>
    </div>
  );
}
