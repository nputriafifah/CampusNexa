import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Leaf,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { campusApi } from '../../lib/api'
import { computeMatch, isGreenChoice, walkEstimate } from '../../lib/itemInsights'
import { ItemCard } from '../../components/ui/ItemCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'

const typeTabs = [
  { id: 'all', label: 'Semua' },
  { id: 'sell', label: 'Jual' },
  { id: 'exchange', label: 'Tukar' },
  { id: 'donate', label: 'Donasi' },
  { id: 'borrow', label: 'Pinjam' },
]

const sortOptions = [
  { id: 'newest', label: 'Terbaru' },
  { id: 'nearest', label: 'Terdekat' },
  { id: 'price', label: 'Harga' },
  { id: 'ai', label: 'Rekomendasi AI' },
]

/** Kategori barang inti — jangan campur dengan tipe transaksi (Preloved/Donasi Barang/dll). */
const CORE_CATEGORIES = [
  'Buku',
  'Elektronik',
  'Perlengkapan Kos',
  'Alat Praktikum',
  'Pakaian',
  'Organisasi',
  'Lainnya',
]

const fallbackCategories = CORE_CATEGORIES

export default function ResourceExchange() {
  const { user } = useAuth()
  const { items, favorites = [], toggleFavorite, borrows = [] } = useData()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mineOnly = searchParams.get('mine') === '1'
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState('Semua')
  const [categories, setCategories] = useState(fallbackCategories)
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [recommendations, setRecommendations] = useState([])
  const [savedThisMonth, setSavedThisMonth] = useState(0)
  const uid = String(user?.id)

  useEffect(() => {
    const next = searchParams.get('type') || 'all'
    if (['all', 'sell', 'donate', 'exchange', 'borrow'].includes(next)) {
      setType(next)
    }
    setQuery(searchParams.get('q') || '')
    const sort = searchParams.get('sort') || 'newest'
    if (sortOptions.some((o) => o.id === sort)) setSortBy(sort)
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    campusApi
      .categories()
      .then((list) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return
        const cleaned = list.filter((name) => CORE_CATEGORIES.includes(name))
        setCategories(cleaned.length > 0 ? cleaned : CORE_CATEGORIES)
      })
      .catch(() => {})
    campusApi
      .itemRecommendations()
      .then((rows) => {
        if (!cancelled) setRecommendations(rows || [])
      })
      .catch(() => {})
    campusApi
      .impact()
      .then((data) => {
        if (cancelled) return
        const weekly = data?.weekly || []
        const monthItems = weekly.reduce((sum, row) => sum + Number(row.items || 0), 0)
        setSavedThisMonth(monthItems || Number(data?.personal?.itemsSaved || 0))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const favSet = useMemo(() => new Set(favorites.map(String)), [favorites])

  const recMap = useMemo(() => {
    const map = new Map()
    recommendations.forEach((row) => {
      const key = String(row.dbId ?? String(row.id || '').replace(/^i/, ''))
      map.set(key, row)
    })
    return map
  }, [recommendations])

  const resourceItems = useMemo(
    () =>
      items.filter((i) => ['sell', 'donate', 'exchange', 'borrow'].includes(i.listingType)),
    [items],
  )

  const matchContext = useMemo(
    () => ({ items, borrows, favorites }),
    [items, borrows, favorites],
  )

  const enriched = useMemo(() => {
    return resourceItems.map((item) => {
      const key = String(item.dbId ?? String(item.id || '').replace(/^i/, ''))
      const rec = recMap.get(key)
      const match = computeMatch(item, user, matchContext)
      return {
        ...item,
        matchPercent: match.percent,
        matchSummary: match.summary,
        matchReasons: match.reasons,
        aiRecommended: match.recommended || Boolean(rec),
        greenChoice: isGreenChoice(item, user, matchContext),
        walkMeters: match.walk?.meters ?? walkEstimate(item, user).meters,
      }
    })
  }, [resourceItems, recMap, user, matchContext])

  const filtered = useMemo(() => {
    const rows = enriched.filter((item) => {
      if (mineOnly && String(item.ownerId) !== uid) return false
      if (type !== 'all' && item.listingType !== type) return false
      if (category !== 'Semua' && item.category !== category) return false
      const q = query.toLowerCase()
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.tags || []).some((t) => String(t).toLowerCase().includes(q)) ||
        String(item.location || '')
          .toLowerCase()
          .includes(q)
      )
    })

    const sorted = [...rows]
    if (sortBy === 'nearest') {
      sorted.sort((a, b) => a.walkMeters - b.walkMeters)
    } else if (sortBy === 'price') {
      sorted.sort((a, b) => {
        const pa = a.listingType === 'sell' ? Number(a.price || 0) : Number.POSITIVE_INFINITY
        const pb = b.listingType === 'sell' ? Number(b.price || 0) : Number.POSITIVE_INFINITY
        return pa - pb
      })
    } else if (sortBy === 'ai') {
      sorted.sort((a, b) => Number(b.matchPercent || 0) - Number(a.matchPercent || 0))
    } else {
      sorted.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime()
        const tb = new Date(b.createdAt || 0).getTime()
        return tb - ta || Number(b.dbId || 0) - Number(a.dbId || 0)
      })
    }
    return sorted
  }, [enriched, query, category, type, mineOnly, uid, sortBy])

  const availableCount = useMemo(
    () => enriched.filter((i) => i.status === 'available').length,
    [enriched],
  )
  const aiCount = useMemo(
    () => enriched.filter((i) => i.status === 'available' && Number(i.matchPercent || 0) >= 80).length,
    [enriched],
  )

  function patchParams(mutator) {
    const next = new URLSearchParams(searchParams)
    mutator(next)
    setSearchParams(next, { replace: true })
  }

  function setTypeTab(id) {
    setType(id)
    patchParams((next) => {
      if (id !== 'all') next.set('type', id)
      else next.delete('type')
    })
  }

  function onSortChange(id) {
    setSortBy(id)
    patchParams((next) => {
      if (id !== 'newest') next.set('sort', id)
      else next.delete('sort')
    })
  }

  function onQueryChange(value) {
    setQuery(value)
    patchParams((next) => {
      if (value.trim()) next.set('q', value.trim())
      else next.delete('q')
    })
  }

  async function onToggleFav(_e, item) {
    try {
      const nowFav = await toggleFavorite(item.dbId || item.id)
      toast.success(nowFav ? 'Masuk ke favorit' : 'Dihapus dari favorit')
    } catch (err) {
      toast.error(err?.message || 'Gagal nyimpan favorit')
    }
  }

  const postingTo =
    type !== 'all' ? `/app/posting/barang?type=${type}` : '/app/posting/barang'
  const facultyLabel = user?.faculty || user?.university || 'Kampus'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Barang"
        description="Jual, tukar, donasi, atau pinjam — pilih tab di bawah."
        action={
          <div className="flex flex-wrap gap-2">
            {type === 'borrow' && (
              <Button variant="secondary" onClick={() => navigate('/app/borrow')}>
                <ShoppingBag size={16} />
                Status pinjam
              </Button>
            )}
            <Link to={postingTo}>
              <Button>
                <Plus size={16} />
                Posting
              </Button>
            </Link>
          </div>
        }
      />

      <SearchBar value={query} onChange={onQueryChange} placeholder="Cari barang..." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Barang tersedia',
            value: availableCount,
            icon: Package,
            tone: 'bg-[#cfe4d8] text-[#134232]',
          },
          {
            label: 'Cocok untukmu',
            value: aiCount,
            icon: Sparkles,
            tone: 'bg-[#e8f5ee] text-[var(--forest-deep)]',
          },
          {
            label: 'Barang terselamatkan',
            value: Number(savedThisMonth || 0).toLocaleString('id-ID'),
            icon: Leaf,
            tone: 'bg-[#d9ebe2] text-[#134232]',
          },
          {
            label: 'Fokus lokasi',
            value: facultyLabel,
            icon: MapPin,
            tone: 'bg-[#d5e4ef] text-[#1e3a5f]',
            isText: true,
          },
        ].map(({ label, value, icon: Icon, tone, isText }) => (
          <div key={label} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={16} />
            </div>
            <p
              className={`font-display font-semibold text-[var(--ink)] ${
                isText ? 'truncate text-base' : 'text-2xl'
              }`}
              title={isText ? String(value) : undefined}
            >
              {value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            patchParams((n) => {
              n.delete('mine')
            })
          }
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !mineOnly
              ? 'bg-[var(--forest)] text-white'
              : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)]'
          }`}
        >
          Jelajah
        </button>
        <button
          type="button"
          onClick={() =>
            patchParams((n) => {
              n.set('mine', '1')
            })
          }
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mineOnly
              ? 'bg-[var(--forest)] text-white'
              : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)]'
          }`}
        >
          Punya saya
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {typeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTypeTab(tab.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              type === tab.id
                ? 'bg-[var(--mint)] font-semibold text-[var(--forest-deep)]'
                : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm sm:min-w-[180px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter kategori"
        >
          <option value="Semua">Semua kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)] sm:ml-auto">
          <span className="shrink-0">Urutkan</span>
          <select
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ink)]"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Urutkan barang"
          >
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Kosong nih"
          description="Coba ganti filter, atau posting barang sendiri."
          action={
            <Link to={postingTo}>
              <Button>Posting</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const id = String(item.dbId ?? String(item.id || '').replace(/^i/, ''))
            const isFav = favSet.has(id)
            return (
              <div key={item.id}>
                <ItemCard
                  item={item}
                  to={`/app/exchange/${item.dbId || item.id}`}
                  isFavorite={isFav}
                  onToggleFavorite={(row) => onToggleFav(null, row)}
                  aiRecommended={item.aiRecommended}
                  showInsights
                  user={user}
                />
                {Number(item.interestCount || 0) > 0 && String(item.ownerId) === uid && (
                  <Link
                    to={`/app/exchange/${item.dbId || item.id}#item-chat`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--forest)]"
                  >
                    <MessageSquare size={12} /> Ada yang nanya — balas yuk
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
