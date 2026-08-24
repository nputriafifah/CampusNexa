const styles = {
  available: 'bg-[var(--mint)] text-[var(--forest-deep)]',
  reserved: 'bg-amber-50 text-amber-700',
  borrowed: 'bg-sky-50 text-sky-800',
  pending_borrow: 'bg-amber-50 text-amber-700',
  pending_handover: 'bg-amber-50 text-amber-700',
  claimed: 'bg-slate-100 text-slate-700',
  donated: 'bg-[var(--mint)] text-[var(--forest-deep)]',
  exchanged: 'bg-sky-50 text-sky-700',
  closed: 'bg-slate-100 text-slate-600',
  sold: 'bg-slate-100 text-slate-700',
  expired: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-[var(--mint)] text-[var(--forest-deep)]',
  rejected: 'bg-red-50 text-red-600',
  returned: 'bg-sky-50 text-sky-700',
  sell: 'bg-emerald-50 text-emerald-800',
  exchange: 'bg-[var(--mint)] text-[var(--forest-deep)]',
  borrow: 'bg-sky-50 text-sky-800',
  donate: 'bg-[var(--ember-soft)] text-amber-700',
  default: 'bg-slate-100 text-slate-600',
}

const labels = {
  available: 'Tersedia',
  reserved: 'Dipesan',
  borrowed: 'Dipinjam',
  pending_borrow: 'Menunggu',
  pending_handover: 'Serah terima',
  claimed: 'Diklaim penuh',
  donated: 'Didonasikan',
  exchanged: 'Ditukar',
  closed: 'Ditutup',
  sold: 'Terjual',
  expired: 'Kedaluwarsa',
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
  sell: 'Jual',
  exchange: 'Tukar',
  borrow: 'Pinjam',
  donate: 'Donasi',
}

export function Badge({ children, tone = 'default', className = '' }) {
  const text = children ?? labels[tone] ?? tone
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${styles[tone] || styles.default} ${className}`}
    >
      {typeof text === 'string' && labels[text] ? labels[text] : text}
    </span>
  )
}

export function statusLabel(status) {
  return labels[status] || status
}

export function listingLabel(type) {
  return labels[type] || type
}
