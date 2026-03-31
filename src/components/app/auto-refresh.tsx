"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

import type { AppRuntimeMode } from "@/lib/runtime/mode";

export function AutoRefresh({ runtimeMode }: { runtimeMode: AppRuntimeMode }) {
  const router = useRouter();
  const refreshRoute = useEffectEvent(() => {
    startTransition(async () => {
      try {
        router.refresh();
      } catch {
        // Transient network failures during background polling are expected
      }
    });
  });

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) {
        refreshRoute();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    if (runtimeMode !== "local") {
      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const interval = window.setInterval(() => {
      refreshRoute();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runtimeMode]);

  return null;
}
