import { notFound } from "next/navigation";

import { TimeEditor } from "@/components/app/time-editor";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDayDetailData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import type { BlockKey, ScheduledRecoveryItem } from "@/lib/domain/types";
import { getRevisionAssignedSlotLabel, groupRevisionItemsForDisplay } from "@/lib/domain/schedule";
import { completeRevisionAction, setTrafficLightAction, updateBlockAction } from "@/lib/server/actions";
import { formatDateLabel } from "@/lib/utils/format";

function getRecoveryWaitLabel(daysInBacklog: number) {
  return `Waiting ${daysInBacklog} day${daysInBacklog === 1 ? "" : "s"} before landing here.`;
}

export default async function ScheduleDayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const user = await requireCurrentUser();
  const { day } = await params;
  const detail = await mutateStore((store) => getDayDetailData(store, user.id, Number(day)));

  if (!detail) {
    notFound();
  }

  const defaultCompletionDate = detail.mappedDate ?? detail.todayDate;
  const isPastDay = detail.mappedDate ? detail.mappedDate < detail.todayDate : false;
  const revisionGroups = detail.revisionPlan ? groupRevisionItemsForDisplay(detail.revisionPlan.queue) : [];
  const overflowGroups = detail.revisionPlan
    ? groupRevisionItemsForDisplay(detail.revisionPlan.overflow.map((entry) => entry.item))
    : [];
  const plannedRecoveryByBlock = detail.plannedRecovery.reduce((map, item) => {
    const entries = map.get(item.targetBlockKey) ?? [];
    entries.push(item);
    map.set(item.targetBlockKey, entries);
    return map;
  }, new Map<BlockKey, ScheduledRecoveryItem[]>());
  const timeEditorSlots = detail.blocks.map((block) => ({
    key: block.key as BlockKey,
    label: block.label,
    start: block.start,
    end: block.end,
    status: block.progress.status,
    actualStart: block.progress.actualStart,
    actualEnd: block.progress.actualEnd,
  }));

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="eyebrow">
          Day {detail.day.dayNumber} · {detail.day.phase}
        </div>
        <h1 className="display mt-3 text-3xl">{detail.day.primaryFocus}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {detail.mappedDate ? formatDateLabel(detail.mappedDate) : "Day 1 not set"} · {detail.day.deliverable}
        </p>
        {detail.hiddenShiftLabel ? (
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            This day is currently {detail.hiddenShiftLabel} by the active shift plan.
          </p>
        ) : null}
      </section>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Traffic light for this day</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["green", "yellow", "red"] as const).map((trafficLight) => (
            <form key={trafficLight} action={setTrafficLightAction}>
              <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
              <input type="hidden" name="trafficLight" value={trafficLight} />
              <button
                className={`w-full rounded-full px-4 py-3 text-sm font-semibold ${
                  detail.state.trafficLight === trafficLight ? "bg-[var(--accent)] text-[#20160a]" : "bg-[var(--surface-muted)]"
                }`}
                type="submit"
              >
                {trafficLight}
              </button>
            </form>
          ))}
        </div>
      </section>

      {revisionGroups.length ? (
        <section className="panel p-6">
          <h2 className="text-xl font-semibold">Revision work due on this date</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            This view only surfaces revision that becomes due on this mapped date. Later recalls stay out of the way until their own day arrives.
          </p>
          <div className="mt-4 grid gap-3">
            {revisionGroups.map((group) => (
              <article key={group.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {group.revisionTypes.join(" · ")} / {group.subject}
                </div>
                <div className="mt-2 text-lg font-semibold">{group.sourceTopicLabel}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {group.items.length === 1
                    ? "1 revision segment is due from this topic."
                    : `${group.items.length} revision segments are due from this topic.`}
                </p>
                <div className="mt-4 grid gap-2">
                  {group.items.map((item) => (
                    <form key={item.id} action={completeRevisionAction} className="rounded-2xl border border-[var(--border)] p-3">
                      <input type="hidden" name="sourceDay" value={item.sourceDay} />
                      <input type="hidden" name="sourceBlockKey" value={item.sourceBlockKey} />
                      <input type="hidden" name="revisionType" value={item.revisionType} />
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm text-[var(--muted)]">{item.revisionType}</div>
                          <div className="font-medium">{item.topic}</div>
                        </div>
                        <button className="button-secondary" type="submit">
                          Check off
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              </article>
              ))}
          </div>
          {overflowGroups.length ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              {overflowGroups.map((group) => (
                <div key={group.id} className="mb-3 last:mb-0">
                  <div className="font-medium text-[var(--text-primary)]">{group.sourceTopicLabel}</div>
                  {detail.revisionPlan!.overflow
                    .filter((item) => item.item.sourceDay === group.sourceDay)
                    .map((item) => (
                      <p key={item.item.id}>
                        {getRevisionAssignedSlotLabel(item.assignedSlot)}: {item.item.revisionType} · {item.item.topic}
                      </p>
                    ))}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4">
        {detail.blocks.map((block) => {
          const assignedRecovery = plannedRecoveryByBlock.get(block.key as BlockKey) ?? [];
          return (
            <article key={block.key} className="panel p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="eyebrow">{block.label}</div>
                  <h2 className="mt-2 text-xl font-semibold">{block.displayDescription}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Status: {block.progress.status} · {block.progress.actualStart ?? block.start} - {block.progress.actualEnd ?? block.end}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={updateBlockAction}>
                    <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                    <input type="hidden" name="blockKey" value={block.key} />
                    <input type="hidden" name="intent" value="complete" />
                    {isPastDay ? <input type="hidden" name="completionDate" value={defaultCompletionDate} /> : null}
                    <button className="button-primary" type="submit">
                      Complete
                    </button>
                  </form>
                  <form action={updateBlockAction}>
                    <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                    <input type="hidden" name="blockKey" value={block.key} />
                    <input type="hidden" name="intent" value="skip" />
                    <button className="button-secondary" type="submit">
                      Skip
                    </button>
                  </form>
                </div>
              </div>
              {assignedRecovery.length ? (
                <div className="note-card mt-4 p-4">
                  <div className="eyebrow">Recovery inside this block</div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
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
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          {item.sourceMappedDate ? `${formatDateLabel(item.sourceMappedDate)} origin. ` : ""}
                          {getRecoveryWaitLabel(item.daysInBacklog)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
              {isPastDay ? (
                <form action={updateBlockAction} className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className="mb-2 block text-sm text-[var(--muted)]">Actual completion date</label>
                    <input className="field" type="date" name="completionDate" defaultValue={defaultCompletionDate} />
                  </div>
                  <div className="flex gap-2">
                    <input type="hidden" name="dayNumber" value={detail.day.dayNumber} />
                    <input type="hidden" name="blockKey" value={block.key} />
                    <input type="hidden" name="intent" value="complete" />
                    <button className="button-secondary" type="submit">
                      Complete with date
                    </button>
                  </div>
                </form>
              ) : null}
              <TimeEditor
                dayNumber={detail.day.dayNumber}
                blockKey={block.key as BlockKey}
                start={block.start}
                end={block.end}
                trafficLight={detail.state.trafficLight}
                slots={timeEditorSlots}
              />
            </article>
          );
        })}
      </section>
    </div>
  );
}
