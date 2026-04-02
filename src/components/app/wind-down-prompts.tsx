"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getWindDownState } from "@/lib/domain/today";
import type { BlockKey } from "@/lib/domain/types";
import { runLateNightSweepAction, updateBlockAction, wrapUpDayAction } from "@/lib/server/actions";
import { getMinutesInTimeZone, IST_TIME_ZONE } from "@/lib/utils/date";

type Props = {
  nowIso: string;
  dayNumber: number;
  trafficLight: "green" | "yellow" | "red";
  incompleteVisibleBlocks: BlockKey[];
  finalReviewBlockKey: BlockKey | null;
  lateNightSweepProcessed: boolean;
};

const TICK_MS = 30_000;

export function WindDownPrompts({
  nowIso,
  dayNumber,
  trafficLight,
  incompleteVisibleBlocks,
  finalReviewBlockKey,
  lateNightSweepProcessed,
}: Props) {
  const hydrated = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );
  const [wrapUpDismissals, setWrapUpDismissals] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => new Date(nowIso).getTime());
  const autoMoveRequestedRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const effectiveNow = useMemo(() => new Date(currentTimeMs), [currentTimeMs]);
  const minutes = useMemo(() => getMinutesInTimeZone(effectiveNow, IST_TIME_ZONE), [effectiveNow]);
  const prompt = useMemo(
    () =>
      getWindDownState({
        minutes,
        incompleteVisibleBlocks,
        finalReviewBlockKey,
        wrapUpDismissals,
        lateNightSweepProcessed,
      }),
    [finalReviewBlockKey, incompleteVisibleBlocks, lateNightSweepProcessed, minutes, wrapUpDismissals],
  );
  const triggerAutoMove = useEffectEvent(() => {
    startTransition(async () => {
      await runLateNightSweepAction();
      router.refresh();
    });
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeMs((current) => current + TICK_MS);
    }, TICK_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (prompt.kind !== "auto_move_due" || autoMoveRequestedRef.current || pending) {
      return;
    }

    autoMoveRequestedRef.current = true;
    triggerAutoMove();
  }, [pending, prompt.kind]);

  function handleWrapUpDismiss() {
    setWrapUpDismissals((current) => {
      if (current === 0 && minutes < 22 * 60) {
        return 1;
      }

      return 2;
    });
  }

  if (!hydrated) {
    return null;
  }

  if (prompt.kind === "none") {
    return null;
  }

  if (prompt.kind === "auto_move_done") {
    return (
      <div aria-live="polite" className="note-card p-4 text-sm leading-7 text-(--text-secondary)">
        {prompt.message}
      </div>
    );
  }

  if (prompt.kind === "auto_move_due") {
    return (
      <div aria-live="polite" className="panel p-4 md:p-5">
        <div className="eyebrow">{prompt.label}</div>
        <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
          {pending ? "Moving remaining blocks to backlog now." : prompt.message}
        </p>
      </div>
    );
  }

  if (prompt.kind === "final_review") {
    if (!finalReviewBlockKey) {
      return null;
    }

    return (
      <div aria-live="polite" className="panel p-4 md:p-5">
        <div className="eyebrow">{prompt.label}</div>
        <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
          {prompt.message}
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
                formData.set("blockKey", finalReviewBlockKey);
                formData.set("intent", "partial");
                formData.set("note", "Quick 5-minute version.");
                await updateBlockAction(formData);
                router.refresh();
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
                formData.set("blockKey", finalReviewBlockKey);
                formData.set("intent", "skip");
                formData.set("note", "Skipped the final review to protect sleep.");
                await updateBlockAction(formData);
                router.refresh();
              })
            }
          >
            Skip and sleep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div aria-live="polite" className="panel p-4 md:p-5">
      <div className="eyebrow">{prompt.label}</div>
      <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
        {prompt.message}
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
              router.refresh();
            })
          }
        >
          Yes, wrap up
        </button>
        <button className="button-secondary" type="button" onClick={handleWrapUpDismiss}>
          I&apos;m almost done
        </button>
      </div>
    </div>
  );
}
