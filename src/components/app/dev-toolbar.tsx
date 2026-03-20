"use client";

import { useState, useTransition } from "react";

import {
  clearSimulatedNowAction,
  generateWeeklySummaryAction,
  setSimulatedNowAction,
} from "@/lib/server/actions";

export function DevToolbar({ simulatedNow }: { simulatedNow: string | null }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(simulatedNow ? simulatedNow.slice(0, 16) : "");

  function submit(nextValue: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("simulatedNow", nextValue);
      await setSimulatedNowAction(formData);
    });
  }

  return (
    <section className="panel p-4 md:p-5">
      <div className="eyebrow">Dev Time Travel</div>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
        Drive the app into late-night prompts, midnight rollover, and weekly summary generation without waiting on the wall clock.
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
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Set `22:30`, `23:00`, `23:15`, or the next day after midnight to test wind-down and rollover behavior instantly.
      </p>
    </section>
  );
}
