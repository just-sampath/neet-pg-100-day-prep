"use client";

import { useState, useTransition } from "react";

import { acceptEarlyFinishAction } from "@/lib/server/actions";
import type { BlockKey } from "@/lib/domain/types";
import type { EarlyFinishSuggestion } from "@/lib/domain/today";

export function EarlyFinishSuggestionCard({
    suggestion,
    targetDayNumber,
    targetBlockKey,
}: {
    suggestion: EarlyFinishSuggestion;
    targetDayNumber: number;
    targetBlockKey: BlockKey;
}) {
    const [dismissed, setDismissed] = useState(false);
    const [pending, startTransition] = useTransition();

    if (dismissed) {
        return null;
    }

    return (
        <div className="note-card mt-4 p-4">
            <div className="eyebrow">Early Finish</div>
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                You have {suggestion.remainingMinutes} minutes left. Next planned topic that fits:
            </p>
            <div className="mt-3 rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="font-medium leading-7">{suggestion.label}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    <span>~{suggestion.plannedMinutes} min</span>
                    {suggestion.subject ? (
                        <span className="status-badge" data-tone="neutral">{suggestion.subject}</span>
                    ) : null}
                    {suggestion.isRecovery && suggestion.originalDayNumber != null ? (
                        <span className="status-badge" data-tone="neutral">Recovery · Day {suggestion.originalDayNumber}</span>
                    ) : null}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <form
                    action={acceptEarlyFinishAction}
                    onSubmit={() => {
                        startTransition(() => { });
                    }}
                >
                    <input type="hidden" name="sourceItemId" value={suggestion.sourceItemId} />
                    <input type="hidden" name="targetDayNumber" value={targetDayNumber} />
                    <input type="hidden" name="targetBlockKey" value={targetBlockKey} />
                    <button className="button-primary" type="submit" disabled={pending}>
                        Start
                    </button>
                </form>
                <button
                    className="button-secondary"
                    type="button"
                    onClick={() => setDismissed(true)}
                    disabled={pending}
                >
                    Skip
                </button>
            </div>
        </div>
    );
}
