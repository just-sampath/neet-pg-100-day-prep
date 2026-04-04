import "server-only";

import { getCurrentDayNumber, getScheduleHealth } from "@/lib/domain/schedule";
import {
  createRemoteUser,
  isSupabaseRetryableConflictError,
  persistSupabaseStoreForUser,
  readSupabaseStoreForUser,
} from "@/lib/data/local-store";
import { runMidnightRollover, runMidnightRepack, runWeeklySummaryAutomation } from "@/lib/data/app-state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWeekdayInTimeZone, IST_TIME_ZONE, toDateOnlyInTimeZone } from "@/lib/utils/date";

type JobName = "midnight_rollover" | "weekly_summary" | "keep_alive";

type JobResult = {
  jobName: JobName;
  runKey: string;
  scheduledDate: string;
  processedUsers: number;
  metadata: Record<string, unknown>;
  skipped: boolean;
};

const AUTOMATION_CAS_MAX_ATTEMPTS = 2;

function requireAdminClient() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase cron jobs require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabase;
}

async function beginJobRun(jobName: JobName, runKey: string, scheduledDate: string) {
  const supabase = requireAdminClient();
  const { data: existing, error: selectError } = await supabase
    .from("automation_job_runs")
    .select("*")
    .eq("job_name", jobName)
    .eq("run_key", runKey)
    .maybeSingle();

  if (selectError) {
    throw new Error(`automation_job_runs: ${selectError.message}`);
  }

  if (existing?.status === "completed") {
    return { jobId: existing.id as string, shouldRun: false };
  }

  const { data, error } = await supabase
    .from("automation_job_runs")
    .upsert(
      {
        job_name: jobName,
        run_key: runKey,
        status: "running",
        timezone: IST_TIME_ZONE,
        scheduled_date: scheduledDate,
        started_at: new Date().toISOString(),
        finished_at: null,
        processed_users: 0,
        metadata: {},
      },
      {
        onConflict: "job_name,run_key",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`automation_job_runs: ${error.message}`);
  }

  return { jobId: data.id as string, shouldRun: true };
}

async function finishJobRun(jobId: string, status: "completed" | "failed", processedUsers: number, metadata: Record<string, unknown>) {
  const supabase = requireAdminClient();
  const { error } = await supabase
    .from("automation_job_runs")
    .update({
      status,
      processed_users: processedUsers,
      metadata,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`automation_job_runs: ${error.message}`);
  }
}

async function getAutomationUserIds() {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("user_id")
    .not("day_one_date", "is", null);

  if (error) {
    throw new Error(`app_settings: ${error.message}`);
  }

  return [...new Set((data ?? []).map((entry) => entry.user_id as string))];
}

async function runUserMutationWithRetry<T>(
  userId: string,
  supabase: ReturnType<typeof requireAdminClient>,
  mutator: (store: Awaited<ReturnType<typeof readSupabaseStoreForUser>>) => T,
) {
  for (let attempt = 0; attempt < AUTOMATION_CAS_MAX_ATTEMPTS; attempt += 1) {
    const user = createRemoteUser(userId);
    const store = await readSupabaseStoreForUser(user, supabase);
    const previous = structuredClone(store);
    const result = mutator(store);

    if (JSON.stringify(store) === JSON.stringify(previous)) {
      return result;
    }

    try {
      await persistSupabaseStoreForUser(store, previous, supabase);
      return result;
    } catch (error) {
      if (!isSupabaseRetryableConflictError(error) || attempt === AUTOMATION_CAS_MAX_ATTEMPTS - 1) {
        throw error;
      }
      console.warn(`Automation retry due to CAS conflict for user ${userId} (attempt ${attempt + 1}).`);
    }
  }

  throw new Error("Automation mutation failed due to repeated CAS conflicts.");
}

