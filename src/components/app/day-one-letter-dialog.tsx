"use client";

import { useEffect, useRef, useCallback } from "react";
import { markDayOneLetterShownAction } from "@/lib/server/actions";

export function DayOneLetterDialog() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const markedRef = useRef(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        // Block Escape key — only the CTA button should close this dialog
        const preventCancel = (e: Event) => e.preventDefault();
        dialog.addEventListener("cancel", preventCancel);

        // Block backdrop click (trackpad scroll can fire click on the dialog element)
        const preventBackdropClose = (e: MouseEvent) => {
            if (e.target === dialog) e.preventDefault();
        };
        dialog.addEventListener("click", preventBackdropClose);

        dialog.showModal();

        return () => {
            dialog.removeEventListener("cancel", preventCancel);
            dialog.removeEventListener("click", preventBackdropClose);
        };
    }, []);

    const handleClose = useCallback(async () => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        dialog.close();

        if (markedRef.current) {
            return;
        }

        markedRef.current = true;
        try {
            await markDayOneLetterShownAction();
        } catch {
            markedRef.current = false;
        }
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className="day1-dialog"
            aria-label="Welcome letter"
        >
            <div className="day1-envelope">
                <div className="day1-paper">
                    <div className="day1-letter-body">
                        <p className="day1-greeting">Hey love,</p>

                        <p className="day1-para">
                            Right now, NEET PG might feel like an enormous wall, a hundred days of relentless
                            reading, thousands of MCQs, and the constant whisper that you&apos;re not doing enough.

                        </p>

                        <p className="day1-para">
                            <b>On those days, I want you to remember this:</b> <br></br>
                            I believe in you more than you&apos;ll ever know. Not because I have to, but
                            because I&apos;ve seen how hard you work, how deeply you care, and how much
                            fire you carry inside you.
                        </p>

                        <p className="day1-para">
                            I want you to know how incredibly proud I am of you.
                        </p>

                        <p className="day1-para">
                            You don&apos;t have to be perfect every single day. <b>You just have to keep
                            showing up.</b> And while you&apos;re busy conquering this, I&apos;ll be right here
                            cheering you on, making sure you laugh on the hard days, and reminding
                            you to eat and sleep when you forget.
                        </p>

                        <p className="day1-para">
                            Go get that rank, doctor. The world is lucky to have you.
                        </p>

                        <p className="day1-para day1-sign-off">
                            All my love and all my luck 💛
                        </p>
                    </div>

                    <button
                        type="button"
                        className="day1-cta"
                        onClick={handleClose}
                        autoFocus
                    >
                        Start Day 1
                    </button>
                </div>
            </div>
        </dialog>
    );
}
