import Link from "next/link";

import { DevToolbar } from "@/components/app/dev-toolbar";
import { MorningPlanPanel } from "@/components/app/morning-plan-panel";
import { ScheduleShiftPanel } from "@/components/app/schedule-shift-panel";
import { TimeEditor } from "@/components/app/time-editor";
import { WindDownPrompts } from "@/components/app/wind-down-prompts";
import { requireCurrentUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/data/app-state";
import { readTodayStore } from "@/lib/data/local-store";
import type { BlockKey, BlockStatus, ScheduledRecoveryItem } from "@/lib/domain/types";
import {
  buildTodayTimeline,
  getBacklogIndicatorLabel,
} from "@/lib/domain/today";
import {
  getBlockProgress,
  getDisplayBlockDescription,
  getHiddenBlockKeys,
  getTopicProgress,
  getVisibleBlockKeys,
} from "@/lib/domain/schedule";
import {
  setDayOneDateAction,
  setThemeAction,
  setTrafficLightAction,
  updateBlockAction,
  updateTopicAction,
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
  if (status === "completed") {
    return "green";
  }
  if (status === "partially_complete") {
    return "yellow";
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

function getRecoveryWaitLabel(daysInBacklog: number) {
  return `Waiting ${daysInBacklog} day${daysInBacklog === 1 ? "" : "s"} before landing here.`;
}

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const { data, userState, referenceData } = await readTodayStore((store) => ({
    data: getHomeData(store, user.id),
    userState: structuredClone(store.userState[user.id]),
    referenceData: store.referenceData,
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
            The schedule has already been compiled into app data. This date simply anchors the mapping, revision cadence,
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
  const phase = data.phase;
  const visibleBlocks = getVisibleBlockKeys(todayState.trafficLight, todayScheduleDay);
  const hiddenBlocks = getHiddenBlockKeys(todayState.trafficLight, todayScheduleDay);
  const completedVisibleCount = visibleBlocks.filter((blockKey) => {
    const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, blockKey, referenceData);
    return progress.status === "completed";
  }).length;
  const incompleteVisibleBlocks = visibleBlocks.filter((blockKey) => {
    const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, blockKey, referenceData);
    return progress.status !== "completed";
  });
  const revisionDue = data.todayRevisionPlan?.queueSessions.length ?? 0;
  const plannedRecovery = data.plannedRecovery;
  const plannedRecoveryByBlock = plannedRecovery.reduce((map, item) => {
    const entries = map.get(item.targetBlockKey) ?? [];
    entries.push(item);
    map.set(item.targetBlockKey, entries);
    return map;
  }, new Map<BlockKey, ScheduledRecoveryItem[]>());
  const timelineEntries = buildTodayTimeline(todayScheduleDay, userState, todayState.trafficLight, referenceData);
  const morningBlock = todayScheduleDay.blocks.find((block) => block.semanticBlockKey === "morning_revision") ?? null;
  const timeEditorSlots = todayScheduleDay.blocks
    .filter((block) => block.trackable)
    .map((block) => {
      const key = block.timeSlotKey as typeof visibleBlocks[number];
      const progress = getBlockProgress(userState, todayScheduleDay.dayNumber, key, referenceData);
      const [start, end] = block.timeSlotKey.split("-");
      return {
        key,
        label: block.displayLabel,
        start,
        end,
        status: progress.status,
        actualStart: progress.actualStart,
        actualEnd: progress.actualEnd,
        visible: visibleBlocks.includes(key),
        reschedulable: block.reschedulable,
      };
    });
  const trackableOrder = new Map(
    todayScheduleDay.blocks
      .filter((block) => block.trackable && block.semanticBlockKey !== "morning_revision")
      .map((block, index) => [block.timeSlotKey, index + 1]),
  );
  const backlogIndicatorLabel = getBacklogIndicatorLabel(data.backlogCount);
  const practiceBlockKey =
    todayScheduleDay.blocks.find((block) => block.blockIntent === "practice")?.timeSlotKey ??
    todayScheduleDay.blocks.find((block) => block.trackable)?.timeSlotKey ??
    "";
  const finalReviewBlockKey =
    todayScheduleDay.blocks.find((block) => block.semanticBlockKey === "final_review")?.timeSlotKey ?? null;
  const mcqQuickLogNote = practiceBlockKey
    ? getDisplayBlockDescription(todayScheduleDay, practiceBlockKey, todayState.trafficLight)
    : "Capture today’s MCQ block while the pattern is still clear.";
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
      note: data.todayRevisionPlan?.morningAllocatedMinutes
        ? `${data.todayRevisionPlan.morningAllocatedMinutes} minutes are still queued this morning.`
        : data.todayRevisionPlan?.morningSessionPlanned
          ? "The morning revision queue is already cleared."
          : "No morning revision is due today.",
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
      value: todayScheduleDay.gtTestType === "No" ? "Rest" : todayScheduleDay.gtTestType,
      note: todayScheduleDay.notesRaw ?? todayScheduleDay.resourceRaw,
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
                  {data.dayCountLabel} / {phase?.phaseName ?? todayScheduleDay.phaseName}
                </div>
                <h2 className="display mt-4 text-4xl md:text-6xl">{todayScheduleDay.primaryFocusRaw}</h2>
                <p className="lead mt-5 max-w-2xl">{todayScheduleDay.notesRaw ?? phase?.description ?? todayScheduleDay.resourceRaw}</p>
              </div>
              <div className="note-card min-w-[15rem] p-5">
                <div className="eyebrow">Mapped Date</div>
                <div className="display mt-3 text-2xl md:text-3xl">{formatDateLabel(data.todayDate)}</div>
                <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                  Resource: {todayScheduleDay.resourceRaw}
                </p>
                <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                  Study mins: {todayScheduleDay.plannedStudyMinutes ?? "—"} / buffer {todayScheduleDay.bufferMinutes ?? "—"}
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
        {morningBlock ? (
          <MorningPlanPanel
            morningBlock={{
              blockKey: morningBlock.timeSlotKey,
              displayLabel: morningBlock.displayLabel,
              displayDescription: getDisplayBlockDescription(todayScheduleDay, morningBlock.timeSlotKey, todayState.trafficLight),
              progress: getBlockProgress(userState, todayScheduleDay.dayNumber, morningBlock.timeSlotKey, referenceData),
              items: morningBlock.items.map((item) => ({
                itemId: item.itemId,
                label: item.label,
                plannedMinutes: item.plannedMinutes,
                revisionType: item.revisionType,
                progress: getTopicProgress(userState, item, todayScheduleDay.dayNumber, morningBlock.timeSlotKey),
              })),
            }}
            morningPlan={data.todayRevisionPlan}
            canAdjustToday
          />
        ) : null}

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

            const completed = entry.progress.status === "completed";
            const hiddenStatusTone = completed ? "green" : "neutral";
            const blockNumber = trackableOrder.get(entry.blockKey) ?? 0;
            const assignedRecovery = plannedRecoveryByBlock.get(entry.blockKey) ?? [];
            const block = todayScheduleDay.blocks.find((candidate) => candidate.timeSlotKey === entry.blockKey);
            const blockItems = block?.items.map((item) => ({
              ...item,
              progress: getTopicProgress(userState, item, todayScheduleDay.dayNumber, entry.blockKey),
            })) ?? [];

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

            if (morningBlock && entry.blockKey === morningBlock.timeSlotKey) {
              return null;
            }

            return (
              <article
                key={entry.id}
                className="panel timeline-card reveal-rise p-5 md:p-6"
                data-complete={completed}
              >
                <div className="pl-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-[var(--muted)]">
                      Block {String(blockNumber).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-(--text-secondary)">
                      {entry.start} - {entry.end}
                    </span>
                    <span className="status-badge" data-tone={getProgressTone(entry.progress.status)}>
                      {getProgressLabel(entry.progress.status)}
                    </span>
                  </div>
                  <div className="mt-2 display text-2xl md:text-3xl">{entry.label}</div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug md:text-xl lg:text-2xl">{entry.displayDescription}</h3>
                  {blockItems.length ? (
                    <div className="mt-5 grid gap-3">
                      {blockItems.map((item) => (
                        <article key={item.itemId} className="rounded-2xl border border-[var(--border)] px-4 py-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="font-medium leading-7">{item.label}</div>
                              <div className="mt-1 text-sm text-[var(--muted)]">
                                ~{item.plannedMinutes} min · {item.progress.status === "completed" ? "Done" : item.progress.status === "skipped" ? "Skipped" : item.progress.status === "missed" ? "Missed" : item.progress.status === "rescheduled" ? "Recovery" : "Pending"}
                              </div>
                            </div>
                            {item.progress.status !== "completed" ? (
                              <div className="flex flex-wrap gap-2">
                                <form action={updateTopicAction}>
                                  <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                                  <input type="hidden" name="blockKey" value={entry.blockKey} />
                                  <input type="hidden" name="itemId" value={item.itemId} />
                                  <input type="hidden" name="intent" value="complete" />
                                  <button className="button-secondary" type="submit">
                                    Mark done
                                  </button>
                                </form>
                                <form action={updateTopicAction}>
                                  <input type="hidden" name="dayNumber" value={todayScheduleDay.dayNumber} />
                                  <input type="hidden" name="blockKey" value={entry.blockKey} />
                                  <input type="hidden" name="itemId" value={item.itemId} />
                                  <input type="hidden" name="intent" value="skip" />
                                  <button className="button-secondary" type="submit">
                                    Skip topic
                                  </button>
                                </form>
                              </div>
                            ) : (
                              <span className="status-badge" data-tone="green">
                                Done
                              </span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
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
                      <button className="button-primary" disabled={completed && assignedRecovery.length === 0} type="submit">
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
                    actualStart={entry.progress.actualStart}
                    actualEnd={entry.progress.actualEnd}
                    trafficLight={todayState.trafficLight}
                    slots={timeEditorSlots}
                  />
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
      finalReviewBlockKey={finalReviewBlockKey}
      lateNightSweepProcessed={data.lateNightSweepProcessed}
    />

      {process.env.NODE_ENV !== "production" ? <DevToolbar simulatedNow={data.nowIso} /> : null}
    </div>
  );
}
