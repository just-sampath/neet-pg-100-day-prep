import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/session";
import { getScheduleListData } from "@/lib/data/app-state";
import { mutateStore } from "@/lib/data/local-store";
import { formatDateLabel } from "@/lib/utils/format";

export default async function SchedulePage() {
  const user = await requireCurrentUser();
  const days = await mutateStore((store) => getScheduleListData(store, user.id));

  return (
    <div className="grid gap-4">
      <section className="panel p-6">
        <div className="eyebrow">Schedule Browser</div>
        <h1 className="display mt-3 text-3xl">All 100 days, with the current mapping.</h1>
      </section>

      {days.map((day) => (
        <Link key={day.dayNumber} href={`/schedule/${day.dayNumber}`} className="list-card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow">
                Day {day.dayNumber} · {day.phase}
              </div>
              <h2 className="mt-2 text-xl font-semibold">{day.primaryFocus}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {day.mappedDate ? formatDateLabel(day.mappedDate) : "Day 1 not set"}
                {day.hiddenShiftLabel ? ` · ${day.hiddenShiftLabel}` : ""}
              </p>
            </div>
            <div className="text-sm text-[var(--muted)]">
              {day.status}
              {day.gtTest !== "No" ? ` · ${day.gtTest}` : ""}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
