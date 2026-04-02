import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/actions", () => ({
    clearSimulatedNowAction: async () => { },
    generateWeeklySummaryAction: async () => { },
    runRepackAction: async () => { },
    setSimulatedNowAction: async () => { },
}));

import { DevToolbar } from "@/components/app/dev-toolbar";

describe("DevToolbar", () => {
    it("does not server-render toolbar markup before hydration", () => {
        const html = renderToStaticMarkup(
            createElement(DevToolbar, {
                simulatedNow: "2026-04-09T06:30:00.000Z",
            }),
        );

        expect(html).not.toContain("Dev Time Travel");
        expect(html).not.toContain("Set simulated time");
        expect(html).not.toContain("Multi-day jumps backfill each missed midnight");
    });
});