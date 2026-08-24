import { Search } from 'lucide-react'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Cari…',
  className = '',
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 transition focus-within:border-[var(--leaf)] focus-within:shadow-[0_0_0_3px_rgba(47,158,107,0.18)] ${className}`}
    >
      <Search size={18} className="shrink-0 text-[var(--muted)]" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[#7a8f86]"
      />
    </label>
  )
}
