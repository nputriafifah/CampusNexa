import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, MapPin, Plus, Sparkles, Utensils } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import {
  computeFoodRecommendation,
  computeFreshness,
  computePriority,
  detectFoodSource,
  estimateFoodImpact,
  rankFoodRecommendations,
} from '../../lib/foodInsights'
import { Badge, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Countdown } from '../../components/ui/Countdown'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'

const scopes = [
  { id: 'browse', label: 'Jelajahi' },
  { id: 'mine', label: 'Ambilanku' },
  { id: 'posted', label: 'Yang kuposting' },
]

function foodPath(food) {
  return `/app/food/${food.dbId || food.id}`
}

function isFoodOpen(f) {
  if (f.status !== 'available') return false
  const expired = new Date(f.pickupUntil).getTime() < Date.now()
  const remaining = f.remaining ?? f.quantity
  return !expired && remaining > 0
}

function FoodCard({ food, uid, user, foods }) {
  const remaining = food.remaining ?? food.quantity
  const myClaims = food.claimedBy?.[uid] || food.myClaims || 0
  const maxPer = food.maxClaimPerUser ?? 2
  const freshness = computeFreshness(food)
  const priority = computePriority(food)
  const impact = estimateFoodImpact(food)
  const source = detectFoodSource(food)
  const rec = computeFoodRecommendation(food, user, foods)

  return (
    <Link
      to={foodPath(food)}
      className="group lift flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white transition hover:border-[var(--forest)]"
    >
      <div className="relative">
        <img
          src={food.image}
          alt={food.title}
          className="aspect-[16/10] w-full object-cover"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone={food.status}>{statusLabel(food.status)}</Badge>
          {priority.urgent && (
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              Segera ambil
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
            <Sparkles size={11} />
            AI Freshness {freshness.percent}%
          </span>
          {priority.urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              AI Priority
            </span>
          )}
          {rec.recommended && rec.matchPercent >= 85 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
              Direkomendasikan
            </span>
          )}
        </div>

        <h2 className="font-display text-xl font-semibold group-hover:text-[var(--forest)]">
          {food.title}
        </h2>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {source.emoji} Food Rescue dari {source.label}
          {source.detail && source.detail !== source.label ? (
            <span className="font-normal normal-case tracking-normal"> · {source.detail}</span>
          ) : null}
        </p>

        <Countdown until={food.pickupUntil} mode="berakhir" />

        <div className="space-y-1 text-sm text-[var(--muted)]">
          <p className="flex items-center gap-2">
            <MapPin size={14} className="shrink-0" />
            {food.location}
          </p>
          <p className="flex items-center gap-2">
            <Utensils size={14} className="shrink-0" />
            {remaining}/{food.quantity} {food.unit || 'porsi'} · maks {maxPer}/orang
            {myClaims > 0 ? ` · Ambilanku: ${myClaims}` : ''}
          </p>
        </div>

        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-[11px] font-semibold text-[var(--forest-deep)]">
          <Leaf size={12} />
          {impact.short} · {impact.co2Label}
        </p>

        {freshness.percent > 0 && (
          <p className="text-xs text-[var(--muted)]">
            AI Freshness: {freshness.label} ({freshness.percent}%)
            {priority.urgent ? ` · ${priority.label}` : ''}
          </p>
        )}

        <p className="mt-auto pt-1 text-sm font-semibold text-[var(--forest)]">Lihat detail →</p>
      </div>
    </Link>
  )
}

