import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export default async function WeeklyDetailPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const user = await requireCurrentUser();
  const { week } = await params;
  const summary = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return structuredClone(
      Object.values(store.userState[user.id].weeklySummaries).find((item) => item.weekKey === week) ?? null,
    );
  });

  if (!summary) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">
          {summary.weekStartDate} → {summary.weekEndDate}
        </div>
        <h1 className="display mt-3 text-3xl">Weekly summary</h1>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel p-5">
          <div className="eyebrow">Schedule</div>
          <p className="mt-3 text-3xl font-semibold">{summary.blocksCompleted}/{summary.blocksPlanned}</p>
        </article>
        <article className="panel p-5">
          <div className="eyebrow">Traffic lights</div>
          <p className="mt-3 text-3xl font-semibold">
            {summary.greenDays}/{summary.yellowDays}/{summary.redDays}
          </p>
        </article>
        <article className="panel p-5">
          <div className="eyebrow">MCQs</div>
          <p className="mt-3 text-3xl font-semibold">{summary.totalMcqsSolved}</p>
        </article>
        <article className="panel p-5">
          <div className="eyebrow">Backlog</div>
          <p className="mt-3 text-3xl font-semibold">{summary.backlogCount}</p>
        </article>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Highlights</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          <p>Morning revision completion: {summary.morningRevisionCompleted}/{summary.morningRevisionPlanned}</p>
          <p>Accuracy trend: {summary.accuracyVsPrevious}</p>
          <p>Subjects studied: {summary.subjectsStudied.join(", ") || "—"}</p>
          <p>GT this week: {summary.gtNumber ?? "None logged"}</p>
        </div>
      </section>
    </div>
  );
}
