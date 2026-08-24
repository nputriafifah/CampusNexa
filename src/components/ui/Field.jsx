export function Field({ label, hint, as: Comp = 'input', className = '', ...props }) {
  return (
    <label className="block space-y-1.5 text-sm">
      {label && <span className="font-medium text-[var(--ink)]">{label}</span>}
      <Comp className={`field ${className}`} {...props} />
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  )
}
