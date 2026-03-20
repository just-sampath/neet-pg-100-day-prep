import { McqTrendChart } from "@/components/charts/mcq-trend-chart";
import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export default async function McqAnalyticsPage() {
  const user = await requireCurrentUser();
  const snapshot = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return structuredClone(store.userState[user.id]);
  });

  const grouped = new Map<string, { attempted: number; correct: number }>();
  for (const log of Object.values(snapshot.mcqBulkLogs)) {
    const entry = grouped.get(log.entryDate) ?? { attempted: 0, correct: 0 };
    entry.attempted += log.totalAttempted;
    entry.correct += log.correct;
    grouped.set(log.entryDate, entry);
  }
  for (const log of Object.values(snapshot.mcqItemLogs)) {
    const entry = grouped.get(log.entryDate) ?? { attempted: 0, correct: 0 };
    entry.attempted += 1;
    entry.correct += log.result !== "wrong" ? 1 : 0;
    grouped.set(log.entryDate, entry);
  }

  const chartData = [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, value]) => ({
      label,
      attempted: value.attempted,
      accuracy: value.attempted ? Number(((value.correct / value.attempted) * 100).toFixed(1)) : 0,
    }));

  const wrongSubjects = new Map<string, number>();
  for (const log of Object.values(snapshot.mcqItemLogs)) {
    if (log.result === "wrong" && log.subject) {
      wrongSubjects.set(log.subject, (wrongSubjects.get(log.subject) ?? 0) + 1);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">MCQ Analytics</div>
        <h1 className="display mt-3 text-3xl">Volume and accuracy over time.</h1>
      </section>
      <section className="panel p-6">
        <McqTrendChart data={chartData} />
      </section>
      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Top wrong subjects</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          {[...wrongSubjects.entries()]
            .sort((left, right) => right[1] - left[1])
            .map(([label, count]) => (
              <p key={label}>
                {label}: {count}
              </p>
            ))}
        </div>
      </section>
    </div>
  );
}
