import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Leaf,
  Package,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { formatCo2Avoided, formatKg } from '../../lib/format'

function money(n) {
  if (n == null) return '—'
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

function orgTypeLabel(type) {
  const map = {
    BEM: 'BEM',
    HIMA: 'HIMA',
    UKM: 'UKM',
    kantin: 'Kantin',
    other: 'Lainnya',
  }
  return map[type] || type || '—'
}

export default function CampusImpact() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [weekly, setWeekly] = useState([])
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([campusApi.adminOverview(), campusApi.impact()])
      .then(([overview, impact]) => {
        if (cancelled) return
        setData(overview)
        setWeekly(Array.isArray(impact?.weekly) ? impact.weekly : [])
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err.response?.data?.message ||
          (err.code === 'ERR_NETWORK'
            ? 'Backend tidak terjangkau'
            : 'Gagal memuat analitik kampus')
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
  const report = data?.period?.[period] || {}
  const topCategories = data?.topCategories || []
  const topOrganizations = data?.topOrganizations || []
  const uniName = data?.university?.name || user?.university || 'Kampus'
  const maxCat = Math.max(...topCategories.map((c) => c.count || 0), 1)
  const maxOrg = Math.max(...topOrganizations.map((o) => o.total || 0), 1)

  const treeEq = useMemo(() => {
    const co2 = Number(s.co2AvoidedKg || 0)
    return co2 > 0 ? Math.max(0, Math.round((co2 / 21) * 10) / 10) : 0
  }, [s.co2AvoidedKg])

  const chartWeek = weekly
  const maxItems = Math.max(...chartWeek.map((d) => d.items || 0), 1)
  const maxFood = Math.max(...chartWeek.map((d) => d.food || 0), 1)

  const impactCards = [
    { label: 'Barang terselamatkan', value: s.itemsSaved ?? 0, icon: Package },
    { label: 'Makanan diselamatkan', value: formatKg(s.foodRescuedKg), icon: Utensils },
    { label: 'Limbah dihindari', value: formatKg(s.wasteReducedKg), icon: Leaf },
    {
      label: 'Estimasi CO₂e dihindari',
      value: formatCo2Avoided(s.co2AvoidedKg).replace(' dihindari', ''),
      hint: treeEq > 0 ? `≈ ${treeEq} pohon/tahun` : null,
      icon: TrendingUp,
    },
    { label: 'Estimasi hemat', value: money(s.moneySaved), icon: BarChart3 },
  ]

  const platformCards = [
    { label: 'Mahasiswa', value: s.students ?? 0, sub: `${s.organizations ?? 0} penyelenggara` },
    { label: 'Barang', value: s.items ?? 0, sub: `${s.itemsAvailable ?? 0} tersedia` },
    { label: 'Makanan', value: s.foods ?? 0, sub: `${s.foodsAvailable ?? 0} terbuka` },
    { label: 'Acara', value: s.events ?? 0, sub: `${s.eventsOpen ?? 0} terbuka` },
    {
      label: 'Relawan',
      value: s.volunteers ?? 0,
      sub:
        (s.pendingVolunteerSignups ?? 0) > 0
          ? `${s.volunteersOpen ?? 0} terbuka · ${s.pendingVolunteerSignups} menunggu`
          : `${s.volunteersOpen ?? 0} terbuka`,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Analitik Kampus"
        description={`Dampak keberlanjutan dan aktivitas platform di ${uniName}.`}
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
          <section className="space-y-3">
            <SectionTitle icon={Leaf} title="Dampak keberlanjutan" subtitle="Akumulasi sejak awal." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {impactCards.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={Users}
              title="Ringkasan platform"
              subtitle="Volume konten dan partisipasi kampus."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {platformCards.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--line)] bg-white p-4"
                >
                  <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{stat.sub}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <SectionTitle
                icon={BarChart3}
                title="Kategori barang terpopuler"
                subtitle="Paling banyak diposting mahasiswa."
                compact
              />
              {topCategories.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">Belum ada data kategori.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {topCategories.map((cat) => (
                    <li key={cat.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-[var(--muted)]">{cat.count} posting</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e8efea]">
                        <div
                          className="h-full rounded-full bg-[var(--forest)] transition-all"
                          style={{ width: `${Math.round((cat.count / maxCat) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <SectionTitle
                icon={CalendarDays}
                title="Penyelenggara paling aktif"
                subtitle="Gabungan anggota, barang, makanan, acara, dan relawan."
                compact
              />
              {topOrganizations.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">Belum ada penyelenggara.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {topOrganizations.map((org) => (
                    <li key={org.id}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="font-medium">
                          {org.name}
                          <span className="ml-1.5 font-normal text-[var(--muted)]">
                            ({orgTypeLabel(org.type)})
                          </span>
                        </span>
                        <span className="shrink-0 text-[var(--muted)]">{org.total} aktivitas</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#e8efea]">
                        <div
                          className="h-full rounded-full bg-[var(--leaf)] transition-all"
                          style={{ width: `${Math.round((org.total / maxOrg) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {org.members} anggota · {org.items} barang · {org.foods} makanan ·{' '}
                        {org.events} acara · {org.volunteers} relawan
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/admin/campus/organizations"
                className="mt-4 inline-block text-sm font-semibold text-[var(--forest)] hover:underline"
              >
                Kelola penyelenggara →
              </Link>
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <SectionTitle
              icon={TrendingUp}
              title="Tren minggu ini"
              subtitle="Barang terselamatkan vs makanan (kg) per hari."
              compact
            />
            {chartWeek.length === 0 ? (
              <p className="mt-4 py-8 text-center text-sm text-[var(--muted)]">
                Belum ada data minggu ini.
              </p>
            ) : (
              <>
                <div className="relative mt-4 h-52">
                  <svg
                    viewBox="0 0 320 160"
                    className="h-full w-full"
                    role="img"
                    aria-label="Grafik dampak minggu ini di kampus"
                  >
                    <defs>
                      <linearGradient id="campusReuseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f9e6b" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2f9e6b" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((i) => (
                      <line
                        key={i}
                        x1="0"
                        x2="320"
                        y1={20 + i * 35}
                        y2={20 + i * 35}
                        stroke="#c5d4cb"
                        strokeWidth="1"
                      />
                    ))}
                    <polyline
                      fill="url(#campusReuseFill)"
                      stroke="none"
                      points={`0,160 ${chartWeek
                        .map((d, i) => {
                          const x = (i / Math.max(chartWeek.length - 1, 1)) * 320
                          const y = 150 - ((d.items || 0) / maxItems) * 120
                          return `${x},${y}`
                        })
                        .join(' ')} 320,160`}
                    />
                    <polyline
                      fill="none"
                      stroke="#1b5e45"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={chartWeek
                        .map((d, i) => {
                          const x = (i / Math.max(chartWeek.length - 1, 1)) * 320
                          const y = 150 - ((d.items || 0) / maxItems) * 120
                          return `${x},${y}`
                        })
                        .join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      strokeLinejoin="round"
                      points={chartWeek
                        .map((d, i) => {
                          const x = (i / Math.max(chartWeek.length - 1, 1)) * 320
                          const y = 150 - ((d.food || 0) / maxFood) * 120
                          return `${x},${y}`
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>
                <div className="mt-2 flex justify-between px-1 text-xs text-[var(--muted)]">
                  {chartWeek.map((d) => (
                    <span key={d.day}>{d.day}</span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-[#1b5e45]" />
                    Barang terselamatkan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded border-b-2 border-dashed border-[#d97706]" />
                    Makanan (kg)
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                icon={BarChart3}
                title="Laporan periode"
                subtitle="Perbandingan aktivitas dan dampak."
                compact
              />
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
              <Mini label="Barang baru" value={report.newListings ?? 0} />
              <Mini label="Makanan baru" value={report.newFoods ?? 0} />
              <Mini label="Acara baru" value={report.newEvents ?? 0} />
              <Mini label="Lowongan relawan baru" value={report.newVolunteers ?? 0} />
              <Mini label="Barang selesai" value={report.closedListings ?? 0} />
              <Mini label="Barang terselamatkan" value={report.itemsSaved ?? 0} />
              <Mini label="Makanan diselamatkan" value={formatKg(report.foodRescuedKg)} />
              <Mini label="Limbah dihindari" value={formatKg(report.wasteReducedKg)} />
              <Mini
                label="CO₂e dihindari"
                value={formatCo2Avoided(report.co2AvoidedKg).replace(' dihindari', '')}
              />
              <Mini label="Estimasi hemat" value={money(report.moneySaved)} />
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="text-sm font-medium text-[var(--ink)]">Komposisi barang (total)</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Breakdown label="Jual / tukar" value={s.itemsSell} />
                <Breakdown label="Pinjam" value={s.itemsBorrow} />
                <Breakdown label="Donasi" value={s.itemsDonate} />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-4 text-sm">
            <QuickLink to="/admin/campus/items" label="Kelola barang" />
            <QuickLink to="/admin/campus/foods" label="Kelola makanan" />
            <QuickLink to="/admin/campus/community" label="Aksi komunitas" />
            <QuickLink to="/admin/campus/users" label="Kelola mahasiswa" />
          </div>
        </>
      )}
    </div>
  )
}

function SectionTitle({ icon: Icon, title, subtitle, compact = false }) {
  return (
    <div className={compact ? '' : 'px-0.5'}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} className="text-[var(--forest)]" />}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        {Icon && <Icon size={16} className="text-[var(--forest)]" />}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-[var(--forest)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl bg-[#f5f8f6] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function Breakdown({ label, value }) {
  return (
    <div className="rounded-xl bg-[#f5f8f6] px-4 py-3">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value ?? 0}</p>
    </div>
  )
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="font-semibold text-[var(--forest)] hover:underline">
      {label} →
    </Link>
  )
}
