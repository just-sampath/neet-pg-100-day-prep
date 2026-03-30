import { describe, expect, it } from "vitest";

import { getBacklogQueueItems, refreshBacklogSuggestions } from "@/lib/domain/backlog-queue";
import { previewOverrunCascade, resolvePhase, resolveSubjectTier } from "@/lib/domain/backlog";
import {
  applyOverrunCascadeBacklog,
  applyOverrunCascadeShift,
  applyTrafficLightToDay,
  completeBlockItems,
  getOrCreateProgress,
  moveBlockToBacklog,
  moveVisibleBlocksToBacklog,
  runMidnightRollover,
} from "@/lib/data/app-state";
import { createEmptyUserState } from "@/lib/data/local-store";
import { getStaticReferenceData } from "@/lib/data/reference-data";
import { ensureUserScheduleSeeded } from "@/lib/data/schedule-seed";
import { getBlockProgress, getScheduleDay, getVisibleBlockKeys } from "@/lib/domain/schedule";
import type { BlockKey } from "@/lib/domain/types";

function createConfiguredUserState() {
  const userState = createEmptyUserState();
  userState.settings.dayOneDate = "2026-05-01";
  return userState;
}

function getBlockKey(dayNumber: number, semanticBlockKey: string): BlockKey {
  return getScheduleDay(dayNumber)!.blocks.find((block) => block.semanticBlockKey === semanticBlockKey)!.timeSlotKey;
}

function getBlockItems(dayNumber: number, blockKey: BlockKey) {
  return getScheduleDay(dayNumber)!.blocks.find((block) => block.timeSlotKey === blockKey)!.items;
}

