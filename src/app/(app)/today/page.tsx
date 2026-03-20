import Link from "next/link";

import { AppLogo } from "@/components/app/logo";
import { DevToolbar } from "@/components/app/dev-toolbar";
import { TimeEditor } from "@/components/app/time-editor";
import { WindDownPrompts } from "@/components/app/wind-down-prompts";
import { requireCurrentUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import type { BlockStatus } from "@/lib/domain/types";
import {
  getBlockDurationLabel,
  getBlockProgress,
  getDisplayBlockDescription,
  getHiddenBlockKeys,
  getRevisionAssignedSlotLabel,
  getVisibleBlockKeys,
  groupRevisionItemsForDisplay,
} from "@/lib/domain/schedule";
import { scheduleData } from "@/lib/generated/schedule-data";
import {
  applyShiftAction,
  completeRevisionAction,
  setDayOneDateAction,
  setThemeAction,
  setTrafficLightAction,
  updateBlockAction,
} from "@/lib/server/actions";
import { formatDateLabel } from "@/lib/utils/format";

const paceCopy = {
  green: {
    title: "Green",
    description: "Full schedule. Hold the whole line and finish the day in its original shape.",
  },
  yellow: {
    title: "Yellow",
    description: "Reduced scope. Keep the day moving and let non-essential load slide into recovery.",
  },
  red: {
    title: "Red",
    description: "Salvage mode. Protect sleep, preserve continuity, and refuse the spiral.",
  },
} as const;

function getProgressTone(status: BlockStatus) {
  if (status === "completed" || status === "partial") {
    return "green";
  }
  if (status === "missed") {
    return "red";
  }
  if (status === "skipped" || status === "rescheduled") {
    return "yellow";
  }
  return "neutral";
}

function getProgressLabel(status: BlockStatus) {
  if (status === "partial") {
    return "Quick version";
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
    return "Moved out";
  }
  return "Pending";
}

function getRevisionGroupNote(itemCount: number) {
  return itemCount === 1
    ? "1 revision segment is due from this topic."
    : `${itemCount} revision segments are due from this topic.`;
}

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const { data, userState } = await mutateStore((store) => ({
    data: getHomeData(store, user.id),
    userState: structuredClone(store.userState[user.id]),
  }));

  if (!data.settings.dayOneDate) {
    return (
      <div className="grid gap-6">
        <AppLogo />
        <section className="panel panel-hero reveal-rise p-6 md:p-8">
          <div className="eyebrow">First Setup</div>
          <h2 className="display mt-3 text-4xl md:text-5xl">Set Day 1 once, and let the whole hundred-day arc lock into place.</h2>
          <p className="lead mt-5 max-w-2xl">
            The workbook has already been compiled into app data. This date simply anchors the mapping, revision cadence,
            GT markers, and recovery logic to the calendar you are actually living in.
          </p>
          <form action={setDayOneDateAction} className="mt-8 grid gap-4 md:max-w-md">
            <label>
              <span className="mb-2 block text-sm text-[var(--muted)]">Day 1 date</span>
              <input className="field" type="date" name="dayOneDate" required />
            </label>
            <input type="hidden" name="theme" value={data.settings.theme} />
            <button className="button-primary" type="submit">
              Start the mapped plan
            </button>
          </form>
        </section>
        {process.env.NODE_ENV !== "production" ? <DevToolbar simulatedNow={data.nowIso} /> : null}
      </div>
    );
  }

  if (!data.todayScheduleDay) {
    return (
      <div className="grid gap-6">
        <AppLogo />
        <section className="panel panel-hero reveal-rise p-6 md:p-8">
          <div className="eyebrow">Plan Boundary</div>
          <h2 className="display mt-3 text-4xl md:text-5xl">Today sits outside the tracked hundred-day window.</h2>
          <p className="lead mt-5 max-w-2xl">
            Current effective date: {formatDateLabel(data.todayDate)}. The active schedule covers Days 1 through 100,
            then hands off to calmer exam-readiness behaviour.
          </p>
        </section>
      </div>
    );
  }

  const todayScheduleDay = data.todayScheduleDay;
  const todayState = data.todayState!;
  const phase = scheduleData.phases.find((entry) => entry.name === todayScheduleDay.phase);
  const visibleBlocks = getVisibleBlockKeys(todayState.trafficLight);
  const hiddenBlocks = getHiddenBlockKeys(todayState.trafficLight);
  const completedVisibleCount = visibleBlocks.filter((blockKey) => {
    const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, blockKey);
    return progress.status === "completed" || progress.status === "partial";
  }).length;
  const incompleteVisibleBlocks = visibleBlocks.filter((blockKey) => {
    const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, blockKey);
    return progress.status !== "completed" && progress.status !== "partial";
  });
  const revisionDue = data.todayRevisionPlan?.queue.length ?? 0;
  const overflowCount = data.todayRevisionPlan?.overflow.length ?? 0;
  const catchUpCount = data.todayRevisionPlan?.catchUp.length ?? 0;
  const restudyCount = data.todayRevisionPlan?.restudyFlags.length ?? 0;
  const revisionGroups = data.todayRevisionPlan ? groupRevisionItemsForDisplay(data.todayRevisionPlan.queue) : [];
  const overflowGroups = data.todayRevisionPlan
    ? groupRevisionItemsForDisplay(data.todayRevisionPlan.overflow.map((entry) => entry.item))
    : [];
  const catchUpGroups = data.todayRevisionPlan ? groupRevisionItemsForDisplay(data.todayRevisionPlan.catchUp) : [];
  const restudyGroups = data.todayRevisionPlan ? groupRevisionItemsForDisplay(data.todayRevisionPlan.restudyFlags) : [];
  const quickStats = [
    {
      label: "Visible Blocks",
      value: `${completedVisibleCount}/${visibleBlocks.length}`,
      note: hiddenBlocks.length ? `${hiddenBlocks.length} folded away for recovery.` : "Full day still intact.",
    },
    {
      label: "Revision Due",
      value: String(revisionDue),
      note: overflowCount
        ? `${overflowCount} overflow items also suggested.`
        : data.todayRevisionPlan?.morningMinutesPerItem
          ? `~${data.todayRevisionPlan.morningMinutesPerItem} min per item this morning.`
          : "No extra overflow pressure.",
    },
    {
      label: "Backlog Queue",
      value: String(data.backlogCount),
      note: data.shiftHealth.missedDays.length
        ? `${data.shiftHealth.missedDays.length} missed day(s) are affecting the mapping.`
        : "No missed-day debt detected.",
    },
    {
      label: "GT Marker",
      value: todayScheduleDay.gtTest === "No" ? "Rest" : todayScheduleDay.gtTest,
      note: todayScheduleDay.deliverable,
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <div className="grid gap-6">
          <AppLogo />
          <section className="panel panel-hero grain reveal-rise overflow-hidden p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <div className="eyebrow">
                  {data.dayCountLabel} / {phase?.name ?? todayScheduleDay.phase}
                </div>
                <h2 className="display mt-4 text-4xl md:text-6xl">{todayScheduleDay.primaryFocus}</h2>
                <p className="lead mt-5 max-w-2xl">{phase?.description ?? todayScheduleDay.deliverable}</p>
              </div>
              <div className="note-card min-w-[15rem] p-5">
                <div className="eyebrow">Mapped Date</div>
                <div className="display mt-3 text-2xl md:text-3xl">{formatDateLabel(data.todayDate)}</div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  Deliverable: {todayScheduleDay.deliverable}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {quickStats.map((stat, index) => (
                <article key={stat.label} className={`metric-slab reveal-rise stagger-${index + 1}`}>
                  <div className="metric-label">{stat.label}</div>
                  <div className="metric-value">{stat.value}</div>
                  <p className="metric-note">{stat.note}</p>
                </article>
              ))}
            </div>

            {data.quote ? (
              <blockquote className="note-card mt-8 grid gap-4 p-5 md:grid-cols-[0.28fr_0.72fr] md:p-6">
                <div>
                  <div className="eyebrow">{data.dayComplete ? "Completion Line" : "Today's Line"}</div>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">
                    {todayState.trafficLight} pace / beside you
                  </p>
                </div>
                <div>
                  <p className="display text-2xl leading-[1.1] md:text-3xl">&ldquo;{data.quote.quote}&rdquo;</p>
                  <footer className="mt-4 text-sm text-[var(--text-secondary)]">{data.quote.author}</footer>
                </div>
              </blockquote>
            ) : null}
          </section>
        </div>

        <div className="grid gap-6">
          <section className="panel reveal-rise stagger-2 p-6">
            <div className="eyebrow">Pace Dial</div>
            <h3 className="display mt-3 text-3xl">Choose the real day, not the fantasy day.</h3>
            <p className="lead mt-4 text-sm">
              The app should track reality cleanly. Pick the pace that matches your actual capacity and let the recovery
              logic do its work.
            </p>
            <div className="mt-5 grid gap-3">
              {(["green", "yellow", "red"] as const).map((trafficLight) => (
                <form key={trafficLight} action={setTrafficLightAction}>
                  <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                  <input type="hidden" name="trafficLight" value={trafficLight} />
                  <button className="pace-button" data-active={todayState.trafficLight === trafficLight} type="submit">
                    <div className="font-mono text-[0.72rem] uppercase tracking-[0.22em]">{paceCopy[trafficLight].title}</div>
                    <p className="mt-2 text-sm leading-6">
                      {paceCopy[trafficLight].description}
                    </p>
                  </button>
                </form>
              ))}
            </div>
          </section>

          <section className="panel reveal-rise stagger-3 p-6">
            <div className="eyebrow">Recovery Radar</div>
            <div className="mt-4 grid gap-3">
              <div className="note-card p-4">
                <div className="metric-label">Current Mode</div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {todayState.trafficLight === "green"
                    ? "Everything stays visible. This is the original workload."
                    : todayState.trafficLight === "yellow"
                      ? "Consolidation and PYQ/Image blocks can move without turning the day into a failure story."
                      : "Only the essential spine of the day remains. Protect continuity and sleep."}
                </p>
              </div>
              <div className="note-card p-4">
                <div className="metric-label">Schedule Health</div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {data.shiftHealth.missedDays.length
                    ? `${data.shiftHealth.missedDays.length} missed day(s) detected. A shift can be applied if recovery no longer fits in place.`
                    : "No shift pressure right now. The mapped calendar is still stable."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="button-secondary" href="/backlog">
                  Open backlog ({data.backlogCount})
                </Link>
                <form action={setThemeAction}>
                  <input type="hidden" name="theme" value={data.settings.theme === "dark" ? "light" : "dark"} />
                  <button className="button-secondary" type="submit">
                    Switch to {data.settings.theme === "dark" ? "light" : "dark"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </section>

      {data.shiftPreview ? (
        <section className="panel reveal-rise p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="eyebrow">Shift Preview</div>
              <h3 className="display mt-3 text-3xl">The calendar can still be rescued, but it needs a deliberate move.</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <article className="metric-slab">
                <div className="metric-label">Missed Days</div>
                <div className="metric-value">{data.shiftHealth.missedDays.length}</div>
                <p className="metric-note">Detected from unfinished mapped past days.</p>
              </article>
              <article className="metric-slab">
                <div className="metric-label">Buffer Used</div>
                <div className="metric-value">{data.shiftPreview.bufferUsed}</div>
                <p className="metric-note">Day 84 absorption is used before compression.</p>
              </article>
              <article className="metric-slab">
                <div className="metric-label">Projected Day 100</div>
                <div className="metric-value text-[1.55rem] md:text-[1.85rem]">{formatDateLabel(data.shiftPreview.day100)}</div>
                <p className="metric-note">
                  {data.shiftPreview.hardBoundaryExceeded ? "This breaches the August 20 boundary." : "This stays within the hard boundary."}
                </p>
              </article>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Compression pairs:
              {" "}
              {data.shiftPreview.compressedPairs.length
                ? data.shiftPreview.compressedPairs.map((pair) => `${pair[0]}+${pair[1]}`).join(", ")
                : "none yet"}
              .
            </p>
            <form action={applyShiftAction}>
              <input type="hidden" name="additionalDays" value={data.shiftHealth.missedDays.length} />
              <button className="button-primary" disabled={data.shiftPreview.hardBoundaryExceeded} type="submit">
                Apply suggested shift
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="panel reveal-rise p-6 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Morning Revision</div>
              <h3 className="display mt-3 text-3xl">Open the day with retrieval, not drift.</h3>
              {data.todayRevisionPlan?.morningMinutesPerItem ? (
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  About {data.todayRevisionPlan.morningMinutesPerItem} minutes per visible item across the 06:30-08:00 block.
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Only revision work that is due today is shown here. Later recalls stay quiet until their own date arrives.
              </p>
            </div>
            <span className="status-badge" data-tone={revisionDue ? "yellow" : "green"}>
              {revisionDue} due
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {revisionGroups.length ? (
              revisionGroups.map((group, index) => (
                <article key={group.id} className="note-card p-4">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                        {group.revisionTypes.join(" · ")} / {group.subject}
                      </div>
                      <div className="mt-2 text-base font-semibold leading-7">{group.sourceTopicLabel}</div>
                      <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {getRevisionGroupNote(group.items.length)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {group.items.map((item) => (
                      <form
                        key={item.id}
                        action={completeRevisionAction}
                        className="rounded-2xl border border-[var(--border)] p-3"
                      >
                        <input type="hidden" name="sourceDay" value={item.sourceDay} />
                        <input type="hidden" name="sourceBlockKey" value={item.sourceBlockKey} />
                        <input type="hidden" name="revisionType" value={item.revisionType} />
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                              {item.revisionType}
                            </div>
                            <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">{item.topic}</div>
                          </div>
                          <button className="button-secondary" type="submit">
                            Check off
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-[var(--text-secondary)]">
                No revision items are due for this morning yet.
              </div>
            )}
          </div>

          {(overflowCount || catchUpCount || restudyCount || data.todayRevisionPlan?.overflowSuggestion) ? (
            <div className="mt-5 grid gap-3">
              {data.todayRevisionPlan?.overflowSuggestion ? (
                <div className="note-card p-4">
                  <div className="eyebrow">Revision Pressure</div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {data.todayRevisionPlan.overflowSuggestion}
                  </p>
                </div>
              ) : null}
              {overflowCount ? (
                <div className="note-card p-4">
                  <div className="eyebrow">Also Review Today</div>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {overflowGroups.map((group) => (
                      <div key={group.id} className="rounded-2xl border border-[var(--border)] p-3">
                        <div className="font-medium text-[var(--text-primary)]">{group.sourceTopicLabel}</div>
                        <div className="mt-2 space-y-1">
                          {data.todayRevisionPlan!.overflow
                            .filter((overflow) => overflow.item.sourceDay === group.sourceDay)
                            .map((overflow) => (
                              <p key={overflow.item.id}>
                                {getRevisionAssignedSlotLabel(overflow.assignedSlot)}: {overflow.item.revisionType} · {overflow.item.topic}
                              </p>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {catchUpCount ? (
                <div className="note-card p-4">
                  <div className="eyebrow">Catch-Up Revision</div>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {catchUpGroups.map((group) => (
                      <div key={group.id} className="rounded-2xl border border-[var(--border)] p-3">
                        <div className="font-medium text-[var(--text-primary)]">{group.sourceTopicLabel}</div>
                        <div className="mt-2 space-y-1">
                          {group.items.map((item) => (
                            <p key={item.id}>
                              {getRevisionAssignedSlotLabel(item.assignedSlot)}: {item.revisionType} · {item.topic}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {restudyCount ? (
                <div className="note-card p-4">
                  <div className="eyebrow">Re-Study Flags</div>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {restudyGroups.map((group) => (
                      <div key={group.id} className="rounded-2xl border border-[var(--border)] p-3">
                        <div className="font-medium text-[var(--text-primary)]">{group.sourceTopicLabel}</div>
                        <div className="mt-2 space-y-1">
                          {group.items.map((item) => (
                            <p key={item.id}>
                              {item.revisionType} · {item.topic} should return in the next revision phase instead of staying in the daily queue.
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4">
          {visibleBlocks.map((blockKey, index) => {
            const slot = todayScheduleDay.slots.find((item) => item.key === blockKey)!;
            const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, blockKey);
            const completed = progress.status === "completed" || progress.status === "partial";

            return (
              <article
                key={blockKey}
                className="panel timeline-card reveal-rise p-5 md:p-6"
                style={completed ? { borderColor: "var(--border-strong)" } : undefined}
              >
                <div className="grid gap-5 lg:grid-cols-[8.5rem_1fr]">
                  <div className="pl-6">
                    <div className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-[var(--muted)]">
                      Block {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-3 display text-3xl">{slot.label}</div>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      {slot.start} - {slot.end}
                    </p>
                    <div className="mt-4">
                      <span className="status-badge" data-tone={getProgressTone(progress.status)}>
                        {getProgressLabel(progress.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold leading-tight">
                      {getDisplayBlockDescription(todayScheduleDay, blockKey, todayState.trafficLight)}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {getBlockDurationLabel(todayScheduleDay, blockKey, userState)}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <form action={updateBlockAction}>
                        <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                        <input type="hidden" name="blockKey" value={blockKey} />
                        <input type="hidden" name="intent" value="complete" />
                        <button className="button-primary" disabled={completed} type="submit">
                          Complete block
                        </button>
                      </form>
                      <form action={updateBlockAction}>
                        <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                        <input type="hidden" name="blockKey" value={blockKey} />
                        <input type="hidden" name="intent" value="skip" />
                        <button className="button-secondary" disabled={completed} type="submit">
                          Move out
                        </button>
                      </form>
                    </div>
                    <TimeEditor dayNumber={todayScheduleDay.dayNumber} blockKey={blockKey} start={slot.start} end={slot.end} />
                  </div>
                </div>
              </article>
            );
          })}

          {hiddenBlocks.length ? (
            <section className="panel reveal-rise p-5 md:p-6">
              <div className="eyebrow">Folded Away For Recovery</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {hiddenBlocks.map((blockKey) => {
                  const slot = todayScheduleDay.slots.find((item) => item.key === blockKey)!;
                  return (
                    <div key={blockKey} className="note-card p-4 text-sm leading-7 text-[var(--text-secondary)]">
                      <div className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                        {slot.label}
                      </div>
                      <p className="mt-2">
                        This block is now part of the recovery queue so the current day can stay believable.
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </section>
      </section>

      {data.dayComplete && data.quote ? (
        <section className="panel panel-hero reveal-rise p-6 md:p-8">
          <div className="eyebrow">Completion Moment</div>
          <p className="display mt-4 max-w-4xl text-3xl md:text-5xl">&ldquo;{data.quote.quote}&rdquo;</p>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">{data.quote.author}</p>
        </section>
      ) : null}

      <WindDownPrompts
        nowIso={data.nowIso}
        dayNumber={todayScheduleDay.dayNumber}
        trafficLight={todayState.trafficLight}
        incompleteVisibleBlocks={incompleteVisibleBlocks}
      />

      {process.env.NODE_ENV !== "production" ? <DevToolbar simulatedNow={data.nowIso} /> : null}
    </div>
  );
}
