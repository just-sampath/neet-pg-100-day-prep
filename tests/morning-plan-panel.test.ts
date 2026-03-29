import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { DailyRevisionPlan, RevisionSession } from "@/lib/domain/types";

vi.mock("@/lib/server/actions", () => ({
  completeRevisionSessionAction: async () => {},
}));

import { MorningPlanPanel } from "@/components/app/morning-plan-panel";

function createSession(overrides: Partial<RevisionSession> & Pick<RevisionSession, "id" | "sourceItemId" | "lane">): RevisionSession {
  return {
    id: overrides.id,
    sourceItemId: overrides.sourceItemId,
    sourceDay: overrides.sourceDay ?? 1,
    sourceBlockKey: overrides.sourceBlockKey ?? "0630-0745",
    sourceTopicLabel: overrides.sourceTopicLabel ?? "Topic",
    subject: overrides.subject ?? "Pathology",
    lane: overrides.lane,
    revisionTypes: overrides.revisionTypes ?? ["D+1"],
    revisionIds: overrides.revisionIds ?? [`${overrides.sourceItemId}:D+1`],
    items: overrides.items ?? [],
    assignedSlot: overrides.assignedSlot ?? "morning_revision",
    earliestScheduledDate: overrides.earliestScheduledDate ?? "2026-05-02",
    maxOverdueBy: overrides.maxOverdueBy ?? 0,
    totalIntervals: overrides.totalIntervals ?? 1,
    completedIntervals: overrides.completedIntervals ?? 0,
    remainingIntervals: overrides.remainingIntervals ?? 1,
    allocatedMinutes: overrides.allocatedMinutes ?? 25,
    status: overrides.status ?? "pending",
  };
}

describe("MorningPlanPanel", () => {
  it("shows only the capped queue and does not render carry-forward notes or items", () => {
    const queueSession = createSession({
      id: "due-1",
      sourceItemId: "topic-1",
      lane: "due_this_morning",
      sourceTopicLabel: "Haematology",
      allocatedMinutes: 25,
    });
    const overflowSession = createSession({
      id: "due-2",
      sourceItemId: "topic-2",
      lane: "also_review_today",
      sourceTopicLabel: "General Pathology",
      allocatedMinutes: 25,
    });

    const morningPlan: DailyRevisionPlan = {
      queue: [],
      overflow: [],
      catchUp: [],
      restudyFlags: [],
      queueSessions: [queueSession],
      overflowSessions: [overflowSession],
      catchUpSessions: [],
      restudySessions: [],
      phaseMode: "session_primary",
      blockStatusMode: "revision_sessions",
      morningSessionPlanned: 1,
      morningSessionCompleted: 0,
      morningSessionRemaining: 1,
      morningAllocatedMinutes: 25,
      overflowStreakDays: 0,
      overflowSuggestion: null,
    };

    const html = renderToStaticMarkup(
      createElement(MorningPlanPanel, {
        morningBlock: {
          blockKey: "0630-0745",
          displayLabel: "Morning Revision",
          displayDescription: "Revision queue",
          progress: {
            dayNumber: 2,
            blockKey: "0630-0745",
            status: "pending",
            actualStart: null,
            actualEnd: null,
            completedAt: null,
            sourceTag: null,
            note: null,
            completedItemCount: 0,
            totalItemCount: 1,
            unresolvedItemCount: 1,
          },
          items: [],
        },
        morningPlan,
        canAdjustToday: false,
      }),
    );

    expect(html).toContain("Haematology");
    expect(html).toContain("25 minutes are in today&#x27;s 75-minute queue.");
    expect(html).not.toContain("General Pathology");
    expect(html).not.toContain("Queued For Later");
  });
});
