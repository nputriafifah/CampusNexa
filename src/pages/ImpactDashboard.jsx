import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Leaf, Package, Utensils, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { campusApi } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatKg } from '../lib/format'

function formatIdDecimal(n) {
  const num = Math.round((Number(n) || 0) * 10) / 10
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 1,
  })
}

function relativeSyncLabel(iso) {
  if (!iso) return 'Sinkronisasi otomatis'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'Baru saja diperbarui'
  if (mins === 1) return 'Terakhir diperbarui 1 menit lalu'
  if (mins < 60) return `Terakhir diperbarui ${mins} menit lalu`
  return 'Sinkronisasi terakhir: hari ini'
}

const BADGES = [
  {
    id: 'first-reuse',
    label: 'Pemula hijau',
    desc: 'Barang pertama yang dipakai ulang',
    unlock: (p) => p.itemsSaved >= 1,
  },
  {
    id: 'food-hero',
    label: 'Anti-buang makanan',
    desc: 'Pernah ambil sisa makanan',
    unlock: (p) => p.foodRescuedKg >= 1,
  },
  {
    id: 'waste-warden',
    label: 'Anti-boros',
    desc: 'Hindari limbah ≥ 5 kg',
    unlock: (p) => p.wasteReducedKg >= 5,
  },
  {
    id: 'event-goer',
    label: 'Ikut event',
    desc: 'Pernah daftar event kampus',
    unlock: (_p, c) => c.events >= 1,
  },
  {
    id: 'volunteer',
    label: 'Relawan',
    desc: 'Pernah daftar jadi relawan',
    unlock: (_p, c) => c.volunteers >= 1,
  },
]

const TIPS = [
  {
    to: '/app/food',
    icon: Utensils,
    title: 'Ambil makanan sisa',
    desc: 'Dampak naik pas kamu klaim.',
  },
  {
    to: '/app/exchange?type=donate',
    icon: Package,
    title: 'Donasi atau pinjam',
    desc: 'Naik setelah serah terima / balik.',
  },
  {
    to: '/app/community',
    icon: Users,
    title: 'Ikut komunitas',
    desc: 'Event & relawan biar lencana kebuka.',
  },
]

