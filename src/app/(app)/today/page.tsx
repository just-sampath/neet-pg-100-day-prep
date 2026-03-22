import Link from "next/link";

import { DevToolbar } from "@/components/app/dev-toolbar";
import { ScheduleShiftPanel } from "@/components/app/schedule-shift-panel";
import { TimeEditor } from "@/components/app/time-editor";
import { WindDownPrompts } from "@/components/app/wind-down-prompts";
import { requireCurrentUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import type { BlockKey, BlockStatus, ScheduledRecoveryItem } from "@/lib/domain/types";
import {
  buildTodayTimeline,
  getBacklogIndicatorLabel,
  getRevisionMinutesLabel,
} from "@/lib/domain/today";
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
  completeRevisionAction,
  setDayOneDateAction,
  setThemeAction,
  setTrafficLightAction,
  updateBlockAction,
} from "@/lib/server/actions";
import { addDaysToDateOnly, getMinutesInTimeZone, IST_TIME_ZONE } from "@/lib/utils/date";
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
    description: "A salvage day, not a zero day. Protect sleep, preserve continuity, and refuse the spiral.",
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
    return "Rescheduled";
  }
  return "Pending";
}

function getRevisionGroupNote(itemCount: number) {
  return itemCount === 1
    ? "1 revision segment is due from this topic."
    : `${itemCount} revision segments are due from this topic.`;
}

