import type { BlockKey, BlockProgress, DailyRevisionPlan, TopicStatus } from "@/lib/domain/types";
import { getRevisionAssignedSlotLabel, getRevisionSessionLaneLabel } from "@/lib/domain/schedule";
import { completeRevisionSessionAction, updateBlockAction } from "@/lib/server/actions";

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
  dayNumber: number;
  morningBlock: MorningBlockView;
  morningPlan: DailyRevisionPlan | null;
  canAdjustToday: boolean;
};

export function MorningPlanPanel({
  dayNumber,
  morningBlock,
  morningPlan,
  canAdjustToday,
}: MorningPlanPanelProps) {
  const queueSessions = morningPlan?.queueSessions ?? [];
  const overflowSessions = morningPlan?.overflowSessions ?? [];
  const catchUpSessions = morningPlan?.catchUpSessions ?? [];
  const restudySessions = morningPlan?.restudySessions ?? [];
  const phaseMode = morningPlan?.phaseMode ?? "workbook_only";
  const sessionPrimary = phaseMode === "session_primary";
  const morningMinutesLabel = morningPlan?.morningMinutesPerSession ? `~${morningPlan.morningMinutesPerSession} min each` : null;
  const remainingMorningCount = morningPlan?.morningSessionRemaining ?? 0;
  const primaryStatusLabel = sessionPrimary
    ? remainingMorningCount
      ? `${remainingMorningCount} due`
      : "Morning closed"
    : getProgressLabel(morningBlock.progress.status);
  const hasSecondarySessions = overflowSessions.length > 0 || catchUpSessions.length > 0 || restudySessions.length > 0;
  const workbookPrimaryNote =
    morningBlock.displayLabel === "Warm-Up"
      ? "Start with the workbook warm-up. Live revision stays visible below so nothing urgent disappears."
      : "Use the workbook morning block as the base. Live revision stays secondary here instead of competing with the plan.";

  return (
    <section className="panel reveal-rise p-6 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{morningBlock.displayLabel}</div>
          <h3 className="display mt-3 text-3xl">
            {sessionPrimary ? "Start with the revision that is due now." : "Follow the morning plan first, then use revision support."}
          </h3>
          {sessionPrimary && morningMinutesLabel ? (
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
              Equal split today: {morningMinutesLabel} across the 06:30-08:00 block.
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            {sessionPrimary
              ? "This surface replaces the duplicate timeline interaction. Finish the topic sessions here and let the morning block reflect that state."
              : workbookPrimaryNote}
          </p>
        </div>
        <span className="status-badge" data-tone={sessionPrimary ? (remainingMorningCount ? "yellow" : "green") : getProgressTone(morningBlock.progress.status)}>
          {primaryStatusLabel}
        </span>
      </div>

      {sessionPrimary ? (
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
                  {morningMinutesLabel ? (
                    <span className="status-badge" data-tone="neutral">
                      {morningMinutesLabel}
                    </span>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
              {morningPlan?.morningSessionPlanned
                ? "The morning revision set is already closed for today."
                : "No live revision sessions are due for this morning."}
            </div>
          )}
          {morningBlock.items.length ? (
            <div className="note-card p-4">
              <div className="eyebrow">Original Workbook Guide</div>
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                {morningBlock.items
                  .map((item) => (item.revisionType ? `${item.revisionType} · ${item.label}` : item.label))
                  .join(" | ")}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 note-card p-4">
          <div className="metric-label">Today&apos;s morning focus</div>
          {morningBlock.displayDescription ? (
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{morningBlock.displayDescription}</p>
          ) : null}
          <div className="mt-4 grid gap-3">
            {morningBlock.items.map((item) => (
              <article key={item.itemId} className="rounded-2xl border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.revisionType ? `${item.revisionType} · ${item.label}` : item.label}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">~{item.plannedMinutes} min</div>
                  </div>
                  <span className="status-badge" data-tone={item.progress.status === "completed" ? "green" : "neutral"}>
                    {item.progress.status === "completed" ? "Done" : "Planned"}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canAdjustToday ? (
              <form action={updateBlockAction}>
                <input type="hidden" name="dayNumber" value={dayNumber} />
                <input type="hidden" name="blockKey" value={morningBlock.blockKey} />
                <input type="hidden" name="intent" value="complete" />
                <button className="button-secondary" type="submit">
                  Mark morning block done
                </button>
              </form>
            ) : (
              <span className="status-badge" data-tone="neutral">
                View only
              </span>
            )}
          </div>
        </div>
      )}

      {(morningPlan?.overflowSuggestion || hasSecondarySessions) ? (
        <div className="mt-5 grid gap-3">
          {morningPlan?.overflowSuggestion ? (
            <div className="note-card p-4">
              <div className="eyebrow">Revision Pressure</div>
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{morningPlan.overflowSuggestion}</p>
            </div>
          ) : null}
          {[overflowSessions, catchUpSessions, restudySessions].map((sessions) =>
            sessions.length ? (
              <div key={sessions[0]!.lane} className="note-card p-4">
                <div className="eyebrow">{getRevisionSessionLaneLabel(sessions[0]!.lane)}</div>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-(--text-secondary)">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-[var(--border)] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{session.sourceTopicLabel}</span>
                        {session.assignedSlot !== "next_revision_phase" && session.assignedSlot !== "morning_revision" ? (
                          <span className="status-badge" data-tone="neutral">
                            {getRevisionAssignedSlotLabel(session.assignedSlot)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2">
                        {session.revisionTypes.join(" · ")} / {session.subject}
                      </p>
                      <p className="mt-2">{getSessionNote(session.remainingIntervals)}</p>
                      {canAdjustToday ? (
                        <form action={completeRevisionSessionAction} className="mt-3 flex flex-wrap gap-2">
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
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </section>
  );
}
