import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getWeeklyPageData } from "@/lib/data/app-state";
import { readPassiveStore } from "@/lib/data/local-store";
import { generateWeeklySummaryAction } from "@/lib/server/actions";
import { WeeklySummaryCard } from "@/components/app/weekly-summary-card";

export default async function WeeklyPage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const data = await readPassiveStore((store) => getWeeklyPageData(store, user.id));

  return (
    <div className="grid gap-5">
      <section className="panel p-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="eyebrow">Weekly Review Ledger</div>
            <h1 className="display mt-3 text-3xl md:text-4xl">One place to see what held, what slipped, and what needs a calmer correction.</h1>
            <p className="lead mt-4 max-w-2xl text-sm md:text-base">
              Weekly summaries stay self-service and factual: schedule adherence, revision pressure, MCQ drift, GT signal, and backlog health without nagging.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="note-card p-4">
              <div className="eyebrow">Current Week</div>
              <p className="mt-3 text-lg font-semibold">{data.currentWeekStart}</p>
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                Manual generation snapshots the current Monday-to-Sunday week through today. Sunday automation seals the full week at the end of day.
              </p>
            </div>
            <form action={generateWeeklySummaryAction}>
              <button className="button-primary w-full" type="submit">
                Generate summary now
              </button>
            </form>
          </div>
        </div>
      </section>

      {data.summaries.length === 0 ? (
        <section className="panel p-6">
          <div className="eyebrow">No Summaries Yet</div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-(--text-secondary)">
            The weekly archive is still empty. Generate the current week manually, or let Sunday night automation create the first review on its own.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {data.summaries.map((summary) => (
            <WeeklySummaryCard key={summary.id} summary={summary} isCurrentWeek={summary.weekKey === data.currentWeekStart} />
          ))}
        </div>
      )}
    </div>
  );
}
