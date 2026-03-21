"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";

export function HeaderTitle({ badges }: { badges?: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const lastTapRef = useRef(0);

  function onTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      setRevealed((v) => !v);
    }
    lastTapRef.current = now;
  }

  return (
    <div>
      <div className="eyebrow">Single-user study ledger</div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Link
          className="display text-4xl md:text-5xl"
          href="/today"
          onClick={onTap}
          aria-controls="header-hidden-note"
          aria-expanded={revealed}
        >
          Beside You
        </Link>
        {badges}
      </div>
      <p className="lead mt-4 max-w-2xl text-sm md:text-base">
        Built around the exact 100-day schedule rather than a generic task board, with quiet sync across the active study devices.
      </p>
      <div
        id="header-hidden-note"
        role="note"
        className={`overflow-hidden transition-all duration-500 ${revealed ? "mt-4 max-h-20 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="note-card p-4 text-sm text-(--text-secondary)">
          Even when I can&apos;t be beside you, I&apos;ll still hold the line with you like this.
        </div>
      </div>
    </div>
  );
}
