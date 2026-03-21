"use server";

import { randomUUID } from "node:crypto";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { loginUser, logoutUser, requireCurrentUser } from "@/lib/auth/session";
import {
  completeAssignedRecoveryForTarget,
  dismissBacklogScope,
  isValidBacklogRescheduleTarget,
  moveBacklogItemPriority,
  refreshBacklogSuggestions,
  rescheduleBacklogScopeToSuggestions,
} from "@/lib/domain/backlog-queue";
import {
  applyScheduleShiftToUserState,
  applyOverrunCascadeBacklog,
  applyTrafficLightToDay,
  generateWeeklySummary,
  getOrCreateProgress,
  moveBlockToBacklog,
  moveVisibleBlocksToBacklog,
  runLateNightSweep,
} from "@/lib/data/app-state";
import { createEmptyUserState, getEffectiveNow, mutateStore } from "@/lib/data/local-store";
import {
  createRevisionId,
  getCurrentDayNumber,
  getScheduleHealth,
  getShiftPreview,
  reconcileRevisionCompletionsForSource,
} from "@/lib/domain/schedule";
import type {
  BacklogBulkScope,
  BacklogMoveDirection,
  BlockKey,
  McqCauseCode,
  McqPriority,
  McqResult,
  RevisionSourceBlockKey,
  TrafficLight,
} from "@/lib/domain/types";
import { getMinutesInTimeZone, IST_TIME_ZONE, toDateOnly, toDateOnlyInTimeZone, weekBounds } from "@/lib/utils/date";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function completionIsoForDateOnly(dateOnly: string | null) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : new Date().toISOString();
}

export async function loginAction(formData: FormData) {
  const result = await loginUser(asString(formData.get("email")), asString(formData.get("password")));
  if (!result.ok) {
    redirect(`/login?error=${encodeURIComponent(result.message)}`);
  }
  redirect("/today");
}

export async function logoutAction() {
  await logoutUser();
  redirect("/login");
}

export async function setDayOneDateAction(formData: FormData) {
  const user = await requireCurrentUser();
  const dayOneDate = asString(formData.get("dayOneDate"));
  const theme = asString(formData.get("theme"));
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    userState.settings.dayOneDate = dayOneDate || null;
    if (theme === "dark" || theme === "light") {
      userState.settings.theme = theme;
    }
  });
  refresh();
}

export async function setThemeAction(formData: FormData) {
  const user = await requireCurrentUser();
  const theme = asString(formData.get("theme"));
  if (theme !== "dark" && theme !== "light") {
    return;
  }
  await mutateStore((store) => {
    store.userState[user.id].settings.theme = theme;
  });
  refresh();
}

export async function setTrafficLightAction(formData: FormData) {
  const user = await requireCurrentUser();
  const dayNumber = Number(asString(formData.get("dayNumber")));
  const trafficLight = asString(formData.get("trafficLight")) as TrafficLight;
  if (!dayNumber || !["green", "yellow", "red"].includes(trafficLight)) {
    return;
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);
    applyTrafficLightToDay(userState, dayNumber, trafficLight, {
      allowRestore: dayNumber === todayDayNumber,
    });
  });
  refresh();
}

