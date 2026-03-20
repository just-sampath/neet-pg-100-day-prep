import { notFound } from "next/navigation";

import { TimeEditor } from "@/components/app/time-editor";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDayDetailData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { completeRevisionAction, setTrafficLightAction, updateBlockAction } from "@/lib/server/actions";
import { formatDateLabel } from "@/lib/utils/format";

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

      {detail.revisionPlan?.queue.length ? (
        <section className="panel p-6">
          <h2 className="text-xl font-semibold">Revision items mapped to this date</h2>
          <div className="mt-4 grid gap-3">
            {detail.revisionPlan.queue.map((item) => (
              <form key={item.id} action={completeRevisionAction} className="rounded-2xl border border-[var(--border)] p-4">
                <input type="hidden" name="sourceDay" value={item.sourceDay} />
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
        </section>
      ) : null}

      <section className="grid gap-4">
        {detail.blocks.map((block) => (
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
            <TimeEditor dayNumber={detail.day.dayNumber} blockKey={block.key} start={block.start} end={block.end} />
          </article>
        ))}
      </section>
    </div>
  );
}
