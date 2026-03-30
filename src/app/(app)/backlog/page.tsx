import Link from "next/link";

import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getBacklogPageData } from "@/lib/data/app-state";
import { mutateStore, readRuntimeReferenceData } from "@/lib/data/local-store";
import { getTrackableBlockOptions } from "@/lib/domain/schedule";
import type { BacklogBulkScope, BacklogSortMode, BacklogStatus, BacklogViewFilter } from "@/lib/domain/types";
import { bulkBacklogAction, updateBacklogAction } from "@/lib/server/actions";
import { formatDateLabel } from "@/lib/utils/format";

const FILTERS: Array<{ value: BacklogViewFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const SORTS: Array<{ value: BacklogSortMode; label: string }> = [
  { value: "priority", label: "Priority" },
  { value: "oldest", label: "Oldest First" },
  { value: "newest", label: "Newest First" },
  { value: "subject", label: "By Subject" },
];

const BULK_SCOPES: Array<{ value: BacklogBulkScope; label: string }> = [
  { value: "all_pending", label: "All pending" },
  { value: "missed_skipped", label: "Missed / skipped" },
  { value: "yellow_red", label: "Yellow / red day" },
  { value: "overrun", label: "Overruns only" },
];

function isBacklogFilter(value: string | undefined): value is BacklogViewFilter {
  return FILTERS.some((item) => item.value === value);
}

function isBacklogSort(value: string | undefined): value is BacklogSortMode {
  return SORTS.some((item) => item.value === value);
}

function getStatusTone(status: BacklogStatus) {
  if (status === "completed") {
    return "green";
  }
  if (status === "pending") {
    return "yellow";
  }
  return "neutral";
}

function getStatusLabel(status: BacklogStatus) {
  if (status === "rescheduled") {
    return "Recovery planned";
  }
  if (status === "dismissed") {
    return "Removed";
  }
  return status;
}

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const params = await searchParams;
  const filter = isBacklogFilter(params.status) ? params.status : "pending";
  const sort = isBacklogSort(params.sort) ? params.sort : "priority";
  const referenceData = await readRuntimeReferenceData();
  const manualRescheduleOptions = getTrackableBlockOptions(undefined, referenceData);
  const data = await mutateStore((store) => getBacklogPageData(store, user.id, { filter, sort }));

  const defaultCompletionDate = data.todayDate;
  const summaryLine = `${data.summary.totalPending} items pending (${data.summary.fromMissed} from missed days, ${data.summary.fromYellowRed} from yellow/red days, ${data.summary.fromOverrun} from overruns).`;
  const countForFilter = (value: BacklogViewFilter) => (value === "all" ? data.counts.all : data.counts[value]);

  return (
    <div className="grid gap-6">
      <section className="panel panel-hero reveal-rise p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr] xl:items-end">
          <div>
            <div className="eyebrow">Backlog Queue</div>
            <h1 className="display mt-3 text-4xl md:text-5xl">Incomplete items, rescheduled at a realistic pace.</h1>
            <p className="lead mt-5 max-w-2xl">
              {summaryLine} Completing 80% consistently beats attempting 100% and crashing.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="metric-slab">
              <div className="metric-label">Pending</div>
              <div className="metric-value">{data.counts.pending}</div>
              <p className="metric-note">Not yet completed or rescheduled to a future slot.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Rescheduled</div>
              <div className="metric-value">{data.counts.rescheduled}</div>
              <p className="metric-note">Assigned to a specific future day and time slot.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Recovered</div>
              <div className="metric-value">{data.counts.completed}</div>
              <p className="metric-note">Marked as completed with a recorded date.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Pace Dial</div>
              <div className="metric-value">{data.summary.fromYellowRed}</div>
              <p className="metric-note">Items created when you selected a yellow or red pace for a study day.</p>
            </article>
          </div>
        </div>
      </section>

      {data.revision.totalPending > 0 || data.revision.totalCompleted > 0 ? (
        <section className="panel reveal-rise p-5 md:p-6">
          <div className="grid gap-5">
            <div>
              <div className="eyebrow">Revision Queue</div>
              <h2 className="display mt-3 text-2xl md:text-3xl">Spaced repetition checkpoints</h2>
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                Each completed Phase 1–2 topic generates five revision checkpoints at D+1, D+3, D+7, D+14, and D+28.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <article className="metric-slab">
                <div className="metric-label">Due Today</div>
                <div className="metric-value">{data.revision.dueTodayCount}</div>
                <p className="metric-note">Checkpoints scheduled for today.</p>
              </article>
              <article className="metric-slab">
                <div className="metric-label">Overdue</div>
                <div className="metric-value">{data.revision.overdueCount}</div>
                <p className="metric-note">Past-due checkpoints still pending.</p>
              </article>
              <article className="metric-slab">
                <div className="metric-label">Upcoming</div>
                <div className="metric-value">{data.revision.upcomingCount}</div>
                <p className="metric-note">Checkpoints scheduled for future days.</p>
              </article>
              <article className="metric-slab">
                <div className="metric-label">Completed</div>
                <div className="metric-value">{data.revision.totalCompleted}</div>
                <p className="metric-note">Revision checkpoints already marked off.</p>
              </article>
            </div>

            {data.revision.groups.length > 0 ? (
              <div className="grid gap-3">
                <div className="eyebrow">Pending Topics ({data.revision.totalPending} checkpoints across {data.revision.groups.length} topic{data.revision.groups.length === 1 ? "" : "s"})</div>
                {data.revision.groups.map((group) => (
                  <article key={group.id} className="note-card p-4">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {String(group.sourceDay).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {group.revisionTypes.join(" · ")} / {group.subject}
                        </div>
                        <div className="mt-2 text-base font-semibold leading-7">{group.sourceTopicLabel}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <span
                              key={item.id}
                              className="status-badge"
                              data-tone={item.status === "completed" ? "green" : item.status === "overdue_3_6" || item.status === "overdue_7_plus" ? "red" : item.status === "overdue_1_2" ? "yellow" : "neutral"}
                            >
                              {item.revisionType}
                              {item.status === "completed" ? " ✓" : item.overdueBy > 0 ? ` +${item.overdueBy}d` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="note-card p-5 text-sm leading-7 text-(--text-secondary)">
                No pending revision checkpoints. Future checkpoints will appear here as you complete study topics.
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="panel reveal-rise p-5 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="grid gap-3">
            <div>
              <div className="eyebrow">Queue View</div>
              <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                Pending is the default view. Rescheduled and completed items are still available if you want the full history.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Link
                  key={item.value}
                  className={filter === item.value ? "button-primary" : "button-secondary"}
                  href={{ pathname: "/backlog", query: { status: item.value, sort } }}
                >
                  {item.label}
                  {` (${countForFilter(item.value)})`}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {SORTS.map((item) => (
              <Link
                key={item.value}
                className={sort === item.value ? "button-primary" : "button-secondary"}
                href={{ pathname: "/backlog", query: { status: filter, sort: item.value } }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {data.counts.pending ? (
        <section className="panel reveal-rise p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="note-card p-4">
              <div className="eyebrow">Bulk Reset</div>
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                Dismiss all pending items in a category at once. Dismissed items leave the queue permanently.
              </p>
              <form action={bulkBacklogAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <input type="hidden" name="intent" value="dismiss_scope" />
                <select className="field" name="scope" defaultValue="yellow_red">
                  {BULK_SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
                <button className="button-secondary" type="submit">
                  Dismiss scope
                </button>
              </form>
            </div>

            <div className="note-card p-4">
              <div className="eyebrow">Bulk Reschedule</div>
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                Accept the suggested time slots for all items in a category. Each item moves from pending to rescheduled.
              </p>
              <form action={bulkBacklogAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <input type="hidden" name="intent" value="reschedule_scope_to_suggestions" />
                <select className="field" name="scope" defaultValue="missed_skipped">
                  {BULK_SCOPES.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
                <button className="button-primary" type="submit">
                  Reschedule scope
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        {data.items.length ? (
          data.items.map((item, index) => (
            <article key={item.id} className="panel timeline-card reveal-rise p-5 md:p-6">
              <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
                <div className="pl-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-badge" data-tone={getStatusTone(item.status)}>
                      {getStatusLabel(item.status)}
                    </span>
                    <span className="status-badge" data-tone="neutral">
                      {item.subject}
                    </span>
                    <span className="status-badge" data-tone="neutral">
                      {item.sourceLabel}
                    </span>
                    <span className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-(--muted)">
                      Queue {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold leading-tight">{item.topicDescription}</h2>
                  <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                    Day {item.originalDay}
                    {item.originalMappedDate ? ` · ${formatDateLabel(item.originalMappedDate)}` : ""}
                    {" "}origin. Sitting in recovery for {item.daysInBacklog} day{item.daysInBacklog === 1 ? "" : "s"}.
                  </p>

                  <div className="mt-5 grid gap-3 xl:grid-cols-4">
                    <div className="note-card p-4">
                      <div className="metric-label">Original Slot</div>
                      <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                        Day {item.originalDay}
                        {item.originalMappedDate ? ` · ${formatDateLabel(item.originalMappedDate)}` : ""}
                        {` / ${item.originalBlockKey.replaceAll("_", " ")}`}
                        {item.originalStart && item.originalEnd ? ` / ${item.originalStart} - ${item.originalEnd}` : ""}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Suggested Landing</div>
                      <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                        {item.suggestionLabel ?? "No available slot found."}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Suggested Note</div>
                      <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                        {item.suggestedNote ?? "Staying in backlog until a compatible slot becomes available."}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Recovery Placement</div>
                      <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                        {item.rescheduledLabel ?? "Not assigned yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:min-w-92">
                  {item.status === "pending" || item.status === "rescheduled" ? (
                    <>
                      {item.status === "pending" ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <form action={updateBacklogAction}>
                            <input type="hidden" name="backlogId" value={item.id} />
                            <input type="hidden" name="intent" value="move_up" />
                            <input type="hidden" name="direction" value="up" />
                            <button className="button-secondary w-full" type="submit">
                              Move up
                            </button>
                          </form>
                          <form action={updateBacklogAction}>
                            <input type="hidden" name="backlogId" value={item.id} />
                            <input type="hidden" name="intent" value="move_down" />
                            <input type="hidden" name="direction" value="down" />
                            <button className="button-secondary w-full" type="submit">
                              Move down
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {item.status === "pending" ? (
                        <form action={updateBacklogAction} className="note-card grid gap-3 p-4">
                          <input type="hidden" name="backlogId" value={item.id} />
                          <input type="hidden" name="intent" value="accept_suggestion" />
                          <button className="button-primary w-full" disabled={!item.suggestionLabel} type="submit">
                            Accept suggested slot
                          </button>
                          <p className="text-xs leading-6 text-(--muted)">
                            {item.suggestionLabel ?? "No available slot found."}
                          </p>
                        </form>
                      ) : null}

                      <form action={updateBacklogAction} className="note-card grid gap-3 p-4">
                        <input type="hidden" name="backlogId" value={item.id} />
                        <input type="hidden" name="intent" value="reschedule" />
                        <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                          <input
                            className="field"
                            type="number"
                            min="1"
                            max="100"
                            name="rescheduledToDay"
                            defaultValue={item.rescheduledToDay ?? item.suggestedDay ?? ""}
                            placeholder="Day"
                          />
                          <select
                            className="field"
                            name="rescheduledToBlockKey"
                            defaultValue={
                              item.rescheduledToBlockKey ??
                              item.suggestedBlockKey ??
                              manualRescheduleOptions[0]?.value ??
                              ""
                            }
                          >
                          {manualRescheduleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button className="button-secondary w-full" type="submit">
                          Save manual reschedule
                        </button>
                      </form>

                      <form action={updateBacklogAction} className="note-card grid gap-3 p-4">
                        <input type="hidden" name="backlogId" value={item.id} />
                        <input type="hidden" name="intent" value="complete" />
                        <label>
                          <span className="mb-2 block text-sm text-(--muted)">Completion date</span>
                          <input className="field" type="date" name="completionDate" defaultValue={defaultCompletionDate} />
                        </label>
                        <button className="button-primary w-full" type="submit">
                          Mark completed
                        </button>
                      </form>

                      <form action={updateBacklogAction}>
                        <input type="hidden" name="backlogId" value={item.id} />
                        <input type="hidden" name="intent" value="dismiss" />
                        <button className="button-secondary w-full" type="submit">
                          Remove from queue
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="note-card p-4 text-sm leading-7 text-(--text-secondary)">
                      {item.status === "completed" && item.completedAt ? (
                        <p>Completed on {formatDateLabel(item.completedAt.slice(0, 10))}.</p>
                      ) : null}
                      {item.status === "dismissed" && item.dismissedAt ? (
                        <p>Removed on {formatDateLabel(item.dismissedAt.slice(0, 10))}.</p>
                      ) : null}
                      {!item.completedAt && !item.dismissedAt ? (
                        <p>This item is no longer active in the queue.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <section className="panel reveal-rise p-6">
            <div className="eyebrow">Queue Clear</div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-(--text-secondary)">
              No items match the current filter. Try switching to a different status tab above.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