export async function updateBlockAction(formData: FormData) {
  const user = await requireCurrentUser();
  const dayNumber = Number(asString(formData.get("dayNumber")));
  const blockKey = asString(formData.get("blockKey")) as BlockKey;
  const intent = asString(formData.get("intent"));
  const completionDate = asString(formData.get("completionDate")) || null;
  const actualStart = asString(formData.get("actualStart")) || null;
  const actualEnd = asString(formData.get("actualEnd")) || null;
  const cascadeDecision = asString(formData.get("cascadeDecision"));
  const note = asString(formData.get("note")) || null;

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const progressKey = `${dayNumber}:${blockKey}`;
    const progress =
      userState.blockProgress[progressKey] ??
      (userState.blockProgress[progressKey] = {
        dayNumber,
        blockKey,
        status: "pending",
        actualStart: null,
        actualEnd: null,
        completedAt: null,
        sourceTag: null,
        note: null,
      });

    if (intent === "complete") {
      progress.status = "completed";
      progress.completedAt = completionIsoForDateOnly(completionDate);
      progress.sourceTag = null;
      progress.note = note;
      reconcileRevisionCompletionsForSource(userState.revisionCompletions, dayNumber, blockKey, progress.completedAt);
      for (const item of Object.values(userState.backlogItems)) {
        if (item.originalDay === dayNumber && item.originalBlockKey === blockKey && item.status !== "dismissed") {
          item.status = "completed";
          item.completedAt = progress.completedAt;
        }
      }
      completeAssignedRecoveryForTarget(userState, dayNumber, blockKey, progress.completedAt);
    } else if (intent === "partial") {
      progress.status = "partial";
      progress.completedAt = completionIsoForDateOnly(completionDate);
      progress.note = note;
    } else if (intent === "skip") {
      moveBlockToBacklog(userState, dayNumber, blockKey, "skipped", "skipped", note);
    } else if (intent === "time") {
      progress.actualStart = actualStart;
      progress.actualEnd = actualEnd;
      progress.note = note;

      if (actualEnd && cascadeDecision === "move_next_to_backlog") {
        applyOverrunCascadeBacklog(
          userState,
          dayNumber,
          blockKey,
          actualEnd,
          "Moved to backlog after the earlier block ran long.",
        );
      }

      if (actualEnd && cascadeDecision === "force_sleep_backlog") {
        applyOverrunCascadeBacklog(
          userState,
          dayNumber,
          blockKey,
          actualEnd,
          "Moved to backlog to protect sleep.",
        );
      }
    }
  });

  refresh();
}

export async function completeRevisionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const sourceDay = Number(asString(formData.get("sourceDay")));
  const sourceBlockKey = asString(formData.get("sourceBlockKey")) as RevisionSourceBlockKey;
  const revisionType = asString(formData.get("revisionType"));
  if (!sourceDay || !["block_a", "block_b"].includes(sourceBlockKey) || !["D+1", "D+3", "D+7", "D+14", "D+28"].includes(revisionType)) {
    return;
  }
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const revisionId = createRevisionId(sourceDay, sourceBlockKey, revisionType as never);
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceDay,
      sourceBlockKey,
      revisionType: revisionType as never,
      completedAt: new Date().toISOString(),
    };
  });
  refresh();
}

export async function updateBacklogAction(formData: FormData) {
  const user = await requireCurrentUser();
  const backlogId = asString(formData.get("backlogId"));
  const intent = asString(formData.get("intent"));
  const completionDate = asString(formData.get("completionDate")) || null;
  const rescheduledToDay = Number(asString(formData.get("rescheduledToDay")) || 0);
  const rescheduledToBlockKey = asString(formData.get("rescheduledToBlockKey")) as BlockKey;
  const moveDirection = asString(formData.get("direction")) as BacklogMoveDirection;

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);
    refreshBacklogSuggestions(userState, userState.settings, todayDayNumber);
    const item = userState.backlogItems[backlogId];
    if (!item) {
      return;
    }

    if (intent === "complete") {
      const completedAt = completionIsoForDateOnly(completionDate);
      for (const entry of Object.values(userState.backlogItems)) {
        if (entry.originalDay === item.originalDay && entry.originalBlockKey === item.originalBlockKey && entry.status !== "dismissed") {
          entry.status = "completed";
          entry.completedAt = completedAt;
        }
      }
      const progress = getOrCreateProgress(userState, item.originalDay, item.originalBlockKey);
      progress.status = "completed";
      progress.completedAt = completedAt;
      progress.sourceTag = null;
      reconcileRevisionCompletionsForSource(
        userState.revisionCompletions,
        item.originalDay,
        item.originalBlockKey,
        progress.completedAt,
      );
    } else if (intent === "dismiss") {
      item.status = "dismissed";
      item.dismissedAt = new Date().toISOString();
    } else if (intent === "accept_suggestion") {
      if (
        item.suggestedDay &&
        item.suggestedBlockKey &&
        isValidBacklogRescheduleTarget(
          userState,
          userState.settings,
          todayDayNumber,
          item.suggestedDay,
          item.suggestedBlockKey,
          item.id,
        )
      ) {
        item.status = "rescheduled";
        item.rescheduledToDay = item.suggestedDay;
        item.rescheduledToBlockKey = item.suggestedBlockKey;
      }
    } else if (intent === "reschedule") {
      const targetDay = rescheduledToDay || item.suggestedDay;
      const targetBlockKey = rescheduledToBlockKey || item.suggestedBlockKey;
      if (
        targetDay &&
        targetBlockKey &&
        isValidBacklogRescheduleTarget(userState, userState.settings, todayDayNumber, targetDay, targetBlockKey, item.id)
      ) {
        item.status = "rescheduled";
        item.rescheduledToDay = targetDay;
        item.rescheduledToBlockKey = targetBlockKey;
      }
    } else if ((intent === "move_up" || intent === "move_down") && (moveDirection === "up" || moveDirection === "down")) {
      moveBacklogItemPriority(userState, backlogId, moveDirection);
    }
  });
  refresh();
}

