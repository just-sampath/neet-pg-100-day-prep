import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("supabase runtime reference-data threading", () => {
  it("does not call getCurrentDayNumber(userState, date) without referenceData in runtime mutation/read paths", () => {
    const files = [
      "src/lib/data/app-state.ts",
      "src/lib/server/actions.ts",
      "src/lib/server/automation-jobs.ts",
      "src/app/api/dev/midnight/route.ts",
    ];

    for (const path of files) {
      const content = read(path);
      expect(
        content,
        `${path} should pass referenceData to getCurrentDayNumber when called with userState`,
      ).not.toMatch(/getCurrentDayNumber\(\s*userState\s*,\s*[^,\)]*\)/gu);
    }
  });

  it("always normalizes Supabase quote_state with runtime quote pools", () => {
    const content = read("src/lib/data/local-store.ts");

    expect(
      content,
      "Supabase settings hydration must pass quote pools into normalizeQuoteState",
    ).not.toContain("normalizeQuoteState(settingsResult.data.quote_state)");
  });

  it("keeps scoped quote safelist persistence narrow (quote_state + state_version only)", () => {
    const content = read("src/lib/data/local-store.ts");
    const fn = content.match(/async function persistSupabaseScopedQuoteState[\s\S]*?\n}\n/);
    expect(fn, "persistSupabaseScopedQuoteState should exist").toBeTruthy();
    const body = fn?.[0] ?? "";

    expect(body).toContain("quote_state:");
    expect(body).toContain("state_version:");
    expect(body).not.toContain("processed_dates:");
    expect(body).not.toContain("morning_revision_selections:");
    expect(body).not.toContain("schedule_shift_days:");
    expect(body).not.toContain("shift_events:");
  });

  it("uses guarded passive store reads for non-schedule app pages", () => {
    const passivePageFiles = [
      "src/app/(app)/backlog/page.tsx",
      "src/app/(app)/gt/page.tsx",
      "src/app/(app)/gt/analytics/page.tsx",
      "src/app/(app)/mcq/page.tsx",
      "src/app/(app)/mcq/analytics/page.tsx",
      "src/app/(app)/revision-queue/page.tsx",
      "src/app/(app)/settings/page.tsx",
      "src/app/(app)/weekly/page.tsx",
      "src/app/(app)/weekly/[week]/page.tsx",
    ];

    for (const path of passivePageFiles) {
      const content = read(path);
      expect(content, `${path} should not use mutateStore for passive page reads`).not.toContain("mutateStore(");
      expect(content, `${path} should use readPassiveStore for guarded Supabase reads`).toContain("readPassiveStore(");
    }
  });
});
