import { notFound } from "next/navigation";

import { MorningPlanPanel } from "@/components/app/morning-plan-panel";
import { TimeEditor } from "@/components/app/time-editor";
import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getDayDetailData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import type { BlockKey, ScheduledRecoveryItem } from "@/lib/domain/types";
import { setTrafficLightAction, updateBlockAction, updateTopicAction } from "@/lib/server/actions";
import { toDateOnlyInTimeZone } from "@/lib/utils/date";
import { formatDateLabel } from "@/lib/utils/format";

function getRecoveryWaitLabel(daysInBacklog: number) {
  return `Waiting ${daysInBacklog} day${daysInBacklog === 1 ? "" : "s"} before landing here.`;
}

function getReadOnlyReason(detail: NonNullable<Awaited<ReturnType<typeof getDayDetailData>>>) {
  if (detail.hiddenShiftLabel) {
    return `This day is currently ${detail.hiddenShiftLabel}, so it stays view-only while the shift plan is active.`;
  }

  if (detail.editState.relation === "future") {
    return "Future days stay view-only here. They unlock when their mapped date arrives.";
  }

  if (detail.editState.relation === "unmapped") {
    return "Set Day 1 first to unlock live dates and correction controls.";
  }

  return null;
}

export default async function ScheduleDayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const { day } = await params;
  const detail = await mutateStore((store) => getDayDetailData(store, user.id, Number(day)));

  if (!detail) {
    notFound();
  }

  const readOnlyReason = getReadOnlyReason(detail);
  const morningBlock = detail.blocks.find((block) => block.semanticBlockKey === "morning_revision") ?? null;
  const plannedRecoveryByBlock = detail.plannedRecovery.reduce((map, item) => {
    const entries = map.get(item.targetBlockKey) ?? [];
    entries.push(item);
    map.set(item.targetBlockKey, entries);
    return map;
  }, new Map<BlockKey, ScheduledRecoveryItem[]>());
  const timeEditorSlots = detail.blocks.map((block) => ({
    key: block.timeSlotKey as BlockKey,
    label: block.displayLabel,
    start: block.start,
    end: block.end,
    status: block.progress.status,
    actualStart: block.progress.actualStart,
    actualEnd: block.progress.actualEnd,
    visible: true,
    reschedulable: block.reschedulable,
  }));

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">
          Day {detail.day.dayNumber} · {detail.day.phaseName}
        </div>
        <h1 className="display mt-3 text-3xl">{detail.day.primaryFocusRaw}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {detail.mappedDate ? formatDateLabel(detail.mappedDate) : "Day 1 not set"} · {detail.day.resourceRaw}
        </p>
        <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
          {detail.day.notesRaw ?? "No extra note for this day."} Study mins {detail.day.plannedStudyMinutes ?? "—"} / buffer {detail.day.bufferMinutes ?? "—"}.
        </p>
        {detail.originalPlannedDate && detail.originalPlannedDate !== detail.mappedDate ? (
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            Originally planned for {formatDateLabel(detail.originalPlannedDate)}. This mapped date has shifted with the active schedule.
          </p>
        ) : null}
        {detail.mergedPartnerDay ? (
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            This day is currently carrying merged work from Day {detail.mergedPartnerDay}.
          </p>
        ) : null}
        {readOnlyReason ? <p className="mt-3 text-sm leading-7 text-(--text-secondary)">{readOnlyReason}</p> : null}
      </section>

      {detail.editState.canAdjustToday ? (
        <section className="panel p-6">
          <h2 className="text-xl font-semibold">Traffic light for today</h2>
          <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
            The pace dial only changes the current day. Past and future days stay untouched from the browser.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["green", "yellow", "red"] as const).map((trafficLight) => (
              <form key={trafficLight} action={setTrafficLightAction}>
                <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                <input type="hidden" name="trafficLight" value={trafficLight} />
                <button
                  className={`w-full rounded-full px-4 py-3 text-sm font-semibold ${detail.state.trafficLight === trafficLight ? "bg-[var(--accent)] text-[#20160a]" : "bg-[var(--surface-muted)]"}`}
                  type="submit"
                >
                  {trafficLight}
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel p-6">
          <h2 className="text-xl font-semibold">Recorded traffic light</h2>
          <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
            This day is currently saved as <span className="font-semibold capitalize">{detail.state.trafficLight}</span>.
          </p>
        </section>
      )}

      {morningBlock ? (
        <MorningPlanPanel
          dayNumber={detail.day.dayNumber}
          morningBlock={{
            blockKey: morningBlock.timeSlotKey,
            displayLabel: morningBlock.displayLabel,
            displayDescription: morningBlock.displayDescription,
            progress: morningBlock.progress,
            items: morningBlock.items.map((item) => ({
              itemId: item.itemId,
              label: item.label,
              plannedMinutes: item.plannedMinutes,
              revisionType: item.revisionType,
              progress: item.progress,
            })),
          }}
          morningPlan={detail.revisionPlan}
          canAdjustToday={detail.editState.canAdjustToday}
        />
      ) : null}

      <section className="grid gap-4">
        {detail.blocks.map((block) => {
          const assignedRecovery = plannedRecoveryByBlock.get(block.timeSlotKey as BlockKey) ?? [];
          const defaultCompletionDate = block.progress.completedAt
            ? toDateOnlyInTimeZone(block.progress.completedAt)
            : detail.mappedDate ?? detail.originalPlannedDate ?? detail.todayDate;

          if (morningBlock && block.timeSlotKey === morningBlock.timeSlotKey) {
            const morningSummary = detail.revisionPlan?.phaseMode === "session_primary"
              ? detail.revisionPlan.morningSessionRemaining
                ? `${detail.revisionPlan.morningSessionRemaining} session(s) are still open in the dedicated morning panel above.`
                : detail.revisionPlan?.morningSessionPlanned
                  ? "The live morning revision set is already closed from the panel above."
                  : "No live revision sessions are due on this mapped date."
              : "The dedicated morning panel above is the single place to complete or review this block.";

            return (
              <article key={block.timeSlotKey} className="panel p-5">
                <div className="eyebrow">{block.displayLabel}</div>
                <h2 className="mt-2 text-xl font-semibold">{block.displayDescription}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {block.start} – {block.end} · {block.progress.status}
                </p>
                <p className="mt-4 text-sm leading-7 text-(--text-secondary)">{morningSummary}</p>
                <div className="note-card mt-4 p-4 text-sm leading-7 text-(--text-secondary)">
                  The schedule block remains visible here for auditability, but its real interaction now lives in the shared morning panel above.
                </div>
                {detail.editState.canAdjustToday ? (
                  <TimeEditor
                    dayNumber={detail.day.dayNumber}
                    blockKey={block.timeSlotKey as BlockKey}
                    start={block.start}
                    end={block.end}
                    actualStart={block.progress.actualStart}
                    actualEnd={block.progress.actualEnd}
                    trafficLight={detail.state.trafficLight}
                    slots={timeEditorSlots}
                  />
                ) : null}
              </article>
            );
          }

          return (
            <article key={block.timeSlotKey} className="panel p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="eyebrow">{block.displayLabel}</div>
                  <h2 className="mt-2 text-xl font-semibold">{block.displayDescription}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {block.start} – {block.end} · {block.progress.status}
                  </p>
                </div>
                {detail.editState.canAdjustToday ? (
                  <div className="flex gap-2">
                    <form action={updateBlockAction}>
                      <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                      <input type="hidden" name="blockKey" value={block.timeSlotKey} />
                      <input type="hidden" name="intent" value="complete" />
                      <button className="button-primary" type="submit">
                        Complete
                      </button>
                    </form>
                    <form action={updateBlockAction}>
                      <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                      <input type="hidden" name="blockKey" value={block.timeSlotKey} />
                      <input type="hidden" name="intent" value="skip" />
                      <button className="button-secondary" type="submit">
                        Skip
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              {block.items.length ? (
                <div className="mt-4 grid gap-3">
                  {block.items.map((item) => (
                    <article key={item.itemId} className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            ~{item.plannedMinutes} min · {item.progress.status}
                          </div>
                        </div>
                        {!detail.editState.isReadOnly && item.progress.status !== "completed" ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={updateTopicAction}>
                              <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                              <input type="hidden" name="blockKey" value={block.timeSlotKey} />
                              <input type="hidden" name="itemId" value={item.itemId} />
                              <input type="hidden" name="intent" value="complete" />
                              {detail.editState.canRetroactivelyComplete ? <input type="hidden" name="completionDate" value={defaultCompletionDate} /> : null}
                              <button className="button-secondary" type="submit">
                                Mark done
                              </button>
                            </form>
                            {detail.editState.canAdjustToday ? (
                              <form action={updateTopicAction}>
                                <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                                <input type="hidden" name="blockKey" value={block.timeSlotKey} />
                                <input type="hidden" name="itemId" value={item.itemId} />
                                <input type="hidden" name="intent" value="skip" />
                                <button className="button-secondary" type="submit">
                                  Skip topic
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <span className="status-badge" data-tone={item.progress.status === "completed" ? "green" : "neutral"}>
                            {item.progress.status === "completed" ? "Done" : "View only"}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {assignedRecovery.length ? (
                <div className="note-card mt-4 p-4">
                  <div className="eyebrow">Recovery inside this block</div>
                  <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                    These queue items are already assigned here, so this block now carries them as part of the real plan.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {assignedRecovery.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-[var(--border)] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="status-badge" data-tone="neutral">
                            {item.subject}
                          </span>
                          <span className="status-badge" data-tone="neutral">
                            from Day {item.sourceDay}
                          </span>
                        </div>
                        <div className="mt-3 font-medium">{item.topicDescription}</div>
                        <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                          {item.sourceMappedDate ? `${formatDateLabel(item.sourceMappedDate)} origin. ` : ""}
                          {getRecoveryWaitLabel(item.daysInBacklog)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {detail.editState.canRetroactivelyComplete ? (
                <form action={updateBlockAction} className="note-card mt-4 grid gap-3 p-4">
                  <div className="eyebrow">Retroactive completion</div>
                  <p className="text-sm leading-7 text-(--text-secondary)">
                    This day has already passed. If you completed this block but forgot to mark it, pick the date you actually finished and record it below. Your revision schedule will adjust automatically.
                  </p>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                      <label className="mb-2 block text-sm text-[var(--muted)]">Date you finished this block</label>
                      <input className="field" type="date" name="completionDate" defaultValue={defaultCompletionDate} max={detail.todayDate} />
                    </div>
                    <div className="flex gap-2">
                      <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                      <input type="hidden" name="blockKey" value={block.timeSlotKey} />
                      <input type="hidden" name="intent" value="complete" />
                      <button className="button-secondary" type="submit">
                        Mark as completed
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}

              {detail.editState.canAdjustToday ? (
                <TimeEditor
                  dayNumber={detail.day.dayNumber}
                  blockKey={block.timeSlotKey as BlockKey}
                  start={block.start}
                  end={block.end}
                  actualStart={block.progress.actualStart}
                  actualEnd={block.progress.actualEnd}
                  trafficLight={detail.state.trafficLight}
                  slots={timeEditorSlots}
                />
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
