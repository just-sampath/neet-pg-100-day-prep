import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { submitMcqBulkAction, submitMcqItemAction } from "@/lib/server/actions";

export default async function McqPage() {
  const user = await requireCurrentUser();
  const snapshot = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return structuredClone(store.userState[user.id]);
  });

  const bulkLogs = Object.values(snapshot.mcqBulkLogs);
  const itemLogs = Object.values(snapshot.mcqItemLogs);
  const totalSolved = bulkLogs.reduce((sum, log) => sum + log.totalAttempted, 0) + itemLogs.length;
  const totalCorrect = bulkLogs.reduce((sum, log) => sum + log.correct, 0) + itemLogs.filter((item) => item.result !== "wrong").length;
  const accuracy = totalSolved ? ((totalCorrect / totalSolved) * 100).toFixed(1) : "—";

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow">MCQ Tracker</div>
            <h1 className="display mt-3 text-3xl">Log quickly, analyse later.</h1>
          </div>
          <Link className="button-secondary" href="/mcq/analytics">
            View analytics
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-[var(--border)] p-4">
            <div className="eyebrow">Total solved</div>
            <p className="mt-2 text-3xl font-semibold">{totalSolved}</p>
          </article>
          <article className="rounded-3xl border border-[var(--border)] p-4">
            <div className="eyebrow">Overall accuracy</div>
            <p className="mt-2 text-3xl font-semibold">{accuracy}%</p>
          </article>
          <article className="rounded-3xl border border-[var(--border)] p-4">
            <div className="eyebrow">Detailed entries</div>
            <p className="mt-2 text-3xl font-semibold">{itemLogs.length}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="eyebrow">Bulk Entry</div>
          <form action={submitMcqBulkAction} className="mt-4 grid gap-4">
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">Entry date</span>
              <input className="field" type="date" name="entryDate" />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Total attempted</span>
                <input className="field" type="number" name="totalAttempted" min="0" required />
              </label>
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Correct</span>
                <input className="field" type="number" name="correct" min="0" required />
              </label>
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Wrong</span>
                <input className="field" type="number" name="wrong" min="0" required />
              </label>
            </div>
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">Subject</span>
              <input className="field" name="subject" placeholder="Optional" />
            </label>
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">Source</span>
              <input className="field" name="source" placeholder="Module-Pharma-ANS" />
            </label>
            <button className="button-primary" type="submit">
              Save bulk entry
            </button>
          </form>
        </section>

        <section className="panel p-6">
          <div className="eyebrow">One-by-One Entry</div>
          <form action={submitMcqItemAction} className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">Entry date</span>
                <input className="field" type="date" name="entryDate" />
              </label>
              <label>
                <span className="mb-2 block text-sm text-[var(--muted)]">MCQ ID</span>
                <input className="field" name="mcqId" required />
              </label>
            </div>
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">Result</span>
              <select className="field" name="result" defaultValue="wrong">
                <option value="right">Right</option>
                <option value="wrong">Wrong</option>
                <option value="guessed_right">Guessed Right</option>
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="field" name="subject" placeholder="Subject" />
              <input className="field" name="topic" placeholder="Topic" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="field" name="source" placeholder="Source" />
              <input className="field" name="causeCode" placeholder="Cause code e.g. C" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="field" name="priority" placeholder="Priority e.g. P1" />
              <input className="field" name="fixCodes" placeholder="Comma-separated fix codes" />
            </div>
            <input className="field" name="tags" placeholder="Comma-separated tags" />
            <textarea className="field min-h-28" name="correctRule" placeholder="Correct rule" />
            <textarea className="field min-h-28" name="whatFooledMe" placeholder="What fooled me" />
            <button className="button-primary" type="submit">
              Save detailed entry
            </button>
          </form>
        </section>
      </section>
    </div>
  );
}
