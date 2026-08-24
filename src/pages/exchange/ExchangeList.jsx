import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquare, Package, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { campusApi } from '../../lib/api'
import { ItemCard } from '../../components/ui/ItemCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEffect, useMemo, useState } from 'react'

const fallbackCategories = [
  'Buku',
  'Elektronik',
  'Perlengkapan Kos',
  'Alat Praktikum',
  'Pakaian',
  'Organisasi',
  'Lainnya',
]

const typeTabs = [
  { id: 'all', label: 'Semua' },
  { id: 'sell', label: 'Jual' },
  { id: 'exchange', label: 'Tukar' },
]

export default function ExchangeList() {
  const { user } = useAuth()
  const { items, favorites = [], toggleFavorite } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const mineOnly = searchParams.get('mine') === '1'
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState('Semua')
  const [categories, setCategories] = useState(fallbackCategories)
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const uid = String(user?.id)
  const favSet = useMemo(() => new Set(favorites.map(String)), [favorites])

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    setType(searchParams.get('type') || 'all')
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    campusApi
      .categories()
      .then((list) => {
        if (cancelled || !Array.isArray(list) || list.length === 0) return
        setCategories(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function onToggleFav(item) {
    try {
      const nowFav = await toggleFavorite(item.dbId || item.id)
      toast.success(nowFav ? 'Masuk ke favorit' : 'Dihapus dari favorit')
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan favorit')
    }
  }

  const dealItems = useMemo(
    () => items.filter((i) => i.listingType === 'sell' || i.listingType === 'exchange'),
    [items],
  )

  const myDealItems = useMemo(
    () => dealItems.filter((i) => String(i.ownerId) === uid),
    [dealItems, uid],
  )

  const waitingMine = useMemo(
    () =>
      myDealItems.filter((i) => {
        if (i.status === 'sold' || i.status === 'exchanged' || i.status === 'closed') return false
        if (i.status === 'reserved' || i.status === 'pending_handover') return true
        return Number(i.interestCount || 0) > 0
      }),
    [myDealItems],
  )

  const filtered = useMemo(() => {
    return dealItems.filter((item) => {
      if (mineOnly && String(item.ownerId) !== String(user?.id)) return false
      if (type !== 'all' && item.listingType !== type) return false
      if (category !== 'Semua' && item.category !== category) return false
      const q = query.toLowerCase()
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.includes(q))
      )
    })
  }, [dealItems, query, category, type, mineOnly, user?.id])

  function setScope(mine) {
    const next = new URLSearchParams(searchParams)
    if (mine) next.set('mine', '1')
    else next.delete('mine')
    if (type !== 'all') next.set('type', type)
    else next.delete('type')
    setSearchParams(next, { replace: true })
  }

  function setTypeTab(id) {
    setType(id)
    const next = new URLSearchParams(searchParams)
    if (id !== 'all') next.set('type', id)
    else next.delete('type')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Tukar"
        description="Jual atau tukar barang antar mahasiswa."
        action={
          <Link to="/app/exchange/upload">
            <Button>
              <Plus size={16} />
              Posting
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope(false)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !mineOnly
              ? 'bg-[var(--forest)] text-white'
              : 'bg-[#dfe8e2] text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--ink)]'
          }`}
        >
          Jelajahi
        </button>
        <button
          type="button"
          onClick={() => setScope(true)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mineOnly
              ? 'bg-[var(--forest)] text-white'
              : 'bg-[#dfe8e2] text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--ink)]'
          }`}
        >
          Milik saya{myDealItems.length > 0 ? ` (${myDealItems.length})` : ''}
        </button>
      </div>

      {mineOnly && waitingMine.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Menunggu kamu</h2>
          <ul className="space-y-2">
            {waitingMine.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    {Number(item.interestCount || 0) > 0
                      ? `${item.interestCount} orang nanya — balas chatnya yuk`
                      : 'Ada yang nanya — balas chatnya yuk'}
                  </p>
                </div>
                <Link to={`/app/exchange/${item.dbId || item.id}#item-chat`} className="shrink-0">
                  <Button size="sm">
                    <MessageSquare size={14} />
                    Chat
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Cari buku, keyboard, kalkulator…"
        />

        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                type === tab.id
                  ? 'bg-[var(--forest)] text-white'
                  : 'bg-white text-[var(--muted)] hover:bg-[var(--mint)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {['Semua', ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                category === c
                  ? 'border-[var(--forest)] bg-[var(--mint)] text-[var(--forest-deep)]'
                  : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--leaf)]'
              }`}
            >
              {c === 'Semua' ? 'Semua kategori' : c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={mineOnly ? 'Belum ada barangmu di sini' : 'Kosong nih'}
          description={
            mineOnly
              ? 'Belum ada yang kamu jual atau tukar. Posting dulu yuk.'
              : 'Coba cari lain, atau posting barangmu sendiri.'
          }
          action={
            <Link to="/app/exchange/upload">
              <Button>Posting</Button>
            </Link>
          }
        />
      ) : (
        <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const id = String(item.dbId ?? String(item.id || '').replace(/^i/, ''))
            const isFav = favSet.has(id)
            return (
              <ItemCard
                key={item.id}
                item={item}
                to={`/app/exchange/${item.dbId || item.id}`}
                isFavorite={isFav}
                onToggleFavorite={onToggleFav}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
