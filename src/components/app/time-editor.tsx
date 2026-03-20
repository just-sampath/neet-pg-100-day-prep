"use client";

import { useMemo, useState, useTransition } from "react";

import { previewOverrunCascade, type OverrunPreviewSlot } from "@/lib/domain/backlog";
import type { BlockKey, TrafficLight } from "@/lib/domain/types";
import { updateBlockAction } from "@/lib/server/actions";

type Props = {
  dayNumber: number;
  blockKey: BlockKey;
  start: string;
  end: string;
  trafficLight: TrafficLight;
  slots: OverrunPreviewSlot[];
};

export function TimeEditor({ dayNumber, blockKey, start, end, trafficLight, slots }: Props) {
  const [pending, startTransition] = useTransition();
  const [actualStart, setActualStart] = useState(start);
  const [actualEnd, setActualEnd] = useState(end);

  function isInvalid(nextStart: string, nextEnd: string) {
    return nextStart < "06:30" || nextEnd > "23:00";
  }

  const sleepViolation = isInvalid(actualStart, actualEnd);
  const overrunPreview = useMemo(
    () =>
      sleepViolation
        ? { kind: "none" as const }
        : previewOverrunCascade({
            editedBlockKey: blockKey,
            newEndTime: actualEnd,
            trafficLight,
            slots,
          }),
    [actualEnd, blockKey, sleepViolation, slots, trafficLight],
  );

  function submitTimeUpdate(cascadeDecision?: "move_next_to_backlog" | "force_sleep_backlog") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("dayNumber", String(dayNumber));
      formData.set("blockKey", blockKey);
      formData.set("intent", "time");
      formData.set("actualStart", actualStart);
      formData.set("actualEnd", actualEnd);
      if (cascadeDecision) {
        formData.set("cascadeDecision", cascadeDecision);
      }
      await updateBlockAction(formData);
    });
  }

  function save() {
    if (sleepViolation) {
      return;
    }
    submitTimeUpdate();
  }

  function moveToBacklog() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("dayNumber", String(dayNumber));
      formData.set("blockKey", blockKey);
      formData.set("intent", "skip");
      formData.set("note", "Moved to backlog to protect sleep.");
      await updateBlockAction(formData);
    });
  }

  const guidance = sleepViolation
    ? {
        tone: "warning" as const,
        message: "This would cut into sleep time. Move to backlog instead?",
      }
    : overrunPreview.kind === "decision"
      ? {
          tone: "neutral" as const,
          message: overrunPreview.message,
        }
      : overrunPreview.kind === "force_to_backlog"
        ? {
            tone: "warning" as const,
            message: overrunPreview.message,
          }
        : null;

  return (
    <div className="note-card mt-4 p-4">
      <div className="eyebrow">Actual Timing</div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 mt-3 block text-[var(--muted)]">Start</span>
          <input className="field" type="time" value={actualStart} onChange={(event) => setActualStart(event.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 mt-3 block text-[var(--muted)]">End</span>
          <input className="field" type="time" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} />
        </label>
      </div>
      {guidance ? (
        <p className={`mt-3 text-sm ${guidance.tone === "warning" ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}`}>
          {guidance.message}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {!sleepViolation && overrunPreview.kind === "none" ? (
          <button className="button-secondary" type="button" disabled={pending} onClick={save}>
            Save times
          </button>
        ) : null}
        {sleepViolation ? (
          <button className="button-primary" type="button" disabled={pending} onClick={moveToBacklog}>
            Move to backlog
          </button>
        ) : null}
        {overrunPreview.kind === "decision" ? (
          <>
            <button className="button-secondary" type="button" disabled={pending} onClick={save}>
              Keep it visible
            </button>
            <button
              className="button-primary"
              type="button"
              disabled={pending}
              onClick={() => submitTimeUpdate("move_next_to_backlog")}
            >
              Move overflow to backlog
            </button>
          </>
        ) : null}
        {overrunPreview.kind === "force_to_backlog" ? (
          <button
            className="button-primary"
            type="button"
            disabled={pending}
            onClick={() => submitTimeUpdate("force_sleep_backlog")}
          >
            Protect sleep
          </button>
        ) : null}
      </div>
    </div>
  );
}