export default function ImpactDashboard() {
  const { user, applyUser } = useAuth()
  const { campusImpact, weekly = [], notifications = [] } = useData()
  const [communityStats, setCommunityStats] = useState({ events: 0, volunteers: 0 })
  const [campus, setCampus] = useState(campusImpact)
  const [week, setWeek] = useState(weekly)
  const [personal, setPersonal] = useState(
    user?.impact || {
      itemsSaved: 0,
      foodRescuedKg: 0,
      wasteReducedKg: 0,
      moneySaved: 0,
    },
  )
  const [syncedAt, setSyncedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    campusApi
      .impact()
      .then((data) => {
        if (cancelled) return
        if (data.campus) setCampus(data.campus)
        if (Array.isArray(data.weekly)) setWeek(data.weekly)
        if (data.personal) {
          setPersonal(data.personal)
          if (applyUser && user) {
            applyUser({ ...user, impact: data.personal })
          }
        }
        if (data.community) {
          setCommunityStats({
            events: Number(data.community.eventsJoined || 0),
            volunteers: Number(data.community.volunteersJoined || 0),
          })
        }
        setSyncedAt(new Date().toISOString())
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (user?.impact) setPersonal(user.impact)
  }, [user?.impact])

  useEffect(() => {
    if (campusImpact) setCampus(campusImpact)
  }, [campusImpact])

  useEffect(() => {
    if (Array.isArray(weekly) && weekly.length) setWeek(weekly)
  }, [weekly])

  const co2Kg = useMemo(() => {
    const fromWaste = Number(personal.wasteReducedKg || 0) * 1.8
    const fromFood = Number(personal.foodRescuedKg || 0) * 2.5
    const fromItems = Number(personal.itemsSaved || 0) * 0.8
    return Math.round((fromWaste + fromFood + fromItems) * 10) / 10
  }, [personal])

  const treeEq = Math.max(0, Math.round((co2Kg / 21) * 10) / 10)

  const badges = useMemo(
    () =>
      BADGES.map((b) => ({
        ...b,
        unlocked: Boolean(b.unlock(personal, communityStats)),
      })),
    [personal, communityStats],
  )

  const unlockedCount = badges.filter((b) => b.unlocked).length
  const chartWeek = Array.isArray(week) ? week : []
  const maxItems = Math.max(...chartWeek.map((d) => d.items || 0), 1)
  const maxFood = Math.max(...chartWeek.map((d) => d.food || 0), 1)
  const chartMax = Math.max(maxItems, maxFood, 1)
  const recent = notifications.slice(0, 5)
  const plot = { left: 36, right: 344, top: 16, bottom: 132, width: 308, height: 116 }

  const personalEmpty =
    !personal.itemsSaved &&
    !personal.foodRescuedKg &&
    !personal.wasteReducedKg &&
    !personal.moneySaved &&
    !communityStats.events &&
    !communityStats.volunteers

  const campusData = campus || {
    itemsSaved: 0,
    foodRescuedKg: 0,
    wasteReducedKg: 0,
    moneySaved: 0,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Dampak"
        description="Ringkasan aksi kamu. Naik setelah transaksi selesai, bukan cuma upload."
      />
      <p className="-mt-4 text-sm italic text-[var(--muted)]">
        Estimasi dampak dihitung berdasarkan aktivitas transaksi dan Food Rescue menggunakan model
        perhitungan AI.
      </p>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Punyamu</h2>
          {!personalEmpty && co2Kg > 0 && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Estimasi dampak: {formatIdDecimal(co2Kg)} kg CO₂e dihindari
              {treeEq > 0 ? ` · setara ±${formatIdDecimal(treeEq)} pohon/tahun` : ''}.
            </p>
          )}
        </div>

        {personalEmpty ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-6">
            <p className="text-sm text-[var(--muted)]">Masih kosong. Mulai dari salah satu ini:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/app/food">
                <Button size="sm">Ambil makanan</Button>
              </Link>
              <Link to="/app/posting">
                <Button size="sm" variant="secondary">
                  Posting barang
                </Button>
              </Link>
              <Link to="/app/community">
                <Button size="sm" variant="secondary">
                  Ikut event
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Barang dipakai ulang', value: personal.itemsSaved || 0 },
              { label: 'Makanan diselamatkan', value: formatKg(personal.foodRescuedKg) },
              { label: 'Limbah dihindari', value: formatKg(personal.wasteReducedKg) },
              {
                label: 'Estimasi hemat',
                value: `Rp ${Number(personal.moneySaved || 0).toLocaleString('id-ID')}`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4"
              >
                <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
            <p className="text-sm text-[var(--muted)]">Event yang kamu ikut</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">
              {communityStats.events}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
            <p className="text-sm text-[var(--muted)]">Relawan</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">
              {communityStats.volunteers}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[var(--forest)]" />
            <h2 className="font-display text-xl font-semibold">Lencana</h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {unlockedCount}/{badges.length} kebuka
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl border p-4 ${
                b.unlocked
                  ? 'border-[var(--line)] bg-white'
                  : 'border-dashed border-[var(--line)] bg-[#eef3f0]/60 opacity-70'
              }`}
            >
              <Badge tone={b.unlocked ? 'available' : 'expired'}>
                {b.unlocked ? b.label : `Terkunci · ${b.label}`}
              </Badge>
              <p className="mt-2 text-sm text-[var(--muted)]">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Cara nambah</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIPS.map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--forest)]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--mint)] text-[var(--forest)]">
                <Icon size={18} />
              </span>
              <p className="mt-3 font-semibold group-hover:text-[var(--forest)]">{title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Leaf className="text-[var(--leaf)]" size={18} />
            <h2 className="font-display text-xl font-semibold">Minggu ini di kampus</h2>
          </div>

          {chartWeek.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">Belum ada data minggu ini.</p>
          ) : (
            <>
              <div className="relative h-56">
                <svg
                  viewBox="0 0 360 180"
                  className="h-full w-full"
                  role="img"
                  aria-label="Grafik barang dan makanan terselamatkan minggu ini"
                >
                  <defs>
                    <linearGradient id="reuseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f9e6b" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#2f9e6b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const y = plot.top + (i / 4) * plot.height
                    const value = Math.round(chartMax * (1 - i / 4))
                    return (
                      <g key={i}>
                        <line
                          x1={plot.left}
                          x2={plot.right}
                          y1={y}
                          y2={y}
                          stroke="#c5d4cb"
                          strokeWidth="1"
                        />
                        <text
                          x={plot.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill="#6b7c73"
                        >
                          {value}
                        </text>
                      </g>
                    )
                  })}
                  <line
                    x1={plot.left}
                    x2={plot.left}
                    y1={plot.top}
                    y2={plot.bottom}
                    stroke="#9bb3a4"
                    strokeWidth="1"
                  />
                  <line
                    x1={plot.left}
                    x2={plot.right}
                    y1={plot.bottom}
                    y2={plot.bottom}
                    stroke="#9bb3a4"
                    strokeWidth="1"
                  />
                  {(() => {
                    const n = Math.max(chartWeek.length - 1, 1)
                    const itemPts = chartWeek.map((d, i) => {
                      const x = plot.left + (i / n) * plot.width
                      const y = plot.bottom - ((d.items || 0) / chartMax) * plot.height
                      return { x, y, value: d.items || 0, day: d.day }
                    })
                    const foodPts = chartWeek.map((d, i) => {
                      const x = plot.left + (i / n) * plot.width
                      const y = plot.bottom - ((d.food || 0) / chartMax) * plot.height
                      return { x, y, value: d.food || 0 }
                    })
                    const fillPts = `${plot.left},${plot.bottom} ${itemPts
                      .map((p) => `${p.x},${p.y}`)
                      .join(' ')} ${plot.right},${plot.bottom}`
                    return (
                      <>
                        <polyline fill="url(#reuseFill)" stroke="none" points={fillPts} />
                        <polyline
                          fill="none"
                          stroke="#1b5e45"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={itemPts.map((p) => `${p.x},${p.y}`).join(' ')}
                        />
                        <polyline
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="2.5"
                          strokeDasharray="6 4"
                          strokeLinejoin="round"
                          points={foodPts.map((p) => `${p.x},${p.y}`).join(' ')}
                        />
                        {itemPts.map((p) => (
                          <circle key={`i-${p.day}`} cx={p.x} cy={p.y} r="3.2" fill="#1b5e45" />
                        ))}
                        {foodPts.map((p, i) => (
                          <circle key={`f-${i}`} cx={p.x} cy={p.y} r="3" fill="#d97706" />
                        ))}
                        {itemPts.map((p) => (
                          <text
                            key={`d-${p.day}`}
                            x={p.x}
                            y={168}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#6b7c73"
                          >
                            {p.day}
                          </text>
                        ))}
                      </>
                    )
                  })()}
                </svg>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-[var(--forest)]" /> Barang
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-[var(--ember)]" /> Makanan (kg)
                </span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Update terakhir</h2>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Belum ada update.</p>
            ) : (
              recent.map((n) => (
                <Link
                  key={n.id}
                  to={n.link || '/app/notifications'}
                  className="block rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-3 transition hover:border-[var(--forest)]"
                >
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">{n.body}</p>
                </Link>
              ))
            )}
          </div>
          {recent.length > 0 && (
            <Link
              to="/app/notifications"
              className="mt-4 inline-block text-sm font-semibold text-[var(--forest)] hover:underline"
            >
              Semua notifikasi
            </Link>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Kampusmu</h2>
        <p className="text-sm text-[var(--muted)]">Gabungan aksi mahasiswa di kampus yang sama.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Barang dipakai ulang',
              value: Number(campusData.itemsSaved || 0).toLocaleString('id-ID'),
            },
            { label: 'Makanan diselamatkan', value: formatKg(campusData.foodRescuedKg) },
            { label: 'Limbah dihindari', value: formatKg(campusData.wasteReducedKg) },
            {
              label: 'Estimasi hemat',
              value: `Rp ${(Number(campusData.moneySaved || 0) / 1_000_000).toFixed(1)}jt`,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4">
              <p className="text-sm text-[var(--muted)]">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--ink)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">{relativeSyncLabel(syncedAt)}</p>
      </section>
    </div>
  )
}
