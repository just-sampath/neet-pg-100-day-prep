import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function getRuleBody(selector: string) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = globalsCss.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`));
    return match?.[1] ?? "";
}

describe("Day 1 letter dialog styles", () => {
    it("only applies the full-screen grid layout while the native dialog is open", () => {
        const baseDialogRule = getRuleBody(".day1-dialog");
        const openDialogRule = getRuleBody(".day1-dialog[open]");
        const closedDialogRule = getRuleBody(".day1-dialog:not([open])");

        expect(baseDialogRule).not.toMatch(/display\s*:/);
        expect(openDialogRule).toMatch(/display\s*:\s*grid/);
        expect(closedDialogRule).toMatch(/display\s*:\s*none/);
    });
});