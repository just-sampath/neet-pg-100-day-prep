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
  rebalanceEarlyFinishSchedule,
  completeBlockItems,
  completeRevisionSession,
  completeTopicItem,
  getOrCreateProgress,
  moveBlockToBacklog,
  moveVisibleBlocksToBacklog,
  runBlockOverrunCutoff,
  runEndOfDaySweep,
  runMidnightRepack,
  runMidnightRollover,
  applyAutomationsWithMode,
  skipTopicItem,
  upsertWeeklySummary,
} from "@/lib/data/app-state";
import {
  createEmptyUserState,
  getEffectiveNow,
  isSupabaseRetryableConflictError,
  mutateActivityStore,
  mutateScheduleStore,
  mutateStore,
} from "@/lib/data/local-store";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
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
import { getEarlyFinishSuggestion } from "@/lib/domain/today";
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

function completionIsoForDateOnly(dateOnly: string | null, fallbackNow = new Date()) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : fallbackNow.toISOString();
}

function isDateOnly(value: string | null) {
  return value === null || /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function asOptionalPositiveInt(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function refreshScheduleViews(dayNumber?: number) {
  void dayNumber;
  refresh();
}

async function mutateScheduleStoreWithConflictHandling(
  mutator: Parameters<typeof mutateScheduleStore>[0],
) {
  try {
    return await mutateScheduleStore(mutator);
  } catch (error) {
    if (!isSupabaseRetryableConflictError(error)) {
      throw error;
    }
    refresh();
    throw new Error("RETRYABLE_CONFLICT: State changed on another device. Reload and retry.");
  }
}

async function mutateStoreWithConflictHandling(
  mutator: Parameters<typeof mutateStore>[0],
) {
  try {
    return await mutateStore(mutator);
  } catch (error) {
    if (!isSupabaseRetryableConflictError(error)) {
      throw error;
    }
    refresh();
    throw new Error("RETRYABLE_CONFLICT: State changed on another device. Reload and retry.");
  }
}

async function mutateActivityStoreWithConflictHandling(
  mutator: Parameters<typeof mutateActivityStore>[0],
) {
  try {
    return await mutateActivityStore(mutator);
  } catch (error) {
    if (!isSupabaseRetryableConflictError(error)) {
      throw error;
    }
    refresh();
    throw new Error("RETRYABLE_CONFLICT: State changed on another device. Reload and retry.");
  }
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
  await mutateScheduleStoreWithConflictHandling((store) => {
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
  refreshScheduleViews();
}

export async function setThemeAction(formData: FormData) {
  const user = await requireCurrentUser();
  const theme = asString(formData.get("theme"));
  if (theme !== "dark" && theme !== "light") {
    return;
  }
  await mutateScheduleStoreWithConflictHandling((store) => {
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

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    ensureUserScheduleSeeded(userState);
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate, userState);
    if (!editState.canAdjustToday) {
      return;
    }

    const todayDayNumber = getCurrentDayNumber(userState, todayDate, store.referenceData);
    applyTrafficLightToDay(userState, dayNumber, trafficLight, {
      allowRestore: dayNumber === todayDayNumber,
    }, store.referenceData);
  });
  refreshScheduleViews(dayNumber);
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

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    ensureUserScheduleSeeded(userState);
    const effectiveNow = getEffectiveNow(store);
    const todayDate = toDateOnlyInTimeZone(effectiveNow, IST_TIME_ZONE);
    const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate, userState);
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
      resolvedCompletionDate = completionDate || getMappedDate(dayNumber, userState) || todayDate;

      if (resolvedCompletionDate > todayDate) {
        return;
      }

      if (userState.settings.dayOneDate && resolvedCompletionDate < userState.settings.dayOneDate) {
        return;
      }
    }

    if (intent === "complete") {
      completeBlockItems(userState, dayNumber, blockKey, completionIsoForDateOnly(resolvedCompletionDate, effectiveNow), note, store.referenceData);
    } else if (intent === "partial" || intent === "quick_finish") {
      const block = getScheduleDay(dayNumber, userState, store.referenceData)?.blocks.find((entry) => entry.timeSlotKey === blockKey);
      const nextItem = block?.items.find((item) => userState.schedule.topicAssignments[item.itemId]?.status !== "completed");
      if (!nextItem) {
        return;
      }
      completeTopicItem(
        userState,
        dayNumber,
        blockKey,
        nextItem.itemId,
        completionIsoForDateOnly(completionDate, effectiveNow),
        note ?? "Quick version.",
        store.referenceData,
      );
    } else if (intent === "skip") {
      moveBlockToBacklog(userState, dayNumber, blockKey, "manual_skip", "skipped", note, store.referenceData);
    } else if (intent === "time") {
      const progress = getOrCreateProgress(userState, dayNumber, blockKey);
      progress.actualStart = actualStart;
      progress.actualEnd = actualEnd;
      progress.note = note;
      progress.updatedAt = new Date().toISOString();

      if (actualEnd && cascadeDecision === "keep_next_visible") {
        applyOverrunCascadeShift(userState, dayNumber, blockKey, actualEnd, store.referenceData);
      }

      if (actualEnd && cascadeDecision === "move_next_to_backlog") {
        applyOverrunCascadeBacklog(
          userState,
          dayNumber,
          blockKey,
          actualEnd,
          "Moved to backlog after the earlier block ran long.",
          store.referenceData,
        );
      }

      if (actualEnd && cascadeDecision === "force_sleep_backlog") {
        applyOverrunCascadeBacklog(
          userState,
          dayNumber,
          blockKey,
          actualEnd,
          "Moved to backlog to protect sleep.",
          store.referenceData,
        );
      }
    }
  });

  refreshScheduleViews(dayNumber);
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

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    ensureUserScheduleSeeded(userState);
    const effectiveNow = getEffectiveNow(store);
    const todayDate = toDateOnlyInTimeZone(effectiveNow, IST_TIME_ZONE);
    const editState = getScheduleDayEditState(dayNumber, userState.settings, todayDate, userState);
    const isRetroactiveCompletion = intent === "complete" && editState.canRetroactivelyComplete;

    if (!editState.canAdjustToday && !isRetroactiveCompletion) {
      return;
    }

    if (!isDateOnly(completionDate)) {
      return;
    }

    let resolvedCompletionDate = completionDate;
    if (isRetroactiveCompletion) {
      resolvedCompletionDate = completionDate || getMappedDate(dayNumber, userState) || todayDate;
      if (resolvedCompletionDate > todayDate) {
        return;
      }
      if (userState.settings.dayOneDate && resolvedCompletionDate < userState.settings.dayOneDate) {
        return;
      }
    }

    if (intent === "complete") {
      completeTopicItem(userState, dayNumber, blockKey, itemId, completionIsoForDateOnly(resolvedCompletionDate, effectiveNow), note, store.referenceData);
      return;
    }

    skipTopicItem(userState, dayNumber, blockKey, itemId, "manual_skip", "skipped", note, store.referenceData);
  });

  refreshScheduleViews(dayNumber);
}

