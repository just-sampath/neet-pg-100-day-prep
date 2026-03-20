import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { submitGtAction } from "@/lib/server/actions";

export default async function GtPage() {
  const user = await requireCurrentUser();
  const gtLogs = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return structuredClone(Object.values(store.userState[user.id].gtLogs).sort((left, right) => right.gtDate.localeCompare(left.gtDate)));
  });

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow">GT Tracker</div>
            <h1 className="display mt-3 text-3xl">Capture score, behaviour, and correction plan.</h1>
          </div>
          <Link className="button-secondary" href="/gt/analytics">
            View analytics
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <form action={submitGtAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <input className="field" name="gtNumber" placeholder="GT-1" required />
            <input className="field" type="date" name="gtDate" />
            <input className="field" type="number" name="dayNumber" placeholder="Day number" />
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <input className="field" type="number" name="score" placeholder="Score" />
            <input className="field" type="number" name="correct" placeholder="Correct" />
            <input className="field" type="number" name="wrong" placeholder="Wrong" />
            <input className="field" type="number" name="unattempted" placeholder="Unattempted" />
            <input className="field" name="airPercentile" placeholder="AIR / Percentile" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <input className="field" name="device" placeholder="Device" />
            <input className="field" name="overallFeeling" placeholder="Feeling" />
            <input className="field" name="attemptedLive" placeholder="yes / no" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <textarea className="field min-h-28" name="errorTypes" placeholder="What kinds of errors dominated?" />
            <textarea className="field min-h-28" name="recurringTopics" placeholder="Top recurring topics" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="field" type="number" name="knowledgeVsBehaviour" placeholder="Knowledge vs behaviour (0-100)" />
            <input className="field" type="number" name="unsureRightCount" placeholder="Unsure-right count" />
          </div>
          <textarea className="field min-h-28" name="changeBeforeNextGt" placeholder="What will change before the next GT?" />
          <button className="button-primary" type="submit">
            Save GT log
          </button>
        </form>
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Recent GT logs</h2>
        <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
          {gtLogs.map((log) => (
            <p key={log.id}>
              {log.gtDate} · {log.gtNumber} · Score {log.score ?? "—"} · {log.airPercentile ?? "No AIR/percentile logged"}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
