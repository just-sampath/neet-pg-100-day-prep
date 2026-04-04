import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getRevisionQueuePageData } from "@/lib/data/app-state";
import { readPassiveStore } from "@/lib/data/local-store";
import { getRevisionSessionLaneLabel } from "@/lib/domain/schedule";
import type { RevisionSession } from "@/lib/domain/types";
import { formatDateLabel } from "@/lib/utils/format";

function getSessionNote(remainingIntervals: number) {
  return remainingIntervals === 1
    ? "1 checkpoint is still open for this topic."
    : `${remainingIntervals} checkpoints are still open for this topic.`;
}

function getLaneTone(lane: RevisionSession["lane"]) {
  if (lane === "revision_recovery" || lane === "needs_restudy") {
    return "red";
  }
  if (lane === "also_review_today") {
    return "yellow";
  }
  return "neutral";
}

export default async function RevisionQueuePage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const data = await readPassiveStore((store) => getRevisionQueuePageData(store, user.id));

  const queueSessions = data.revisionPlan?.queueSessions ?? [];
  const waitingSessions = data.waitingSessions;
  const morningAllocatedMinutes = data.revisionPlan?.morningAllocatedMinutes ?? 0;

  return (
    <div className="grid gap-5">
      <section className="panel panel-hero reveal-rise p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr] xl:items-end">
          <div>
            <div className="eyebrow">Revision Queue</div>
            <h1 className="display mt-3 text-4xl md:text-5xl">Every pending revision session, from the 75-minute window to the waiting lanes.</h1>
            <p className="lead mt-5 max-w-2xl">
              {data.dayCountLabel} on {formatDateLabel(data.todayDate)}. Keep the morning queue clean first, then pull from waiting lanes as time opens.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="metric-slab">
              <div className="metric-label">In Morning Queue</div>
              <div className="metric-value">{queueSessions.length}</div>
              <p className="metric-note">
                {morningAllocatedMinutes
                  ? `${morningAllocatedMinutes} minutes are currently assigned in the 75-minute block.`
                  : "No active sessions are currently assigned in the 75-minute block."}
              </p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Waiting Sessions</div>
              <div className="metric-value">{waitingSessions.length}</div>
              <p className="metric-note">Sessions waiting in overflow, recovery, or re-study lanes.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Due Today</div>
              <div className="metric-value">{data.revision.dueTodayCount}</div>
              <p className="metric-note">Pending checkpoints scheduled for today.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Overdue</div>
              <div className="metric-value">{data.revision.overdueCount}</div>
              <p className="metric-note">Past-due checkpoints still waiting.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="panel reveal-rise p-5 md:p-6">
        <div className="grid gap-3">
          <div>
            <div className="eyebrow">Due This Morning</div>
            <h2 className="display mt-3 text-2xl md:text-3xl">Active 75-minute queue</h2>
          </div>
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
                  <span className="status-badge" data-tone="yellow">
                    {getRevisionSessionLaneLabel(session.lane)}
                  </span>
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
              The active morning queue is clear right now.
            </div>
          )}
        </div>
      </section>

      <section className="panel reveal-rise p-5 md:p-6">
        <div className="grid gap-3">
          <div>
            <div className="eyebrow">Waiting Lanes</div>
            <h2 className="display mt-3 text-2xl md:text-3xl">Overflow, recovery, and re-study</h2>
          </div>
          {waitingSessions.length ? (
            waitingSessions.map((session, index) => (
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
                    <div className="mt-2 text-sm leading-7 text-(--text-secondary)">
                      Due from {formatDateLabel(session.earliestScheduledDate)}.
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="status-badge" data-tone={getLaneTone(session.lane)}>
                    {getRevisionSessionLaneLabel(session.lane)}
                  </span>
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
              No waiting sessions in overflow or recovery lanes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
