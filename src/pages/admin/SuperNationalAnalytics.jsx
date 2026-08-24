import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CalendarDays,
  Leaf,
  Package,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { formatKg } from '../../lib/format'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { SearchBar } from '../../components/ui/SearchBar'

function money(n) {
  if (n == null) return '—'
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

function orgTypeLabel(type) {
  const map = { BEM: 'BEM', HIMA: 'HIMA', UKM: 'UKM', kantin: 'Kantin', other: 'Lainnya' }
  return map[type] || type || '—'
}

function uniStatusLabel(status) {
  return status === 'active' ? 'Aktif' : 'Nonaktif'
}

const SORT_OPTIONS = [
  { id: 'activityScore', label: 'Aktivitas' },
  { id: 'students', label: 'Mahasiswa' },
  { id: 'items', label: 'Barang' },
  { id: 'foods', label: 'Makanan' },
  { id: 'co2AvoidedKg', label: 'CO₂' },
]

export default function SuperNationalAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [period, setPeriod] = useState('week')
  const [tableQ, setTableQ] = useState('')
  const [sortBy, setSortBy] = useState('activityScore')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    campusApi
      .adminNationalAnalytics()
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err.response?.data?.message ||
          (err.code === 'ERR_NETWORK' ? 'Backend tidak terjangkau' : 'Gagal memuat analitik')
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

  const t = data?.totals || {}
  const report = data?.period?.[period] || {}
  const rankings = data?.rankings || {}
  const topCategories = data?.topCategories || []
  const topOrganizations = data?.topOrganizations || []
  const chartWeek = data?.weekly || []

  const treeEq = useMemo(() => {
    const co2 = Number(t.co2AvoidedKg || 0)
    return co2 > 0 ? Math.max(0, Math.round((co2 / 21) * 10) / 10) : 0
  }, [t.co2AvoidedKg])

  const maxCat = Math.max(...topCategories.map((c) => c.count || 0), 1)
  const maxOrg = Math.max(...topOrganizations.map((o) => o.total || 0), 1)
  const maxItems = Math.max(...chartWeek.map((d) => d.items || 0), 1)
  const maxFood = Math.max(...chartWeek.map((d) => d.food || 0), 1)

  const filteredUniversities = useMemo(() => {
    const rows = data?.byUniversity || []
    const q = tableQ.trim().toLowerCase()
    const filtered = q
      ? rows.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.code?.toLowerCase().includes(q) ||
            u.city?.toLowerCase().includes(q)
        )
      : rows
    return [...filtered].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
  }, [data?.byUniversity, tableQ, sortBy])

  const impactCards = [
    { label: 'Barang terselamatkan', value: t.itemsSaved ?? 0, icon: Package },
    { label: 'Makanan diselamatkan', value: formatKg(t.foodRescuedKg), icon: Utensils },
    { label: 'Limbah dihindari', value: formatKg(t.wasteReducedKg), icon: Leaf },
    {
      label: 'Estimasi CO₂ terhindari',
      value: `${formatKg(t.co2AvoidedKg, { unit: false })} kg`,
      hint: treeEq > 0 ? `≈ ${treeEq} pohon/tahun` : null,
      icon: TrendingUp,
    },
    { label: 'Estimasi hemat', value: money(t.moneySaved), icon: BarChart3 },
  ]

  const platformCards = [
    { label: 'Universitas', value: t.universities ?? 0, sub: `${t.campusAdmins ?? 0} admin kampus` },
    { label: 'Mahasiswa', value: t.students ?? 0, sub: 'Seluruh platform' },
    { label: 'Barang', value: t.items ?? 0, sub: 'Total listing' },
    { label: 'Makanan', value: t.foods ?? 0, sub: 'Total food rescue' },
    { label: 'Acara', value: t.events ?? 0, sub: 'Aksi komunitas' },
    { label: 'Relawan', value: t.volunteers ?? 0, sub: 'Lowongan relawan' },
  ]

  const rankingBlocks = [
    { title: 'Universitas paling aktif', rows: rankings.mostActive, valueKey: 'activityScore' },
    { title: 'Barang terbanyak', rows: rankings.mostItems, valueKey: 'items' },
    { title: 'Makanan terbanyak', rows: rankings.mostFoods, valueKey: 'foods' },
    { title: 'Acara terbanyak', rows: rankings.mostEvents, valueKey: 'events' },
    { title: 'Relawan terbanyak', rows: rankings.mostVolunteers, valueKey: 'volunteers' },
    {
      title: 'CO₂ terhindari terbanyak',
      rows: rankings.mostCo2,
      valueKey: 'co2AvoidedKg',
      format: (v) => `${formatKg(v, { unit: false })} kg`,
    },
    {
      title: 'Limbah dihindari terbanyak',
      rows: rankings.mostWasteReduced,
      valueKey: 'wasteReducedKg',
      format: (v) => formatKg(v),
    },
    {
      title: 'Makanan diselamatkan terbanyak',
      rows: rankings.mostFoodRescued,
      valueKey: 'foodRescuedKg',
      format: (v) => formatKg(v),
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Analitik Nasional"
        description="Perbandingan aktivitas dan dampak lintas universitas."
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
      ) : (t.universities ?? 0) === 0 ? (
        <section className="rounded-2xl border border-[var(--forest)]/30 bg-[#eef3f0] px-5 py-6">
          <h2 className="font-display text-lg font-semibold">Belum ada universitas</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Tambah universitas dan admin kampus untuk mulai melihat analitik nasional.
          </p>
          <Link
            to="/admin/super/universities"
            className="mt-4 inline-block text-sm font-semibold text-[var(--forest)] hover:underline"
          >
            Kelola universitas →
          </Link>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <SectionTitle icon={Leaf} title="Dampak keberlanjutan" subtitle="Akumulasi seluruh platform." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {impactCards.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              icon={Building2}
              title="Ringkasan platform"
              subtitle="Volume konten dan partisipasi lintas kampus."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {platformCards.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">{stat.value}</p>
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
                subtitle="Paling banyak diposting di seluruh platform."
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
                        {org.universityCode ? `${org.universityCode} · ` : ''}
                        {org.university || 'Kampus'} · {org.members} anggota · {org.items} barang ·{' '}
                        {org.foods} makanan
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <SectionTitle
              icon={TrendingUp}
              title="Tren minggu ini (nasional)"
              subtitle="Barang terselamatkan vs makanan (kg) per hari."
              compact
            />
            {chartWeek.length === 0 ? (
              <p className="mt-4 py-8 text-center text-sm text-[var(--muted)]">Belum ada data minggu ini.</p>
            ) : (
              <>
                <div className="relative mt-4 h-52">
                  <svg
                    viewBox="0 0 320 160"
                    className="h-full w-full"
                    role="img"
                    aria-label="Grafik dampak minggu ini nasional"
                  >
                    <defs>
                      <linearGradient id="nationalReuseFill" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#nationalReuseFill)"
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
                subtitle="Perbandingan aktivitas dan dampak nasional."
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
              <Mini label="CO₂ terhindari" value={`${formatKg(report.co2AvoidedKg, { unit: false })} kg`} />
              <Mini label="Estimasi hemat" value={money(report.moneySaved)} />
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="text-sm font-medium text-[var(--ink)]">Komposisi barang (total nasional)</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Breakdown label="Jual / tukar" value={t.itemsSell} />
                <Breakdown label="Pinjam" value={t.itemsBorrow} />
                <Breakdown label="Donasi" value={t.itemsDonate} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle
              icon={Users}
              title="Ranking universitas"
              subtitle="Top 5 per metrik — skor aktivitas = mahasiswa + barang + makanan + acara + relawan."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {rankingBlocks.map((block) => (
                <RankingBlock key={block.title} {...block} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Detail per universitas</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {filteredUniversities.length} kampus ditampilkan
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">Urutkan</span>
                  <select
                    className="border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <SearchBar
                  value={tableQ}
                  onChange={setTableQ}
                  placeholder="Cari kampus, kode, kota…"
                  className="min-w-[220px]"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Kampus</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Kota</th>
                    <th className="py-2 pr-4 font-medium">Mahasiswa</th>
                    <th className="py-2 pr-4 font-medium">Barang</th>
                    <th className="py-2 pr-4 font-medium">Makanan</th>
                    <th className="py-2 pr-4 font-medium">Acara</th>
                    <th className="py-2 pr-4 font-medium">Relawan</th>
                    <th className="py-2 pr-4 font-medium">Sampah ↓</th>
                    <th className="py-2 font-medium">CO₂</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUniversities.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-[var(--muted)]">
                        Tidak ada kampus yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredUniversities.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                        <td className="py-2.5 pr-4 font-medium">
                          {u.code} · {u.name}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={u.status === 'active' ? 'available' : 'expired'}>
                            {uniStatusLabel(u.status)}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-[var(--muted)]">{u.city || '—'}</td>
                        <td className="py-2.5 pr-4">{u.students}</td>
                        <td className="py-2.5 pr-4">{u.items}</td>
                        <td className="py-2.5 pr-4">{u.foods}</td>
                        <td className="py-2.5 pr-4">{u.events}</td>
                        <td className="py-2.5 pr-4">{u.volunteers}</td>
                        <td className="py-2.5 pr-4">{formatKg(u.wasteReducedKg)}</td>
                        <td className="py-2.5">{formatKg(u.co2AvoidedKg, { unit: false })} kg</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap gap-4 text-sm">
            <QuickLink to="/admin/super/universities" label="Kelola universitas" />
            <QuickLink to="/admin/super/admins" label="Kelola admin kampus" />
            <QuickLink to="/admin/super" label="Dashboard" />
          </div>
        </>
      )}
    </div>
  )
}

function RankingBlock({ title, rows = [], valueKey, format }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Belum ada data.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row, i) => (
            <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 font-semibold text-[var(--muted)]">{i + 1}.</span>
                {row.code} · {row.name}
              </span>
              <span className="shrink-0 font-semibold text-[var(--forest)]">
                {format ? format(row[valueKey]) : row[valueKey]}
              </span>
            </li>
          ))}
        </ul>
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
