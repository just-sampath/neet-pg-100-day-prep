"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AppRuntimeMode } from "@/lib/runtime/mode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const realtimeTables = [
  "app_settings",
  "schedule_days",
  "schedule_blocks",
  "schedule_topic_assignments",
  "phase_config",
  "revision_completions",
  "backlog_items",
  "mcq_bulk_logs",
  "mcq_item_logs",
  "gt_logs",
  "weekly_summaries",
] as const;

type SyncState = "live" | "reconnecting" | "offline";
const SELF_ECHO_SUPPRESSION_MS = 10_000;
const REFRESH_OPTIMIZATIONS_ENABLED =
  process.env.NEXT_PUBLIC_SUPABASE_REFRESH_OPTIMIZATIONS?.toLowerCase() !== "false" &&
  process.env.NEXT_PUBLIC_SUPABASE_REFRESH_OPTIMIZATIONS !== "0";

export function SyncStatus({
  runtimeMode,
  userId,
}: {
  runtimeMode: AppRuntimeMode;
  userId: string;
}) {
  const router = useRouter();
  const supabaseClient = useMemo(
    () => (runtimeMode === "supabase" ? createSupabaseBrowserClient() : null),
    [runtimeMode],
  );
  const [state, setState] = useState<SyncState>(
    runtimeMode !== "supabase" ? "live" : supabaseClient ? "reconnecting" : "offline",
  );
  const timerRef = useRef<number | null>(null);
  const lastLocalMutationAtRef = useRef(0);

  const queueRefresh = useEffectEvent(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      startTransition(() => {
        router.refresh();
      });
    }, REFRESH_OPTIMIZATIONS_ENABLED ? 2_000 : 0);
  });

  useEffect(() => {
    if (runtimeMode !== "supabase" || !supabaseClient) {
      return;
    }

    const onSubmit = () => {
      lastLocalMutationAtRef.current = Date.now();
    };
    const onOnline = () => {
      setState("reconnecting");
      queueRefresh();
    };
    const onOffline = () => setState("offline");

    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const channel = realtimeTables.reduce((builder, table) => {
      return builder.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (
            REFRESH_OPTIMIZATIONS_ENABLED &&
            Date.now() - lastLocalMutationAtRef.current <= SELF_ECHO_SUPPRESSION_MS
          ) {
            return;
          }
          queueRefresh();
        },
      );
    }, supabaseClient.channel(`app-sync-${userId}`));

    let hadConnection = false;

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setState("live");
        if (hadConnection) {
          queueRefresh();
        }
        hadConnection = true;
        return;
      }

      if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setState("reconnecting");
        return;
      }

      if (status === "CLOSED") {
        setState(navigator.onLine ? "reconnecting" : "offline");
      }
    });

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      void supabaseClient.removeChannel(channel);
    };
  }, [runtimeMode, supabaseClient, userId]);

  if (runtimeMode !== "supabase" || state === "live") {
    return null;
  }

  return (
    <span className="status-badge" data-tone={state === "offline" ? "red" : "yellow"}>
      {state === "offline" ? "No connection" : "Sync reconnecting"}
    </span>
  );
}