function getRecoveryWaitLabel(daysInBacklog: number) {
  return `Waiting ${daysInBacklog} day${daysInBacklog === 1 ? "" : "s"} before landing here.`;
}

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const { data, userState } = await mutateStore((store) => ({
    data: getHomeData(store, user.id),
    userState: structuredClone(store.userState[user.id]),
  }));

  const tomorrowDefault = addDaysToDateOnly(data.todayDate, 1);
  const minDate = process.env.NODE_ENV === "production"
    ? getMinutesInTimeZone(new Date(data.nowIso), IST_TIME_ZONE) >= 720
      ? addDaysToDateOnly(data.todayDate, 1)
      : data.todayDate
    : undefined;

  if (!data.settings.dayOneDate) {
    return (
      <div className="grid gap-6">
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
              <input className="field" type="date" name="dayOneDate" defaultValue={tomorrowDefault} min={minDate} required />
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
  const plannedRecovery = data.plannedRecovery;
  const plannedRecoveryByBlock = plannedRecovery.reduce((map, item) => {
    const entries = map.get(item.targetBlockKey) ?? [];
    entries.push(item);
    map.set(item.targetBlockKey, entries);
    return map;
  }, new Map<BlockKey, ScheduledRecoveryItem[]>());
  const revisionGroups = data.todayRevisionPlan ? groupRevisionItemsForDisplay(data.todayRevisionPlan.queue) : [];
  const overflowGroups = data.todayRevisionPlan
    ? groupRevisionItemsForDisplay(data.todayRevisionPlan.overflow.map((entry) => entry.item))
    : [];
  const catchUpGroups = data.todayRevisionPlan ? groupRevisionItemsForDisplay(data.todayRevisionPlan.catchUp) : [];
  const restudyGroups = data.todayRevisionPlan ? groupRevisionItemsForDisplay(data.todayRevisionPlan.restudyFlags) : [];
  const timelineEntries = buildTodayTimeline(todayScheduleDay, userState, todayState.trafficLight);
  const timeEditorSlots = todayScheduleDay.slots
    .filter((slot) => slot.trackable)
    .map((slot) => {
      const key = slot.key as typeof visibleBlocks[number];
      const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, key);
      return {
        key,
        label: slot.label,
        start: slot.start,
        end: slot.end,
        status: progress.status,
        actualStart: progress.actualStart,
        actualEnd: progress.actualEnd,
      };
    });
  const trackableOrder = new Map(
    todayScheduleDay.slots.filter((slot) => slot.trackable).map((slot, index) => [slot.key, index + 1]),
  );
  const backlogIndicatorLabel = getBacklogIndicatorLabel(data.backlogCount);
  const revisionMinutesLabel = getRevisionMinutesLabel(data.todayRevisionPlan?.morningMinutesPerItem ?? 0);
  const mcqQuickLogNote = getDisplayBlockDescription(todayScheduleDay, "mcq", todayState.trafficLight);
  const hasRecoverySignal =
    todayState.trafficLight !== "green" ||
    data.shiftHealth.missedDays.length > 0 ||
    data.backlogCount > 0 ||
    plannedRecovery.length > 0;
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
      <section className="panel reveal-rise p-6">
        <div className="max-w-xl">
          <div className="eyebrow">Pace Dial</div>
          <h3 className="display mt-3 text-3xl">Choose the real day, not the fantasy day.</h3>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(["green", "yellow", "red"] as const).map((trafficLight) => (
            <form key={trafficLight} action={setTrafficLightAction}>
              <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
              <input type="hidden" name="trafficLight" value={trafficLight} />
              <button className="pace-button" data-active={todayState.trafficLight === trafficLight} type="submit">
                <div className="font-mono text-[0.72rem] uppercase tracking-[0.22em]">{paceCopy[trafficLight].title}</div>
                <p className="mt-2 text-sm leading-6">{paceCopy[trafficLight].description}</p>
              </button>
            </form>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <form action={setThemeAction}>
            <input type="hidden" name="theme" value={data.settings.theme === "dark" ? "light" : "dark"} />
            <button className="button-secondary" type="submit">
              Switch to {data.settings.theme === "dark" ? "light" : "dark"}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.38fr_0.62fr]">
        <div className="grid gap-6">
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
                <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
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

            {todayState.trafficLight === "red" ? (
              <div className="note-card mt-6 p-5">
                <div className="eyebrow">Salvage Mode</div>
                <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                  A salvage day, not a zero day. Morning recall, one high-confidence review block, easy MCQs, then an early stop.
                </p>
              </div>
            ) : null}

            {data.lineQuote ? (
              <blockquote className="note-card mt-8 grid gap-4 p-5 md:grid-cols-[0.28fr_0.72fr] md:p-6">
                <div>
                  <div className="eyebrow">{data.lineQuoteCategory === "tough_day" ? "Tough-Day Line" : "Daily Line"}</div>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-dim)]">
                    {data.lineQuoteCategory === "tough_day" ? `${todayState.trafficLight} pace` : "green pace"} / beside you
                  </p>
                </div>
                <div>
                  <p className="display text-2xl leading-[1.1] md:text-3xl">&ldquo;{data.lineQuote.quote}&rdquo;</p>
                  <footer className="mt-4 text-sm text-(--text-secondary)">{data.lineQuote.author}</footer>
                </div>
              </blockquote>
            ) : null}
          </section>
        </div>

        {hasRecoverySignal ? (
          <div className="grid gap-6">
            <section className="panel reveal-rise stagger-2 p-6">
              <div className="eyebrow">Recovery Radar</div>
              <div className="mt-4 grid gap-3">
                {todayState.trafficLight !== "green" ? (
                  <div className="note-card p-4">
                    <div className="metric-label">Current Mode</div>
                    <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                      {todayState.trafficLight === "yellow"
                        ? "Consolidation and PYQ/Image blocks can move without turning the day into a failure story."
                        : "Only the essential spine of the day remains. Protect continuity and sleep."}
                    </p>
                  </div>
                ) : null}
                {data.shiftHealth.missedDays.length > 0 ? (
                  <div className="note-card p-4">
                    <div className="metric-label">Schedule Health</div>
                    <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                      {data.shiftHealth.missedDays.length} missed day(s) detected. A shift can be applied if recovery
                      no longer fits in place.
                    </p>
                  </div>
                ) : null}
                {plannedRecovery.length > 0 ? (
                  <div className="note-card p-4">
                    <div className="metric-label">Recovery Today</div>
                    <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                      {plannedRecovery.length} recovery item(s) are woven into today&apos;s blocks. Completing 80%
                      consistently beats attempting 100% and crashing.
                    </p>
                  </div>
                ) : null}
                {data.backlogCount > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Link className="button-secondary" href="/backlog">
                      {backlogIndicatorLabel}
                    </Link>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      {data.shiftPreview ? <ScheduleShiftPanel health={data.shiftHealth} preview={data.shiftPreview} /> : null}

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="panel reveal-rise p-6 md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Morning Revision</div>
              <h3 className="display mt-3 text-3xl">Open the day with retrieval, not drift.</h3>
              {revisionMinutesLabel ? (
                <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                  Equal split today: {revisionMinutesLabel} across the 06:30-08:00 block.
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
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
                      <div className="mt-2 text-sm leading-7 text-(--text-secondary)">
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
                            <div className="mt-1 text-sm leading-7 text-(--text-secondary)">{item.topic}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {revisionMinutesLabel ? (
                              <span className="status-badge" data-tone="neutral">
                                {revisionMinutesLabel}
                              </span>
                            ) : null}
                            <button className="button-secondary" type="submit">
                              Check off
                            </button>
                          </div>
                        </div>
                      </form>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
                No revision items are due for this morning yet.
              </div>
            )}
          </div>

          {(overflowCount || catchUpCount || restudyCount || data.todayRevisionPlan?.overflowSuggestion) ? (
            <div className="mt-5 grid gap-3">
              {data.todayRevisionPlan?.overflowSuggestion ? (
                <div className="note-card p-4">
                  <div className="eyebrow">Revision Pressure</div>
                  <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                    {data.todayRevisionPlan.overflowSuggestion}
                  </p>
                </div>
              ) : null}
              {overflowCount ? (
                <div className="note-card p-4">
                  <div className="eyebrow">Also Review Today</div>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-(--text-secondary)">
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
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-(--text-secondary)">
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
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-(--text-secondary)">
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
          <section className="panel reveal-rise p-5 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                <div className="eyebrow">MCQ Quick Log</div>
                <h3 className="display mt-3 text-3xl">Capture the question block while it is still warm.</h3>
                <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                  {mcqQuickLogNote}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link className="button-primary" href={{ pathname: "/mcq", hash: "bulk-entry" }}>
                  Open quick log
                </Link>
                <Link className="button-secondary" href="/mcq/analytics">
                  Accuracy trend
                </Link>
                {data.backlogCount ? (
                  <Link className="button-secondary" href="/backlog">
                    {backlogIndicatorLabel}
                  </Link>
                ) : (
                  <span className="status-badge" data-tone="neutral">
                    backlog clear
                  </span>
                )}
              </div>
            </div>
          </section>

          {timelineEntries.map((entry) => {
            if (entry.kind === "separator") {
              return (
                <div key={entry.id} className="timeline-separator" data-kind={entry.slotKind}>
                  <span>{entry.label}</span>
                  <span>
                    {entry.start} - {entry.end}
                  </span>
                </div>
              );
            }

            const completed = entry.progress.status === "completed" || entry.progress.status === "partial";
            const hiddenStatusTone = completed ? "green" : "neutral";
            const blockNumber = trackableOrder.get(entry.blockKey) ?? 0;
            const assignedRecovery = plannedRecoveryByBlock.get(entry.blockKey) ?? [];

            if (entry.mode === "hidden") {
              return (
                <article key={entry.id} className="timeline-hidden-card reveal-rise p-4 md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-[var(--muted)]">
                        Block {String(blockNumber).padStart(2, "0")} / {entry.label}
                      </div>
                      <p className="mt-2 text-sm text-(--text-secondary)">
                        {entry.start} - {entry.end}
                      </p>
                    </div>
                    <span className="status-badge" data-tone={hiddenStatusTone}>
                      {completed ? "Completed" : "Rescheduled"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-(--text-secondary)">
                    {completed
                      ? "Already completed before the pace dial tightened. Kept on record."
                      : "Folded into the recovery queue so today stays believable without stretching sleep."}
                  </p>
                  {assignedRecovery.length ? (
                    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-4">
                      <div className="eyebrow">Recovery still assigned here</div>
                      <div className="mt-3 grid gap-3">
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
                </article>
              );
            }

            return (
              <article
                key={entry.id}
                className="panel timeline-card reveal-rise p-5 md:p-6"
                data-complete={completed}
              >
                <div className="grid gap-5 lg:grid-cols-[8.5rem_1fr]">
                  <div className="pl-6">
                    <div className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-[var(--muted)]">
                      Block {String(blockNumber).padStart(2, "0")}
                    </div>
                    <div className="mt-3 display text-3xl">{entry.label}</div>
                    <p className="mt-3 text-sm text-(--text-secondary)">
                      {entry.start} - {entry.end}
                    </p>
                    <div className="mt-4">
                      <span className="status-badge" data-tone={getProgressTone(entry.progress.status)}>
                        {getProgressLabel(entry.progress.status)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold leading-tight">{entry.displayDescription}</h3>
                    <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                      {getBlockDurationLabel(todayScheduleDay, entry.blockKey, userState)}
                    </p>
                    {assignedRecovery.length ? (
                      <div className="note-card mt-5 p-4">
                        <div className="eyebrow">Recovery inside this block</div>
                        <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                          These items are no longer floating in backlog. They now belong to this block&apos;s plan.
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
                    <div className="mt-5 flex flex-wrap gap-2">
                      <form action={updateBlockAction}>
                        <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                        <input type="hidden" name="blockKey" value={entry.blockKey} />
                        <input type="hidden" name="intent" value="complete" />
                        <button className="button-primary" disabled={completed} type="submit">
                          Complete block
                        </button>
                      </form>
                      <form action={updateBlockAction}>
                        <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                        <input type="hidden" name="blockKey" value={entry.blockKey} />
                        <input type="hidden" name="intent" value="skip" />
                        <button className="button-secondary" disabled={completed} type="submit">
                          Move to backlog
                        </button>
                      </form>
                    </div>
                    <TimeEditor
                      dayNumber={todayScheduleDay.dayNumber}
                      blockKey={entry.blockKey}
                      start={entry.start}
                      end={entry.end}
                      trafficLight={todayState.trafficLight}
                      slots={timeEditorSlots}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </section>

      {data.dayComplete && data.celebrationQuote ? (
        <section className="panel panel-hero celebration-panel reveal-rise p-6 md:p-8">
          <div className="eyebrow">Completion Moment</div>
          <p className="display mt-4 max-w-4xl text-3xl md:text-5xl">&ldquo;{data.celebrationQuote.quote}&rdquo;</p>
          <p className="mt-4 text-sm text-(--text-secondary)">{data.celebrationQuote.author}</p>
          <p className="mt-4 text-sm leading-7 text-(--text-secondary)">
            The visible day is closed. Let the rest of the night belong to recovery, not extension.
          </p>
        </section>
      ) : null}

      <WindDownPrompts
        key={`${todayScheduleDay.dayNumber}:${data.nowIso}`}
        nowIso={data.nowIso}
        dayNumber={todayScheduleDay.dayNumber}
        trafficLight={todayState.trafficLight}
        incompleteVisibleBlocks={incompleteVisibleBlocks}
        lateNightSweepProcessed={data.lateNightSweepProcessed}
      />

      {process.env.NODE_ENV !== "production" ? <DevToolbar simulatedNow={data.nowIso} /> : null}
    </div>
  );
}
