import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Leaf, MapPin, Sparkles, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { campusApi, USE_API } from '../../lib/api'
import {
  computeFoodRecommendation,
  computeFreshness,
  computePriority,
  detectFoodSource,
  estimateFoodImpact,
} from '../../lib/foodInsights'
import { Badge, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Countdown } from '../../components/ui/Countdown'

export default function FoodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { foods, claimFood, cancelFoodClaim, mergeFoodIntoState } = useData()
  const [amount, setAmount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const uid = String(user?.id)

  const foodFromList = useMemo(
    () =>
      foods.find(
        (f) => f.id === id || String(f.dbId) === String(id) || f.id === `f${id}`,
      ),
    [foods, id],
  )

  const [fetched, setFetched] = useState(null)
  const food = foodFromList || fetched

  useEffect(() => {
    setFetched(null)
    setNotFound(false)
    if (foodFromList || !USE_API || !id) return

    let cancelled = false
    setLoading(true)
    campusApi
      .food(id)
      .then((data) => {
        if (cancelled) return
        setFetched(data)
        mergeFoodIntoState?.(data)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, foodFromList, mergeFoodIntoState])

  if (loading && !food) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-8 text-center text-sm text-[var(--muted)]">
          Memuat detail…
        </p>
      </div>
    )
  }

  if (!food || notFound) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/app/food"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--forest)]"
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>
        <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-8 text-center text-sm text-[var(--muted)]">
          Makanan tidak ditemukan. Mungkin sudah habis atau dihapus.
        </p>
      </div>
    )
  }

  const remaining = food.remaining ?? food.quantity
  const myClaims = Number(food.claimedBy?.[uid] || food.myClaims || 0)
  const maxPer = food.maxClaimPerUser ?? 2
  const expired =
    food.status === 'expired' || new Date(food.pickupUntil).getTime() < Date.now()
  const isOwner = String(food.ownerId) === uid
  const canClaim =
    !isOwner &&
    !expired &&
    food.status === 'available' &&
    remaining > 0 &&
    myClaims < maxPer
  const canCancel = !expired && myClaims > 0 && !isOwner
  const maxTake = Math.max(1, Math.min(maxPer - myClaims, remaining))

  const freshness = computeFreshness(food)
  const priority = computePriority(food)
  const impact = estimateFoodImpact(food)
  const source = detectFoodSource(food)
  const rec = computeFoodRecommendation(food, user, foods)

  async function onClaim() {
    const take = Math.min(Math.max(1, Number(amount) || 1), maxTake)
    setAmount(take)
    setBusy(true)
    try {
      const res = await claimFood(food.dbId || food.id, take)
      if (res.ok) toast.success(res.message || 'Oke, jangan lupa diambil ya')
      else toast.error(res.message || 'Belum bisa diklaim')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Belum bisa diklaim')
    } finally {
      setBusy(false)
    }
  }

  async function onCancel() {
    setBusy(true)
    try {
      const res = await cancelFoodClaim(food.dbId || food.id)
      if (res.ok) toast.success(res.message || 'Klaim dibatalkan')
      else toast.error(res.message || 'Gagal batalkan')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal batalkan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--forest)]"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--mint)]">
          <img
            src={food.image}
            alt={food.title}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone={expired ? 'expired' : food.status}>
              {expired ? 'Lewat waktu' : statusLabel(food.status)}
            </Badge>
            <Badge>
              Sisa {remaining}/{food.quantity} {food.unit || 'porsi'}
            </Badge>
            {!expired && freshness.percent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--forest-deep)]">
                <Sparkles size={11} />
                AI Freshness {freshness.percent}%
              </span>
            )}
            {priority.urgent && !expired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                AI Priority · Segera ambil
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-semibold md:text-4xl">{food.title}</h1>
          <p className="text-sm font-semibold text-[var(--muted)]">
            {source.emoji} Food Rescue dari {source.label}
            {source.detail && source.detail !== source.label ? ` · ${source.detail}` : ''}
          </p>
          <p className="text-lg leading-relaxed text-[var(--muted)]">{food.description}</p>

          <div className="grid gap-3 border-y border-[var(--line)] py-4 text-sm sm:grid-cols-2">
            <p className="flex items-center gap-2">
              <MapPin size={16} className="text-[var(--forest)]" />
              {food.location}
            </p>
            <p className="flex items-center gap-2">
              <User size={16} className="text-[var(--forest)]" />
              {food.organization || food.owner || '—'}
            </p>
            <p className="sm:col-span-2">
              <Countdown until={food.pickupUntil} mode="berakhir" />
            </p>
            <p>
              Maks {maxPer} {food.unit || 'porsi'}/orang
              {myClaims > 0 ? ` · Ambilanku: ${myClaims}` : ''}
            </p>
          </div>

          {!expired && (
            <div className="space-y-3 rounded-2xl border border-[var(--leaf)]/30 bg-gradient-to-br from-[#e8f5ee] to-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
                <Sparkles size={16} />
                AI Freshness · {freshness.label} ({freshness.percent}%)
              </p>
              {priority.urgent && (
                <p className="text-sm text-amber-800">{priority.label}</p>
              )}
              {rec.recommended && (
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Direkomendasikan untukmu ({rec.matchPercent}%)
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {rec.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--forest)]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[var(--line)] bg-[#e8f5ee]/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
              <Leaf size={16} />
              Estimasi dampak lingkungan
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Menyelamatkan makanan ini dapat mengurangi {impact.co2Label} · {impact.wasteLabel}
            </p>
          </div>

          {isOwner && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint)]/40 p-4 text-sm text-[var(--forest-deep)]">
              Ini postinganmu. Pantau sisa kuota di tab Yang kuposting.
            </div>
          )}

          {canClaim && (
            <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-[var(--muted)]">Jumlah</label>
                <input
                  type="number"
                  min={1}
                  max={maxTake}
                  value={amount}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isFinite(v)) {
                      setAmount(1)
                      return
                    }
                    setAmount(Math.min(Math.max(1, v), maxTake))
                  }}
                  className="field w-24"
                />
                <span className="text-sm text-[var(--muted)]">{food.unit || 'porsi'}</span>
              </div>
              <Button className="w-full" disabled={busy} onClick={onClaim}>
                {busy ? 'Memproses…' : 'Ambil'}
              </Button>
            </div>
          )}

          {!canClaim && !isOwner && myClaims > 0 && (
            <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4">
              <p className="text-sm text-[var(--muted)]">
                Kamu sudah klaim {myClaims} {food.unit || 'porsi'}. Ambil di {food.location} sebelum
                batas waktu.
              </p>
              {canCancel && (
                <Button variant="secondary" disabled={busy} onClick={onCancel}>
                  Batalkan klaim
                </Button>
              )}
            </div>
          )}

          {canClaim && canCancel && (
            <Button variant="secondary" disabled={busy} onClick={onCancel}>
              Batalkan klaim sebelumnya
            </Button>
          )}

          {!canClaim && !isOwner && myClaims === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {expired
                ? 'Sudah lewat batas pengambilan.'
                : remaining <= 0 || food.status === 'claimed'
                  ? 'Sudah habis.'
                  : 'Belum bisa diambil.'}
            </p>
          )}

          <Link
            to="/app/food"
            className="inline-block text-sm font-semibold text-[var(--forest)] hover:underline"
          >
            Lihat makanan lain
          </Link>
        </div>
      </div>
    </div>
  )
}
