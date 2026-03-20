import { GtScoreChart } from "@/components/charts/gt-score-chart";
import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";

export default async function GtAnalyticsPage() {
  const user = await requireCurrentUser();
  const logs = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return structuredClone(Object.values(store.userState[user.id].gtLogs).sort((left, right) => left.gtDate.localeCompare(right.gtDate)));
  });

  const chartData = logs
    .filter((log) => log.score !== null)
    .map((log) => ({ label: log.gtNumber, score: log.score ?? 0 }));

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">GT Analytics</div>
        <h1 className="display mt-3 text-3xl">Score trend and reflection trail.</h1>
      </section>
      <section className="panel p-6">
        <GtScoreChart data={chartData} />
      </section>
      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Behaviour notes</h2>
        <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
          {logs.map((log) => (
            <p key={log.id}>
              {log.gtDate} · {log.gtNumber} · {log.changeBeforeNextGt || "No wrapper note yet"}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