export async function bulkBacklogAction(formData: FormData) {
  const user = await requireCurrentUser();
  const intent = asString(formData.get("intent"));
  const scope = asString(formData.get("scope")) as BacklogBulkScope;

  if (!["dismiss_scope", "accept_scope_suggestions", "reschedule_scope_to_suggestions"].includes(intent)) {
    return;
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);
    refreshBacklogSuggestions(userState, userState.settings, todayDayNumber);

    if (intent === "dismiss_scope") {
      dismissBacklogScope(userState, scope);
      return;
    }

    rescheduleBacklogScopeToSuggestions(userState, userState.settings, todayDayNumber, scope);
  });

  refresh();
}

export async function wrapUpDayAction(formData: FormData) {
  const user = await requireCurrentUser();
  const dayNumber = Number(asString(formData.get("dayNumber")));
  const trafficLight = asString(formData.get("trafficLight")) as TrafficLight;
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    moveVisibleBlocksToBacklog(userState, dayNumber, trafficLight, {
      excludeNightRecall: true,
      note: "Moved to backlog by wind-down prompt.",
    });
  });
  refresh();
}

export async function runLateNightSweepAction() {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const now = getEffectiveNow(store);
    const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);
    const minutes = getMinutesInTimeZone(now, IST_TIME_ZONE);

    runLateNightSweep(userState, userState.settings, todayDate, todayDayNumber, minutes);
  });
  refresh();
}

export async function applyShiftAction(formData: FormData) {
  const user = await requireCurrentUser();
  const previewSignature = asString(formData.get("previewSignature"));
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState.settings, todayDate);
    const shiftHealth = getScheduleHealth(userState, userState.settings, todayDayNumber);
    const preview = shiftHealth.suggestShift ? getShiftPreview(userState.settings, shiftHealth.missedDays) : null;

    if (!preview || preview.signature !== previewSignature) {
      return;
    }

    applyScheduleShiftToUserState(userState, preview);
  });
  refresh();
}

export async function submitMcqBulkAction(formData: FormData) {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const id = randomUUID();
    userState.mcqBulkLogs[id] = {
      id,
      entryDate: asString(formData.get("entryDate")) || toDateOnly(new Date()),
      totalAttempted: Number(asString(formData.get("totalAttempted")) || 0),
      correct: Number(asString(formData.get("correct")) || 0),
      wrong: Number(asString(formData.get("wrong")) || 0),
      subject: asString(formData.get("subject")) || null,
      source: asString(formData.get("source")) || null,
      createdAt: new Date().toISOString(),
    };
  });
  refresh();
}

