export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
      {tabs.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              active ? 'text-[var(--forest)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
            <span
              className={`absolute inset-x-3 -bottom-px h-0.5 origin-left bg-[var(--forest)] transition ${
                active ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
