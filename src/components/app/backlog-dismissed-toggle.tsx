"use client";

import { useState } from "react";

export function BacklogDismissedToggle({
    count,
    children,
}: {
    count: number;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    if (count === 0) return null;

    return (
        <section className="grid gap-4">
            <button
                className="button-secondary w-fit"
                type="button"
                onClick={() => setOpen((prev) => !prev)}
            >
                {open ? "Hide dismissed" : `Show dismissed (${count})`}
            </button>
            {open ? children : null}
        </section>
    );
}
