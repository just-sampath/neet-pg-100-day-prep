"use server";

import { randomUUID } from "node:crypto";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { loginUser, logoutUser, requireCurrentUser } from "@/lib/auth/session";
import {
  dismissBacklogScope,
  isValidBacklogRescheduleTarget,
  moveBacklogItemPriority,
  refreshBacklogSuggestions,
  rescheduleBacklogScopeToSuggestions,
} from "@/lib/domain/backlog-queue";
import {
  applyOverrunCascadeBacklog,
  applyOverrunCascadeShift,
  applyScheduleShiftToUserState,
  applyTrafficLightToDay,
  completeBlockItems,
  completeRevisionSession,
  completeTopicItem,
  getOrCreateProgress,
  moveBlockToBacklog,
  moveVisibleBlocksToBacklog,
  runLateNightSweep,
  skipTopicItem,
  upsertWeeklySummary,
} from "@/lib/data/app-state";
import { createEmptyUserState, getEffectiveNow, mutateStore } from "@/lib/data/local-store";
import {
  getCurrentDayNumber,
  getMappedDate,
  getScheduleDay,
  getScheduleDayEditState,
  getScheduleHealth,
  getShiftPreview,
} from "@/lib/domain/schedule";
import { validateGtDraft } from "@/lib/domain/gt";
import { validateMcqBulkDraft, validateMcqItemDraft } from "@/lib/domain/mcq";
import type {
  BacklogBulkScope,
  BacklogMoveDirection,
  BlockKey,
  RevisionType,
  TrafficLight,
} from "@/lib/domain/types";
import { addDaysToDateOnly, getMinutesInTimeZone, IST_TIME_ZONE, toDateOnly, toDateOnlyInTimeZone, weekBounds } from "@/lib/utils/date";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function completionIsoForDateOnly(dateOnly: string | null) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : new Date().toISOString();
}

function isDateOnly(value: string | null) {
  return value === null || /^\d{4}-\d{2}-\d{2}$/u.test(value);
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
    const resolvedDate = dayOneDate || addDaysToDateOnly(
      toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE),
      1,
    );
    if (process.env.NODE_ENV === "production") {
      const now = getEffectiveNow(store);
      const todayIST = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
      if (resolvedDate < todayIST) {
        return;
      }
      if (resolvedDate === todayIST && getMinutesInTimeZone(now, IST_TIME_ZONE) >= 720) {
        return;
      }
    }
    userState.settings.dayOneDate = resolvedDate;
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
    const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate);
    if (!editState.canAdjustToday) {
      return;
    }

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
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate);
    const isRetroactiveCompletion = intent === "complete" && editState.canRetroactivelyComplete;
    const canMutateToday = editState.canAdjustToday;

    if (!canMutateToday && !isRetroactiveCompletion) {
      return;
    }

    if (!isDateOnly(completionDate)) {
      return;
    }

    let resolvedCompletionDate = completionDate;
    if (isRetroactiveCompletion) {
      resolvedCompletionDate = completionDate || getMappedDate(dayNumber, userState.settings) || todayDate;

      if (resolvedCompletionDate > todayDate) {
        return;
      }

      if (userState.settings.dayOneDate && resolvedCompletionDate < userState.settings.dayOneDate) {
        return;
      }
    }

    if (intent === "complete") {
      completeBlockItems(userState, dayNumber, blockKey, completionIsoForDateOnly(resolvedCompletionDate), note);
    } else if (intent === "partial" || intent === "quick_finish") {
      const block = getScheduleDay(dayNumber)?.blocks.find((entry) => entry.timeSlotKey === blockKey);
      const nextItem = block?.items.find((item) => userState.topicProgress[item.itemId]?.status !== "completed");
      if (!nextItem) {
        return;
      }
      completeTopicItem(userState, dayNumber, blockKey, nextItem.itemId, completionIsoForDateOnly(completionDate), note ?? "Quick version.");
    } else if (intent === "skip") {
      moveBlockToBacklog(userState, dayNumber, blockKey, "skipped", "skipped", note);
    } else if (intent === "time") {
      const progress = getOrCreateProgress(userState, dayNumber, blockKey);
      progress.actualStart = actualStart;
      progress.actualEnd = actualEnd;
      progress.note = note;
      progress.updatedAt = new Date().toISOString();

      if (actualEnd && cascadeDecision === "keep_next_visible") {
        applyOverrunCascadeShift(userState, dayNumber, blockKey, actualEnd);
      }

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

export async function updateTopicAction(formData: FormData) {
  const user = await requireCurrentUser();
  const dayNumber = Number(asString(formData.get("dayNumber")));
  const blockKey = asString(formData.get("blockKey")) as BlockKey;
  const itemId = asString(formData.get("itemId"));
  const intent = asString(formData.get("intent"));
  const completionDate = asString(formData.get("completionDate")) || null;
  const note = asString(formData.get("note")) || null;

  if (!dayNumber || !blockKey || !itemId || !["complete", "skip"].includes(intent)) {
    return;
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate);
    const isRetroactiveCompletion = intent === "complete" && editState.canRetroactivelyComplete;

    if (!editState.canAdjustToday && !isRetroactiveCompletion) {
      return;
    }

    if (!isDateOnly(completionDate)) {
      return;
    }

    let resolvedCompletionDate = completionDate;
    if (isRetroactiveCompletion) {
      resolvedCompletionDate = completionDate || getMappedDate(dayNumber, userState.settings) || todayDate;
      if (resolvedCompletionDate > todayDate) {
        return;
      }
      if (userState.settings.dayOneDate && resolvedCompletionDate < userState.settings.dayOneDate) {
        return;
      }
    }

    if (intent === "complete") {
      completeTopicItem(userState, dayNumber, blockKey, itemId, completionIsoForDateOnly(resolvedCompletionDate), note);
      return;
    }

    skipTopicItem(userState, dayNumber, blockKey, itemId, "skipped", "skipped", note);
  });

  refresh();
}

