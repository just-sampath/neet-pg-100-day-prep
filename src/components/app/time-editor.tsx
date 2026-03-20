"use client";

import { useState, useTransition } from "react";

import { updateBlockAction } from "@/lib/server/actions";

type Props = {
  dayNumber: number;
  blockKey: string;
  start: string;
  end: string;
};

export function TimeEditor({ dayNumber, blockKey, start, end }: Props) {
  const [pending, startTransition] = useTransition();
  const [actualStart, setActualStart] = useState(start);
  const [actualEnd, setActualEnd] = useState(end);
  const [warning, setWarning] = useState("");

  function isInvalid(nextStart: string, nextEnd: string) {
    return nextStart < "06:30" || nextEnd > "23:00";
  }

  function save() {
    if (isInvalid(actualStart, actualEnd)) {
      setWarning("This would cut into sleep time. Move to backlog instead?");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("dayNumber", String(dayNumber));
      formData.set("blockKey", blockKey);
      formData.set("intent", "time");
      formData.set("actualStart", actualStart);
      formData.set("actualEnd", actualEnd);
      await updateBlockAction(formData);
    });
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
      {warning ? <p className="mt-3 text-sm text-[var(--warning)]">{warning}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="button-secondary" type="button" disabled={pending} onClick={save}>
          Save times
        </button>
        {warning ? (
          <button className="button-primary" type="button" disabled={pending} onClick={moveToBacklog}>
            Move to backlog
          </button>
        ) : null}
      </div>
    </div>
  );
}