export async function submitMcqItemAction(formData: FormData) {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const id = randomUUID();
    userState.mcqItemLogs[id] = {
      id,
      entryDate: asString(formData.get("entryDate")) || toDateOnly(new Date()),
      mcqId: asString(formData.get("mcqId")),
      result: asString(formData.get("result")) as McqResult,
      subject: asString(formData.get("subject")) || null,
      topic: asString(formData.get("topic")) || null,
      source: asString(formData.get("source")) || null,
      causeCode: (asString(formData.get("causeCode")) || null) as McqCauseCode | null,
      priority: (asString(formData.get("priority")) || null) as McqPriority | null,
      correctRule: asString(formData.get("correctRule")) || null,
      whatFooledMe: asString(formData.get("whatFooledMe")) || null,
      fixCodes: asString(formData.get("fixCodes"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      tags: asString(formData.get("tags"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    };
  });
  refresh();
}

export async function submitGtAction(formData: FormData) {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const id = randomUUID();
    const section = (prefix: string) => ({
      timeEnough: asString(formData.get(`${prefix}TimeEnough`)) ? asString(formData.get(`${prefix}TimeEnough`)) === "yes" : null,
      panicStarted: asString(formData.get(`${prefix}PanicStarted`)) ? asString(formData.get(`${prefix}PanicStarted`)) === "yes" : null,
      guessedTooMuch: asString(formData.get(`${prefix}GuessedTooMuch`)) ? asString(formData.get(`${prefix}GuessedTooMuch`)) === "yes" : null,
      timeLostOn: asString(formData.get(`${prefix}TimeLostOn`))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });

    userState.gtLogs[id] = {
      id,
      gtNumber: asString(formData.get("gtNumber")),
      gtDate: asString(formData.get("gtDate")) || toDateOnly(new Date()),
      dayNumber: Number(asString(formData.get("dayNumber")) || 0) || null,
      score: Number(asString(formData.get("score")) || 0) || null,
      correct: Number(asString(formData.get("correct")) || 0) || null,
      wrong: Number(asString(formData.get("wrong")) || 0) || null,
      unattempted: Number(asString(formData.get("unattempted")) || 0) || null,
      airPercentile: asString(formData.get("airPercentile")) || null,
      device: (asString(formData.get("device")) || null) as never,
      attemptedLive: asString(formData.get("attemptedLive")) ? asString(formData.get("attemptedLive")) === "yes" : null,
      overallFeeling: (asString(formData.get("overallFeeling")) || null) as never,
      sectionA: section("sectionA"),
      sectionB: section("sectionB"),
      sectionC: section("sectionC"),
      sectionD: section("sectionD"),
      sectionE: section("sectionE"),
      errorTypes: asString(formData.get("errorTypes")) || null,
      recurringTopics: asString(formData.get("recurringTopics")) || null,
      knowledgeVsBehaviour: Number(asString(formData.get("knowledgeVsBehaviour")) || 0) || null,
      unsureRightCount: Number(asString(formData.get("unsureRightCount")) || 0) || null,
      changeBeforeNextGt: asString(formData.get("changeBeforeNextGt")) || null,
      createdAt: new Date().toISOString(),
    };
  });
  refresh();
}

export async function generateWeeklySummaryAction() {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const today = toDateOnly(store.dev.simulatedNowIso ?? new Date().toISOString());
    const week = weekBounds(today);
    const summary = generateWeeklySummary(userState, userState.settings, week.start);
    userState.weeklySummaries[summary.id] = summary;
  });
  refresh();
}

export async function setSimulatedNowAction(formData: FormData) {
  await requireCurrentUser();
  const value = asString(formData.get("simulatedNow"));
  await mutateStore((store) => {
    store.dev.simulatedNowIso = value ? new Date(value).toISOString() : null;
  });
  refresh();
}

export async function clearSimulatedNowAction() {
  await requireCurrentUser();
  await mutateStore((store) => {
    store.dev.simulatedNowIso = null;
  });
  refresh();
}

export async function resetLocalDataAction() {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    store.userState[user.id] = createEmptyUserState();
    store.sessions = {};
    store.dev.simulatedNowIso = null;
  });
  await logoutUser();
  redirect("/login");
}
