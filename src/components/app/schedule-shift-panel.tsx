"use client";

import { useState } from "react";

import { applyShiftAction } from "@/lib/server/actions";
import type { ScheduleHealth, ScheduleShiftPreview } from "@/lib/domain/types";
import { formatDateLabel } from "@/lib/utils/format";

type Props = {
  health: ScheduleHealth;
  preview: ScheduleShiftPreview;
};

export function ScheduleShiftPanel({ health, preview }: Props) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <section className="panel reveal-rise p-5 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <div className="eyebrow">Schedule Shift</div>
          <h3 className="display mt-3 text-3xl">You&apos;re {health.missedDays.length} day{health.missedDays.length === 1 ? "" : "s"} behind. Adjust the plan only if recovery no longer fits honestly.</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            This is always manual. Review the dry run first, then confirm if the preview still feels right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            className="button-secondary"
            onClick={() => setShowPreview((current) => !current)}
            type="button"
          >
            {showPreview ? "Hide preview" : "Adjust schedule"}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="metric-slab">
              <div className="metric-label">Shift From</div>
              <div className="metric-value">Day {preview.anchorDayNumber}</div>
              <p className="metric-note">The earliest heavily missed day becomes the new honest anchor.</p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Buffer Days</div>
              <div className="metric-value">
                {preview.bufferDaysUsed}/{preview.bufferDaysAvailable}
              </div>
              <p className="metric-note">
                {preview.isCleanShift
                  ? "Clean shift. No content lost."
                  : "Day 84 is used first, then Final Assault compression begins."}
              </p>
            </article>
            <article className="metric-slab">
              <div className="metric-label">Projected Day 100</div>
              <div className="metric-value text-[1.55rem] md:text-[1.85rem]">{formatDateLabel(preview.day100)}</div>
              <p className="metric-note">
                {preview.hardBoundaryExceeded
                  ? "This breaches the August 20 boundary."
                  : "This stays within the August 20 boundary."}
              </p>
            </article>
          </div>

          <div className="note-card p-4">
            <div className="metric-label">Preview</div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {preview.isCleanShift
                ? `Clean shift. No content lost. Buffer days used: ${preview.bufferDaysUsed}.`
                : preview.mergedDays.length
                  ? preview.mergedDays.map((entry) => entry.mergedDescription).join(" ")
                  : "No safe compression path remains. The hard boundary blocks this shift."}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Schedule cannot extend past August 20, 2026.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action={applyShiftAction}>
              <input type="hidden" name="previewSignature" value={preview.signature} />
              <button className="button-primary" disabled={preview.hardBoundaryExceeded} type="submit">
                Apply shift
              </button>
            </form>
            <button className="button-secondary" onClick={() => setShowPreview(false)} type="button">
              Keep current schedule
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
