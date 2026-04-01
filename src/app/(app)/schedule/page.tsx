import Link from "next/link";

import { ScheduleBrowserFocus } from "@/components/app/schedule-browser-focus";
import { requireCurrentUser, requireDayOneSetup } from "@/lib/auth/session";
import { getScheduleListData } from "@/lib/data/app-state";
import { readScheduleBrowserStore } from "@/lib/data/local-store";
import { formatDateLabel } from "@/lib/utils/format";

const TODAY_CARD_ID = "schedule-today-card";

function getStatusTone(status: string) {
  if (status === "completed") {
    return "green";
  }

  if (status === "today") {
    return "blue";
  }

  if (status === "missed") {
    return "yellow";
  }

  return "neutral";
}

function getStatusLabel(status: string) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "today") {
    return "Today";
  }

  if (status === "missed") {
    return "Missed";
  }

  return "Upcoming";
}

export default async function SchedulePage() {
  const user = await requireCurrentUser();
  await requireDayOneSetup(user.id);
  const days = await readScheduleBrowserStore((store) => getScheduleListData(store, user.id));
  const todayDay = days.find((day) => day.today);

  return (
    <div className="grid gap-4">
      <section className="panel p-6">
        <div className="eyebrow">Schedule Browser</div>
        <h1 className="display mt-3 text-3xl">Current mapped schedule, day by day.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-(--text-secondary)">
          Opens around today by default. Past days can be corrected from here, while future days stay view-only until their mapped date arrives.
        </p>
      </section>
      <ScheduleBrowserFocus targetId={todayDay ? TODAY_CARD_ID : null} />

      {days.map((day) => (
        <Link
          key={day.dayNumber}
          id={day.today ? TODAY_CARD_ID : undefined}
          href={`/schedule/${day.dayNumber}`}
          className="list-card p-5"
          data-schedule-status={day.status}
          aria-current={day.today ? "date" : undefined}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow">
                Day {day.dayNumber} · {day.phaseName}
              </div>
              <h2 className="mt-2 text-xl font-semibold">{day.primaryFocusRaw}</h2>
              <p className="mt-1 text-sm text-(--muted)">
                {day.mappedDate ? `Now ${formatDateLabel(day.mappedDate)}` : "Day 1 not set"}
                {day.originalPlannedDate && day.originalPlannedDate !== day.mappedDate
                  ? ` · originally ${formatDateLabel(day.originalPlannedDate)}`
                  : ""}
              </p>
              {day.hiddenShiftLabel ? (
                <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                  This day is currently {day.hiddenShiftLabel}.
                </p>
              ) : day.mergedPartnerDay ? (
                <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
                  This day is carrying merged work from Day {day.mergedPartnerDay}.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-(--muted)">
              <span className="status-badge" data-tone={getStatusTone(day.status)}>
                {getStatusLabel(day.status)}
              </span>
              {day.gtTestType !== "No" ? (
                <span className="status-badge" data-tone="neutral">
                  {day.gtTestType}
                </span>
              ) : null}
              {day.hiddenShiftLabel ? (
                <span className="status-badge" data-tone="neutral">
                  Shifted
                </span>
              ) : null}
              {day.trafficLight !== "green" ? (
                <span className="status-badge" data-tone={day.trafficLight === "red" ? "red" : "yellow"}>
                  {day.trafficLight}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
