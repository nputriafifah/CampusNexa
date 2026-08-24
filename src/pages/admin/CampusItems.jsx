import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Badge, listingLabel, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

const TYPE_TABS = [
  { id: 'all', label: 'Semua tipe' },
  { id: 'sell', label: 'Jual' },
  { id: 'exchange', label: 'Tukar' },
  { id: 'borrow', label: 'Pinjam' },
  { id: 'donate', label: 'Donasi' },
]

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function closeStatusForType(listingType) {
  switch (listingType) {
    case 'donate':
      return 'donated'
    case 'exchange':
      return 'exchanged'
    case 'borrow':
      return 'borrowed'
    case 'sell':
    default:
      return 'sold'
  }
}

function closeActionLabel(listingType) {
  switch (listingType) {
    case 'donate':
      return 'Tandai didonasikan'
    case 'exchange':
      return 'Tandai ditukar'
    case 'borrow':
      return 'Tandai dipinjam'
    case 'sell':
    default:
      return 'Tandai terjual'
  }
}

function priceLine(item) {
  if (item.listingType === 'sell' && item.price != null) {
    return `Rp ${Number(item.price).toLocaleString('id-ID')}`
  }
  if (item.listingType === 'exchange' && item.lookingFor) {
    return `Cari: ${item.lookingFor}`
  }
  return null
}

/** Label klaim/peminjam sesuai tipe listing — jangan selalu "Klaim donasi". */
function partyLine(item) {
  const name = item.donationClaim?.claimerName
  if (!name) return null
  switch (item.listingType) {
    case 'borrow':
      return `Peminjam: ${name}`
    case 'donate':
      return `Klaim donasi: ${name}`
    case 'sell':
      return `Pemesan: ${name}`
    case 'exchange':
      return `Penukar: ${name}`
    default:
      return `Minat: ${name}`
  }
}

/** Prioritas moderasi AI — listing "macet" > 3 hari (sama seperti dashboard). */
function isAiReviewNeeded(item) {
  if (!['reserved', 'pending_borrow', 'pending_handover'].includes(item.status)) return false
  const raw = item.updatedAt || item.createdAt
  if (!raw) return false
  const t = new Date(raw).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t > 3 * 24 * 60 * 60 * 1000
}

export default function CampusItems() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(() => {
    setLoading(true)
    campusApi
      .adminItems({
        q: debouncedQ || undefined,
        listing_type: type === 'all' ? undefined : type,
      })
      .then(setItems)
      .catch(() => toast.error('Gagal memuat barang'))
      .finally(() => setLoading(false))
  }, [debouncedQ, type])

  useEffect(() => {
    load()
  }, [load])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => Number(isAiReviewNeeded(b)) - Number(isAiReviewNeeded(a)))
  }, [items])

  async function setItemStatus(id, next) {
    try {
      await campusApi.adminModerateItem(id, next)
      toast.success('Status diperbarui')
      load()
    } catch {
      toast.error('Gagal ubah status')
    }
  }

  async function removeItem(id) {
    if (!window.confirm('Hapus barang ini dari kampus?')) return
    try {
      await campusApi.adminDeleteItem(id)
      toast.success('Barang dihapus')
      setOpenId(null)
      load()
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Kelola Barang"
        description="Moderasi barang mahasiswa: jual, tukar, pinjam, dan donasi."
      />

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Cari judul barang atau pemilik…" />

        <div className="flex flex-wrap gap-1.5">
          {TYPE_TABS.map((tab) => (
            <FilterChip
              key={tab.id}
              active={type === tab.id}
              onClick={() => setType(tab.id)}
              label={tab.label}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
            Memuat…
          </p>
        )}

        {!loading &&
          sortedItems.map((item) => {
            const open = openId === item.id
            const extra = priceLine(item)
            const party = partyLine(item)
            const needsAi = isAiReviewNeeded(item)
            const ownerLine = [item.owner, item.ownerFaculty].filter(Boolean).join(' · ')

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open
                    ? 'border-[var(--forest)]/40 shadow-sm'
                    : needsAi
                      ? 'border-amber-200'
                      : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#eef3f0] text-xs text-[var(--muted)]">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={item.listingType}>{listingLabel(item.listingType)}</Badge>
                      <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
                      {needsAi && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          <Sparkles size={11} aria-hidden />
                          Perlu ditinjau AI
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold">{item.title}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {ownerLine || '—'} · {item.location || '—'}
                      {extra ? ` · ${extra}` : ''}
                    </p>
                    {needsAi && (
                      <p className="mt-1.5 text-xs text-amber-900/80">
                        AI mendeteksi listing ini belum selesai selama lebih dari 3 hari.
                      </p>
                    )}
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <div className="border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">
                    <p className="text-sm leading-relaxed text-[var(--ink)]">
                      {item.description || 'Tidak ada deskripsi.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <MetaPill label="Kategori" value={item.category || '—'} />
                      <MetaPill label="Kondisi" value={item.condition || '—'} />
                      <MetaPill label="Minat" value={item.interestCount ?? 0} />
                      <MetaPill label="Diposting" value={formatDate(item.createdAt)} />
                    </div>
                    {item.listingType === 'exchange' && item.lookingFor && (
                      <p className="mt-2 text-sm text-[var(--ink)]">
                        <span className="text-[var(--muted)]">Ingin tukar dengan: </span>
                        {item.lookingFor}
                      </p>
                    )}
                    {party && <p className="mt-2 text-sm text-[var(--muted)]">{party}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status !== 'available' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setItemStatus(item.id, 'available')}
                        >
                          Buka lagi
                        </Button>
                      )}
                      {item.status === 'available' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setItemStatus(item.id, closeStatusForType(item.listingType))
                          }
                        >
                          {closeActionLabel(item.listingType)}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

        {!loading && items.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            Tidak ada barang.
          </p>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-[var(--forest)] text-white'
          : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  )
}

function MetaPill({ label, value }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--line)]">
      <span className="text-[var(--muted)]">{label}</span>{' '}
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </span>
  )
}
