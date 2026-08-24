import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Heart,
  Leaf,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  Trash2,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { campusApi, USE_API } from '../../lib/api'
import {
  buildAiDetailInsight,
  impactBadgeText,
  walkEstimate,
} from '../../lib/itemInsights'
import { Badge, statusLabel } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

function ChatBubble({ mine, name, message, time }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          mine
            ? 'rounded-br-md bg-[var(--forest)] text-white'
            : 'rounded-bl-md border border-[var(--line)] bg-white text-[var(--ink)]'
        }`}
      >
        {!mine && (
          <p className={`text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-[var(--forest)]'}`}>
            {name}
          </p>
        )}
        <p className={`leading-relaxed ${mine ? 'text-white' : 'text-[var(--ink)]'}`}>{message}</p>
        {time ? (
          <p className={`mt-1 text-[10px] ${mine ? 'text-white/65' : 'text-[var(--muted)]'}`}>{time}</p>
        ) : null}
      </div>
    </div>
  )
}

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    items,
    borrows,
    favorites = [],
    getItemInterests,
    sendInterest,
    replyInterest,
    requestBorrow,
    claimDonation,
    confirmDonationHandover,
    updateItemStatus,
    deleteItem,
    toggleFavorite,
  } = useData()
  const item = items.find(
    (i) => i.id === id || String(i.dbId) === String(id) || i.id === `i${id}`,
  )
  const [interests, setInterests] = useState(() => getItemInterests(item?.id || id))
  const [message, setMessage] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [sendingReply, setSendingReply] = useState(null)
  const [borrowDays, setBorrowDays] = useState(14)
  const [borrowing, setBorrowing] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  const itemKey = String(item?.dbId || String(item?.id || '').replace(/^i/, ''))
  const isFav = favorites.map(String).includes(itemKey)
  const isOwner = String(item?.ownerId) === String(user?.id)
  const isDealType = item?.listingType === 'sell' || item?.listingType === 'exchange'
  const isClaimer = String(item?.donationClaim?.claimerId) === String(user?.id)
  const isDonateReserved =
    item?.listingType === 'donate' &&
    (item?.status === 'reserved' || item?.status === 'pending_handover')
  const canDonationChat = isOwner || isClaimer
  const myBorrowOnItem = borrows.find(
    (b) =>
      String(b.borrowerId) === String(user?.id) &&
      (b.itemId === item?.id ||
        b.itemId === `i${item?.dbId}` ||
        String(b.itemId) === String(item?.dbId)) &&
      (b.status === 'pending' || b.status === 'approved'),
  )
  const isBorrowParty =
    item?.listingType === 'borrow' &&
    (isOwner || Boolean(myBorrowOnItem) || String(item?.donationClaim?.claimerId) === String(user?.id))
  const canBorrowChat =
    isBorrowParty &&
    (item?.status === 'reserved' ||
      item?.status === 'borrowed' ||
      Boolean(myBorrowOnItem) ||
      Number(item?.interestCount || 0) > 0)

  function dueDateFromDays(days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  useEffect(() => {
    if (!item) return
    if (USE_API) {
      campusApi
        .item(item.dbId || item.id)
        .then((res) => setInterests(res.interests || []))
        .catch(() => setInterests([]))
    } else {
      setInterests(getItemInterests(item.id))
    }
  }, [item, getItemInterests])

  useEffect(() => {
    const hash = window.location.hash
    if (hash !== '#item-chat' && hash !== '#donation-chat') return
    const t = setTimeout(() => {
      document.getElementById('item-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
    return () => clearTimeout(t)
  }, [item?.id, interests.length])

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-[var(--muted)]">Barang tidak ditemukan.</p>
        <Link to="/app/exchange" className="mt-4 inline-block text-[var(--forest)]">
          Kembali ke daftar barang
        </Link>
      </div>
    )
  }

  const ai = buildAiDetailInsight(item, user, { items, borrows, favorites })
  const walk = walkEstimate(item, user)
  const ownerLine =
    [item.ownerStudyProgram || item.ownerFaculty, item.ownerUniversity]
      .filter(Boolean)
      .join(' · ') || 'Mahasiswa kampus'
  const ownerDeals = Number(item.ownerCompletedDeals || 0)
  const ownerStars = Math.min(5, Math.max(3, 3 + Math.floor(ownerDeals / 5)))
  const viewApprox =
    12 +
    Number(item.interestCount || 0) * 3 +
    Number(item.favoriteCount || 0) * 2 +
    (Number(item.dbId) || 0) % 17
  const postedLabel = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const visibleInterests = isOwner
    ? interests
    : interests.filter((row) => String(row.fromUserId) === String(user?.id))

  async function handlePrimary() {
    try {
      if (item.listingType === 'borrow') {
        setBorrowing(true)
        try {
          const row = await requestBorrow({
            itemId: item.dbId || item.id,
            dueDate: dueDateFromDays(borrowDays),
          })
          if (row?.interest) {
            setInterests((prev) => [{ ...row.interest, replies: row.interest.replies || [] }, ...prev])
          } else if (USE_API) {
            const detail = await campusApi.item(item.dbId || item.id)
            setInterests(detail.interests || [])
          }
          toast.success('Permintaan terkirim. Atur ketemu di chat.')
          navigate(`/app/exchange/${item.dbId || item.id}#item-chat`, { replace: true })
          requestAnimationFrame(() => {
            document.getElementById('item-chat')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          })
        } finally {
          setBorrowing(false)
        }
        return
      }
      if (item.listingType === 'donate') {
        const res = await claimDonation(item.dbId || item.id)
        toast[res.ok ? 'success' : 'error'](res.message)
          if (res.ok) {
            if (res.interest) {
              setInterests((prev) => [{ ...res.interest, replies: res.interest.replies || [] }, ...prev])
            } else if (USE_API) {
              const detail = await campusApi.item(item.dbId || item.id)
              setInterests(detail.interests || [])
            }
            toast.success('Atur pengambilan lewat chat.')
            requestAnimationFrame(() => {
              document.getElementById('item-chat')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            })
          }
        return
      }
      if (!message.trim()) {
        toast.error('Tulis pesan dulu')
        return
      }
      const row = await sendInterest({ itemId: item.dbId || item.id, message: message.trim() })
      setInterests((prev) => [{ ...row, replies: row.replies || [] }, ...prev])
      setMessage('')
      toast.success('Pesan terkirim')
      requestAnimationFrame(() => {
        document.getElementById('item-chat')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Aksi gagal')
    }
  }

  function scrollToChat() {
    document.getElementById('item-chat')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  async function handleReply(interest) {
    const text = (replyDrafts[interest.id] || '').trim()
    if (!text) {
      toast.error('Tulis balasan dulu')
      return
    }
    setSendingReply(interest.id)
    try {
      const res = await replyInterest({
        interestId: interest.dbId || interest.id,
        message: text,
      })
      const updated = res.interest
      const reply = res.data
      setInterests((prev) =>
        prev.map((row) => {
          if (row.id !== interest.id && String(row.dbId) !== String(interest.dbId)) return row
          if (updated) return { ...updated, replies: updated.replies || [] }
          return { ...row, replies: [...(row.replies || []), reply] }
        }),
      )
      setReplyDrafts((prev) => ({ ...prev, [interest.id]: '' }))
      toast.success('Balasan terkirim')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim balasan')
    } finally {
      setSendingReply(null)
    }
  }

  function canChat(interest) {
    return isOwner || String(interest.fromUserId) === String(user?.id)
  }

  async function handleDelete() {
    if (!window.confirm('Hapus listing ini? Tindakan ini tidak bisa dibatalkan.')) return
    try {
      await deleteItem(item.dbId || item.id)
      toast.success('Listing dihapus')
      navigate('/app/exchange?mine=1', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus listing')
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={
          item.listingType === 'borrow'
            ? '/app/exchange?type=borrow'
            : item.listingType === 'donate'
              ? '/app/exchange?type=donate'
              : isOwner
                ? '/app/exchange?mine=1'
                : '/app/exchange'
        }
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--forest)]"
      >
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="relative w-full overflow-hidden border border-[var(--line)] bg-[var(--mint)]">
          <img
            src={item.image}
            alt={item.title}
            className="aspect-square w-full object-cover"
          />
          {!isOwner && (
            <button
              type="button"
              disabled={favBusy}
              onClick={async () => {
                setFavBusy(true)
                try {
                  const nowFav = await toggleFavorite(item.dbId || item.id)
                  toast.success(nowFav ? 'Masuk ke favorit' : 'Dihapus dari favorit')
                } catch (err) {
                  toast.error(err?.message || 'Gagal nyimpan favorit')
                } finally {
                  setFavBusy(false)
                }
              }}
              className={`absolute right-3 top-3 rounded-full border bg-white/95 p-2.5 shadow-sm transition ${
                isFav
                  ? 'border-[var(--ember)] text-[var(--ember)]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--ember)]'
              }`}
              aria-label={isFav ? 'Hapus favorit' : 'Simpan favorit'}
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={item.listingType} />
            <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
            <Badge>{item.condition}</Badge>
            {isOwner && (
              <span className="rounded-full bg-[var(--mint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--forest-deep)]">
                Postingan Saya
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl font-semibold md:text-4xl">{item.title}</h1>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-semibold text-[var(--forest-deep)]">
              <Sparkles size={12} />
              Kecocokan {ai.matchPercent}%
            </span>
            {ai.conditionText && (
              <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
                Analisis AI · {ai.conditionText}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-semibold text-[var(--forest-deep)]">
              <Leaf size={12} />
              {impactBadgeText(item)}
            </span>
            {ai.greenChoice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3f0] px-2.5 py-1 text-xs font-semibold text-[var(--forest-deep)]">
                <Leaf size={12} />
                Green Choice
              </span>
            )}
          </div>

          <p className="text-base leading-relaxed text-[var(--muted)] whitespace-pre-line">
            {item.description}
          </p>

          <div className="grid gap-4 border-y border-[var(--line)] py-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-medium text-[var(--ink)]">
                <MapPin size={16} className="text-[var(--forest)]" />
                {item.location}
              </p>
              <p className="pl-6 text-xs text-[var(--forest)]">{walk.label}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-medium text-[var(--ink)]">
                <User size={16} className="text-[var(--forest)]" />
                {item.owner}
              </p>
              <p className="pl-6 text-xs text-[var(--muted)]">{ownerLine}</p>
              <p className="flex items-center gap-1 pl-6 text-xs text-[var(--forest)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={i < ownerStars ? 'currentColor' : 'none'}
                    className={i < ownerStars ? '' : 'text-[var(--line)]'}
                  />
                ))}
                <span className="ml-1 text-[var(--muted)]">
                  {ownerDeals} transaksi selesai
                </span>
              </p>
            </div>
            <p>
              Kategori: <strong>{item.category}</strong>
            </p>
            <p>
              {item.listingType === 'sell'
                ? `Harga: Rp ${Number(item.price || 0).toLocaleString('id-ID')}`
                : item.listingType === 'exchange'
                  ? `Dicari: ${item.lookingFor || '—'}`
                  : item.listingType === 'donate'
                    ? 'Gratis'
                    : 'Tanpa biaya'}
            </p>
          </div>

          <section className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--forest-deep)]">
              <Sparkles size={16} />
              Analisis AI
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--muted)]">Kecocokan</dt>
                <dd className="font-semibold text-[var(--ink)]">{ai.matchPercent}%</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Kondisi</dt>
                <dd className="font-semibold text-[var(--ink)]">{ai.conditionText}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Kategori</dt>
                <dd className="font-semibold text-[var(--ink)]">{ai.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Estimasi nilai</dt>
                <dd className="font-semibold text-[var(--ink)]">
                  Rp {Number(ai.estimatedValue).toLocaleString('id-ID')}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Usia pakai</dt>
                <dd className="font-semibold text-[var(--ink)]">
                  ±{ai.usefulLifeYears} tahun lagi
                </dd>
              </div>
            </dl>
            {ai.matchReasons?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-[var(--muted)]">Kenapa cocok untukmu</p>
                <ul className="mt-1.5 space-y-1">
                  {ai.matchReasons.map((reason) => (
                    <li key={reason} className="text-sm text-[var(--ink)]">
                      · {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-[var(--forest-deep)]">
              <span className="font-semibold">Rekomendasi · </span>
              {ai.advice}
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <h2 className="font-display text-lg font-semibold">Riwayat barang</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-[var(--muted)]">Diposting</dt>
                <dd className="font-semibold">{postedLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Dilihat</dt>
                <dd className="font-semibold">±{viewApprox}x</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Disimpan</dt>
                <dd className="font-semibold">{Number(item.favoriteCount || 0)} orang</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Minat / chat</dt>
                <dd className="font-semibold">{Number(item.interestCount || 0)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Diajukan pinjam</dt>
                <dd className="font-semibold">{Number(item.borrowCount || 0)} kali</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Berhasil dipinjam</dt>
                <dd className="font-semibold">{Number(item.borrowCompletedCount || 0)} kali</dd>
              </div>
            </dl>
          </section>

          {isOwner && isDealType && (item.status === 'available' || item.status === 'reserved') && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint)]/40 p-4 text-sm text-[var(--forest-deep)]">
              <p>
                Ada yang nanya? Balas di chat. Ketemu di kampus aja — bayar di luar app.
                Udah beres, tandai selesai.
              </p>
              {visibleInterests.length > 0 && (
                <Button type="button" className="mt-3" size="sm" onClick={scrollToChat}>
                  <MessageSquare size={14} />
                  Balas chat ({visibleInterests.length})
                </Button>
              )}
            </div>
          )}

          {item.listingType === 'borrow' && isOwner && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint)]/40 p-4 text-sm text-[var(--forest-deep)]">
              <p>
                Ada yang minta pinjam? Setujui di Status pinjam, balas chat buat atur ketemu,
                nanti mereka kembalikan.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/app/borrow?tab=incoming">
                  <Button type="button" size="sm" variant="secondary">
                    Ke Pinjam
                  </Button>
                </Link>
                {(visibleInterests.length > 0 || canBorrowChat) && (
                  <Button type="button" size="sm" onClick={scrollToChat}>
                    <MessageSquare size={14} />
                    Chat
                  </Button>
                )}
              </div>
            </div>
          )}

          {item.listingType === 'borrow' && !isOwner && myBorrowOnItem?.status === 'pending' && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint)]/40 p-4 text-sm text-[var(--forest-deep)]">
              <p>Menunggu disetujui. Bisa chat pemilik sambil nunggu.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={scrollToChat}>
                  <MessageSquare size={14} />
                  Ke chat
                </Button>
                <Link to="/app/borrow?tab=mine">
                  <Button type="button" size="sm" variant="secondary">
                    Status pinjam
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {item.listingType === 'borrow' && !isOwner && myBorrowOnItem?.status === 'approved' && (
            <div className="rounded-2xl border-2 border-[var(--forest)] bg-[var(--mint)]/50 p-4 text-sm text-[var(--forest-deep)]">
              <p className="flex items-center gap-2 font-semibold">
                <MessageSquare size={18} />
                Disetujui — atur ketemu di chat
              </p>
              <p className="mt-2">
                Lokasi: <strong>{item.location || 'kampus'}</strong> · kembali sebelum{' '}
                <strong>{myBorrowOnItem.dueDate}</strong>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={scrollToChat}>
                  <MessageSquare size={14} />
                  Ke chat
                </Button>
                <Link to="/app/borrow?tab=mine">
                  <Button type="button" size="sm" variant="secondary">
                    Kembalikan di Pinjam
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {item.listingType === 'borrow' &&
            !isOwner &&
            item.status === 'available' &&
            !myBorrowOnItem && (
              <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--mint)]/35 p-4 text-sm text-[var(--forest-deep)]">
                <p>Pilih lama pinjam. Setelah disetujui, atur ketemu di chat.</p>
                <div className="flex flex-wrap gap-2">
                  {[7, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBorrowDays(d)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                        borrowDays === d
                          ? 'bg-[var(--forest)] text-white'
                          : 'bg-white text-[var(--muted)] hover:bg-[var(--mint)]'
                      }`}
                    >
                      {d} hari
                    </button>
                  ))}
                </div>
              </div>
            )}

          {item.listingType === 'donate' && item.status === 'available' && !isOwner && (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint)]/35 p-4 text-sm text-[var(--forest-deep)]">
              <p>
                Klaim dulu, terus chat pemberi buat atur ambil di{' '}
                <strong>{item.location || 'kampus'}</strong>.
              </p>
            </div>
          )}

          {isDonateReserved && canDonationChat && (
            <div className="rounded-2xl border-2 border-[var(--forest)] bg-[var(--mint)]/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-[var(--forest-deep)]">
                <MessageSquare size={18} />
                Chat buat atur ambil
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-[var(--muted)]">Pemberi:</span>{' '}
                  <strong>{item.owner}</strong>
                </p>
                <p>
                  <span className="text-[var(--muted)]">Penerima:</span>{' '}
                  <strong>{item.donationClaim?.claimerName || '—'}</strong>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-[var(--muted)]">Lokasi ambil:</span>{' '}
                  <strong>{item.location || 'Sepakati di chat'}</strong>
                </p>
              </div>
              <Button type="button" className="mt-4 w-full" onClick={scrollToChat}>
                <MessageSquare size={16} />
                Ke chat
              </Button>
            </div>
          )}

          {!isOwner && isDealType && item.status === 'available' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Tulis pesan</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Halo, masih ada? Bisa ketemu di mana?"
                className="field"
              />
              <p className="text-xs text-[var(--muted)]">
                Nanti lanjut ngobrol di bawah buat atur ketemu.
              </p>
            </div>
          )}

          {!isOwner && isDealType && visibleInterests.length > 0 && (
            <Button type="button" variant="secondary" onClick={scrollToChat}>
              <MessageSquare size={16} />
              Ke chat
            </Button>
          )}

          <div className="flex flex-wrap gap-3">
            {!isOwner && item.status === 'available' && !(item.listingType === 'borrow' && myBorrowOnItem) && (
              <Button onClick={handlePrimary} disabled={borrowing}>
                {item.listingType === 'borrow'
                  ? borrowing
                    ? 'Mengirim…'
                    : `Ajukan pinjam · ${borrowDays} hari`
                  : item.listingType === 'donate'
                    ? 'Klaim'
                    : 'Kirim pesan'}
              </Button>
            )}

            {isOwner && isDealType && item.status === 'available' && (
              <>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await updateItemStatus(item.id, 'reserved')
                    toast.success('Ditandai lagi diproses')
                  }}
                >
                  Lagi diproses
                </Button>
                <Button
                  onClick={async () => {
                    const nextStatus = item.listingType === 'sell' ? 'sold' : 'exchanged'
                    await updateItemStatus(item.id, nextStatus)
                    toast.success(
                      item.listingType === 'sell' ? 'Sudah terjual' : 'Tukar selesai',
                    )
                  }}
                >
                  {item.listingType === 'sell' ? 'Sudah terjual' : 'Sudah ditukar'}
                </Button>
              </>
            )}

            {isOwner && item.status === 'reserved' && isDealType && (
              <Button
                onClick={async () => {
                  const nextStatus = item.listingType === 'sell' ? 'sold' : 'exchanged'
                  await updateItemStatus(item.id, nextStatus)
                  toast.success(
                    item.listingType === 'sell' ? 'Sudah terjual' : 'Tukar selesai',
                  )
                }}
              >
                {item.listingType === 'sell' ? 'Sudah terjual' : 'Sudah ditukar'}
              </Button>
            )}

            {isOwner && item.status === 'available' && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!window.confirm('Tutup dulu? Bisa dibuka lagi nanti.')) {
                    return
                  }
                  await updateItemStatus(item.id, 'closed')
                  toast.success('Ditutup. Bisa dibuka lagi kapan saja.')
                }}
              >
                Tutup dulu
              </Button>
            )}

            {isOwner &&
              (item.status === 'closed' ||
                item.status === 'reserved' ||
                item.status === 'exchanged') && (
              <Button
                onClick={async () => {
                  await updateItemStatus(item.id, 'available')
                  toast.success('Diaktifkan kembali')
                }}
              >
                Aktifkan kembali
              </Button>
            )}

            {isOwner && (
              <Button
                variant="secondary"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                Hapus postingan
              </Button>
            )}

            {(item.status === 'reserved' || item.status === 'pending_handover') &&
              (isOwner || String(item.donationClaim?.claimerId) === String(user?.id)) &&
              item.listingType === 'donate' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      scrollToChat()
                    }}
                  >
                    <MessageSquare size={16} />
                    Chat
                  </Button>
                  <Button
                    onClick={async () => {
                      await confirmDonationHandover(item.id)
                      toast.success('Serah terima dikonfirmasi!')
                    }}
                  >
                    Konfirmasi Serah Terima
                  </Button>
                </>
              )}
          </div>
        </div>
      </div>

      {(item.listingType === 'donate' || isDealType || item.listingType === 'borrow') && (
      <section
        id="item-chat"
        className={`mt-10 scroll-mt-6 border p-5 ${
          (isDonateReserved && canDonationChat) ||
          (isDealType && visibleInterests.length > 0) ||
          (item.listingType === 'borrow' && canBorrowChat && visibleInterests.length > 0)
            ? 'border-[var(--forest)] bg-[var(--mint)]/25 shadow-[0_0_0_3px_rgba(15,92,76,0.12)]'
            : 'border-[var(--line)] bg-white'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--forest)] text-white">
                <MessageSquare size={18} />
              </span>
              {item.listingType === 'donate'
                ? isOwner
                  ? `Chat (${visibleInterests.length})`
                  : 'Chat pemberi'
                : item.listingType === 'borrow'
                  ? isOwner
                    ? `Chat peminjam (${visibleInterests.length})`
                    : 'Chat pemilik'
                  : isOwner
                    ? `Chat (${visibleInterests.length})`
                    : 'Chat'}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {item.listingType === 'donate'
                ? 'Biar gampang atur kapan & di mana ambil.'
                : item.listingType === 'borrow'
                  ? 'Atur ketemu & pengembalian di sini.'
                  : 'Biar gampang atur ketemu di kampus.'}
            </p>
          </div>
          {((isDonateReserved && canDonationChat) ||
            (isDealType && visibleInterests.length > 0) ||
            (item.listingType === 'borrow' && canBorrowChat && visibleInterests.length > 0)) && (
            <span className="rounded-full bg-[var(--forest)] px-3 py-1 text-xs font-semibold text-white">
              Ada chat
            </span>
          )}
        </div>

        {visibleInterests.length === 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              {item.listingType === 'donate'
                ? isOwner
                  ? 'Belum ada yang klaim.'
                  : isClaimer
                    ? 'Belum ada chat. Mulai dari tombol di bawah.'
                    : 'Klaim dulu baru bisa chat.'
                : item.listingType === 'borrow'
                  ? isOwner
                    ? 'Belum ada yang minta pinjam.'
                    : myBorrowOnItem || String(item.donationClaim?.claimerId) === String(user?.id)
                      ? 'Belum ada thread. Mulai chat di bawah.'
                      : 'Ajukan pinjam dulu untuk mulai chat.'
                  : isOwner
                    ? 'Belum ada yang nanya.'
                    : 'Tulis pesan di atas dulu.'}
            </p>
            {((item.listingType === 'donate' && isClaimer && isDonateReserved) ||
              (item.listingType === 'borrow' &&
                !isOwner &&
                (myBorrowOnItem || String(item.donationClaim?.claimerId) === String(user?.id)))) && (
              <Button
                onClick={async () => {
                  try {
                    const msg =
                      item.listingType === 'borrow'
                        ? `Halo, saya pinjam "${item.title}". Kapan bisa ketemu di ${item.location || 'kampus'}?`
                        : `Halo, saya mengklaim donasi "${item.title}". Kapan bisa ambil di ${item.location || 'kampus'}?`
                    const row = await sendInterest({
                      itemId: item.id,
                      message: msg,
                    })
                    setInterests((prev) => [{ ...row, replies: row.replies || [] }, ...prev])
                    toast.success('Chat dimulai')
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Gagal mulai chat')
                  }
                }}
              >
                <MessageSquare size={16} />
                Mulai chat
              </Button>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {visibleInterests.map((row) => {
              const rootMine = String(row.fromUserId) === String(user?.id)
              return (
              <li key={row.id} className="rounded-2xl border border-[var(--line)] bg-[#f4f7f5] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Chat dengan {rootMine ? item.owner : row.fromName}
                  </p>
                  {!rootMine && row.fromFaculty && (
                    <span className="text-xs text-[var(--muted)]">{row.fromFaculty}</span>
                  )}
                </div>

                <div className="space-y-2.5">
                  <ChatBubble
                    mine={rootMine}
                    name={rootMine ? 'Kamu' : row.fromName}
                    message={row.message}
                    time={
                      row.createdAt
                        ? new Date(row.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''
                    }
                  />
                  {(row.replies || []).map((reply) => {
                    const mine = String(reply.fromUserId) === String(user?.id)
                    return (
                      <ChatBubble
                        key={reply.id}
                        mine={mine}
                        name={mine ? 'Kamu' : reply.fromName}
                        message={reply.message}
                        time={
                          reply.createdAt
                            ? new Date(reply.createdAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''
                        }
                      />
                    )
                  })}
                </div>

                {canChat(row) && item.status !== 'sold' && item.status !== 'exchanged' && (
                  <div className="mt-3 flex gap-2">
                    <input
                      className="field flex-1"
                      placeholder="Tulis balasan…"
                      value={replyDrafts[row.id] || ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleReply(row)
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      disabled={sendingReply === row.id}
                      onClick={() => handleReply(row)}
                    >
                      <Send size={14} />
                      Kirim
                    </Button>
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}
      </section>
      )}
    </div>
  )
}
