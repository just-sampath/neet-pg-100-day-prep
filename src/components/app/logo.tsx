"use client";

import { useRef, useState } from "react";

export function AppLogo() {
  const [revealed, setRevealed] = useState(false);
  const lastTapRef = useRef(0);

  function onTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      setRevealed((value) => !value);
    }
    lastTapRef.current = now;
  }

  return (
    <div className="panel panel-hero grain relative overflow-hidden p-5 md:p-6">
      <div className="absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,rgba(223,176,111,0.22),transparent_68%)] opacity-80" />
      <button type="button" onClick={onTap} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Quiet Companion</div>
            <h1 className="display mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Beside You</h1>
          </div>
          <div className="note-card hidden min-w-24 items-center justify-center rounded-full px-4 py-3 text-center sm:flex">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.26em] text-[var(--muted)]">
              PG
              <div className="mt-1 text-sm text-[var(--foreground)]">2026</div>
            </div>
          </div>
        </div>
        <p className="lead mt-4 max-w-xl text-sm md:text-base">
          An editorial study ledger for the hundred-day run: calm pacing, sharp recall, and enough structure to keep the day honest.
        </p>
      </button>
      <div className={`mt-5 overflow-hidden transition-all duration-500 ${revealed ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="note-card p-4 text-sm text-[var(--text-secondary)]">
          Even when I can&apos;t be beside you, I&apos;ll still hold the line with you like this.
        </div>
      </div>
    </div>
  );
}
