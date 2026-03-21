import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/session";
import { getBacklogPageData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
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
  const params = await searchParams;
  const filter = isBacklogFilter(params.status) ? params.status : "pending";
  const sort = isBacklogSort(params.sort) ? params.sort : "priority";
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
            <h1 className="display mt-3 text-4xl md:text-5xl">Recovery should feel believable, not endless.</h1>
            <p className="lead mt-5 max-w-2xl">
              {summaryLine} Completing 80% consistently beats attempting 100% and crashing.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="metric-slab">
              <div className="metric-label">Pending</div>
              <div className="metric-value">{data.counts.pending}</div>
              <p className="metric-note">Still waiting for a real completion or a believable new home.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Rescheduled</div>
              <div className="metric-value">{data.counts.rescheduled}</div>
              <p className="metric-note">Already assigned to a future day and slot in the plan.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Recovered</div>
              <div className="metric-value">{data.counts.completed}</div>
              <p className="metric-note">Closed with a real completion date.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Pace Dial</div>
              <div className="metric-value">{data.summary.fromYellowRed}</div>
              <p className="metric-note">Created by honest yellow and red day selections.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="panel reveal-rise p-5 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="grid gap-3">
            <div>
              <div className="eyebrow">Queue View</div>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
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
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Remove a whole calm category at once if it no longer deserves space in the queue.
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
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Apply the current suggested slots for a whole slice of the queue when the placements already look believable.
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
                    <span className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[var(--muted)]">
                      Queue {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-semibold leading-tight">{item.topicDescription}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Day {item.originalDay}
                    {item.originalMappedDate ? ` · ${formatDateLabel(item.originalMappedDate)}` : ""}
                    {" "}origin. Sitting in recovery for {item.daysInBacklog} day{item.daysInBacklog === 1 ? "" : "s"}.
                  </p>

                  <div className="mt-5 grid gap-3 xl:grid-cols-4">
                    <div className="note-card p-4">
                      <div className="metric-label">Original Slot</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Day {item.originalDay}
                        {item.originalMappedDate ? ` · ${formatDateLabel(item.originalMappedDate)}` : ""}
                        {` / ${item.originalBlockKey.replaceAll("_", " ")}`}
                        {item.originalStart && item.originalEnd ? ` / ${item.originalStart} - ${item.originalEnd}` : ""}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Suggested Landing</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.suggestionLabel ?? "No safe suggestion yet."}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Suggested Note</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.suggestedNote ?? "Keeping this in backlog until a believable slot opens."}
                      </p>
                    </div>
                    <div className="note-card p-4">
                      <div className="metric-label">Recovery Placement</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.rescheduledLabel ?? "Not assigned yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:min-w-[23rem]">
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
                          <p className="text-xs leading-6 text-[var(--muted)]">
                            {item.suggestionLabel ?? "No safe suggestion is available yet."}
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
                            defaultValue={item.rescheduledToBlockKey ?? item.suggestedBlockKey ?? "consolidation"}
                          >
                            <option value="block_a">Block A</option>
                            <option value="block_b">Block B</option>
                            <option value="consolidation">Consolidation</option>
                            <option value="mcq">MCQ</option>
                            <option value="pyq_image">PYQ / Image</option>
                            <option value="night_recall">Night Recall</option>
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
                          <span className="mb-2 block text-sm text-[var(--muted)]">Completion date</span>
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
                    <div className="note-card p-4 text-sm leading-7 text-[var(--text-secondary)]">
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
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Nothing matches this view right now. The recovery queue is either genuinely clear or already filed into another state.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
