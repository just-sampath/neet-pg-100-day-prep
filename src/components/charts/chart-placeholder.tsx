export function ChartPlaceholder({
  title,
  body,
  heightClassName = "h-72",
}: {
  title: string;
  body: string;
  heightClassName?: string;
}) {
  return (
    <div className={`note-card grid ${heightClassName} gap-4 p-4`} role="status" aria-live="polite">
      <div>
        <div className="eyebrow">Loading chart</div>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{title}</p>
        <p className="mt-2 text-sm leading-7 text-[var(--text-dim)]">{body}</p>
      </div>
      <div aria-hidden="true" className="mt-auto grid grid-cols-6 items-end gap-3">
        <div className="skeleton-block h-20" />
        <div className="skeleton-block h-28" />
        <div className="skeleton-block h-16" />
        <div className="skeleton-block h-24" />
        <div className="skeleton-block h-12" />
        <div className="skeleton-block h-32" />
      </div>
    </div>
  );
}

