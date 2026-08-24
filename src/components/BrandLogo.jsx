const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
}

/**
 * Logo CampusNexa (+ opsional wordmark)
 * Background PNG transparan — tanpa lingkaran putih.
 */
export function BrandLogo({
  size = 'md',
  withWordmark = true,
  tone = 'forest',
  className = '',
  wordmarkClassName = '',
}) {
  const textTone =
    tone === 'light'
      ? 'text-white'
      : tone === 'dark'
        ? 'text-[var(--ink)]'
        : 'text-[var(--forest)]'

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo-nexa.png"
        alt={withWordmark ? '' : 'CampusNexa'}
        className={`${sizes[size] || sizes.md} shrink-0 object-contain`}
        width={80}
        height={80}
        decoding="async"
      />
      {withWordmark && (
        <span
          className={`font-display font-semibold tracking-tight ${textTone} ${wordmarkClassName}`}
        >
          CampusNexa
        </span>
      )}
    </span>
  )
}