export async function completeRevisionSessionAction(formData: FormData) {
  const user = await requireCurrentUser();
  const sourceItemId = asString(formData.get("sourceItemId"));
  const sourceDay = Number(asString(formData.get("sourceDay")));
  const sourceBlockKey = asString(formData.get("sourceBlockKey")) as BlockKey;
  const revisionIds = formData.getAll("revisionId").filter((value): value is string => typeof value === "string");
  const actualMinutes = asOptionalPositiveInt(asString(formData.get("actualMinutes")));

  if (!sourceItemId || !sourceDay || !sourceBlockKey || revisionIds.length === 0) {
    return;
  }

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const now = getEffectiveNow(store);
    const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
    completeRevisionSession(
      userState,
      sourceItemId,
      sourceDay,
      sourceBlockKey,
      revisionIds,
      now.toISOString(),
      {
        actualMinutes,
        targetDate: todayDate,
      },
      store.referenceData,
    );
  });
  refreshScheduleViews();
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
  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const revisionId = `${sourceItemId}:${revisionType}`;
    userState.revisionCompletions[revisionId] = {
      revisionId,
      sourceItemId,
      sourceDay,
      sourceBlockKey,
      revisionType,
      completedAt: getEffectiveNow(store).toISOString(),
    };
  });
  refreshScheduleViews();
}

