import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { generateWeeklySummaryAction } from "@/lib/server/actions";

export default async function WeeklyPage() {
  const user = await requireCurrentUser();
  const summaries = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return structuredClone(
      Object.values(store.userState[user.id].weeklySummaries).sort((left, right) => right.weekStartDate.localeCompare(left.weekStartDate)),
    );
  });

  return (
    <div className="grid gap-4">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Weekly Summaries</div>
            <h1 className="display mt-3 text-3xl">Monday to Sunday, rendered without guesswork.</h1>
          </div>
          <form action={generateWeeklySummaryAction}>
            <button className="button-primary" type="submit">
              Generate now
            </button>
          </form>
        </div>
      </section>

      {summaries.map((summary) => (
        <Link key={summary.id} href={`/weekly/${summary.weekKey}`} className="panel block p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow">
                {summary.weekStartDate} → {summary.weekEndDate}
              </div>
              <h2 className="mt-2 text-xl font-semibold">
                {summary.blocksCompleted}/{summary.blocksPlanned} visible blocks completed
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                MCQs: {summary.totalMcqsSolved} · Accuracy: {summary.overallAccuracy ?? "—"}%
              </p>
            </div>
            <div className="text-sm text-[var(--muted)]">{summary.scheduleStatus}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
