// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const actionMocks = vi.hoisted(() => ({
    markDayOneLetterShownAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/actions", () => ({
    markDayOneLetterShownAction: actionMocks.markDayOneLetterShownAction,
}));

import { DayOneLetterDialog } from "@/components/app/day-one-letter-dialog";

const originalShowModal = HTMLDialogElement.prototype.showModal;
const originalClose = HTMLDialogElement.prototype.close;

describe("DayOneLetterDialog", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeAll(() => {
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
            configurable: true,
            value: function showModal(this: HTMLDialogElement) {
                this.setAttribute("open", "");
            },
        });

        Object.defineProperty(HTMLDialogElement.prototype, "close", {
            configurable: true,
            value: function close(this: HTMLDialogElement) {
                this.removeAttribute("open");
            },
        });
    });

    afterAll(() => {
        if (originalShowModal) {
            Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
                configurable: true,
                value: originalShowModal,
            });
        } else {
            delete HTMLDialogElement.prototype.showModal;
        }

        if (originalClose) {
            Object.defineProperty(HTMLDialogElement.prototype, "close", {
                configurable: true,
                value: originalClose,
            });
        } else {
            delete HTMLDialogElement.prototype.close;
        }
    });

    beforeEach(() => {
        actionMocks.markDayOneLetterShownAction.mockClear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
    });

    it("persists that the letter was shown only after clicking Start Day 1", async () => {
        await act(async () => {
            root.render(createElement(DayOneLetterDialog));
        });

        expect(actionMocks.markDayOneLetterShownAction).not.toHaveBeenCalled();

        const button = container.querySelector<HTMLButtonElement>(".day1-cta");
        expect(button).not.toBeNull();

        await act(async () => {
            button!.click();
            await Promise.resolve();
        });

        expect(actionMocks.markDayOneLetterShownAction).toHaveBeenCalledTimes(1);
    });
});
