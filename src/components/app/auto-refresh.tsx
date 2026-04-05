"use client";

import { startTransition, useEffect, useEffectEvent, useRef } from "react";
import { useRouter } from "next/navigation";

import type { AppRuntimeMode } from "@/lib/runtime/mode";

const MUTATION_COOLDOWN_MS = 10_000;

export function AutoRefresh({ runtimeMode }: { runtimeMode: AppRuntimeMode }) {
  const router = useRouter();
  const lastMutationRef = useRef(0);

  const refreshRoute = useEffectEvent(() => {
    if (Date.now() - lastMutationRef.current <= MUTATION_COOLDOWN_MS) {
      return;
    }
    startTransition(async () => {
      try {
        router.refresh();
      } catch {
        // Transient network failures during background polling are expected
      }
    });
  });

  useEffect(() => {
    const onSubmit = () => {
      lastMutationRef.current = Date.now();
    };
    const onVisibility = () => {
      if (!document.hidden) {
        refreshRoute();
      }
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("visibilitychange", onVisibility);

    if (runtimeMode !== "local") {
      return () => {
        document.removeEventListener("submit", onSubmit, true);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const interval = window.setInterval(() => {
      refreshRoute();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runtimeMode]);

  return null;
}
