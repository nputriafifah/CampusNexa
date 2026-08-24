import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  CalendarPlus,
  Flame,
  Leaf,
  MapPin,
  QrCode,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { campusApi } from '../../lib/api'
import {
  calendarUrl,
  computeAiMatch,
  detectCategory,
  estimateImpact,
  filterByTime,
  formatCountdown,
  quotaProgress,
  rankRecommendations,
} from '../../lib/communityInsights'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs } from '../../components/ui/Tabs'

const TIME_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'today', label: 'Hari ini' },
  { id: 'week', label: 'Minggu ini' },
  { id: 'open', label: 'Masih buka' },
  { id: 'done', label: 'Selesai' },
]

function formatWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ProgressBar({ registered, quota, pct }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {registered} / {quota} peserta
        </span>
        <span className="font-semibold text-[var(--forest)]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e8efe9]">
        <div className="h-full rounded-full bg-[var(--forest)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CommunityCard({ item, kind, user, borrows, foods }) {
  const cat = detectCategory(item)
  const impact = estimateImpact(item)
  const { registered, quota, pct } = quotaProgress(item)
  const ai = computeAiMatch(item, user, borrows, foods)
  const href =
    kind === 'event'
      ? `/app/community/events/${item.dbId || item.id}`
      : `/app/community/volunteers/${item.dbId || item.id}`

  return (
    <Link
      to={href}
      className="lift group flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--forest)]"
    >
      <div className="flex flex-wrap gap-2">
        <Badge tone={kind === 'event' ? 'available' : 'borrow'}>
          {kind === 'event' ? 'Event' : 'Relawan'}
        </Badge>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f0] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink)]">
          {cat.emoji} {cat.label}
        </span>
        {ai.matchPercent >= 85 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
            <Sparkles size={11} />
            AI Match {ai.matchPercent}%
          </span>
        )}
        {ai.aiPick && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
            <Star size={11} />
            AI Picks
          </span>
        )}
        {ai.popular && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <Flame size={11} />
            Sedang populer
          </span>
        )}
        {item.myStatus === 'registered' && <Badge tone="approved">Terdaftar</Badge>}
        {item.myStatus === 'approved' && <Badge tone="approved">Diterima</Badge>}
        {item.myStatus === 'pending' && <Badge tone="pending">Menunggu</Badge>}
      </div>

      <div>
        <h3 className="font-display text-xl font-semibold group-hover:text-[var(--forest)]">
          {item.title}
        </h3>
        {ai.matchPercent >= 85 && ai.reason && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--forest)]">{ai.reason}</p>
        )}
        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.description}</p>
      </div>

      <ProgressBar registered={registered} quota={quota} pct={pct} />

      <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} /> {formatWhen(item.startsAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} /> {item.location || '—'}
        </span>
        {item.organizer && (
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} /> {item.organizer}
          </span>
        )}
      </div>

      <p className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-[11px] font-semibold text-[var(--forest-deep)]">
        <Leaf size={12} />
        Estimasi dampak: {impact.short}
      </p>

      <span className="text-sm font-semibold text-[var(--forest)]">Lihat detail →</span>
    </Link>
  )
}

