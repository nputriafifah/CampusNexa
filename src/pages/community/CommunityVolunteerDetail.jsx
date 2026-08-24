import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Leaf,
  MapPin,
  MessageCircle,
  QrCode,
  Sparkles,
  Star,
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

export default function CommunityVolunteerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { borrows = [], foods = [] } = useData()
  const [v, setV] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    campusApi
      .communityVolunteer(id)
      .then((data) => {
        if (!cancelled) setV(data)
      })
      .catch(() => {
        if (!cancelled) setV(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function toggleJoin() {
    if (!v) return
    setBusy(true)
    try {
      if (v.myStatus === 'pending' || v.myStatus === 'approved') {
        const res = await campusApi.cancelVolunteer(v.dbId || v.id)
        setV(res.data)
        toast.success('Pendaftaran dibatalkan')
      } else {
        const res = await campusApi.signupVolunteer(v.dbId || v.id)
        setV(res.data)
        toast.success('Pendaftaran masuk')
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

  if (!v) {
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
          Lowongan relawan tidak ditemukan atau sudah ditutup.
        </p>
      </div>
    )
  }

  const pending = v.myStatus === 'pending'
  const approved = v.myStatus === 'approved'
  const joined = pending || approved
  const badges = eventBadges(v)
  const { registered: regCount, quota, pct } = quotaProgress(v)
  const ai = computeAiMatch(v, user, borrows, foods)
  const reward = personalImpactReward(v)
  const checklist = bringChecklist(v)
  const insight = aiInsight(v)
  const qr = qrCheckinStatus(v)

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

      <div className="flex flex-wrap gap-2">
        <Badge tone="borrow">Relawan</Badge>
        {badges.map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-1 rounded-full bg-[#eef3f0] px-2.5 py-1 text-[11px] font-semibold"
          >
            {b.emoji} {b.label}
          </span>
        ))}
        {approved && <Badge tone="approved">Diterima</Badge>}
        {pending && <Badge tone="pending">Menunggu</Badge>}
        {v.status === 'closed' && <Badge tone="expired">Ditutup</Badge>}
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{v.title}</h1>
        {ai.matchPercent >= 80 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--forest-deep)]">
            <Star size={15} className="fill-[var(--forest)] text-[var(--forest)]" />
            Direkomendasikan AI {ai.matchPercent}%
          </p>
        )}
        <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">{v.description}</p>
      </div>

      <div className="grid gap-3 border-y border-[var(--line)] py-4 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--forest)]" />
          {formatWhen(v.startsAt)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={16} className="text-[var(--forest)]" />
          {v.location || '—'}
        </p>
        <p className="flex items-center gap-2">
          <Building2 size={16} className="text-[var(--forest)]" />
          {v.organizer || 'Lembaga kampus'}
        </p>
        <p className="flex items-center gap-2">
          <Users size={16} className="text-[var(--forest)]" />
          {v.signedUp}/{v.quota} daftar · sisa {v.spotsLeft}
        </p>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
          <span>
            {regCount} / {quota} relawan
          </span>
          <span className="font-semibold text-[var(--forest)]">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e8efe9]">
          <div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Section
        title="AI Recommendation"
        icon={Sparkles}
        className="border-[var(--leaf)]/30 bg-gradient-to-br from-[#e8f5ee] to-white"
      >
        <p className="text-sm font-semibold text-[var(--forest-deep)]">
          Lowongan ini cocok untukmu <span className="text-lg">{ai.matchPercent}%</span>
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">Karena kamu pernah:</p>
        <ul className="mt-2 space-y-1.5">
          {(ai.bullets || []).map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--forest)]" />
              {line}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Dampak yang akan kamu berikan" icon={Leaf}>
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

      <Section title="AI Insight" icon={Sparkles} className="bg-[#f7faf8]">
        <p className="text-sm leading-relaxed">{insight}</p>
      </Section>

      <Section title="Yang perlu dibawa">
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8f5ee] text-[10px] font-bold text-[var(--forest)]">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {joined ? (
        <div className="space-y-4 rounded-2xl border border-[var(--leaf)]/40 bg-[var(--mint)]/50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Status pendaftaran
            </p>
            <p className="mt-1 flex items-center gap-2 font-semibold text-[var(--forest-deep)]">
              {approved ? (
                <CheckCircle2 size={20} className="text-[var(--forest)]" />
              ) : (
                <Clock size={20} className="text-[var(--forest)]" />
              )}
              {approved
                ? 'Kamu diterima sebagai relawan'
                : 'Menunggu konfirmasi panitia'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {approved
                ? `Siap di ${v.location || 'lokasi'} · ${formatWhen(v.startsAt)}.`
                : 'Panitia akan meninjau pendaftaranmu. Status berubah jadi diterima jika lolos.'}
            </p>
          </div>

          {approved && (
            <div className="rounded-xl border border-[var(--line)] bg-white/90 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
                <QrCode size={16} />
                {qr.active ? 'QR Check-in aktif' : 'QR Check-in'}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{qr.label}</p>
            </div>
          )}

          {v.contactNote && <p className="text-sm text-[var(--muted)]">{v.contactNote}</p>}

          <div className="flex flex-wrap gap-2">
            {v.whatsappUrl && (
              <a href={v.whatsappUrl} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <MessageCircle size={16} />
                  {v.whatsappUrl.includes('wa.me') ? 'Chat CP' : 'Masuk Grup'}
                </Button>
              </a>
            )}
            {qr.active && approved && (
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
            Daftar dulu — biasanya menunggu dicek panitia sebelum diterima final.
          </p>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={busy || v.spotsLeft <= 0}
            onClick={toggleJoin}
          >
            {v.spotsLeft <= 0 ? 'Penuh' : busy ? 'Sebentar…' : 'Daftar sebagai relawan'}
          </Button>
        </div>
      )}
    </div>
  )
}