export async function runMidnightCronJob(runAt = new Date()): Promise<JobResult> {
  const scheduledDate = toDateOnlyInTimeZone(runAt, IST_TIME_ZONE);
  const runKey = `ist:${scheduledDate}`;
  const { jobId, shouldRun } = await beginJobRun("midnight_rollover", runKey, scheduledDate);

  if (!shouldRun) {
    return {
      jobName: "midnight_rollover",
      runKey,
      scheduledDate,
      processedUsers: 0,
      metadata: { skippedReason: "already_completed" },
      skipped: true,
    };
  }

  const supabase = requireAdminClient();
  const userIds = await getAutomationUserIds();
  const perUser: Array<Record<string, unknown>> = [];
  let processedUsers = 0;

  try {
    for (const userId of userIds) {
      const summary = await runUserMutationWithRetry(userId, supabase, (store) => {
        const userState = store.userState[userId];
        const todayDayNumber = getCurrentDayNumber(userState, scheduledDate, store.referenceData);
        const midnight = runMidnightRollover(userState, userState.settings, scheduledDate, todayDayNumber, store.referenceData);
        const repack = runMidnightRepack(userState, userState.settings, scheduledDate, todayDayNumber, store.referenceData);
        const shiftHealth = getScheduleHealth(userState, userState.settings, todayDayNumber, store.referenceData);
        return {
          midnight,
          repack,
          shiftHealth,
        };
      });

      processedUsers += 1;
      perUser.push({
        userId,
        missedBlocks: summary.midnight.missedBlocks,
        backlogCreated: summary.midnight.backlogCreated,
        processedDate: summary.midnight.processedDate,
        revisionRollover: summary.midnight.revisionRollover,
        shiftSuggested: summary.shiftHealth.suggestShift,
        shiftPressureDays: summary.shiftHealth.missedDays.length,
        repackSkipped: summary.repack.skipped,
        repackPlaced: summary.repack.placed,
        repackOverflow: summary.repack.overflowBacklog + summary.repack.overflowTopics,
        repackExtensionDays: summary.repack.extensionDaysCreated,
        repackPhaseClosed: summary.repack.phaseClosed + summary.repack.phaseTransitionClosed,
        repackBacklogRescheduled: summary.repack.backlogRescheduled,
      });
    }

    const metadata = {
      scheduleBoundaryTimeZone: IST_TIME_ZONE,
      scheduledDate,
      perUser,
    };

    await finishJobRun(jobId, "completed", processedUsers, metadata);

    return {
      jobName: "midnight_rollover",
      runKey,
      scheduledDate,
      processedUsers,
      metadata,
      skipped: false,
    };
  } catch (error) {
    const metadata = {
      scheduleBoundaryTimeZone: IST_TIME_ZONE,
      scheduledDate,
      processedUsers,
      error: error instanceof Error ? error.message : "Unknown automation failure",
    };
    await finishJobRun(jobId, "failed", processedUsers, metadata);
    throw error;
  }
}

export async function runWeeklySummaryCronJob(runAt = new Date()): Promise<JobResult> {
  const scheduledDate = toDateOnlyInTimeZone(runAt, IST_TIME_ZONE);
  const weekday = getWeekdayInTimeZone(runAt, IST_TIME_ZONE);
  const runKey = `ist:${scheduledDate}`;
  const { jobId, shouldRun } = await beginJobRun("weekly_summary", runKey, scheduledDate);

  if (!shouldRun) {
    return {
      jobName: "weekly_summary",
      runKey,
      scheduledDate,
      processedUsers: 0,
      metadata: { skippedReason: "already_completed" },
      skipped: true,
    };
  }

  const supabase = requireAdminClient();
  const userIds = await getAutomationUserIds();
  const perUser: Array<Record<string, unknown>> = [];
  let processedUsers = 0;

  try {
    for (const userId of userIds) {
      const weekly = await runUserMutationWithRetry(userId, supabase, (store) => {
        const userState = store.userState[userId];
        return runWeeklySummaryAutomation(userState, userState.settings, runAt, store.referenceData);
      });

      processedUsers += 1;
      perUser.push({
        userId,
        weekStart: weekly.weekStart,
        generated: weekly.generated,
        summaryId: weekly.summaryId,
      });
    }

    const metadata = {
      scheduleBoundaryTimeZone: IST_TIME_ZONE,
      scheduledDate,
      weekday,
      expectedWeekday: 0,
      perUser,
    };

    await finishJobRun(jobId, "completed", processedUsers, metadata);

    return {
      jobName: "weekly_summary",
      runKey,
      scheduledDate,
      processedUsers,
      metadata,
      skipped: false,
    };
  } catch (error) {
    const metadata = {
      scheduleBoundaryTimeZone: IST_TIME_ZONE,
      scheduledDate,
      processedUsers,
      error: error instanceof Error ? error.message : "Unknown automation failure",
    };
    await finishJobRun(jobId, "failed", processedUsers, metadata);
    throw error;
  }
}

export async function runKeepAliveCheck() {
  const supabase = requireAdminClient();
  const scheduledDate = toDateOnlyInTimeZone(new Date(), IST_TIME_ZONE);
  const { count, error } = await supabase
    .from("app_settings")
    .select("user_id", { count: "exact", head: true });

  if (error) {
    throw new Error(`keep_alive: ${error.message}`);
  }

  return {
    ok: true,
    scheduledDate,
    activeUsers: count ?? 0,
  };
}
