import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  HandHeart,
  Leaf,
  Megaphone,
  MessageSquare,
  Package,
  Plus,
  Recycle,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { campusApi } from '../lib/api'
import { ItemCard } from '../components/ui/ItemCard'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Countdown } from '../components/ui/Countdown'
import { formatKg } from '../lib/format'
import { computeMatch } from '../lib/itemInsights'

const quickActions = [
  {
    label: 'Posting Barang',
    to: '/app/posting/barang',
    icon: Plus,
    tone: 'bg-[#cfe4d8] text-[#134232]',
  },
  {
    label: 'Food Rescue',
    to: '/app/food',
    icon: Utensils,
    tone: 'bg-[#efe0c4] text-[#7a4b0f]',
  },
  {
    label: 'Event',
    to: '/app/community',
    icon: CalendarDays,
    tone: 'bg-[#d5e4ef] text-[#1e3a5f]',
  },
  {
    label: 'Relawan',
    to: '/app/community',
    icon: HandHeart,
    tone: 'bg-[#ead5d5] text-[#6b2f2f]',
  },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function resolveSearchPath(raw) {
  const q = String(raw || '').trim().toLowerCase()
  if (!q) return '/app/exchange'
  if (/(makanan|food|rescue|sisa)/.test(q)) {
    return `/app/food`
  }
  if (/(event|relawan|volunteer|komunitas|aksi)/.test(q)) {
    return `/app/community`
  }
  return `/app/exchange?q=${encodeURIComponent(raw.trim())}`
}

function sustainabilityScore(impact = {}, borrowedCount = 0) {
  return Math.round(
    Number(impact.itemsSaved || 0) * 100 +
      Number(impact.foodRescuedKg || 0) * 40 +
      Number(impact.wasteReducedKg || 0) * 30 +
      borrowedCount * 50 +
      Number(impact.moneySaved || 0) / 100,
  )
}

export default function DashboardHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, foods, borrows, favorites = [], toggleFavorite } = useData()
  const uid = String(user?.id)
  const [communityPreview, setCommunityPreview] = useState({ events: [], volunteers: [] })
  const [announcements, setAnnouncements] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTasks, setShowAllTasks] = useState(false)
  const favSet = useMemo(() => new Set(favorites.map(String)), [favorites])

  function favKey(item) {
    return String(item.dbId ?? String(item.id || '').replace(/^i/, ''))
  }

  async function onToggleFav(item) {
    try {
      const nowFav = await toggleFavorite(item.dbId || item.id)
      toast.success(nowFav ? 'Masuk ke favorit' : 'Dihapus dari favorit')
    } catch (err) {
      toast.error(err?.message || 'Gagal nyimpan favorit')
    }
  }

  useEffect(() => {
    let cancelled = false
    campusApi
      .community()
      .then((data) => {
        if (cancelled) return
        setCommunityPreview({
          events: data.events || [],
          volunteers: data.volunteers || [],
        })
      })
      .catch(() => {})
    campusApi
      .announcements()
      .then((rows) => {
        if (!cancelled) setAnnouncements(rows || [])
      })
      .catch(() => {})
    campusApi
      .itemRecommendations()
      .then((rows) => {
        if (!cancelled) setRecommendations(rows || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const tasks = useMemo(() => {
    const list = []

    items.forEach((item) => {
      if (String(item.ownerId) === uid && Number(item.interestCount || 0) > 0) {
        if (['sell', 'exchange'].includes(item.listingType) && item.status === 'available') {
          list.push({
            id: `interest-${item.id}`,
            title: item.title,
            detail: `${item.interestCount} orang nanya — balas chatnya yuk`,
            action: 'Chat',
            to: `/app/exchange/${item.dbId || item.id}#item-chat`,
          })
        }
      }

      if (item.listingType !== 'donate') return
      if (item.status !== 'reserved' && item.status !== 'pending_handover') return

      if (String(item.ownerId) === uid) {
        list.push({
          id: `donate-owner-${item.id}`,
          title: item.title,
          detail: `${item.donationClaim?.claimerName || 'Seseorang'} mau ambil donasimu`,
          action: 'Chat',
          to: `/app/exchange/${item.dbId || item.id}#donation-chat`,
        })
      }

      if (String(item.donationClaim?.claimerId) === uid) {
        list.push({
          id: `donate-claim-${item.id}`,
          title: item.title,
          detail: `Chat ${item.owner} buat atur ambil · ${item.location || 'kampus'}`,
          action: 'Chat',
          to: `/app/exchange/${item.dbId || item.id}#donation-chat`,
        })
      }
    })

    borrows.forEach((b) => {
      if (String(b.ownerId) === uid && b.status === 'pending') {
        list.push({
          id: `borrow-in-${b.id}`,
          title: b.itemTitle || b.title || 'Permintaan pinjam',
          detail: 'Ada yang minta pinjam, perlu disetujui',
          action: 'Cek',
          to: '/app/borrow',
        })
      }
      if (String(b.borrowerId) === uid && b.status === 'approved') {
        list.push({
          id: `borrow-out-${b.id}`,
          title: b.itemTitle || b.title || 'Sedang dipinjam',
          detail: 'Jangan lupa dikembalikan ya',
          action: 'Lihat',
          to: '/app/borrow',
        })
      }
    })

    communityPreview.events.forEach((e) => {
      if (e.myStatus !== 'registered') return
      const ms = new Date(e.startsAt).getTime() - Date.now()
      if (ms < -6 * 60 * 60 * 1000) return
      const hours = Math.round(ms / (1000 * 60 * 60))
      list.push({
        id: `event-${e.id}`,
        title: e.title,
        detail:
          hours <= 0
            ? `Event hari ini · ${e.location || 'kampus'}`
            : hours < 48
              ? `Event dalam ~${hours} jam · ${e.location || 'kampus'}`
              : `Kamu terdaftar · ${e.location || 'kampus'}`,
        action: 'Detail',
        to: `/app/community/events/${e.dbId || e.id}`,
      })
    })

    communityPreview.volunteers.forEach((v) => {
      if (v.myStatus === 'pending') {
        list.push({
          id: `vol-pending-${v.id}`,
          title: v.title,
          detail: 'Menunggu konfirmasi panitia relawan',
          action: 'Cek',
          to: `/app/community/volunteers/${v.dbId || v.id}`,
        })
      }
      if (v.myStatus === 'approved') {
        list.push({
          id: `vol-ok-${v.id}`,
          title: v.title,
          detail: `Relawan diterima · ${v.location || 'kampus'}`,
          action: 'Detail',
          to: `/app/community/volunteers/${v.dbId || v.id}`,
        })
      }
    })

    return list
  }, [items, borrows, uid, communityPreview])

  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 5)

  const communityCards = useMemo(() => {
    const events = (communityPreview.events || [])
      .filter((e) => e.status !== 'cancelled' && e.myStatus !== 'registered')
      .slice(0, 3)
      .map((e) => ({
        id: `ev-${e.dbId || e.id}`,
        kind: 'Event',
        title: e.title,
        meta: e.location || 'Kampus',
        participants: e.registered ?? 0,
        participantsLabel: 'peserta',
        needed: e.spotsLeft ?? 0,
        neededLabel: 'kursi tersisa',
        cta: 'Daftar',
        to: `/app/community/events/${e.dbId || e.id}`,
      }))

    const volunteers = (communityPreview.volunteers || [])
      .filter((v) => !v.myStatus || v.myStatus === 'cancelled')
      .slice(0, 2)
      .map((v) => ({
        id: `vol-${v.dbId || v.id}`,
        kind: 'Relawan',
        title: v.title,
        meta: v.location || 'Kampus',
        participants: v.signedUp ?? 0,
        participantsLabel: 'terdaftar',
        needed: v.spotsLeft ?? 0,
        neededLabel: 'relawan dibutuhkan',
        cta: 'Daftar',
        to: `/app/community/volunteers/${v.dbId || v.id}`,
      }))

    return [...events, ...volunteers].slice(0, 4)
  }, [communityPreview])

  const availableItems = useMemo(
    () => items.filter((i) => i.status === 'available').slice(0, 4),
    [items],
  )

  const latestFoods = useMemo(() => {
    return foods
      .filter((f) => {
        if (f.status !== 'available') return false
        const expired = new Date(f.pickupUntil).getTime() < Date.now()
        const remaining = f.remaining ?? f.quantity
        return !expired && remaining > 0
      })
      .sort((a, b) => new Date(a.pickupUntil).getTime() - new Date(b.pickupUntil).getTime())
      .slice(0, 4)
  }, [foods])

  const matchContext = useMemo(
    () => ({ items, borrows, favorites }),
    [items, borrows, favorites],
  )

  const aiRecs = useMemo(() => {
    const scored = recommendations.map((item) => {
      const match = computeMatch(item, user, matchContext)
      return {
        ...item,
        matchPercent: match.percent,
        matchSummary: match.summary,
        aiRecommended: true,
      }
    })
    scored.sort((a, b) => Number(b.matchPercent || 0) - Number(a.matchPercent || 0))
    return scored
  }, [recommendations, user, matchContext])
  const topAi = aiRecs[0]

  const borrowedCount = borrows.filter(
    (b) => String(b.borrowerId) === uid && ['approved', 'returned'].includes(b.status),
  ).length

  const score = sustainabilityScore(user?.impact, borrowedCount)
  const monthActions =
    Number(user?.impact?.itemsSaved || 0) +
    Math.ceil(Number(user?.impact?.foodRescuedKg || 0)) +
    borrowedCount
  const monthGoal = 8
  const monthProgress = Math.min(100, Math.round((monthActions / monthGoal) * 100))

  const firstName = user?.name?.split(' ')[0] || 'teman'
  const faculty = user?.faculty ? `${user.university} · ${user.faculty}` : user?.university
  const studyHint = user?.studyProgram || user?.faculty || 'jurusanmu'

  function onSearch(e) {
    e.preventDefault()
    navigate(resolveSearchPath(searchQuery))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="fade-up">
        <p className="chip">{faculty || 'Kampus'}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Mau berbagi barang, menyelamatkan makanan, atau ikut aksi komunitas hari ini?
        </p>
      </section>

      <form onSubmit={onSearch} className="fade-up">
        <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(19,66,50,0.04)] transition focus-within:border-[var(--leaf)] focus-within:shadow-[0_0_0_3px_rgba(47,158,107,0.16)]">
          <Search size={18} className="shrink-0 text-[var(--muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari barang, makanan, event..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            aria-label="Cari di CampusNexa"
          />
          <Button type="submit" size="sm" className="shrink-0">
            Cari
          </Button>
        </label>
      </form>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map(({ label, to, icon: Icon, tone }) => (
          <Link
            key={label}
            to={to}
            className="lift flex flex-col items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--leaf)]"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
              <Icon size={18} />
            </span>
            <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
          </Link>
        ))}
      </section>

      {announcements.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-[var(--forest)]" />
              <h2 className="font-display text-lg font-semibold">Pengumuman kampus</h2>
            </div>
            <Link
              to="/app/announcements"
              className="text-sm font-semibold text-[var(--forest)] hover:underline"
            >
              Lihat semua ({announcements.length})
            </Link>
          </div>
          <ul className="mt-3 space-y-3">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
                <Link to={`/app/announcements#${a.id}`} className="group block">
                  <p className="text-xs text-[var(--muted)]">
                    {a.publishedAt
                      ? new Date(a.publishedAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                    {a.authorName ? ` · ${a.authorName}` : ''}
                  </p>
                  <p className="mt-0.5 font-semibold text-[var(--ink)] group-hover:text-[var(--forest)]">
                    {a.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{a.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Menunggu kamu</h2>
          {tasks.length > 5 && (
            <button
              type="button"
              className="text-sm font-semibold text-[var(--forest)] hover:underline"
              onClick={() => setShowAllTasks((v) => !v)}
            >
              {showAllTasks ? 'Tampilkan lebih sedikit' : `Lihat semua (${tasks.length})`}
            </button>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-5 text-sm text-[var(--muted)]">
            Belum ada yang perlu direspons. Santai dulu.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ink)]">{task.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{task.detail}</p>
                </div>
                <Link to={task.to} className="shrink-0">
                  <Button size="sm">
                    <MessageSquare size={14} />
                    {task.action}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(aiRecs.length > 0 || topAi) && (
        <section className="space-y-4">
          {topAi && (
            <Link
              to={`/app/exchange/${topAi.dbId || topAi.id}`}
              className="lift flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#e8f5ee] to-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">
                  <Sparkles size={14} />
                  AI Assistant
                </div>
                <p className="mt-2 font-display text-xl font-semibold text-[var(--ink)]">
                  Hari ini ada {aiRecs.length} barang yang cocok dengan {studyHint}.
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Highlight: <span className="font-semibold text-[var(--ink)]">{topAi.title}</span>
                  {topAi.matchPercent ? ` · ${topAi.matchPercent}% cocok` : ''}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--forest)]">Lihat →</span>
            </Link>
          )}

          {aiRecs.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[var(--forest)]" />
                  <h2 className="font-display text-xl font-semibold">Mungkin cocok buat kamu</h2>
                </div>
                <Link
                  to="/app/exchange"
                  className="text-sm font-semibold text-[var(--forest)] hover:underline"
                >
                  Semua
                </Link>
              </div>
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-semibold text-[var(--forest-deep)]">
                <Sparkles size={12} />
                Direkomendasikan AI
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {aiRecs.map((item) => (
                  <ItemCard
                    key={`ai-${item.id}`}
                    item={item}
                    to={`/app/exchange/${item.dbId || item.id}`}
                    isFavorite={favSet.has(favKey(item))}
                    onToggleFavorite={onToggleFav}
                    aiRecommended
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Food Rescue terbaru</h2>
            <p className="text-sm text-[var(--muted)]">Ambil sebelum kedaluwarsa</p>
          </div>
          <Link to="/app/food" className="text-sm font-semibold text-[var(--forest)] hover:underline">
            Semua
          </Link>
        </div>
        {latestFoods.length === 0 ? (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-6 text-sm text-[var(--muted)]">
            Belum ada makanan terbuka. Yuk posting sisa makanmu.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestFoods.map((food) => (
              <Link
                key={food.id}
                to={`/app/food/${food.dbId || food.id}`}
                className="lift surface flex flex-col overflow-hidden"
              >
                <img
                  src={food.image}
                  alt={food.title}
                  className="aspect-[4/3] object-cover"
                  loading="lazy"
                />
                <div className="space-y-2 p-4">
                  <Badge tone="available">Makanan</Badge>
                  <h3 className="font-display text-lg font-semibold">{food.title}</h3>
                  <p className="text-sm text-[var(--muted)]">{food.location}</p>
                  <Countdown until={food.pickupUntil} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[var(--forest)]" />
            <h2 className="font-display text-xl font-semibold">Aksi komunitas</h2>
          </div>
          <Link
            to="/app/community"
            className="text-sm font-semibold text-[var(--forest)] hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        {communityCards.length === 0 ? (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-6 text-sm text-[var(--muted)]">
            Belum ada aksi komunitas terbuka. Cek lagi nanti.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {communityCards.map((row) => (
              <div
                key={row.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-white p-5"
              >
                <div>
                  <Badge tone="available">{row.kind}</Badge>
                  <h3 className="mt-3 font-display text-lg font-semibold text-[var(--ink)]">
                    {row.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{row.meta}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="font-semibold text-[var(--ink)]">
                      {row.participants} {row.participantsLabel}
                    </span>
                    <span className="text-[var(--muted)]">
                      {row.needed} {row.neededLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-5">
                  <Link to={row.to}>
                    <Button size="sm">{row.cta}</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Dampakmu</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Naik setelah barang laku / diklaim / diserahkan, bukan cuma upload.
            </p>
          </div>
          <Link to="/app/impact" className="text-sm font-semibold text-[var(--forest)] hover:underline">
            Detail dampak
          </Link>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cfe4d8] text-[#134232]">
                <Leaf size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forest)]">
                  Skor keberlanjutan
                </p>
                <p className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
                  {score.toLocaleString('id-ID')}{' '}
                  <span className="text-base font-medium text-[var(--muted)]">poin</span>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--ink)]">Progress bulan ini</p>
              <p className="text-sm font-semibold text-[var(--forest)]">{monthProgress}%</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e8efe9]">
              <div
                className="h-full rounded-full bg-[var(--forest)] transition-all"
                style={{ width: `${monthProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {monthActions}/{monthGoal} aksi menuju target bulanan
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Barang dipakai ulang',
              value: user?.impact?.itemsSaved ?? 0,
              icon: Recycle,
              tone: 'bg-[#cfe4d8] text-[#134232]',
            },
            {
              label: 'Makanan diselamatkan',
              value: formatKg(user?.impact?.foodRescuedKg),
              icon: Utensils,
              tone: 'bg-[#efe0c4] text-[#7a4b0f]',
            },
            {
              label: 'Barang dipinjam',
              value: borrowedCount,
              icon: ShoppingBag,
              tone: 'bg-[#d5e4ef] text-[#1e3a5f]',
            },
            {
              label: 'Limbah dihindari',
              value: formatKg(user?.impact?.wasteReducedKg),
              icon: Package,
              tone: 'bg-[#d9ebe2] text-[#134232]',
            },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="surface-soft p-5">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={18} />
              </div>
              <p className="font-display text-3xl font-semibold text-[var(--ink)]">{value}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Barang terbaru</h2>
            <p className="text-sm text-[var(--muted)]">Yang lagi tersedia di kampus</p>
          </div>
          <Link to="/app/exchange" className="text-sm font-semibold text-[var(--forest)] hover:underline">
            Semua
          </Link>
        </div>

        {availableItems.length === 0 ? (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-8 text-center text-sm text-[var(--muted)]">
            Masih kosong. Posting barang pertama kamu?
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {availableItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                to={`/app/exchange/${item.dbId || item.id}`}
                isFavorite={favSet.has(favKey(item))}
                onToggleFavorite={onToggleFav}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
