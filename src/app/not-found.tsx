import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="app-shell">
      <section className="panel panel-hero p-6 md:p-8">
        <div className="eyebrow">Not Found</div>
        <h1 className="display mt-3 text-3xl md:text-4xl">That page is outside the study map.</h1>
        <p className="lead mt-4 max-w-2xl text-sm md:text-base">
          The route you opened is not part of the current shell. Go back to Today, or open the schedule browser and move from there.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button-primary" href="/today">
            Open Today
          </Link>
          <Link className="button-secondary" href="/schedule">
            Open Schedule
          </Link>
        </div>
      </section>
    </main>
  );
}

