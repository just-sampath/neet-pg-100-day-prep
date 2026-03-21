type Props = {
  eyebrow: string;
  title: string;
  body: string;
  metricCount?: number;
  sectionCount?: number;
};

function SkeletonLine({ className }: { className: string }) {
  return <div aria-hidden="true" className={`skeleton-block ${className}`} />;
}

export function RouteLoadingShell({
  eyebrow,
  title,
  body,
  metricCount = 3,
  sectionCount = 2,
}: Props) {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-6" role="status">
      <section className="panel panel-hero p-6 md:p-7">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="display mt-3 text-3xl md:text-4xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-(--text-secondary)">{body}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: metricCount }).map((_, index) => (
            <article key={index} className="metric-slab">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="mt-4 h-10 w-20" />
              <SkeletonLine className="mt-4 h-3 w-full" />
              <SkeletonLine className="mt-2 h-3 w-3/4" />
            </article>
          ))}
        </div>
      </section>

      {Array.from({ length: sectionCount }).map((_, index) => (
        <section key={index} className="panel p-6">
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="mt-4 h-9 w-2/3" />
          <div className="mt-6 grid gap-3">
            <div className="note-card p-4">
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="mt-3 h-3 w-5/6" />
              <SkeletonLine className="mt-3 h-3 w-2/3" />
            </div>
            <div className="note-card p-4">
              <SkeletonLine className="h-3 w-4/5" />
              <SkeletonLine className="mt-3 h-3 w-full" />
              <SkeletonLine className="mt-3 h-3 w-3/4" />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

