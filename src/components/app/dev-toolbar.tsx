"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import {
  clearSimulatedNowAction,
  generateWeeklySummaryAction,
  runRepackAction,
  setSimulatedNowAction,
} from "@/lib/server/actions";

function formatDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function resolveToolbarDate(value: string, simulatedNow: string | null) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (simulatedNow) {
    const parsed = new Date(simulatedNow);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function DevToolbar({ simulatedNow }: { simulatedNow: string | null }) {
  const hydrated = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(simulatedNow ? simulatedNow.slice(0, 16) : "");

  function submit(nextValue: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("simulatedNow", nextValue);
      await setSimulatedNowAction(formData);
    });
  }

  function jumpDays(days: number) {
    const nextDate = resolveToolbarDate(value, simulatedNow);
    nextDate.setDate(nextDate.getDate() + days);
    const nextValue = formatDateTimeLocalValue(nextDate);
    setValue(nextValue);
    submit(nextValue);
  }

  if (!hydrated) {
    return null;
  }

  return (
    <section className="panel p-4 md:p-5">
      <div className="eyebrow">Dev Time Travel</div>
      <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
        Drive the app into late-night prompts, midnight rollover, and weekly summary generation without waiting on the wall clock.
        Multi-day jumps backfill each missed midnight and redistribution pass on the way.
      </p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="field"
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button className="button-primary" type="button" disabled={pending} onClick={() => submit(value)}>
            Set simulated time
          </button>
          <button className="button-secondary" type="button" disabled={pending} onClick={() => jumpDays(1)}>
            +1 day
          </button>
          <button className="button-secondary" type="button" disabled={pending} onClick={() => jumpDays(7)}>
            +7 days
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await clearSimulatedNowAction();
                setValue("");
              })
            }
          >
            Clear
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await generateWeeklySummaryAction();
              })
            }
          >
            Generate weekly summary
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await runRepackAction();
              })
            }
          >
            Run Repack
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-(--text-secondary)">
        Set `21:45`, `22:15`, `22:45`, jump ahead by a day, or move a week forward without waiting on the wall clock.
      </p>
    </section>
  );
}
