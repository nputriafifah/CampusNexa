import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'

const STATUS_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'published', label: 'Tayang' },
  { id: 'draft', label: 'Draft' },
]

const empty = { title: '', body: '' }

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

function previewBody(text, max = 120) {
  if (!text) return ''
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max)}…`
}

export default function CampusAnnouncements() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [globalCounts, setGlobalCounts] = useState({ total: 0, published: 0, draft: 0 })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      campusApi.adminAnnouncements({
        q: debouncedQ || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
      campusApi.adminAnnouncements(),
    ])
      .then(([filtered, all]) => {
        setRows(filtered)
        setGlobalCounts({
          total: all.length,
          published: all.filter((r) => r.publishedAt).length,
          draft: all.filter((r) => !r.publishedAt).length,
        })
      })
      .catch(() => toast.error('Gagal muat pengumuman'))
      .finally(() => setLoading(false))
  }, [debouncedQ, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const counts = globalCounts

  function startCreate() {
    setEditingId(null)
    setForm(empty)
    setShowForm(true)
    setOpenId(null)
  }

  function startEdit(row) {
    setEditingId(row.id)
    setForm({ title: row.title || '', body: row.body || '' })
    setShowForm(true)
    setOpenId(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(empty)
  }

  async function saveAnnouncement(publish) {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Judul dan isi wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await campusApi.adminUpdateAnnouncement(editingId, {
          title: form.title,
          body: form.body,
          ...(publish !== undefined ? { publish } : {}),
        })
        toast.success(publish === false ? 'Draft disimpan' : 'Pengumuman diperbarui')
      } else {
        await campusApi.adminCreateAnnouncement({ ...form, publish: publish !== false })
        toast.success(publish === false ? 'Draft disimpan' : 'Pengumuman dipublikasikan')
      }
      cancelForm()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal simpan')
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    await saveAnnouncement(true)
  }

  async function togglePublish(row) {
    try {
      await campusApi.adminUpdateAnnouncement(row.id, {
        publish: !row.publishedAt,
      })
      toast.success(row.publishedAt ? 'Disembunyikan' : 'Dipublikasikan')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal update')
    }
  }

  async function remove(id) {
    if (!confirm('Hapus pengumuman ini?')) return
    try {
      await campusApi.adminDeleteAnnouncement(id)
      toast.success('Dihapus')
      if (editingId === id) cancelForm()
      if (openId === id) setOpenId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Kelola Pengumuman"
        description="Info resmi untuk mahasiswa: makanan, acara, atau kebijakan kampus."
        action={
          <Button size="sm" onClick={() => (showForm && !editingId ? cancelForm() : startCreate())}>
            {showForm && !editingId ? 'Tutup form' : 'Buat Pengumuman'}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <StatPill label="Total" value={counts.total} />
        <StatPill label="Tayang" value={counts.published} tone="forest" />
        <StatPill label="Draft" value={counts.draft} tone="muted" />
      </div>

      <div className="space-y-3">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Cari judul atau isi pengumuman…"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
              label={f.label}
            />
          ))}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <p className="text-sm font-semibold">
            {editingId ? 'Edit pengumuman' : 'Pengumuman baru'}
          </p>
          <Field
            label="Judul"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Field
            as="textarea"
            label="Isi"
            rows={5}
            required
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Menyimpan…'
                : editingId
                  ? 'Simpan & tayangkan'
                  : 'Publikasikan ke mahasiswa'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => saveAnnouncement(false)}
            >
              Simpan draft
            </Button>
            <Button type="button" variant="ghost" onClick={cancelForm}>
              Batal
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading && (
          <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
            Memuat…
          </p>
        )}

        {!loading &&
          rows.map((row) => {
            const open = openId === row.id
            return (
              <div
                key={row.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={row.publishedAt ? 'approved' : 'pending'}>
                        {row.publishedAt ? 'Tayang' : 'Draft'}
                      </Badge>
                      {row.authorName && (
                        <span className="text-xs text-[var(--muted)]">oleh {row.authorName}</span>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold">{row.title}</h3>
                    {!open && (
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                        {previewBody(row.body)}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      {row.publishedAt
                        ? `Dipublikasikan ${formatDateTime(row.publishedAt)}`
                        : `Draft · dibuat ${formatDateTime(row.createdAt)}`}
                    </p>
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
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {row.createdAt && (
                        <MetaPill label="Dibuat" value={formatDateTime(row.createdAt)} />
                      )}
                      {row.publishedAt && (
                        <MetaPill label="Tayang sejak" value={formatDateTime(row.publishedAt)} />
                      )}
                      {row.authorName && <MetaPill label="Penulis" value={row.authorName} />}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => togglePublish(row)}>
                        {row.publishedAt ? 'Sembunyikan' : 'Publikasikan'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

        {!loading && rows.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            {q || statusFilter !== 'all'
              ? 'Tidak ada pengumuman untuk filter ini.'
              : 'Belum ada pengumuman. Klik Buat Pengumuman di atas.'}
          </p>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-[var(--forest)] text-white'
          : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  )
}

function StatPill({ label, value, tone = 'default' }) {
  const styles =
    tone === 'forest'
      ? 'bg-[var(--forest)]/10 text-[var(--forest)]'
      : tone === 'muted'
        ? 'bg-[#eef3f0] text-[var(--muted)]'
        : 'bg-white ring-1 ring-[var(--line)] text-[var(--ink)]'
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${styles}`}>
      {label}: {value}
    </span>
  )
}

function MetaPill({ label, value }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--line)]">
      <span className="text-[var(--muted)]">{label}</span>{' '}
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </span>
  )
}