export async function updateBacklogAction(formData: FormData) {
  const user = await requireCurrentUser();
  const backlogId = asString(formData.get("backlogId"));
  const intent = asString(formData.get("intent"));
  const completionDate = asString(formData.get("completionDate")) || null;
  const rescheduledToDay = Number(asString(formData.get("rescheduledToDay")) || 0);
  const rescheduledToBlockKey = asString(formData.get("rescheduledToBlockKey")) as BlockKey;
  const moveDirection = asString(formData.get("direction")) as BacklogMoveDirection;

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState, todayDate, store.referenceData);
    refreshBacklogSuggestions(userState, userState.settings, todayDayNumber, store.referenceData);
    const item = userState.backlogItems[backlogId];
    if (!item) {
      return;
    }

    if (intent === "complete") {
      const completedAt = completionIsoForDateOnly(completionDate, getEffectiveNow(store));
      completeTopicItem(userState, item.originalDay, item.originalBlockKey, item.sourceItemId, completedAt, null, store.referenceData);
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
          store.referenceData,
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
        isValidBacklogRescheduleTarget(userState, userState.settings, todayDayNumber, targetDay, targetBlockKey, item.id, store.referenceData)
      ) {
        item.status = "rescheduled";
        item.rescheduledToDay = targetDay;
        item.rescheduledToBlockKey = targetBlockKey;
      }
    } else if ((intent === "move_up" || intent === "move_down") && (moveDirection === "up" || moveDirection === "down")) {
      moveBacklogItemPriority(userState, backlogId, moveDirection);
    }
  });
  refreshScheduleViews();
}

export async function bulkBacklogAction(formData: FormData) {
  const user = await requireCurrentUser();
  const intent = asString(formData.get("intent"));
  const scope = asString(formData.get("scope")) as BacklogBulkScope;

  if (!["dismiss_scope", "accept_scope_suggestions", "reschedule_scope_to_suggestions"].includes(intent)) {
    return;
  }

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState, todayDate, store.referenceData);
    refreshBacklogSuggestions(userState, userState.settings, todayDayNumber, store.referenceData);

    if (intent === "dismiss_scope") {
      dismissBacklogScope(userState, scope);
      return;
    }

    rescheduleBacklogScopeToSuggestions(userState, userState.settings, todayDayNumber, scope, store.referenceData);
  });

  refreshScheduleViews();
}

export async function wrapUpDayAction(formData: FormData) {
  const user = await requireCurrentUser();
  const dayNumber = Number(asString(formData.get("dayNumber")));
  const trafficLight = asString(formData.get("trafficLight")) as TrafficLight;
  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    moveVisibleBlocksToBacklog(userState, dayNumber, trafficLight, {
      excludeFinalReview: true,
      note: "Moved to backlog by wind-down prompt.",
    }, store.referenceData);
  });
  refreshScheduleViews(dayNumber);
}

export async function runLateNightSweepAction() {
  const user = await requireCurrentUser();
  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const now = getEffectiveNow(store);
    const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState, todayDate, store.referenceData);
    const minutes = getMinutesInTimeZone(now, IST_TIME_ZONE);

    runBlockOverrunCutoff(userState, userState.settings, todayDate, todayDayNumber, minutes, store.referenceData);
    runEndOfDaySweep(userState, userState.settings, todayDate, todayDayNumber, minutes, store.referenceData);
  });
  refreshScheduleViews();
}

export async function applyShiftAction(formData: FormData) {
  const user = await requireCurrentUser();
  const previewSignature = asString(formData.get("previewSignature"));
  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const todayDate = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState, todayDate, store.referenceData);
    const shiftHealth = getScheduleHealth(userState, userState.settings, todayDayNumber, store.referenceData);
    const preview = shiftHealth.suggestShift ? getShiftPreview(userState.settings, shiftHealth.missedDays, store.referenceData) : null;

    if (!preview || preview.signature !== previewSignature) {
      return;
    }

    applyScheduleShiftToUserState(userState, preview);
  });
  refreshScheduleViews();
}

