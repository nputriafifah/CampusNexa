import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Leaf,
  Package,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge, listingLabel, statusLabel } from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { formatCo2Avoided, formatKg } from '../../lib/format'

function money(n) {
  if (n == null) return '—'
  return `Rp ${Number(n).toLocaleString('id-ID')}`
}

export default function CampusAdminHome() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('week')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    campusApi
      .adminOverview()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err.response?.data?.message ||
          (err.response?.status === 401
            ? 'Sesi habis — login ulang sebagai admin kampus'
            : err.response?.status === 403
              ? 'Akses ditolak — akun ini bukan admin kampus'
              : err.code === 'ERR_NETWORK'
                ? 'Backend tidak terjangkau (cek php artisan serve di :8000)'
                : 'Gagal memuat ringkasan kampus')
        setError(msg)
        toast.error(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const s = data?.stats || {}
  const uniName = data?.university?.name || user?.university || 'Kampus'
  const recentItems = data?.recentItems || []
  const recentFoods = data?.recentFoods || []
  const recentEvents = data?.recentEvents || []
  const recentAnnouncements = data?.recentAnnouncements || []
  const itemsStuck = data?.attention?.itemsStuck || []
  const foodsExpiring = data?.attention?.foodsExpiring || []
  const foodsOverdue = data?.attention?.foodsOverdue || []
  const attentionCount = s.attentionCount ?? itemsStuck.length + foodsExpiring.length + foodsOverdue.length
  const pendingVolunteers = s.pendingVolunteerSignups ?? 0
  const report = data?.period?.[period] || {}
  const hasAttention = itemsStuck.length > 0 || foodsExpiring.length > 0 || foodsOverdue.length > 0

  const aiInsight = useMemo(() => {
    const parts = []
    if (itemsStuck.length > 0) {
      parts.push(
        `AI mendeteksi ${itemsStuck.length} listing kemungkinan macet`,
      )
    }
    const foodRisk = foodsExpiring.length + foodsOverdue.length
    if (foodRisk > 0) {
      parts.push(
        `memprediksi ${foodRisk} makanan berisiko terbuang hari ini`,
      )
    }
    if (parts.length === 0) return null
    if (parts.length === 1) return `${parts[0]}.`
    return `${parts[0]}; ${parts[1]}.`
  }, [itemsStuck.length, foodsExpiring.length, foodsOverdue.length])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Dashboard"
        description={`Ringkasan ${uniName}: mahasiswa, barang, makanan, komunitas, dampak.`}
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Memuat…</p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-6">
          <p className="text-sm text-amber-950">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-[var(--forest)] hover:underline"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <section className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/admin/campus/users"
              className="lift block rounded-2xl border border-[var(--line)] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Mahasiswa</p>
                <Users size={18} className="text-[var(--forest)]" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">
                {s.students ?? '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{s.organizations ?? 0} organisasi</p>
            </Link>

            <Link
              to="/admin/campus/items"
              className="lift block rounded-2xl border border-[var(--line)] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Barang</p>
                <Package size={18} className="text-[var(--forest)]" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">
                {s.items ?? '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{s.itemsAvailable ?? 0} tersedia</p>
            </Link>

            <Link
              to="/admin/campus/foods"
              className="lift block rounded-2xl border border-[var(--line)] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Makanan</p>
                <Utensils size={18} className="text-[var(--forest)]" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">
                {s.foods ?? '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{s.foodsAvailable ?? 0} tersedia</p>
            </Link>

            <Link
              to="/admin/campus/community"
              className="lift block rounded-2xl border border-[var(--line)] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Event</p>
                <CalendarDays size={18} className="text-[var(--forest)]" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">
                {s.events ?? '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{s.eventsOpen ?? 0} dibuka</p>
            </Link>

            <Link
              to="/admin/campus/community?tab=volunteer"
              className="lift block rounded-2xl border border-[var(--line)] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Relawan</p>
                <Users size={18} className="text-[var(--forest)]" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">
                {s.volunteers ?? '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {s.volunteersOpen ?? 0} dibuka
                {pendingVolunteers > 0 && (
                  <span className="ml-1.5 font-semibold text-amber-700">
                    · {pendingVolunteers} menunggu
                  </span>
                )}
              </p>
            </Link>

            <Link
              to="/admin/campus/impact"
              className="lift block rounded-2xl border border-[var(--line)] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted)]">Dampak</p>
                <Leaf size={18} className="text-[var(--forest)]" />
              </div>
              <p className="mt-2 font-display text-xl font-semibold leading-snug text-[var(--forest)] sm:text-2xl">
                {formatCo2Avoided(s.co2AvoidedKg)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {s.itemsSaved ?? 0} barang · {formatKg(s.wasteReducedKg)} limbah
              </p>
            </Link>
          </section>

          {hasAttention && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-[var(--forest)]/15 bg-[linear-gradient(135deg,#f3faf5_0%,#ffffff_55%)] px-5 py-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 shrink-0 text-[var(--forest)]" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--forest)]">
                      AI Monitoring
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink)]">{aiInsight}</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
                  Prioritas hari ini
                </h2>
                <p className="mt-1 text-sm text-amber-900">
                  {attentionCount} item membutuhkan tindakan admin
                </p>
              </div>

              {itemsStuck.length > 0 && (
                <AttentionPanel
                  title={`Listing macet (${itemsStuck.length})`}
                  subtitle='Masih berstatus "dipesan" lebih dari 3 hari.'
                  linkTo="/admin/campus/items"
                  linkLabel="Kelola listing"
                  tone="amber"
                >
                  {itemsStuck.slice(0, 4).map((row) => (
                    <AttentionRow
                      key={row.id}
                      title={row.title}
                      meta={`${row.owner || '—'} · ${row.location || '—'}`}
                    />
                  ))}
                </AttentionPanel>
              )}

              {foodsOverdue.length > 0 && (
                <AttentionPanel
                  title={`Makanan lewat batas ambil (${foodsOverdue.length})`}
                  subtitle="Masih terbuka tapi sudah lewat waktu pengambilan."
                  linkTo="/admin/campus/foods"
                  linkLabel="Kelola makanan"
                  tone="red"
                >
                  {foodsOverdue.slice(0, 4).map((row) => (
                    <AttentionRow
                      key={row.id}
                      title={row.title}
                      meta={`${row.location || '—'} · sisa ${row.remaining}/${row.quantity}`}
                    />
                  ))}
                </AttentionPanel>
              )}

              {foodsExpiring.length > 0 && (
                <AttentionPanel
                  title={`Makanan hampir habis (${foodsExpiring.length})`}
                  subtitle="Pengambilan dalam 24 jam ke depan."
                  linkTo="/admin/campus/foods"
                  linkLabel="Kelola makanan"
                  tone="amber"
                >
                  {foodsExpiring.slice(0, 4).map((row) => (
                    <AttentionRow
                      key={row.id}
                      title={row.title}
                      meta={`${row.location || '—'} · ambil ${formatPickup(row.pickupUntil)}`}
                    />
                  ))}
                </AttentionPanel>
              )}
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-3">
            <RecentPanel title="Makanan terbaru" linkTo="/admin/campus/foods" empty="Belum ada makanan.">
              {recentFoods.map((row) => (
                <RecentRow
                  key={row.id}
                  title={row.title}
                  meta={`${row.organization || '—'} · ${row.remaining}/${row.quantity} ${row.unit || ''}`}
                  badge={row.status}
                />
              ))}
            </RecentPanel>
            <RecentPanel title="Event terbaru" linkTo="/admin/campus/community" empty="Belum ada event.">
              {recentEvents.map((row) => (
                <RecentRow
                  key={row.id}
                  title={row.title}
                  meta={`${row.organizer || '—'} · ${row.registered}/${row.quota}`}
                  badge={row.status === 'closed' ? 'expired' : 'available'}
                  badgeLabel={row.status === 'closed' ? 'Ditutup' : 'Dibuka'}
                />
              ))}
            </RecentPanel>
            <RecentPanel
              title="Pengumuman terbaru"
              linkTo="/admin/campus/announcements"
              empty="Belum ada pengumuman."
            >
              {recentAnnouncements.map((row) => (
                <RecentRow
                  key={row.id}
                  title={row.title}
                  meta={row.publishedAt ? new Date(row.publishedAt).toLocaleString('id-ID') : 'Draft'}
                  badge={row.publishedAt ? 'approved' : 'pending'}
                  badgeLabel={row.publishedAt ? 'Tayang' : 'Draft'}
                />
              ))}
            </RecentPanel>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Laporan listing</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Aktivitas tukar, pinjam, donasi.</p>
              </div>
              <div className="flex gap-1.5">
                {[
                  { id: 'week', label: '7 hari' },
                  { id: 'month', label: '30 hari' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPeriod(tab.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      period === tab.id
                        ? 'bg-[var(--forest)] text-white'
                        : 'bg-[#f5f8f6] text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReportStat label="Listing baru" value={report.newListings ?? 0} />
              <ReportStat label="Selesai" value={report.closedListings ?? 0} />
              <ReportStat label="Barang terselamatkan" value={report.itemsSaved ?? 0} />
              <ReportStat label="Estimasi hemat" value={money(report.moneySaved)} />
            </div>
            <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
              <Breakdown label="Tukar / jual" value={s.itemsSell} />
              <Breakdown label="Pinjam" value={s.itemsBorrow} />
              <Breakdown label="Donasi" value={s.itemsDonate} />
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <h2 className="font-display text-base font-semibold">Listing terbaru</h2>
              <Link
                to="/admin/campus/items"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--forest)] hover:underline"
              >
                Semua
                <ArrowRight size={14} />
              </Link>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {recentItems.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  Belum ada listing.
                </li>
              )}
              {recentItems.map((item) => (
                <li key={item.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={item.listingType}>{listingLabel(item.listingType)}</Badge>
                    <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[var(--ink)]">{item.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.owner || '—'} · {item.location || '—'}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function formatPickup(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AttentionPanel({ title, subtitle, linkTo, linkLabel, tone, children }) {
  const styles =
    tone === 'red'
      ? 'border-red-200 bg-red-50/60 text-red-950'
      : 'border-amber-200 bg-amber-50/60 text-amber-950'
  const linkColor = tone === 'red' ? 'text-red-800' : 'text-amber-800'
  const iconColor = tone === 'red' ? 'text-red-700' : 'text-amber-700'

  return (
    <div className={`rounded-2xl border p-5 ${styles}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <Link to={linkTo} className={`text-sm font-semibold hover:underline ${linkColor}`}>
              {linkLabel}
            </Link>
          </div>
          <p className="mt-1 text-sm opacity-70">{subtitle}</p>
          <ul className="mt-3 space-y-1.5">{children}</ul>
        </div>
      </div>
    </div>
  )
}

function AttentionRow({ title, meta }) {
  return (
    <li className="rounded-lg bg-white/80 px-3 py-2 text-sm">
      <span className="font-medium">{title}</span>
      <span className="mt-0.5 block text-xs opacity-60">{meta}</span>
    </li>
  )
}

function RecentPanel({ title, linkTo, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--forest)] hover:underline"
        >
          Semua
          <ArrowRight size={12} />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {items.length === 0 ? (
          <li className="px-4 py-6 text-center text-xs text-[var(--muted)]">{empty}</li>
        ) : (
          items
        )}
      </ul>
    </section>
  )
}

function RecentRow({ title, meta, badge, badgeLabel }) {
  return (
    <li className="px-4 py-3">
      {badge && (
        <Badge tone={badge}>{badgeLabel || statusLabel(badge)}</Badge>
      )}
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{title}</p>
      <p className="text-xs text-[var(--muted)]">{meta}</p>
    </li>
  )
}

function ReportStat({ label, value }) {
  return (
    <div className="rounded-xl bg-[#f5f8f6] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function Breakdown({ label, value }) {
  return (
    <div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value ?? 0}</p>
    </div>
  )
}
