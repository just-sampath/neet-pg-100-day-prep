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
  actualStart?: string | null;
  actualEnd?: string | null;
  trafficLight: TrafficLight;
  slots: OverrunPreviewSlot[];
  canCreateBacklog?: boolean;
};

export function TimeEditor({
  dayNumber,
  blockKey,
  start,
  end,
  actualStart: savedStart,
  actualEnd: savedEnd,
  trafficLight,
  slots,
  canCreateBacklog = true,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [actualStart, setActualStart] = useState(savedStart || start);
  const [actualEnd, setActualEnd] = useState(savedEnd || end);

  const hasRecordedTimes = Boolean(savedStart && savedEnd) && (savedStart !== start || savedEnd !== end);
  const summaryLabel = hasRecordedTimes ? `Actual: ${savedStart} \u2013 ${savedEnd}` : "Edit actual timing";

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

  function submitTimeUpdate(cascadeDecision?: "keep_next_visible" | "move_next_to_backlog" | "force_sleep_backlog") {
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
    submitTimeUpdate(overrunPreview.kind === "decision" ? "keep_next_visible" : undefined);
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
      message: canCreateBacklog
        ? "This would cut into sleep time. Move to backlog instead?"
        : "This would cut into sleep time. Skip this block and stop here?",
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
    <details className="note-card mt-4">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--muted)]">
        {summaryLabel}
      </summary>
      <div className="px-4 pb-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 mt-1 block text-[var(--muted)]">Start</span>
            <input className="field" type="time" value={actualStart} onChange={(event) => setActualStart(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 mt-1 block text-[var(--muted)]">End</span>
            <input className="field" type="time" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} />
          </label>
        </div>
        {guidance ? (
          <p className={`mt-3 text-sm ${guidance.tone === "warning" ? "text-[var(--warning)]" : "text-(--text-secondary)"}`}>
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
              {canCreateBacklog ? "Move to backlog" : "Skip block"}
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
                {canCreateBacklog ? "Move overflow to backlog" : "Skip overflow block"}
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
    </details>
  );
}
