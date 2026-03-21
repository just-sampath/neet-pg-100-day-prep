"use client";

import { useEffect } from "react";

type Props = {
  targetId: string | null;
};

export function ScheduleBrowserFocus({ targetId }: Props) {
  useEffect(() => {
    if (!targetId || window.location.hash) {
      return;
    }

    const node = document.getElementById(targetId);
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      node.focus({ preventScroll: true });
      node.scrollIntoView({ block: "center", inline: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [targetId]);

  return null;
}
