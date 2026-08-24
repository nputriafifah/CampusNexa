export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="surface-soft flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mint)] text-[var(--forest)]">
          <Icon size={22} />
        </div>
      )}
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      )}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
