import type { BlockKey, BlockProgress, DailyRevisionPlan, TopicStatus } from "@/lib/domain/types";
import { completeRevisionSessionAction } from "@/lib/server/actions";

type MorningWorkbookItem = {
  itemId: string;
  label: string;
  plannedMinutes: number;
  revisionType?: string | null;
  progress: {
    status: TopicStatus;
  };
};

type MorningBlockView = {
  blockKey: BlockKey;
  displayLabel: string;
  displayDescription?: string;
  progress: BlockProgress;
  items: MorningWorkbookItem[];
};

function getSessionNote(remainingIntervals: number) {
  return remainingIntervals === 1
    ? "1 checkpoint is still open for this topic."
    : `${remainingIntervals} checkpoints are still open for this topic.`;
}

function getProgressTone(status: BlockProgress["status"]) {
  if (status === "completed") {
    return "green";
  }

  if (status === "partially_complete") {
    return "yellow";
  }

  if (status === "missed") {
    return "red";
  }

  return "neutral";
}

function getProgressLabel(status: BlockProgress["status"]) {
  if (status === "partially_complete") {
    return "Partially complete";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "missed") {
    return "Missed";
  }

  if (status === "skipped") {
    return "Skipped";
  }

  if (status === "rescheduled") {
    return "Rescheduled";
  }

  return "Pending";
}

type MorningPlanPanelProps = {
  morningBlock: MorningBlockView;
  morningPlan: DailyRevisionPlan | null;
  canAdjustToday: boolean;
};

export function MorningPlanPanel({
  morningBlock,
  morningPlan,
  canAdjustToday,
}: MorningPlanPanelProps) {
  const queueSessions = morningPlan?.queueSessions ?? [];
  const queueCount = queueSessions.length;
  const morningAllocatedMinutes = morningPlan?.morningAllocatedMinutes ?? 0;
  const hasMorningException =
    morningBlock.progress.status === "missed" ||
    morningBlock.progress.status === "skipped" ||
    morningBlock.progress.status === "rescheduled";
  const primaryStatusLabel = hasMorningException
    ? getProgressLabel(morningBlock.progress.status)
    : queueCount
      ? `${queueCount} due`
      : morningPlan?.morningSessionPlanned
        ? "Queue cleared"
        : "No queue today";
  return (
    <section className="panel reveal-rise p-6 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{morningBlock.displayLabel}</div>
          <h3 className="display mt-3 text-3xl">Morning revision queue</h3>
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            FIFO queue with native revision times: 25m <code>D+1</code>, 15m <code>D+3</code>, 15m <code>D+7</code>, 10m <code>D+14</code>, 10m <code>D+28</code>. Only the first 75 minutes are shown today.
          </p>
          {morningAllocatedMinutes ? (
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
              {morningAllocatedMinutes} minutes are in today&apos;s 75-minute queue.
            </p>
          ) : null}
          {morningBlock.displayDescription ? (
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{morningBlock.displayDescription}</p>
          ) : null}
        </div>
        <span
          className="status-badge"
          data-tone={hasMorningException ? getProgressTone(morningBlock.progress.status) : queueCount ? "yellow" : "green"}
        >
          {primaryStatusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-3">
        {queueSessions.length ? (
          queueSessions.map((session, index) => (
            <article key={session.id} className="note-card p-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {session.revisionTypes.join(" · ")} / {session.subject}
                  </div>
                  <div className="mt-2 text-base font-semibold leading-7">{session.sourceTopicLabel}</div>
                  <div className="mt-2 text-sm leading-7 text-(--text-secondary)">{getSessionNote(session.remainingIntervals)}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {canAdjustToday ? (
                  <form action={completeRevisionSessionAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="sourceItemId" value={session.sourceItemId} />
                    <input type="hidden" name="sourceDay" value={session.sourceDay} />
                    <input type="hidden" name="sourceBlockKey" value={session.sourceBlockKey} />
                    {session.revisionIds.map((revisionId) => (
                      <input key={revisionId} type="hidden" name="revisionId" value={revisionId} />
                    ))}
                    <button className="button-secondary" type="submit">
                      Mark revised
                    </button>
                  </form>
                ) : (
                  <span className="status-badge" data-tone="neutral">
                    View only
                  </span>
                )}
                {session.allocatedMinutes ? (
                  <span className="status-badge" data-tone="neutral">
                    ~{session.allocatedMinutes} min
                  </span>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
            {morningPlan?.morningSessionPlanned
              ? "The morning revision queue is already cleared for today."
              : "No live revision is due in the 75-minute morning queue today."}
          </div>
        )}
      </div>

      {morningPlan?.overflowSuggestion ? (
        <div className="mt-5 grid gap-3">
          <div className="note-card p-4">
            <div className="eyebrow">Revision Pressure</div>
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{morningPlan.overflowSuggestion}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