export async function submitMcqBulkAction(formData: FormData) {
  const user = await requireCurrentUser();
  let result: { ok: boolean; error?: string } = { ok: true };
  await mutateActivityStoreWithConflictHandling((store) => {
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
      store.referenceData,
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
  await mutateActivityStoreWithConflictHandling((store) => {
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
      store.referenceData,
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
  await mutateActivityStoreWithConflictHandling((store) => {
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
      store.referenceData,
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
  await mutateActivityStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const today = toDateOnlyInTimeZone(getEffectiveNow(store), IST_TIME_ZONE);
    const week = weekBounds(today);
    upsertWeeklySummary(userState, userState.settings, week.start, today, store.referenceData);
  });
  refresh();
}

export async function runRepackAction() {
  const user = await requireCurrentUser();
  let result: ReturnType<typeof runMidnightRepack> | null = null;
  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    const now = getEffectiveNow(store);
    const todayDate = toDateOnlyInTimeZone(now, IST_TIME_ZONE);
    const todayDayNumber = getCurrentDayNumber(userState, todayDate, store.referenceData);
    runMidnightRollover(userState, userState.settings, todayDate, todayDayNumber, store.referenceData);
    result = runMidnightRepack(userState, userState.settings, todayDate, todayDayNumber, store.referenceData);
  });
  refreshScheduleViews();
  return result;
}

export async function acceptEarlyFinishAction(formData: FormData) {
  const user = await requireCurrentUser();
  const sourceItemId = asString(formData.get("sourceItemId"));
  const targetDayNumber = Number(asString(formData.get("targetDayNumber")));
  const targetBlockKey = asString(formData.get("targetBlockKey")) as BlockKey;

  if (!sourceItemId || !targetDayNumber || !targetBlockKey) {
    return;
  }

  await mutateScheduleStoreWithConflictHandling((store) => {
    const userState = store.userState[user.id];
    ensureUserScheduleSeeded(userState);
    const todayScheduleDay = getScheduleDay(targetDayNumber, userState, store.referenceData);
    const block = todayScheduleDay?.blocks.find((entry) => entry.timeSlotKey === targetBlockKey) ?? null;
    if (!todayScheduleDay || !block) {
      return;
    }

    const suggestion = getEarlyFinishSuggestion({
      block,
      blockKey: targetBlockKey,
      blockEndTime: targetBlockKey.split("-")[1] ?? "",
      effectiveNowIso: getEffectiveNow(store).toISOString(),
      todayDayNumber: targetDayNumber,
      todayScheduleDay,
      tomorrowScheduleDay: getScheduleDay(targetDayNumber + 1, userState, store.referenceData) ?? null,
      userState,
      referenceData: store.referenceData,
    });

    if (!suggestion || suggestion.sourceItemId !== sourceItemId) {
      return;
    }

    rebalanceEarlyFinishSchedule(
      userState,
      sourceItemId,
      targetDayNumber,
      targetBlockKey,
      suggestion.remainingMinutes,
      store.referenceData,
    );
  });

  refreshScheduleViews(targetDayNumber);
}

export async function setSimulatedNowAction(formData: FormData) {
  const user = await requireCurrentUser();
  const value = asString(formData.get("simulatedNow"));
  await mutateScheduleStoreWithConflictHandling((store) => {
    store.dev.simulatedNowIso = value ? new Date(value).toISOString() : null;
    applyAutomationsWithMode(store, user.id, "full_mutation");
  });
  refreshScheduleViews();
}

export async function clearSimulatedNowAction() {
  const user = await requireCurrentUser();
  await mutateScheduleStoreWithConflictHandling((store) => {
    store.dev.simulatedNowIso = null;
    applyAutomationsWithMode(store, user.id, "full_mutation");
  });
  refreshScheduleViews();
}

export async function resetAppStateAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (asString(formData.get("confirmReset")) !== "yes") {
    return;
  }

  const user = await requireCurrentUser();
  await mutateStoreWithConflictHandling((store) => {
    store.userState[user.id] = createEmptyUserState();
    store.sessions = {};
    store.dev.simulatedNowIso = null;
  });
  await logoutUser();
  redirect("/login");
}
