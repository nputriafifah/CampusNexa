export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex w-full flex-col items-start justify-between gap-4 text-left sm:flex-row sm:items-end">
      <div className="min-w-0 w-full">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
            {eyebrow}
          </p>
        )}
        <h1 className={`font-display text-3xl font-semibold md:text-4xl ${eyebrow ? 'mt-2' : ''}`}>
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-[var(--muted)]">{description}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
