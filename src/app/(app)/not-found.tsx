import Link from "next/link";

export default function AppNotFound() {
  return (
    <section className="panel panel-hero p-6 md:p-8">
      <div className="eyebrow">Not Found</div>
      <h1 className="display mt-3 text-3xl md:text-4xl">This study view does not exist.</h1>
      <p className="lead mt-4 max-w-2xl text-sm md:text-base">
        The app shell is still healthy. This route just is not part of the tracked study workflow.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="button-primary" href="/today">
          Return to Today
        </Link>
        <Link className="button-secondary" href="/schedule">
          Browse Schedule
        </Link>
      </div>
    </section>
  );
}
