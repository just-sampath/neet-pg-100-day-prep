"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="app-shell">
          <section className="panel panel-hero p-6 md:p-8" role="alert" aria-live="assertive">
            <div className="eyebrow">Global Error</div>
            <h1 className="display mt-3 text-3xl md:text-4xl">The app shell needs one more attempt.</h1>
            <p className="lead mt-4 max-w-2xl text-sm md:text-base">
              A top-level render failed before the normal route could settle. Retry once, or reopen Today from a fresh navigation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="button-primary" type="button" onClick={reset}>
                Retry shell
              </button>
              <Link className="button-secondary" href="/today">
                Open Today
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