describe("backlog creation and traffic-light handling", () => {
  it("uses the new phase-aware traffic-light policy", () => {
    const day2 = getScheduleDay(2)!;

    expect(getVisibleBlockKeys("yellow", day2)).toEqual([
      "06:30-07:45",
      "08:00-11:00",
      "11:15-14:15",
      "18:00-20:00",
      "22:15-22:45",
    ]);

    expect(getVisibleBlockKeys("red", day2)).toEqual([
      "06:30-07:45",
      "08:00-11:00",
      "18:00-20:00",
      "22:15-22:45",
    ]);
  });

  it("moves only unresolved hidden work into recovery on a yellow day and preserves completed hidden blocks", () => {
    const userState = createConfiguredUserState();
    const blockCKey = getBlockKey(2, "block_c");
    const finalReviewKey = getBlockKey(2, "final_review");

    completeBlockItems(userState, 2, blockCKey, "2026-05-02T12:00:00.000Z");
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    // block_c is completed — no backlog. final_review has recall intent — excluded by guard.
    const backlogBlocks = Object.values(userState.backlogItems).map((item) => item.originalBlockKey);
    expect(backlogBlocks).toHaveLength(0);

    expect(getBlockProgress(userState, 2, blockCKey).status).toBe("completed");
    // Topics still marked rescheduled via markTopicForRecovery even without a backlog entry
    expect(getBlockProgress(userState, 2, finalReviewKey).status).toBe("rescheduled");
  });

  it("restores same-day red-to-yellow work while keeping still-hidden blocks pending", () => {
    const userState = createConfiguredUserState();
    const blockBKey = getBlockKey(2, "block_b");
    const blockCKey = getBlockKey(2, "block_c");

    applyTrafficLightToDay(userState, 2, "red", { allowRestore: true });
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    expect(getBlockProgress(userState, 2, blockBKey).status).toBe("pending");

    const restoredBacklog = Object.values(userState.backlogItems).filter((item) => item.originalBlockKey === blockBKey);
    expect(restoredBacklog.every((item) => item.status === "dismissed")).toBe(true);

    // Only block_c creates backlog (core_study intent); final_review (recall) is excluded by guard
    const stillHiddenBacklog = Object.values(userState.backlogItems).filter(
      (item) => item.originalBlockKey === blockCKey,
    );
    expect(stillHiddenBacklog.length).toBeGreaterThan(0);
    expect(stillHiddenBacklog.every((item) => item.status === "pending")).toBe(true);
  });

  it("does not restore hidden work when green is applied without same-day restore", () => {
    const userState = createConfiguredUserState();
    const blockCKey = getBlockKey(2, "block_c");
    const finalReviewKey = getBlockKey(2, "final_review");

    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });
    applyTrafficLightToDay(userState, 2, "green", { allowRestore: false });

    const backlogItems = Object.values(userState.backlogItems);
    expect(backlogItems.every((item) => item.status === "pending")).toBe(true);
    expect(getBlockProgress(userState, 2, blockCKey).status).toBe("rescheduled");
    expect(getBlockProgress(userState, 2, finalReviewKey).status).toBe("rescheduled");
  });

  it("creates manual-skip recovery for study blocks but keeps morning revision out of the backlog queue", () => {
    const userState = createConfiguredUserState();
    const morningRevisionKey = getBlockKey(2, "morning_revision");
    const blockAKey = getBlockKey(2, "block_a");

    moveBlockToBacklog(userState, 2, blockAKey, "skipped", "skipped", "User chose to skip.");
    moveBlockToBacklog(userState, 2, morningRevisionKey, "skipped", "skipped", "Handled by revision system.");

    const backlogItems = Object.values(userState.backlogItems);
    expect(backlogItems).toHaveLength(getBlockItems(2, blockAKey).length);
    expect(backlogItems.every((item) => item.originalBlockKey === blockAKey)).toBe(true);
    expect(getBlockProgress(userState, 2, morningRevisionKey).status).toBe("skipped");
  });

  it("moves only visible reschedulable study work during wind-down and leaves no-due morning revision closed", () => {
    const userState = createConfiguredUserState();
    const morningRevisionKey = getBlockKey(2, "morning_revision");
    const finalReviewKey = getBlockKey(2, "final_review");

    moveVisibleBlocksToBacklog(userState, 2, "green", {
      excludeFinalReview: true,
      note: "Moved to recovery by wind-down prompt.",
    });

    const queuedBlockKeys = new Set(Object.values(userState.backlogItems).map((item) => item.originalBlockKey));
    expect(queuedBlockKeys).toEqual(
      new Set([
        getBlockKey(2, "block_a"),
        getBlockKey(2, "block_b"),
        getBlockKey(2, "block_c"),
      ]),
    );
    expect(getBlockProgress(userState, 2, morningRevisionKey).status).toBe("pending");
    expect(getBlockProgress(userState, 2, finalReviewKey).status).toBe("pending");
  });

  it("marks midnight misses correctly and keeps non-backlog blocks out of the recovery queue", () => {
    const userState = createEmptyUserState();
    userState.settings.dayOneDate = "2026-05-01";
    userState.morningRevisionSelections["2026-05-01"] = ["stale"];
    userState.morningRevisionActualMinutes["2026-05-01"] = { stale: 10 };
    userState.morningRevisionAutoAddNotice["2026-05-01"] = {
      sourceItemId: "stale",
      sourceTopicLabel: "Stale topic",
      actualMinutes: 10,
      savedMinutes: 5,
      addedSessions: [{ sourceItemId: "added", sourceTopicLabel: "Added topic", allocatedMinutes: 10 }],
      createdAt: "2026-05-01T07:00:00.000Z",
    };
    userState.morningRevisionSelections["2026-05-03"] = ["keep"];
    userState.morningRevisionActualMinutes["2026-05-03"] = { keep: 15 };
    userState.morningRevisionAutoAddNotice["2026-05-03"] = {
      sourceItemId: "keep",
      sourceTopicLabel: "Keep topic",
      actualMinutes: 15,
      savedMinutes: 10,
      addedSessions: [{ sourceItemId: "added-keep", sourceTopicLabel: "Added keep", allocatedMinutes: 10 }],
      createdAt: "2026-05-03T07:00:00.000Z",
    };
    const morningRevisionKey = getBlockKey(2, "morning_revision");
    const wrapUpLogKey = getBlockKey(2, "wrap_up_log");
    const backlogEligibleBlockKeys = [
      getBlockKey(2, "block_a"),
      getBlockKey(2, "block_b"),
      getBlockKey(2, "block_c"),
    ];

    const result = runMidnightRollover(userState, userState.settings, "2026-05-03", 3);
    const expectedBacklogCreated = backlogEligibleBlockKeys.reduce((total, blockKey) => total + getBlockItems(2, blockKey).length, 0);

    expect(result.missedBlocks).toBe(6);
    expect(result.backlogCreated).toBe(expectedBacklogCreated);
    expect(getBlockProgress(userState, 2, morningRevisionKey).status).toBe("completed");
    expect(getBlockProgress(userState, 2, wrapUpLogKey).status).toBe("missed");
    expect(Object.values(userState.backlogItems).every((item) => item.originalBlockKey !== morningRevisionKey)).toBe(true);
    expect(Object.values(userState.backlogItems).every((item) => item.originalBlockKey !== wrapUpLogKey)).toBe(true);
    expect(userState.morningRevisionSelections["2026-05-01"]).toBeUndefined();
    expect(userState.morningRevisionActualMinutes["2026-05-01"]).toBeUndefined();
    expect(userState.morningRevisionAutoAddNotice["2026-05-01"]).toBeUndefined();
    expect(userState.morningRevisionSelections["2026-05-03"]).toEqual(["keep"]);
    expect(userState.morningRevisionActualMinutes["2026-05-03"]).toEqual({ keep: 15 });
    expect(userState.morningRevisionAutoAddNotice["2026-05-03"]?.sourceItemId).toBe("keep");
  });

  it("previews and persists a downstream overrun cascade instead of shifting only one adjacent block", () => {
    expect(
      previewOverrunCascade({
        editedBlockKey: "study-a",
        newEndTime: "09:30",
        slots: [
          {
            key: "study-a",
            label: "Study A",
            start: "08:00",
            end: "09:00",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            visible: true,
            reschedulable: true,
          },
          {
            key: "study-b",
            label: "Study B",
            start: "09:00",
            end: "10:00",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            visible: true,
            reschedulable: true,
          },
          {
            key: "study-c",
            label: "Study C",
            start: "10:00",
            end: "11:00",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            visible: true,
            reschedulable: true,
          },
        ],
      }),
    ).toMatchObject({
      kind: "decision",
      affectedBlockKey: "study-b",
      shiftedStart: "09:30",
      shiftedEnd: "10:30",
    });

    const userState = createConfiguredUserState();
    const blockAKey = getBlockKey(2, "block_a");
    const blockBKey = getBlockKey(2, "block_b");
    const blockCKey = getBlockKey(2, "block_c");

    const result = applyOverrunCascadeShift(userState, 2, blockAKey, "12:00");

    expect(result.preview).toMatchObject({
      kind: "decision",
      affectedBlockKey: blockBKey,
    });
    expect(getOrCreateProgress(userState, 2, blockBKey)).toMatchObject({
      actualStart: "12:00",
      actualEnd: "15:00",
    });
    expect(getOrCreateProgress(userState, 2, blockCKey)).toMatchObject({
      actualStart: "15:00",
      actualEnd: "17:45",
    });
  });

  it("forces the affected tail into recovery when an overrun would breach the 23:00 boundary", () => {
    const userState = createConfiguredUserState();
    const mcqKey = getBlockKey(2, "mcq_practice");
    const finalReviewKey = getBlockKey(2, "final_review");

    const result = applyOverrunCascadeBacklog(userState, 2, mcqKey, "22:00", "Moved to protect sleep.");

    expect(result.preview).toMatchObject({
      kind: "force_to_backlog",
      affectedBlockKeys: [finalReviewKey],
    });
    expect(getBlockProgress(userState, 2, finalReviewKey).status).toBe("rescheduled");
  });

  it("keeps recovery suggestions inside the same macro phase for Phase 1 topic backlog", () => {
    const userState = createConfiguredUserState();
    const blockAKey = getBlockKey(2, "block_a");

    moveBlockToBacklog(userState, 2, blockAKey, "missed", "missed", "Carry this forward.");
    refreshBacklogSuggestions(userState, userState.settings, 2);

    const queueItems = getBacklogQueueItems(userState, userState.settings, "2026-05-02", "all", "priority");
    expect(queueItems.length).toBeGreaterThan(0);
    expect(queueItems.every((item) => item.suggestedDay !== null)).toBe(true);
    expect(
      queueItems.every(
        (item) =>
          item.suggestedDay !== null &&
          getScheduleDay(item.suggestedDay)!.phaseId === getScheduleDay(item.originalDay)!.phaseId,
      ),
    ).toBe(true);
  });

  it("uses traffic_light source tag for yellow and red days", () => {
    const userState = createConfiguredUserState();
    const blockCKey = getBlockKey(2, "block_c");

    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });

    const items = Object.values(userState.backlogItems).filter((item) => item.originalBlockKey === blockCKey);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.sourceTag === "traffic_light")).toBe(true);
  });

  it("uses manual_skip source tag when a block is explicitly skipped", () => {
    const userState = createConfiguredUserState();
    const blockAKey = getBlockKey(2, "block_a");

    moveBlockToBacklog(userState, 2, blockAKey, "manual_skip", "skipped", "User chose to skip.");

    const items = Object.values(userState.backlogItems).filter((item) => item.originalBlockKey === blockAKey);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.sourceTag === "manual_skip")).toBe(true);
  });

  it("populates subjectTier and phase on new backlog items", () => {
    const userState = createConfiguredUserState();
    ensureUserScheduleSeeded(userState);
    const refData = getStaticReferenceData();
    const blockAKey = getBlockKey(2, "block_a");

    moveBlockToBacklog(userState, 2, blockAKey, "missed", "missed", null, refData);

    const items = Object.values(userState.backlogItems).filter((item) => item.originalBlockKey === blockAKey);
    expect(items.length).toBeGreaterThan(0);
    // Day 2 subject is pathology (rank 1 → tier A), phase 1
    expect(items[0]!.subjectTier).toBe("A");
    expect(items[0]!.phase).toBe(1);
    expect(items[0]!.updatedAt).toBeTruthy();
  });

  it("does not create backlog items for non-qualifying block intents (practice, recall)", () => {
    const userState = createConfiguredUserState();
    const mcqKey = getBlockKey(2, "mcq_practice");
    const finalReviewKey = getBlockKey(2, "final_review");

    moveBlockToBacklog(userState, 2, mcqKey, "missed", "missed", null);
    moveBlockToBacklog(userState, 2, finalReviewKey, "missed", "missed", null);

    // No backlog items created for practice/recall intents
    expect(Object.values(userState.backlogItems)).toHaveLength(0);
    // But topics are still marked as missed
    expect(getBlockProgress(userState, 2, mcqKey).status).toBe("missed");
    expect(getBlockProgress(userState, 2, finalReviewKey).status).toBe("missed");
  });

  it("resolves subject tier from reference data", () => {
    const refData = getStaticReferenceData();

    // Single rank-1 subject → tier A
    expect(resolveSubjectTier(["pathology"], refData)).toEqual({ subject: "Pathology", subjectTier: "A" });

    // Rank-2 subject → tier B
    expect(resolveSubjectTier(["physiology"], refData)).toEqual({ subject: "Physiology", subjectTier: "B" });

    // Rank-3 subject → tier C
    expect(resolveSubjectTier(["ent"], refData)).toEqual({ subject: "ENT", subjectTier: "C" });

    // Multi-subject: highest priority (lowest rank) wins
    expect(resolveSubjectTier(["ent", "pathology"], refData)).toEqual({ subject: "Pathology", subjectTier: "A" });

    // Unknown subject → fallback
    expect(resolveSubjectTier(["unknown_subject"], refData)).toEqual({ subject: "unknown subject", subjectTier: null });

    // Empty → General
    expect(resolveSubjectTier([], refData)).toEqual({ subject: "General", subjectTier: null });
  });

  it("resolves phase from user state phase config", () => {
    const userState = createConfiguredUserState();
    ensureUserScheduleSeeded(userState);

    // Day 2 → Phase 1 (days 1-63)
    expect(resolvePhase(2, userState)).toBe(1);

    // Day 63 → Phase 1 boundary
    expect(resolvePhase(63, userState)).toBe(1);

    // Day 64 → Phase 2 (days 64-82)
    expect(resolvePhase(64, userState)).toBe(2);

    // Day 83 → Phase 3 (days 83-100)
    expect(resolvePhase(83, userState)).toBe(3);

    // Day 101 → out of range
    expect(resolvePhase(101, userState)).toBeNull();
  });

  it("cycles traffic_light backlog through green→yellow→green→yellow upsert", () => {
    const userState = createConfiguredUserState();
    const blockCKey = getBlockKey(2, "block_c");

    // Green → Yellow: creates backlog
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });
    const firstItems = Object.values(userState.backlogItems).filter(
      (item) => item.originalBlockKey === blockCKey && item.status === "pending",
    );
    expect(firstItems.length).toBeGreaterThan(0);

    // Yellow → Green with restore: dismisses backlog
    applyTrafficLightToDay(userState, 2, "green", { allowRestore: true });
    const dismissed = Object.values(userState.backlogItems).filter(
      (item) => item.originalBlockKey === blockCKey && item.status === "dismissed",
    );
    expect(dismissed.length).toBe(firstItems.length);

    // Green → Yellow again: re-upserts backlog as pending
    applyTrafficLightToDay(userState, 2, "yellow", { allowRestore: true });
    const reupserted = Object.values(userState.backlogItems).filter(
      (item) => item.originalBlockKey === blockCKey && item.status === "pending",
    );
    expect(reupserted.length).toBe(firstItems.length);
    expect(reupserted.every((item) => item.sourceTag === "traffic_light")).toBe(true);
  });
});
