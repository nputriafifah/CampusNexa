import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Package, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ItemCard } from '../../components/ui/ItemCard'
import { Badge, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SearchBar } from '../../components/ui/SearchBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'

function daysUntil(dateStr) {
  if (!dateStr) return 999
  const end = new Date(dateStr)
  end.setHours(23, 59, 59, 999)
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))
}

const scopes = [
  { id: 'browse', label: 'Jelajahi' },
  { id: 'mine', label: 'Saya pinjam' },
  { id: 'incoming', label: 'Barang saya' },
]

export default function BorrowCenter() {
  const { user } = useAuth()
  const { items, borrows, respondBorrow, returnBorrow, sendBorrowReminder } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = ['browse', 'mine', 'incoming'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'browse'
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const uid = String(user?.id)

  function setTab(next) {
    const params = new URLSearchParams(searchParams)
    if (next === 'browse') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const myBorrowListings = useMemo(
    () => items.filter((i) => i.listingType === 'borrow' && String(i.ownerId) === uid),
    [items, uid],
  )

  const borrowable = useMemo(
    () =>
      items.filter((i) => {
        if (i.listingType !== 'borrow' || i.status !== 'available') return false
        if (String(i.ownerId) === uid) return false
        if (!query) return true
        return i.title.toLowerCase().includes(query.toLowerCase())
      }),
    [items, query, uid],
  )

  const myBorrows = useMemo(
    () => borrows.filter((b) => String(b.borrowerId) === uid),
    [borrows, uid],
  )

  const incoming = useMemo(
    () => borrows.filter((b) => String(b.ownerId) === uid),
    [borrows, uid],
  )

  const pendingIncoming = useMemo(
    () => incoming.filter((b) => b.status === 'pending'),
    [incoming],
  )

  const dueSoonMine = useMemo(
    () =>
      myBorrows.filter((b) => {
        if (b.status !== 'approved') return false
        return daysUntil(b.dueDate) <= 3
      }),
    [myBorrows],
  )

  const waitingTasks = useMemo(() => {
    const tasks = []
    pendingIncoming.forEach((req) => {
      tasks.push({
        id: `in-${req.id}`,
        title: req.itemTitle,
        detail: `${req.borrower} minta pinjam`,
        kind: 'incoming',
        borrowId: req.id,
        itemId: req.itemId,
      })
    })
    dueSoonMine.forEach((req) => {
      const left = daysUntil(req.dueDate)
      tasks.push({
        id: `due-${req.id}`,
        title: req.itemTitle,
        detail: left < 0 ? 'Sudah lewat jatuh tempo' : `Kembali dalam ${left} hari`,
        kind: 'return',
        borrowId: req.id,
        itemId: req.itemId,
      })
    })
    return tasks
  }, [pendingIncoming, dueSoonMine])

  async function onApprove(id) {
    setBusyId(id)
    try {
      await respondBorrow(id, 'approve')
      toast.success('Disetujui')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Gagal setujui')
    } finally {
      setBusyId(null)
    }
  }

  async function onReject(id) {
    setBusyId(id)
    try {
      await respondBorrow(id, 'reject')
      toast.success('Ditolak')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Gagal tolak')
    } finally {
      setBusyId(null)
    }
  }

  async function onReturn(id) {
    setBusyId(id)
    try {
      await returnBorrow(id)
      toast.success('Sudah dikembalikan')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Gagal kembalikan')
    } finally {
      setBusyId(null)
    }
  }

  async function onRemind(id) {
    setBusyId(id)
    try {
      await sendBorrowReminder(id)
      toast.success('Pengingat terkirim ke peminjam')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Gagal kirim pengingat')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Pinjam"
        description="Pinjam sementara, kembalikan setelah dipakai."
        action={
          <Link to="/app/borrow/upload">
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
            s.id === 'incoming'
              ? pendingIncoming.length
              : s.id === 'mine'
                ? myBorrows.filter((b) => b.status === 'approved' || b.status === 'pending').length
                : 0
          const label = count > 0 && (s.id === 'incoming' || s.id === 'mine') ? `${s.label} (${count})` : s.label
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
                <div className="flex shrink-0 flex-wrap gap-2">
                  {task.kind === 'return' ? (
                    <Button
                      size="sm"
                      disabled={busyId === task.borrowId}
                      onClick={() => onReturn(task.borrowId)}
                    >
                      Kembalikan
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={busyId === task.borrowId}
                        onClick={() => onApprove(task.borrowId)}
                      >
                        Setujui
                      </Button>
                      <Link to={`/app/exchange/${task.itemId}`}>
                        <Button size="sm" variant="secondary">
                          Lihat
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
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
            placeholder="Cari buku, tripod, racket…"
            className="max-w-lg"
          />
          {borrowable.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Kosong nih"
              description="Belum ada yang bisa dipinjam. Atau posting barangmu sendiri?"
              action={
                <Link to="/app/borrow/upload">
                  <Button>Posting</Button>
                </Link>
              }
            />
          ) : (
            <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {borrowable.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'mine' && (
        <div className="space-y-3">
          {myBorrows.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Belum pinjam apa-apa"
              description="Cari di Jelajahi, lalu ajukan pinjam."
              action={<Button onClick={() => setTab('browse')}>Jelajahi</Button>}
            />
          ) : (
            myBorrows.map((req) => {
              const left = daysUntil(req.dueDate)
              const overdue = req.status === 'approved' && left < 0
              const dueSoon = req.status === 'approved' && left >= 0 && left <= 3
              return (
                <div
                  key={req.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge tone={req.status}>{statusLabel(req.status)}</Badge>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--danger)]">
                          <AlertTriangle size={12} /> Terlambat
                        </span>
                      )}
                      {dueSoon && !overdue && (
                        <span className="text-xs font-semibold text-[var(--ember)]">
                          {left === 0 ? 'Jatuh tempo hari ini' : `${left} hari lagi`}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold">{req.itemTitle}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      Dari {req.owner} · kembali {req.dueDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/app/exchange/${req.itemId}`}>
                      <Button variant="secondary" size="sm">
                        Detail
                      </Button>
                    </Link>
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <Link to={`/app/exchange/${req.itemId}#item-chat`}>
                        <Button variant="secondary" size="sm">
                          Chat
                        </Button>
                      </Link>
                    )}
                    {req.status === 'approved' && (
                      <Button
                        size="sm"
                        disabled={busyId === req.id}
                        onClick={() => onReturn(req.id)}
                      >
                        Kembalikan
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'incoming' && (
        <div className="space-y-6">
          {myBorrowListings.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Listingmu</h2>
              <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {myBorrowListings.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Permintaan masuk</h2>
            {incoming.length === 0 && myBorrowListings.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Belum ada barang pinjamanmu"
                description="Posting barang yang boleh dipinjam teman."
                action={
                  <Link to="/app/borrow/upload">
                    <Button>Posting</Button>
                  </Link>
                }
              />
            ) : incoming.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Belum ada permintaan"
                description="Kalau ada yang mau pinjam, muncul di sini."
              />
            ) : (
              incoming.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <Badge tone={req.status}>{statusLabel(req.status)}</Badge>
                    <h3 className="mt-2 font-display text-lg font-semibold">{req.itemTitle}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {req.borrower} · minta sampai {req.dueDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/app/exchange/${req.itemId}`}>
                      <Button variant="secondary" size="sm">
                        Detail
                      </Button>
                    </Link>
                    {(req.status === 'pending' || req.status === 'approved') && (
                      <Link to={`/app/exchange/${req.itemId}#item-chat`}>
                        <Button variant="secondary" size="sm">
                          Chat
                        </Button>
                      </Link>
                    )}
                    {req.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === req.id}
                          onClick={() => onApprove(req.id)}
                        >
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === req.id}
                          onClick={() => onReject(req.id)}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                    {req.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === req.id || req.reminderSent}
                        onClick={() => onRemind(req.id)}
                      >
                        {req.reminderSent ? 'Sudah diingatkan' : 'Ingatkan'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