export default function FoodRescue() {
  const { user } = useAuth()
  const { foods, cancelFoodClaim, refreshFoods, loading: dataLoading } = useData()
  const [tab, setTab] = useState('browse')
  const [busyId, setBusyId] = useState(null)
  const [foodsReady, setFoodsReady] = useState(false)
  const uid = String(user?.id)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refreshFoods?.()
      } finally {
        if (!cancelled) setFoodsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshFoods])

  const availableFoods = useMemo(() => foods.filter(isFoodOpen), [foods])

  const myClaimedFoods = useMemo(
    () => foods.filter((f) => Number(f.claimedBy?.[uid] || f.myClaims || 0) > 0),
    [foods, uid],
  )

  const myPosted = useMemo(
    () => foods.filter((f) => String(f.ownerId) === uid),
    [foods, uid],
  )

  const urgent = useMemo(() => {
    return availableFoods
      .map((f) => {
        const ms = new Date(f.pickupUntil).getTime() - Date.now()
        return { food: f, hoursLeft: ms / (1000 * 60 * 60) }
      })
      .filter((x) => x.hoursLeft > 0 && x.hoursLeft <= 3)
      .sort((a, b) => a.hoursLeft - b.hoursLeft)
      .slice(0, 4)
  }, [availableFoods])

  const recommendations = useMemo(
    () => rankFoodRecommendations(availableFoods, user, 3),
    [availableFoods, user],
  )

  async function onCancelClaim(food) {
    const key = `cancel-${food.id}`
    setBusyId(key)
    try {
      const res = await cancelFoodClaim(food.dbId || food.id)
      if (res.ok) toast.success(res.message || 'Klaim dibatalkan')
      else toast.error(res.message || 'Gagal batalkan')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal batalkan')
    } finally {
      setBusyId(null)
    }
  }

  const postedList = myPosted

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Makanan"
        description="Food Rescue kampus — AI membantu prioritas pengambilan & estimasi dampak."
        action={
          <Link to="/app/posting/makanan">
            <Button>
              <Plus size={16} />
              Posting
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {scopes.map((s) => {
          const count =
            s.id === 'mine' ? myClaimedFoods.length : s.id === 'posted' ? postedList.length : 0
          const label = count > 0 ? `${s.label} (${count})` : s.label
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === s.id
                  ? 'bg-[var(--forest)] text-white'
                  : 'bg-[#dfe8e2] text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--ink)]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'browse' && foodsReady && !dataLoading && recommendations.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#e8f5ee] to-white p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--forest)]" />
            <h2 className="font-display text-lg font-semibold">Direkomendasikan untukmu</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            AI menyesuaikan lokasi, sisa waktu, dan pola klaim Food Rescue-mu.
          </p>
          <ul className="mt-4 space-y-2">
            {recommendations.map(({ food, matchPercent, headline, freshness }) => (
              <li key={food.id}>
                <Link
                  to={foodPath(food)}
                  className="flex flex-col gap-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 transition hover:border-[var(--forest)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {food.title}{' '}
                      <span className="text-[var(--forest)]">({matchPercent}% cocok)</span>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {headline} · Freshness {freshness.percent}%
                    </p>
                    <Countdown until={food.pickupUntil} mode="berakhir" className="mt-1 text-xs" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--forest)]">Lihat →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'browse' && foodsReady && !dataLoading && urgent.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Buruan ambil</h2>
          <ul className="space-y-2">
            {urgent.map(({ food }) => {
              const priority = computePriority(food)
              return (
                <li key={food.id}>
                  <Link
                    to={foodPath(food)}
                    className="flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--forest)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <p className="font-semibold text-[var(--ink)]">{food.title}</p>
                        {priority.urgent && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            AI Priority
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-[var(--muted)]">Ambil di {food.location}</p>
                      <Countdown until={food.pickupUntil} mode="berakhir" className="mt-1" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--forest)]">Lihat detail</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {tab === 'browse' && (
        <div className="space-y-4">
          {!foodsReady || dataLoading ? (
            <p className="text-sm text-[var(--muted)]">Memuat makanan…</p>
          ) : availableFoods.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="Belum ada makanan"
              description="Sisa kantin atau event? Posting biar temen bisa ambil."
              action={
                <Link to="/app/posting/makanan">
                  <Button>Posting</Button>
                </Link>
              }
            />
          ) : (
            <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {availableFoods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  uid={uid}
                  user={user}
                  foods={foods}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'mine' && (
        <div className="space-y-3">
          {myClaimedFoods.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="Belum ambil apa-apa"
              description="Cek Jelajahi dulu, siapa tahu ada yang masih hangat."
              action={<Button onClick={() => setTab('browse')}>Jelajahi</Button>}
            />
          ) : (
            myClaimedFoods.map((food) => {
              const expired = new Date(food.pickupUntil).getTime() < Date.now()
              const myClaims = food.claimedBy?.[uid] || food.myClaims || 0
              const canCancel = !expired && myClaims > 0
              const impact = estimateFoodImpact({ ...food, remaining: myClaims, quantity: myClaims })
              return (
                <div
                  key={food.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center"
                >
                  <Link to={foodPath(food)} className="min-w-0 flex-1 hover:opacity-90">
                    <Badge tone={expired ? 'expired' : food.status}>
                      {expired ? 'Lewat waktu' : statusLabel(food.status)}
                    </Badge>
                    <h3 className="mt-2 font-display text-lg font-semibold text-[var(--forest)]">
                      {food.title}
                    </h3>
                    <p className="text-sm text-[var(--muted)]">
                      Ambilanku {myClaims} {food.unit || 'porsi'} · {food.location}
                    </p>
                    {!expired && (
                      <Countdown until={food.pickupUntil} mode="berakhir" className="mt-1" />
                    )}
                    <p className="mt-1 text-xs font-semibold text-[var(--forest)]">
                      {impact.short}
                    </p>
                  </Link>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === `cancel-${food.id}`}
                      onClick={() => onCancelClaim(food)}
                    >
                      Batalkan klaim
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'posted' && (
        <div className="space-y-3">
          {postedList.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title="Belum posting makanan"
              description="Punya sisa dari event atau kantin? Bagikan di sini."
              action={
                <Link to="/app/posting/makanan">
                  <Button>Posting</Button>
                </Link>
              }
            />
          ) : (
            postedList.map((food) => {
              const remaining = food.remaining ?? food.quantity
              const taken = Math.max(0, (food.quantity || 0) - remaining)
              const impact = estimateFoodImpact(food)
              return (
                <Link
                  key={food.id}
                  to={foodPath(food)}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--forest)] sm:flex-row sm:items-center"
                >
                  <div>
                    <Badge tone={food.status}>{statusLabel(food.status)}</Badge>
                    <h3 className="mt-2 font-display text-lg font-semibold">{food.title}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      Diambil {taken}/{food.quantity} {food.unit || 'porsi'} · {food.location}
                    </p>
                    <Countdown until={food.pickupUntil} mode="berakhir" className="mt-1" />
                    <p className="mt-1 text-xs font-semibold text-[var(--forest)]">
                      Potensi dampak: {impact.co2Label}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--forest)]">Lihat detail</span>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
