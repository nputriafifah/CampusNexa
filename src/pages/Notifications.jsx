import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  HandHeart,
  MessageSquare,
  Package,
  ShoppingBag,
  Utensils,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useData } from '../context/DataContext'
import { formatTimeAgo } from '../lib/format'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

const kinds = {
  announcement: { icon: Bell, label: 'Pengumuman' },
  borrow: { icon: ShoppingBag, label: 'Pinjam' },
  food: { icon: Utensils, label: 'Food Rescue' },
  food_rescued: { icon: Utensils, label: 'Food Rescue' },
  donate: { icon: HandHeart, label: 'Donasi' },
  exchange: { icon: Package, label: 'Barang' },
  sell: { icon: Package, label: 'Barang' },
  community: { icon: CalendarDays, label: 'Event' },
  chat: { icon: MessageSquare, label: 'Chat' },
  default: { icon: Bell, label: 'Update' },
}

function kindFor(n) {
  const type = String(n.type || '').toLowerCase()
  const text = `${n.title || ''} ${n.body || ''}`.toLowerCase()
  if (text.includes('chat') || text.includes('membalas') || text.includes('minat')) {
    return kinds.chat
  }
  if (type === 'community' || text.includes('event') || text.includes('relawan')) {
    return kinds.community
  }
  return kinds[type] || kinds.default
}

function uniqueNotifications(list) {
  const seen = new Set()
  return list.filter((n) => {
    const key = `${n.title || ''}|${n.body || ''}|${n.type || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function quotedTitle(text = '') {
  const m = String(text).match(/[“"]([^”"]+)[”"]/)
  return m?.[1]?.trim() || null
}

function findByTitle(list, title) {
  if (!title) return null
  const needle = title.toLowerCase()
  return (
    list.find((row) => String(row.title || '').toLowerCase() === needle) ||
    list.find((row) => String(row.title || '').toLowerCase().includes(needle)) ||
    null
  )
}

function pathForNotification(n, { items = [], foods = [] } = {}) {
  if (n.link) return n.link

  const type = String(n.type || '').toLowerCase()
  if (type === 'announcement') return '/app/announcements'

  const text = `${n.title || ''} ${n.body || ''}`.toLowerCase()
  const named = quotedTitle(n.body || n.title || '')

  const itemHit = findByTitle(items, named)
  const foodHit = findByTitle(foods, named)

  if (
    text.includes('membalas') ||
    text.includes('balasan') ||
    text.includes('chat') ||
    text.includes('minat') ||
    text.includes('tertarik')
  ) {
    if (itemHit) return `/app/exchange/${itemHit.dbId || itemHit.id}#item-chat`
  }

  if (type === 'community' || text.includes('event') || text.includes('relawan')) {
    if (text.includes('relawan')) return '/app/community?tab=volunteer'
    return '/app/community'
  }

  if (type === 'food' || type === 'food_rescued' || text.includes('makanan')) {
    if (foodHit) return `/app/food/${foodHit.dbId || foodHit.id}`
    return '/app/food'
  }

  if (type === 'borrow' || text.includes('pinjam')) {
    if (itemHit) {
      if (text.includes('disetujui') || text.includes('chat') || text.includes('minta')) {
        return `/app/exchange/${itemHit.dbId || itemHit.id}#item-chat`
      }
      return `/app/exchange/${itemHit.dbId || itemHit.id}`
    }
    if (text.includes('disetujui') || text.includes('kembalikan') || text.includes('reminder')) {
      return '/app/borrow?tab=mine'
    }
    if (text.includes('permintaan') || text.includes('ditolak')) {
      return '/app/borrow?tab=incoming'
    }
    return '/app/borrow'
  }

  if (type === 'donate' || text.includes('donasi')) {
    if (itemHit) return `/app/exchange/${itemHit.dbId || itemHit.id}#item-chat`
    if (text.includes('klaim')) return '/app/exchange?type=donate&mine=1'
    return '/app/exchange?type=donate'
  }

  if (type === 'sell' || type === 'exchange' || text.includes('terjual') || text.includes('tukar')) {
    if (itemHit) return `/app/exchange/${itemHit.dbId || itemHit.id}`
    return '/app/exchange?mine=1'
  }

  if (itemHit) return `/app/exchange/${itemHit.dbId || itemHit.id}`
  if (foodHit) return `/app/food/${foodHit.dbId || foodHit.id}`

  return '/app'
}

export default function Notifications() {
  const navigate = useNavigate()
  const { notifications, items = [], foods = [], markNotifRead, markAllNotifsRead } = useData()
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => uniqueNotifications(notifications), [notifications])

  const unreadCount = useMemo(
    () => list.filter((n) => !n.read).length,
    [list],
  )

  async function openNotif(n) {
    try {
      if (!n.read) await markNotifRead(n.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal update notifikasi')
    }
    navigate(pathForNotification(n, { items, foods }))
  }

  async function markAll() {
    setBusy(true)
    try {
      await markAllNotifsRead()
      toast.success('Semua sudah dibaca')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menandai')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifikasi"
        description="Update soal pinjam, makanan, donasi, pengumuman, dan tukar."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" disabled={busy} onClick={markAll}>
              Tandai semua dibaca
            </Button>
          ) : null
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sepi nih"
          description="Kalau ada yang chat, klaim, atau pinjam, muncul di sini."
        />
      ) : (
        <div className="stagger space-y-3">
          {list.map((n) => {
            const kind = kindFor(n)
            const Icon = kind.icon
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotif(n)}
                className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition hover:border-[var(--leaf)] ${
                  n.read
                    ? 'border-[var(--line)] bg-white'
                    : 'border-[var(--leaf)]/30 bg-[var(--mint)]/40'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--forest)] text-white">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {kind.label}
                      </p>
                      <h2 className="font-display text-lg font-semibold">{n.title}</h2>
                    </div>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--ember)]" />
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{n.body}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {formatTimeAgo(n.createdAt || n.time)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
