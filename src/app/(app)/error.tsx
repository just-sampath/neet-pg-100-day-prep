"use client";

import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="panel panel-hero p-6 md:p-8" role="alert" aria-live="assertive">
      <div className="eyebrow">Route Error</div>
      <h1 className="display mt-3 text-3xl md:text-4xl">This screen did not load cleanly.</h1>
      <p className="lead mt-4 max-w-2xl text-sm md:text-base">
        Nothing has been reframed as progress or failure here. Try the same view again, or return to Today and continue from the main rail.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="button-primary" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="button-secondary" href="/today">
          Return to Today
        </Link>
      </div>
    </section>
  );
}

