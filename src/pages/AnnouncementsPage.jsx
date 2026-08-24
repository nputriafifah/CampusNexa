import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function previewBody(text, max = 140) {
  if (!text) return ''
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max)}…`
}

export default function AnnouncementsPage() {
  const location = useLocation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    campusApi
      .announcements()
      .then((data) => {
        if (!cancelled) setRows(data || [])
      })
      .catch(() => {
        if (!cancelled) toast.error('Gagal muat pengumuman')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (!hash || rows.length === 0) return
    const id = Number(hash)
    if (!Number.isFinite(id)) return
    setOpenId(id)
    requestAnimationFrame(() => {
      document.getElementById(`announcement-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash, rows])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Pengumuman kampus"
        description="Info resmi dari admin kampus — acara, makanan, kebijakan, dan lainnya."
      />

      {loading ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
          Memuat…
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada pengumuman"
          description="Kalau admin kampus publish info baru, akan muncul di sini dan di beranda."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const open = openId === row.id
            return (
              <article
                key={row.id}
                id={`announcement-${row.id}`}
                className={`overflow-hidden rounded-2xl border bg-white transition scroll-mt-24 ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--muted)]">
                      {formatDateTime(row.publishedAt)}
                      {row.authorName ? ` · ${row.authorName}` : ''}
                    </p>
                    <h2 className="mt-1 font-display text-base font-semibold text-[var(--ink)]">
                      {row.title}
                    </h2>
                    {!open && (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                        {previewBody(row.body)}
                      </p>
                    )}
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>
                {open && (
                  <div className="border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
                      {row.body}
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
