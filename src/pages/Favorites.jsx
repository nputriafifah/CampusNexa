import { Link } from 'react-router-dom'
import { Heart, MapPin, Package, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { computeMatch, walkEstimate } from '../lib/itemInsights'
import { ItemCard } from '../components/ui/ItemCard'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

export default function Favorites() {
  const { user } = useAuth()
  const { items, favorites = [], borrows = [], toggleFavorite, loading } = useData()
  const favSet = useMemo(() => new Set(favorites.map(String)), [favorites])
  const matchContext = useMemo(
    () => ({ items, borrows, favorites }),
    [items, borrows, favorites],
  )

  const saved = useMemo(
    () =>
      items.filter((item) => {
        const keys = [
          String(item.dbId || ''),
          String(item.id || '').replace(/^i/, ''),
          String(item.id),
        ]
        return keys.some((k) => k && favSet.has(k))
      }),
    [items, favSet],
  )

  const insightRows = useMemo(
    () =>
      saved.map((item) => {
        const walk = walkEstimate(item, user)
        const match = computeMatch(item, user, matchContext)
        return { item, walk, match }
      }),
    [saved, user, matchContext],
  )

  const nearbyCount = insightRows.filter((row) => row.walk.nearby || row.walk.meters <= 200).length
  const aiCount = insightRows.filter((row) => row.match.recommended).length

  const banner = useMemo(() => {
    if (insightRows.length === 0) return null

    const nearest = [...insightRows].sort((a, b) => a.walk.meters - b.walk.meters)[0]
    const topMatch = [...insightRows].sort((a, b) => b.match.percent - a.match.percent)[0]

    if (nearest && (nearest.walk.nearby || nearest.walk.meters <= 200)) {
      return `${nearest.item.title} berada ${nearest.walk.label.toLowerCase()} dari kampusmu. Disarankan diprioritaskan sebelum diambil orang lain.`
    }
    if (topMatch && topMatch.match.percent >= 80) {
      return `${topMatch.item.title} cocok dengan kebutuhanmu. ${topMatch.match.summary}. Disarankan diprioritaskan sebelum tidak tersedia.`
    }
    return 'Barang favorit akan diperbarui jika stok berubah atau sudah tidak tersedia.'
  }, [insightRows])

  async function onToggleFav(item) {
    try {
      await toggleFavorite(item.dbId || item.id)
      toast.success('Dihapus dari favorit')
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus favorit')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Favorit"
        description="Disimpan supaya mudah ditemukan lagi saat dibutuhkan."
      />

      {loading && saved.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Sebentar ya…</p>
      ) : saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Belum ada favorit"
          description="Pas lagi lihat barang, tekan hati biar masuk ke sini."
          action={
            <Link to="/app/exchange">
              <Button>
                <Package size={16} />
                Cari barang
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3f0] px-3 py-1.5 font-semibold text-[var(--ink)]">
              <Heart size={14} className="text-[var(--ember)]" />
              {saved.length} Barang favorit
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3f0] px-3 py-1.5 font-semibold text-[var(--ink)]">
              <MapPin size={14} className="text-[var(--forest)]" />
              {nearbyCount} Dekat lokasimu
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-3 py-1.5 font-semibold text-[var(--forest-deep)]">
              <Sparkles size={14} />
              {aiCount} Direkomendasikan AI
            </span>
          </div>

          {banner && (
            <section className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#e8f5ee] to-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
                <Sparkles size={16} />
                AI Insight
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{banner}</p>
            </section>
          )}

          <p className="text-sm text-[var(--muted)]">
            Barang favorit akan diperbarui jika stok berubah atau sudah tidak tersedia.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                to={`/app/exchange/${item.dbId || item.id}`}
                isFavorite
                onToggleFavorite={onToggleFav}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
