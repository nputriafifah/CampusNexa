import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  HandHeart,
  Package,
  Shield,
  Sparkles,
  Tags,
  Users,
  Utensils,
  Leaf,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { formatKg } from '../../lib/format'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

function asList(value) {
  return Array.isArray(value) ? value : []
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SuperAdminHome() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    campusApi
      .adminNationalAnalytics()
      .then((payload) => {
        if (cancelled) return
        setData(payload && typeof payload === 'object' ? payload : null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err.response?.data?.message ||
            (err.code === 'ECONNABORTED'
              ? 'Timeout memuat statistik — coba lagi'
              : 'Gagal memuat dashboard'),
        )
        toast.error('Gagal memuat dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const t = data?.totals || {}
  const attention = data?.attention || {}
  const recent = data?.recent || {}
  const topActive = asList(data?.rankings?.mostActive).slice(0, 3)

  const withoutAdmin = asList(attention.universitiesWithoutAdmin)
  const inactiveUnis = asList(attention.inactiveUniversities)
  const attentionCount = withoutAdmin.length + inactiveUnis.length
  const recentUniversities = asList(recent.universities)
  const recentCampusAdmins = asList(recent.campusAdmins)

  const cards = [
    {
      label: 'Total universitas',
      value: t.universities ?? 0,
      icon: Building2,
      to: '/admin/super/universities',
      hint: 'Kelola universitas',
    },
    {
      label: 'Total admin kampus',
      value: t.campusAdmins ?? 0,
      icon: Shield,
      to: '/admin/super/admins',
      hint: 'Kelola admin',
    },
    {
      label: 'Total mahasiswa',
      value: t.students ?? 0,
      icon: Users,
      to: '/admin/super/analytics',
      hint: 'Lihat per kampus',
    },
    {
      label: 'Total resource',
      value: t.items ?? 0,
      icon: Package,
      to: '/admin/super/analytics',
      hint: 'Lihat per kampus',
    },
    {
      label: 'Total Food Rescue',
      value: t.foods ?? 0,
      icon: Utensils,
      to: '/admin/super/analytics',
      hint: 'Lihat per kampus',
    },
    {
      label: 'Total acara',
      value: t.events ?? 0,
      icon: CalendarDays,
      to: '/admin/super/analytics',
      hint: 'Lihat per kampus',
    },
    {
      label: 'Total relawan',
      value: t.volunteers ?? 0,
      icon: HandHeart,
      to: '/admin/super/analytics',
      hint: 'Lihat per kampus',
    },
  ]

  const quickLinks = [
    { to: '/admin/super/categories', label: 'Kelola Kategori', icon: Tags },
    { to: '/admin/super/ai-settings', label: 'Pengaturan AI', icon: Sparkles },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Dashboard"
        description="Statistik seluruh platform CampusNexa."
      />

      {loading ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
          Memuat…
        </p>
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
          {(t.universities ?? 0) === 0 && (
            <section className="rounded-2xl border border-[var(--forest)]/30 bg-[#eef3f0] px-5 py-6">
              <h2 className="font-display text-lg font-semibold">Belum ada universitas</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tambah universitas pertama, lalu buat admin kampus agar kampus bisa beroperasi.
              </p>
              <Link to="/admin/super/universities" className="mt-4 inline-block">
                <Button size="sm">Tambah universitas</Button>
              </Link>
            </section>
          )}

          {attentionCount > 0 && (
            <section className="space-y-3">
              <p className="text-sm font-medium text-amber-900">
                {attentionCount} hal perlu perhatian platform
              </p>

              {withoutAdmin.length > 0 && (
                <AttentionPanel
                  title={`Universitas tanpa admin (${withoutAdmin.length})`}
                  subtitle="Kampus belum bisa dioperasikan tanpa admin kampus."
                  linkTo="/admin/super/admins"
                  linkLabel="Buat admin"
                >
                  {withoutAdmin.slice(0, 4).map((row) => (
                    <AttentionRow
                      key={row.id}
                      title={`${row.code} · ${row.name}`}
                      meta={row.city || 'Kota belum diisi'}
                    />
                  ))}
                </AttentionPanel>
              )}

              {inactiveUnis.length > 0 && (
                <AttentionPanel
                  title={`Universitas nonaktif (${inactiveUnis.length})`}
                  subtitle="Kampus ini tidak aktif di platform."
                  linkTo="/admin/super/universities"
                  linkLabel="Kelola universitas"
                  tone="red"
                >
                  {inactiveUnis.slice(0, 4).map((row) => (
                    <AttentionRow
                      key={row.id}
                      title={`${row.code} · ${row.name}`}
                      meta="Status nonaktif"
                    />
                  ))}
                </AttentionPanel>
              )}
            </section>
          )}

          <section className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, to, hint }) => (
              <Link
                key={label}
                to={to}
                className="lift block rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--forest)]/30"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--muted)]">{label}</p>
                  <Icon size={18} className="text-[var(--ember)]" />
                </div>
                <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">{value}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{hint} →</p>
              </Link>
            ))}
          </section>

          <div className="flex flex-wrap gap-2">
            {quickLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--forest)] transition hover:border-[var(--forest)]/30"
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          {topActive.length > 0 && (
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Kampus paling aktif</h2>
                <Link
                  to="/admin/super/analytics"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--forest)] hover:underline"
                >
                  Analitik lengkap
                  <ArrowRight size={14} />
                </Link>
              </div>
              <ul className="mt-4 space-y-2">
                {topActive.map((row, i) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#f8faf9] px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="mr-2 font-semibold text-[var(--muted)]">{i + 1}.</span>
                      {row.code} · {row.name}
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--forest)]">
                      skor {row.activityScore}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <RecentPanel
              title="Universitas terbaru"
              linkTo="/admin/super/universities"
              empty="Belum ada universitas."
            >
              {(recentUniversities).map((row) => (
                <RecentRow
                  key={row.id}
                  title={`${row.code} · ${row.name}`}
                  meta={`${row.city || 'Kota belum diisi'} · ${formatDate(row.createdAt)}`}
                />
              ))}
            </RecentPanel>

            <RecentPanel
              title="Admin kampus terbaru"
              linkTo="/admin/super/admins"
              empty="Belum ada admin kampus."
            >
              {(recentCampusAdmins).map((row) => (
                <RecentRow
                  key={row.id}
                  title={row.name}
                  meta={`${row.code ? `${row.code} · ` : ''}${row.university || '—'} · ${formatDate(row.createdAt)}`}
                />
              ))}
            </RecentPanel>
          </div>

          <Link
            to="/admin/super/analytics"
            className="lift block rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-5 transition hover:border-[var(--forest)]/30"
          >
            <div className="flex items-center gap-2">
              <Leaf size={18} className="text-[var(--forest)]" />
              <h2 className="font-display text-lg font-semibold">Total dampak nasional</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ImpactStat label="Barang terselamatkan" value={t.itemsSaved ?? 0} />
              <ImpactStat label="Makanan diselamatkan" value={formatKg(t.foodRescuedKg)} />
              <ImpactStat label="Sampah dikurangi" value={formatKg(t.wasteReducedKg)} />
              <ImpactStat label="CO₂ dihemat" value={`${formatKg(t.co2AvoidedKg, { unit: false })} kg`} />
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--forest)]">Lihat analitik nasional →</p>
          </Link>
        </>
      )}
    </div>
  )
}

function ImpactStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function AttentionPanel({ title, subtitle, linkTo, linkLabel, tone = 'amber', children }) {
  const styles =
    tone === 'red'
      ? 'border-red-200 bg-red-50/70 text-red-950'
      : 'border-amber-200 bg-amber-50/70 text-amber-950'
  const linkColor = tone === 'red' ? 'text-red-800' : 'text-amber-800'

  return (
    <div className={`rounded-2xl border p-5 ${styles}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 opacity-80" />
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

function RecentRow({ title, meta }) {
  return (
    <li className="px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{meta}</p>
    </li>
  )
}
