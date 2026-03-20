import { requireCurrentUser } from "@/lib/auth/session";
import { applyAutomations } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { updateBacklogAction } from "@/lib/server/actions";

export default async function BacklogPage() {
  const user = await requireCurrentUser();
  const defaultCompletionDate = new Date().toISOString().slice(0, 10);
  const { items } = await mutateStore((store) => {
    applyAutomations(store, user.id);
    return {
      items: structuredClone(
        Object.values(store.userState[user.id].backlogItems).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      ),
    };
  });

  const pendingCount = items.filter((item) => item.status === "pending").length;
  const rescheduledCount = items.filter((item) => item.status === "rescheduled").length;
  const completedCount = items.filter((item) => item.status === "completed").length;
  const yellowOrRedCount = items.filter((item) => item.sourceTag === "yellow_day" || item.sourceTag === "red_day").length;

  const summary = [
    {
      label: "Pending",
      value: String(pendingCount),
      note: "Still waiting for a real completion or a clean reschedule.",
    },
    {
      label: "Rescheduled",
      value: String(rescheduledCount),
      note: "Already assigned a new home in the plan.",
    },
    {
      label: "Recovered",
      value: String(completedCount),
      note: "Closed without reopening the original day.",
    },
    {
      label: "From Pace Dial",
      value: String(yellowOrRedCount),
      note: "Created by honest yellow or red day selections.",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero reveal-rise p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
          <div>
            <div className="eyebrow">Backlog Queue</div>
            <h1 className="display mt-3 text-4xl md:text-5xl">A recovery queue, not a guilt ledger.</h1>
            <p className="lead mt-5 max-w-2xl">
              This page exists to keep the plan believable. It should make recovery easier to aim, not heavier to look at.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {summary.map((item, index) => (
              <article key={item.label} className={`metric-slab reveal-rise stagger-${index + 1}`}>
                <div className="metric-label">{item.label}</div>
                <div className="metric-value">{item.value}</div>
                <p className="metric-note">{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {items.length ? (
          items.map((item, index) => (
            <article key={item.id} className="panel timeline-card reveal-rise p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                <div className="pl-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-badge" data-tone={item.status === "completed" ? "green" : item.status === "pending" ? "yellow" : "neutral"}>
                      {item.status}
                    </span>
                    <span className="status-badge" data-tone="neutral">
                      {item.subject}
                    </span>
                    <span className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[var(--muted)]">
                      Entry {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight">{item.topicDescription}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.suggestedNote}</p>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="note-card p-4">
                      <div className="metric-label">Original Slot</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Day {item.originalDay} / {item.originalBlockKey.replaceAll("_", " ")}
                        {item.originalStart && item.originalEnd ? ` / ${item.originalStart} - ${item.originalEnd}` : ""}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Suggested Landing</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.suggestedDay ? `Day ${item.suggestedDay}` : "No suggested day"} / {item.suggestedBlockKey ?? "pick a block"}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Source</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.sourceTag}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:min-w-[21rem]">
                  <form action={updateBacklogAction} className="note-card grid gap-3 p-4">
                    <input type="hidden" name="backlogId" value={item.id} />
                    <input type="hidden" name="intent" value="complete" />
                    <input className="field" type="date" name="completionDate" defaultValue={defaultCompletionDate} />
                    <button className="button-primary w-full" type="submit">
                      Mark completed
                    </button>
                  </form>

                  <form action={updateBacklogAction} className="note-card grid gap-3 p-4">
                    <input type="hidden" name="backlogId" value={item.id} />
                    <input type="hidden" name="intent" value="reschedule" />
                    <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                      <input className="field" type="number" min="1" max="100" name="rescheduledToDay" placeholder="Day" />
                      <select className="field" name="rescheduledToBlockKey" defaultValue={item.suggestedBlockKey ?? "consolidation"}>
                        <option value="block_a">Block A</option>
                        <option value="block_b">Block B</option>
                        <option value="consolidation">Consolidation</option>
                        <option value="mcq">MCQ</option>
                        <option value="pyq_image">PYQ / Image</option>
                        <option value="night_recall">Night Recall</option>
                      </select>
                    </div>
                    <button className="button-secondary w-full" type="submit">
                      Reschedule
                    </button>
                  </form>

                  <form action={updateBacklogAction}>
                    <input type="hidden" name="backlogId" value={item.id} />
                    <input type="hidden" name="intent" value="dismiss" />
                    <button className="button-secondary w-full" type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))
        ) : (
          <section className="panel reveal-rise p-6">
            <div className="eyebrow">Backlog Clear</div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Nothing is waiting here right now. That means recovery has either already happened or was not needed.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
