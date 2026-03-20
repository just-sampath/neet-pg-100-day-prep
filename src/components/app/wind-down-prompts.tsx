"use client";

import { useMemo, useState, useTransition } from "react";

import { updateBlockAction, wrapUpDayAction } from "@/lib/server/actions";

type Props = {
  nowIso: string;
  dayNumber: number;
  trafficLight: "green" | "yellow" | "red";
  incompleteVisibleBlocks: string[];
};

export function WindDownPrompts({ nowIso, dayNumber, trafficLight, incompleteVisibleBlocks }: Props) {
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  const [pending, startTransition] = useTransition();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const nightRecallPending = incompleteVisibleBlocks.includes("night_recall");
  const otherPending = incompleteVisibleBlocks.filter((block) => block !== "night_recall");

  if (minutes >= 23 * 60 + 15) {
    return (
      <div className="note-card p-4 text-sm leading-7 text-[var(--text-secondary)]">
        Any remaining blocks have been moved to backlog. Sleep well.
      </div>
    );
  }

  if (minutes >= 23 * 60 && nightRecallPending) {
    return (
      <div className="panel p-4 md:p-5">
        <div className="eyebrow">23:00 Check</div>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Time to rest. Do a quick 5-minute version, or skip tonight&apos;s recall?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            className="button-primary"
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const formData = new FormData();
                formData.set("dayNumber", String(dayNumber));
                formData.set("blockKey", "night_recall");
                formData.set("intent", "partial");
                formData.set("note", "Quick 5-minute version.");
                await updateBlockAction(formData);
              })
            }
          >
            Quick version
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const formData = new FormData();
                formData.set("dayNumber", String(dayNumber));
                formData.set("blockKey", "night_recall");
                formData.set("intent", "skip");
                formData.set("note", "Skipped to protect sleep.");
                await updateBlockAction(formData);
              })
            }
          >
            Skip and sleep
          </button>
        </div>
      </div>
    );
  }

  if (minutes >= 22 * 60 + 30 && otherPending.length > 0 && now.getTime() > snoozedUntil) {
    return (
      <div className="panel p-4 md:p-5">
        <div className="eyebrow">22:30 Check</div>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          It&apos;s getting late. Move remaining blocks to backlog and wind down?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            className="button-primary"
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const formData = new FormData();
                formData.set("dayNumber", String(dayNumber));
                formData.set("trafficLight", trafficLight);
                await wrapUpDayAction(formData);
              })
            }
          >
            Yes, wrap up
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setSnoozedUntil(now.getTime() + 15 * 60 * 1000)}
          >
            I&apos;m almost done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
