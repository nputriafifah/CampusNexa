import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { HandHeart, MessageSquare, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ItemCard } from '../../components/ui/ItemCard'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { Badge, statusLabel } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'

const scopes = [
  { id: 'browse', label: 'Jelajahi' },
  { id: 'claims', label: 'Ambilanku' },
  { id: 'mine', label: 'Yang kukasih' },
]

export default function Donate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, claimDonation, confirmDonationHandover, favorites = [], toggleFavorite } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = ['browse', 'claims', 'mine'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'browse'
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const uid = String(user?.id)
  const favSet = useMemo(() => new Set(favorites.map(String)), [favorites])

  async function onToggleFav(item) {
    try {
      const id = String(item.dbId || item.id)
      const wasFav = favSet.has(id)
      await toggleFavorite(item.dbId || item.id)
      toast.success(wasFav ? 'Dihapus dari favorit' : 'Masuk ke favorit')
    } catch {
      toast.error('Gagal menyimpan favorit')
    }
  }

  function setTab(next) {
    const params = new URLSearchParams(searchParams)
    if (next === 'browse') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const available = useMemo(
    () =>
      items.filter((i) => {
        if (i.listingType !== 'donate' || i.status !== 'available') return false
        if (String(i.ownerId) === uid) return false
        if (!query) return true
        return i.title.toLowerCase().includes(query.toLowerCase())
      }),
    [items, query, uid],
  )

  const myOffers = useMemo(
    () => items.filter((i) => i.listingType === 'donate' && String(i.ownerId) === uid),
    [items, uid],
  )

  const myClaims = useMemo(
    () =>
      items.filter(
        (i) =>
          i.listingType === 'donate' && String(i.donationClaim?.claimerId) === uid,
      ),
    [items, uid],
  )

  const waitingTasks = useMemo(() => {
    const tasks = []
    myOffers.forEach((item) => {
      if (item.status !== 'reserved' && item.status !== 'pending_handover') return
      tasks.push({
        id: `offer-${item.id}`,
        title: item.title,
        detail: `${item.donationClaim?.claimerName || 'Seseorang'} mau ambil barangmu`,
        to: `/app/exchange/${item.dbId || item.id}#item-chat`,
        action: 'Chat',
      })
    })
    myClaims.forEach((item) => {
      if (item.status !== 'reserved' && item.status !== 'pending_handover') return
      tasks.push({
        id: `claim-${item.id}`,
        title: item.title,
        detail: `Atur ambil sama ${item.owner}`,
        to: `/app/exchange/${item.dbId || item.id}#item-chat`,
        action: 'Chat',
      })
    })
    return tasks
  }, [myOffers, myClaims])

  async function onClaim(item) {
    setBusyId(item.id)
    try {
      const res = await claimDonation(item.dbId || item.id)
      if (res.ok) {
        toast.success('Oke, lanjut chat pemberi ya')
        navigate(`/app/exchange/${item.dbId || item.id}#item-chat`)
      } else {
        toast.error(res.message || 'Belum bisa diklaim')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Belum bisa diklaim')
    } finally {
      setBusyId(null)
    }
  }

  async function onHandover(itemId) {
    setBusyId(itemId)
    try {
      await confirmDonationHandover(itemId)
      toast.success('Oke, selesai')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Belum berhasil')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Donasi"
        description="Kasih atau ambil barang bekas yang masih layak pakai."
        action={
          <Link to="/app/donate/upload">
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
            s.id === 'claims'
              ? myClaims.filter((i) => i.status === 'reserved' || i.status === 'pending_handover')
                  .length
              : s.id === 'mine'
                ? myOffers.filter((i) => i.status === 'reserved' || i.status === 'pending_handover')
                    .length
                : 0
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

      {waitingTasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Menunggu kamu</h2>
          <ul className="space-y-2">
            {waitingTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">{task.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{task.detail}</p>
                </div>
                <Link to={task.to} className="shrink-0">
                  <Button size="sm">
                    <MessageSquare size={14} />
                    {task.action}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'browse' && (
        <div className="space-y-4">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Cari buku, baju, rak…"
            className="max-w-lg"
          />
          {available.length === 0 ? (
            <EmptyState
              icon={HandHeart}
              title="Belum ada apa-apa"
              description="Punya barang yang nganggur? Coba posting di sini."
              action={
                <Link to="/app/donate/upload">
                  <Button>Posting</Button>
                </Link>
              }
            />
          ) : (
            <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((item) => {
                const id = String(item.dbId ?? String(item.id || '').replace(/^i/, ''))
                const isFav = favSet.has(id)
                return (
                  <div key={item.id} className="space-y-2">
                    <ItemCard
                      item={item}
                      to={`/app/exchange/${item.dbId || item.id}`}
                      isFavorite={isFav}
                      onToggleFavorite={onToggleFav}
                    />
                    <p className="px-1 text-xs text-[var(--muted)]">
                      Ambil di <strong className="text-[var(--ink)]">{item.location || 'kampus'}</strong>{' '}
                      · {item.owner}
                    </p>
                    <Button
                      className="w-full"
                      disabled={busyId === item.id}
                      onClick={() => onClaim(item)}
                    >
                      Klaim
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'claims' && (
        <div className="space-y-3">
          {myClaims.length === 0 ? (
            <EmptyState
              icon={HandHeart}
              title="Belum ambil apa-apa"
              description="Lihat dulu di Jelajahi, siapa tahu ada yang kepakai."
              action={<Button onClick={() => setTab('browse')}>Jelajahi</Button>}
            />
          ) : (
            myClaims.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
                  <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    Dari {item.owner} · {item.location || 'kampus'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/exchange/${item.dbId || item.id}#item-chat`}>
                    <Button size="sm">
                      <MessageSquare size={14} />
                      Chat
                    </Button>
                  </Link>
                  {(item.status === 'reserved' || item.status === 'pending_handover') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === item.id}
                      onClick={() => onHandover(item.dbId || item.id)}
                    >
                      Sudah ambil
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'mine' && (
        <div className="space-y-3">
          {myOffers.length === 0 ? (
            <EmptyState
              icon={HandHeart}
              title="Belum kasih apa-apa"
              description="Kalau ada barang sisa, posting aja di sini."
              action={
                <Link to="/app/donate/upload">
                  <Button>Posting</Button>
                </Link>
              }
            />
          ) : (
            myOffers.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
                  <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {item.donationClaim
                      ? `Diklaim ${item.donationClaim.claimerName}`
                      : item.location || 'Menunggu diklaim'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/exchange/${item.dbId || item.id}#item-chat`}>
                    <Button size="sm">
                      <MessageSquare size={14} />
                      {item.donationClaim ? 'Chat' : 'Lihat'}
                    </Button>
                  </Link>
                  {(item.status === 'reserved' || item.status === 'pending_handover') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === item.id}
                      onClick={() => onHandover(item.dbId || item.id)}
                    >
                      Udah dikasih
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