export async function completeRevisionSessionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const sourceItemId = asString(formData.get("sourceItemId"));
  const sourceDay = Number(asString(formData.get("sourceDay")));
  const sourceBlockKey = asString(formData.get("sourceBlockKey")) as BlockKey;
  const revisionIds = formData.getAll("revisionId").filter((value): value is string => typeof value === "string");

  if (!sourceItemId || !sourceDay || !sourceBlockKey || revisionIds.length === 0) {
    return;
  }

  await mutateStore((store) => {
    const userState = store.userState[user.id];
    completeRevisionSession(userState, sourceItemId, sourceDay, sourceBlockKey, revisionIds);
  });
  refresh();
}

export async function completeRevisionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const sourceItemId = asString(formData.get("sourceItemId"));
  const sourceDay = Number(asString(formData.get("sourceDay")));
  const sourceBlockKey = asString(formData.get("sourceBlockKey")) as BlockKey;
  const revisionType = asString(formData.get("revisionType")) as RevisionType;
  if (!sourceItemId || !sourceDay || !sourceBlockKey || !["D+1", "D+3", "D+7", "D+14", "D+28"].includes(revisionType)) {
    return;
  }
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const revisionId = `${sourceItemId}:${revisionType}`;
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId,
      sourceDay,
      sourceBlockKey,
      revisionType,
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
      completeTopicItem(userState, item.originalDay, item.originalBlockKey, item.sourceItemId, completedAt);
      item.status = "completed";
      item.completedAt = completedAt;
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
  let result: { ok: boolean; error?: string } = { ok: true };
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const validated = validateMcqBulkDraft(
      {
        entryDate: asString(formData.get("entryDate")) || null,
        totalAttempted: asString(formData.get("totalAttempted")) || null,
        correct: asString(formData.get("correct")) || null,
        wrong: asString(formData.get("wrong")) || null,
        subject: asString(formData.get("subject")) || null,
        source: asString(formData.get("source")) || null,
      },
      toDateOnly(getEffectiveNow(store)),
    );

    if (!validated.ok) {
      result = validated;
      return;
    }

    const id = randomUUID();
    userState.mcqBulkLogs[id] = {
      id,
      entryDate: validated.value.entryDate,
      totalAttempted: validated.value.totalAttempted,
      correct: validated.value.correct,
      wrong: validated.value.wrong,
      subject: validated.value.subject,
      source: validated.value.source,
      createdAt: new Date().toISOString(),
    };
  });
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function submitMcqItemAction(formData: FormData) {
  const user = await requireCurrentUser();
  let result: { ok: boolean; error?: string } = { ok: true };
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const validated = validateMcqItemDraft(
      {
        entryDate: asString(formData.get("entryDate")) || null,
        mcqId: asString(formData.get("mcqId")) || null,
        result: asString(formData.get("result")) || null,
        subject: asString(formData.get("subject")) || null,
        topic: asString(formData.get("topic")) || null,
        source: asString(formData.get("source")) || null,
        causeCode: asString(formData.get("causeCode")) || null,
        priority: asString(formData.get("priority")) || null,
        correctRule: asString(formData.get("correctRule")) || null,
        whatFooledMe: asString(formData.get("whatFooledMe")) || null,
        fixCodes: formData.getAll("fixCodes").map((value) => (typeof value === "string" ? value : null)),
        tags: formData.getAll("tags").map((value) => (typeof value === "string" ? value : null)),
      },
      toDateOnly(getEffectiveNow(store)),
    );

    if (!validated.ok) {
      result = validated;
      return;
    }

    const id = randomUUID();
    userState.mcqItemLogs[id] = {
      id,
      entryDate: validated.value.entryDate,
      mcqId: validated.value.mcqId,
      result: validated.value.result,
      subject: validated.value.subject,
      topic: validated.value.topic,
      source: validated.value.source,
      causeCode: validated.value.causeCode,
      priority: validated.value.priority,
      correctRule: validated.value.correctRule,
      whatFooledMe: validated.value.whatFooledMe,
      fixCodes: validated.value.fixCodes,
      tags: validated.value.tags,
      createdAt: new Date().toISOString(),
    };
  });
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function submitGtAction(formData: FormData) {
  const user = await requireCurrentUser();
  let result: { ok: boolean; error?: string } = { ok: true };
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const sectionInput = (prefix: string) => ({
      timeEnough: asString(formData.get(`${prefix}TimeEnough`)) || null,
      panicStarted: asString(formData.get(`${prefix}PanicStarted`)) || null,
      guessedTooMuch: asString(formData.get(`${prefix}GuessedTooMuch`)) || null,
      timeLostOn: formData.getAll(`${prefix}TimeLostOn`).flatMap((value) => (typeof value === "string" ? [value] : [])),
    });

    const validated = validateGtDraft(
      {
        gtNumber: asString(formData.get("gtNumber")) || null,
        gtDate: asString(formData.get("gtDate")) || null,
        dayNumber: asString(formData.get("dayNumber")) || null,
        score: asString(formData.get("score")) || null,
        correct: asString(formData.get("correct")) || null,
        wrong: asString(formData.get("wrong")) || null,
        unattempted: asString(formData.get("unattempted")) || null,
        airPercentile: asString(formData.get("airPercentile")) || null,
        device: asString(formData.get("device")) || null,
        attemptedLive: asString(formData.get("attemptedLive")) || null,
        overallFeeling: asString(formData.get("overallFeeling")) || null,
        errorTypes: asString(formData.get("errorTypes")) || null,
        recurringTopics: asString(formData.get("recurringTopics")) || null,
        weakestSubjects: formData.getAll("weakestSubjects").map((value) => (typeof value === "string" ? value : null)),
        knowledgeVsBehaviour: asString(formData.get("knowledgeVsBehaviour")) || null,
        unsureRightCount: asString(formData.get("unsureRightCount")) || null,
        changeBeforeNextGt: asString(formData.get("changeBeforeNextGt")) || null,
        sectionA: sectionInput("sectionA"),
        sectionB: sectionInput("sectionB"),
        sectionC: sectionInput("sectionC"),
        sectionD: sectionInput("sectionD"),
        sectionE: sectionInput("sectionE"),
      },
      toDateOnly(getEffectiveNow(store)),
    );

    if (!validated.ok) {
      result = validated;
      return;
    }

    const id = randomUUID();
    userState.gtLogs[id] = {
      id,
      ...validated.value,
      createdAt: new Date().toISOString(),
    };
  });
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function generateWeeklySummaryAction() {
  const user = await requireCurrentUser();
  await mutateStore((store) => {
    const userState = store.userState[user.id];
    const today = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const week = weekBounds(today);
    upsertWeeklySummary(userState, userState.settings, week.start, today);
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

export async function resetAppStateAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (asString(formData.get("confirmReset")) !== "yes") {
    return;
  }

  const user = await requireCurrentUser();
  await mutateStore((store) => {
    store.userState[user.id] = createEmptyUserState();
    store.sessions = {};
    store.dev.simulatedNowIso = null;
  });
  await logoutUser();
  redirect("/login");
}
