import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Leaf,
  MapPin,
  MessageCircle,
  QrCode,
  Sparkles,
  Star,
  Trees,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { campusApi } from '../../lib/api'
import {
  aiInsight,
  bringChecklist,
  computeAiMatch,
  eventBadges,
  eventStats,
  personalImpactReward,
  qrCheckinStatus,
  quotaProgress,
} from '../../lib/communityInsights'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

function formatWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function gcalDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function calendarLink(ev) {
  const start = gcalDate(ev.startsAt)
  if (!start) return null
  const end =
    gcalDate(ev.endsAt) ||
    gcalDate(new Date(new Date(ev.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString())
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title || 'Event kampus',
    dates: `${start}/${end}`,
    details: ev.description || '',
    location: ev.location || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-[var(--line)] bg-white p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-[var(--ink)]">
        {Icon && <Icon size={18} className="text-[var(--forest)]" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function CommunityEventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { borrows = [], foods = [] } = useData()
  const [ev, setEv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    campusApi
      .communityEvent(id)
      .then((data) => {
        if (!cancelled) setEv(data)
      })
      .catch(() => {
        if (!cancelled) setEv(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function toggleJoin() {
    if (!ev) return
    setBusy(true)
    try {
      if (ev.myStatus === 'registered') {
        const res = await campusApi.cancelEvent(ev.dbId || ev.id)
        setEv(res.data)
        toast.success('Pendaftaran dibatalkan')
      } else {
        const res = await campusApi.registerEvent(ev.dbId || ev.id)
        setEv(res.data)
        toast.success('Berhasil terdaftar')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[var(--muted)]">Memuat detail…</p>
      </div>
    )
  }

  if (!ev) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/app/community"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--forest)]"
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>
        <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-8 text-center text-sm text-[var(--muted)]">
          Event tidak ditemukan atau sudah ditutup.
        </p>
      </div>
    )
  }

  const registered = ev.myStatus === 'registered'
  const cal = calendarLink(ev)
  const badges = eventBadges(ev)
  const { registered: regCount, quota, pct } = quotaProgress(ev)
  const ai = computeAiMatch(ev, user, borrows, foods)
  const reward = personalImpactReward(ev)
  const checklist = bringChecklist(ev)
  const stats = eventStats(ev)
  const insight = aiInsight(ev)
  const qr = qrCheckinStatus(ev)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--forest)]"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-1 rounded-full bg-[#eef3f0] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)]"
          >
            {b.emoji} {b.label}
          </span>
        ))}
        {registered && <Badge tone="approved">Terdaftar</Badge>}
        {ev.status === 'closed' && <Badge tone="expired">Ditutup</Badge>}
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{ev.title}</h1>
        {ai.matchPercent >= 80 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--forest-deep)]">
            <Star size={15} className="fill-[var(--forest)] text-[var(--forest)]" />
            Direkomendasikan AI {ai.matchPercent}%
          </p>
        )}
        <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">{ev.description}</p>
      </div>

      {/* Meta */}
      <div className="grid gap-3 border-y border-[var(--line)] py-4 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <CalendarDays size={16} className="shrink-0 text-[var(--forest)]" />
          {formatWhen(ev.startsAt)}
          {ev.endsAt ? ` – ${formatWhen(ev.endsAt)}` : ''}
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={16} className="shrink-0 text-[var(--forest)]" />
          {ev.location || '—'}
        </p>
        <p className="flex items-center gap-2">
          <Building2 size={16} className="shrink-0 text-[var(--forest)]" />
          {ev.organizer || 'Lembaga kampus'}
        </p>
        <p className="flex items-center gap-2">
          <Users size={16} className="shrink-0 text-[var(--forest)]" />
          {regCount}/{quota} peserta · sisa {ev.spotsLeft}
        </p>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
          <span>
            {regCount} / {quota} peserta
          </span>
          <span className="font-semibold text-[var(--forest)]">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e8efe9]">
          <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* AI Recommendation */}
      <Section title="AI Recommendation" icon={Sparkles} className="border-[var(--leaf)]/30 bg-gradient-to-br from-[#e8f5ee] to-white">
        <p className="text-sm font-semibold text-[var(--forest-deep)]">
          Event ini cocok untukmu <span className="text-lg">{ai.matchPercent}%</span>
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">Karena kamu pernah:</p>
        <ul className="mt-2 space-y-1.5">
          {(ai.bullets || []).map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-[var(--ink)]">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--forest)]" />
              {line}
            </li>
          ))}
        </ul>
        {ai.reason && (
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{ai.reason}</p>
        )}
      </Section>

      {/* Personal impact */}
      <Section title="Dampak yang akan kamu berikan" icon={Leaf}>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Setelah mengikuti event ini kamu berpotensi menambah:
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-[#e8f5ee] px-3 py-3 text-center">
            <p className="font-display text-xl font-semibold text-[var(--forest-deep)]">
              +{reward.scorePoints}
            </p>
            <p className="text-[11px] font-medium text-[var(--muted)]">Sustainability Score</p>
          </div>
          <div className="rounded-xl bg-[#e8f5ee] px-3 py-3 text-center">
            <p className="font-display text-xl font-semibold text-[var(--forest-deep)]">
              +{reward.greenBadge}
            </p>
            <p className="text-[11px] font-medium text-[var(--muted)]">Green Badge</p>
          </div>
          <div className="rounded-xl bg-[#e8f5ee] px-3 py-3 text-center">
            <p className="font-display text-xl font-semibold text-[var(--forest-deep)]">
              ±{reward.wasteKg} kg
            </p>
            <p className="text-[11px] font-medium text-[var(--muted)]">Sampah terkurangi</p>
          </div>
        </div>
      </Section>

      {/* Stats */}
      <Section title="Dampak Event" icon={Trees}>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="flex items-center gap-2 text-[var(--ink)]">
            <Users size={15} className="text-[var(--forest)]" />
            {stats.participants} kuota peserta
          </li>
          <li className="flex items-center gap-2 text-[var(--ink)]">
            <Leaf size={15} className="text-[var(--forest)]" />
            Target ±{stats.targetWasteKg} kg sampah
          </li>
          {stats.areaHa != null && (
            <li className="flex items-center gap-2 text-[var(--ink)]">
              <Trees size={15} className="text-[var(--forest)]" />
              Area ±{stats.areaHa} hektar
            </li>
          )}
          <li className="flex items-center gap-2 text-[var(--ink)]">
            <Clock size={15} className="text-[var(--forest)]" />
            Durasi ±{stats.durationHours} jam
          </li>
        </ul>
      </Section>

      {/* AI Insight */}
      <Section title="AI Insight" icon={Sparkles} className="bg-[#f7faf8]">
        <p className="text-sm leading-relaxed text-[var(--ink)]">{insight}</p>
      </Section>

      {/* Checklist */}
      <Section title="Yang perlu dibawa">
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-[var(--ink)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8f5ee] text-[10px] font-bold text-[var(--forest)]">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* Status / CTA */}
      {registered ? (
        <div className="space-y-4 rounded-2xl border border-[var(--leaf)]/40 bg-[var(--mint)]/50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Status pendaftaran
            </p>
            <p className="mt-1 flex items-center gap-2 font-semibold text-[var(--forest-deep)]">
              <CheckCircle2 size={20} className="shrink-0 text-[var(--forest)]" />
              Kamu terdaftar sebagai peserta
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Datang ke {ev.location || 'lokasi'} · {formatWhen(ev.startsAt)}.
              {ev.organizer ? ` Panitia: ${ev.organizer}.` : ''}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white/90 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
              <QrCode size={16} />
              {qr.active ? 'QR Check-in aktif' : 'QR Check-in'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{qr.label}</p>
          </div>

          {ev.contactNote && (
            <p className="text-sm text-[var(--muted)]">{ev.contactNote}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {ev.whatsappUrl && (
              <a href={ev.whatsappUrl} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <MessageCircle size={16} />
                  Masuk Grup
                </Button>
              </a>
            )}
            {cal && (
              <a href={cal} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary">
                  <CalendarPlus size={16} />
                  Simpan Kalender
                </Button>
              </a>
            )}
            {qr.active && (
              <Link to="/app/community?tab=mine">
                <Button size="sm" variant="secondary">
                  <QrCode size={16} />
                  Lihat QR Check-in
                </Button>
              </Link>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={toggleJoin}>
              <X size={16} />
              Batalkan Pendaftaran
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
          <p className="text-sm text-[var(--muted)]">
            Daftar sekarang untuk mengunci kuota, masuk grup panitia, dan mendapatkan QR check-in
            menjelang acara.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={busy || ev.spotsLeft <= 0}
              onClick={toggleJoin}
            >
              {ev.spotsLeft <= 0 ? 'Penuh' : busy ? 'Sebentar…' : 'Daftar sebagai peserta'}
            </Button>
            {cal && (
              <a href={cal} target="_blank" rel="noreferrer">
                <Button size="lg" variant="secondary">
                  <CalendarPlus size={16} />
                  Simpan Kalender
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
