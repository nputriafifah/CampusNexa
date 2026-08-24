export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--leaf)] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100'

  const sizes = {
    sm: 'px-3.5 py-1.5 text-sm rounded-full',
    md: 'px-5 py-2.5 text-sm rounded-full',
    lg: 'px-6 py-3 text-base rounded-full',
  }

  const variants = {
    primary:
      'bg-[var(--forest)] text-white hover:bg-[var(--forest-deep)] shadow-[0_8px_20px_rgba(21,128,61,0.22)]',
    secondary:
      'bg-[#eef3f0] text-[var(--forest)] border border-[var(--line)] hover:border-[var(--leaf)] hover:bg-[var(--mint)]',
    light:
      'bg-white text-[var(--forest-deep)] hover:bg-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.12)]',
    ember:
      'bg-[var(--ember)] text-white hover:brightness-95 shadow-[0_8px_20px_rgba(245,158,11,0.22)]',
    ghost: 'bg-transparent text-[var(--ink)] hover:bg-[var(--mint)]',
    danger: 'bg-[var(--danger)] text-white hover:brightness-95',
  }

  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