function MineCard({ item, kind }) {
  const countdown = formatCountdown(item.startsAt)
  const href =
    kind === 'event'
      ? `/app/community/events/${item.dbId || item.id}`
      : `/app/community/volunteers/${item.dbId || item.id}`
  const showQr = countdown.hoursLeft != null && countdown.hoursLeft <= 24 && countdown.hoursLeft > 0

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {countdown.dayLabel && countdown.dayLabel !== 'Selesai' && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--forest)]">
              {countdown.dayLabel}
            </p>
          )}
          <Badge tone={item.myStatus === 'approved' ? 'approved' : item.myStatus === 'registered' ? 'approved' : 'pending'}>
            {kind === 'event' ? 'Event' : item.myStatus === 'approved' ? 'Relawan diterima' : 'Menunggu'}
          </Badge>
          <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatWhen(item.startsAt)} · {item.location}
          </p>
          {countdown.label && countdown.label !== 'Selesai' && (
            <p className="mt-1 text-sm font-semibold text-[var(--forest)]">{countdown.label}</p>
          )}
          {showQr && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--forest-deep)]">
              <QrCode size={14} />
              QR Check-in tersedia
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link to={href} className="text-sm font-semibold text-[var(--forest)] hover:underline">
            Buka detail →
          </Link>
          <a
            href={calendarUrl(item)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--forest)]"
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarPlus size={14} />
            Tambah ke Kalender
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CommunityAction() {
  const { user } = useAuth()
  const { borrows = [], foods = [] } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = ['event', 'volunteer', 'mine'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'event'
  const [events, setEvents] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')

  function setTab(next) {
    const params = new URLSearchParams(searchParams)
    if (next === 'event') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await campusApi.community()
      setEvents(data.events || [])
      setVolunteers(data.volunteers || [])
    } catch {
      setEvents([])
      setVolunteers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const myEvents = useMemo(
    () => events.filter((e) => e.myStatus === 'registered'),
    [events],
  )
  const myVolunteers = useMemo(
    () => volunteers.filter((v) => v.myStatus === 'pending' || v.myStatus === 'approved'),
    [volunteers],
  )
  const mineCount = myEvents.length + myVolunteers.length

  const activeList = tab === 'volunteer' ? volunteers : events
  const activeKind = tab === 'volunteer' ? 'volunteer' : 'event'

  const filteredList = useMemo(() => {
    let rows = filterByTime(activeList, timeFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.organizer?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q),
      )
    }
    return rows
  }, [activeList, timeFilter, query])

  const recommendations = useMemo(() => {
    if (tab === 'mine') return []
    const pool = tab === 'volunteer' ? volunteers : events
    return rankRecommendations(pool, user, borrows, foods, 3)
  }, [tab, events, volunteers, user, borrows, foods])

  const recReason = useMemo(() => {
    const impact = user?.impact || {}
    const parts = []
    if (Number(impact.foodRescuedKg || 0) > 0) parts.push('aktif di Food Rescue')
    if (Number(impact.itemsSaved || 0) > 0) parts.push('pernah berbagi barang')
    if (borrows.some((b) => ['approved', 'returned'].includes(b.status))) {
      parts.push('pernah meminjam alat kampus')
    }
    if (parts.length === 0) return 'Kamu peduli keberlanjutan kampus'
    return `Kamu ${parts.join(', ')}`
  }, [user, borrows])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Komunitas"
        description="Event dan relawan kampus — dengan rekomendasi AI sesuai aktivitasmu."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'event', label: 'Event' },
          { id: 'volunteer', label: 'Relawan' },
          { id: 'mine', label: mineCount > 0 ? `Ikutanku (${mineCount})` : 'Ikutanku' },
        ]}
      />

      {tab !== 'mine' && (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Cari event atau relawan..."
          />

          <div className="flex flex-wrap gap-2">
            {TIME_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTimeFilter(f.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  timeFilter === f.id
                    ? 'bg-[var(--forest)] text-white'
                    : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {recommendations.length > 0 && (
            <section className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#e8f5ee] to-white p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--forest)]" />
                <h2 className="font-display text-lg font-semibold">Rekomendasi AI untukmu</h2>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Karena {recReason}, AI merekomendasikan:
              </p>
              <ul className="mt-4 space-y-2">
                {recommendations.map(({ item, matchPercent, reason }) => (
                  <li key={item.id}>
                    <Link
                      to={
                        tab === 'volunteer'
                          ? `/app/community/volunteers/${item.dbId || item.id}`
                          : `/app/community/events/${item.dbId || item.id}`
                      }
                      className="flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 transition hover:border-[var(--forest)] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[var(--ink)]">
                          ✓ {item.title}{' '}
                          <span className="text-[var(--forest)]">({matchPercent}% cocok)</span>
                        </p>
                        <p className="text-xs text-[var(--muted)]">{reason}</p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--forest)]">Lihat →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Sebentar ya…</p>
      ) : tab === 'mine' ? (
        <div className="space-y-6">
          {mineCount === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ikut apa-apa"
              description="Belum ikut apa-apa. Coba daftar event atau relawan dulu."
              action={
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--forest)] hover:underline"
                  onClick={() => setTab('event')}
                >
                  Lihat event
                </button>
              }
            />
          ) : (
            <>
              {myEvents.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-display text-lg font-semibold">Event saya</h2>
                  {myEvents.map((ev) => (
                    <MineCard key={ev.id} item={ev} kind="event" />
                  ))}
                </div>
              )}
              {myVolunteers.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-display text-lg font-semibold">Relawan saya</h2>
                  {myVolunteers.map((v) => (
                    <MineCard key={v.id} item={v} kind="volunteer" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.length === 0 && (
            <EmptyState
              icon={tab === 'event' ? CalendarDays : Users}
              title={tab === 'event' ? 'Belum ada event' : 'Belum ada lowongan'}
              description="Coba ubah filter atau kata kunci pencarian."
            />
          )}
          {filteredList.map((item) => (
            <CommunityCard
              key={item.id}
              item={item}
              kind={activeKind}
              user={user}
              borrows={borrows}
              foods={foods}
            />
          ))}
        </div>
      )}
    </div>
  )
}
