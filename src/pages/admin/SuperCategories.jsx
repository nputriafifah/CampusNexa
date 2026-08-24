import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

const JENIS_TABS = [
  { id: 'all', label: 'Semua jenis' },
  { id: 'resource', label: 'Barang' },
  { id: 'community', label: 'Komunitas' },
  { id: 'food_rescue', label: 'Makanan' },
  { id: 'ewaste', label: 'Sampah elektronik' },
]

const JENIS_FORM = JENIS_TABS.filter((j) => j.id !== 'all')

const JENIS_LABEL = Object.fromEntries(JENIS_FORM.map((j) => [j.id, j.label]))

function summaryLabels(jenis) {
  if (jenis === 'all') {
    return { total: 'Total kategori', active: 'Aktif', inactive: 'Nonaktif' }
  }
  if (jenis === 'resource') {
    return {
      total: 'Kategori barang',
      active: 'Aktif (tampil di upload)',
      inactive: 'Nonaktif',
    }
  }
  const label = JENIS_LABEL[jenis] || jenis
  return {
    total: `Kategori ${label.toLowerCase()}`,
    active: 'Aktif',
    inactive: 'Nonaktif',
  }
}

const STATUS_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Nonaktif' },
]

export default function SuperCategories() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [jenis, setJenis] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', group: 'resource' })
  const [editForm, setEditForm] = useState({ name: '', group: 'resource' })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(() => {
    setLoading(true)
    campusApi
      .adminCategories({
        group: jenis === 'all' ? undefined : jenis,
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: debouncedQ || undefined,
      })
      .then(setRows)
      .catch(() => toast.error('Gagal memuat kategori'))
      .finally(() => setLoading(false))
  }, [jenis, statusFilter, debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (jenis !== 'all') {
      setForm((p) => ({ ...p, group: jenis }))
    }
  }, [jenis])

  const summary = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.isActive).length,
      inactive: rows.filter((r) => !r.isActive).length,
    }),
    [rows]
  )

  const summaryCopy = summaryLabels(jenis)

  function openEdit(row) {
    setOpenId(row.id)
    setEditForm({ name: row.name, group: row.group || 'resource' })
  }

  async function createCategory(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Nama kategori wajib diisi')
      return
    }
    setSaving(true)
    try {
      await campusApi.adminCreateCategory(form)
      toast.success('Kategori ditambahkan')
      setForm({ name: '', group: jenis === 'all' ? 'resource' : jenis })
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambah')
    } finally {
      setSaving(false)
    }
  }

  async function saveCategory(row) {
    if (!editForm.name.trim()) {
      toast.error('Nama kategori wajib diisi')
      return
    }
    setSaving(true)
    try {
      await campusApi.adminUpdateCategory(row.id, editForm)
      toast.success('Kategori diperbarui')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    try {
      await campusApi.adminUpdateCategory(row.id, { is_active: !row.isActive })
      toast.success(row.isActive ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status')
    }
  }

  async function removeCategory(row) {
    if (!confirm(`Hapus kategori "${row.name}"?`)) return
    try {
      await campusApi.adminDeleteCategory(row.id)
      toast.success('Kategori dihapus')
      setOpenId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus')
    }
  }

  const isUploadCategory = (row) => row.group === 'resource' && row.isActive

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Kelola Kategori"
        description="Atur kategori barang, komunitas, dan jenis lain di semua kampus."
        action={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Tutup' : 'Tambah kategori'}
          </Button>
        }
      />

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Cari nama kategori…" />

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {JENIS_TABS.map((tab) => (
            <FilterChip
              key={tab.id}
              active={jenis === tab.id}
              onClick={() => setJenis(tab.id)}
              label={tab.label}
            />
          ))}
          <select
            className="ml-auto min-w-[8.5rem] rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--leaf)]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status"
          >
            {STATUS_TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label === 'Semua' ? 'Semua status' : tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryPill label={summaryCopy.total} value={summary.total} />
          <SummaryPill label={summaryCopy.active} value={summary.active} />
          <SummaryPill label={summaryCopy.inactive} value={summary.inactive} />
        </section>
      )}

      {showForm && (
        <form
          onSubmit={createCategory}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <p className="text-sm font-medium">Tambah kategori baru</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nama kategori"
              required
              hint="Contoh: Elektronik, Buku, Pakaian"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Jenis kategori</span>
              <select
                className="field w-full"
                value={form.group}
                onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
              >
                {JENIS_FORM.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan kategori'}
          </Button>
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
            const inUse = (row.itemsCount ?? 0) > 0

            return (
              <div
                key={row.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => (open ? setOpenId(null) : openEdit(row))}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={row.isActive ? 'available' : 'expired'}>
                        {row.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                      <Badge tone="borrow">{JENIS_LABEL[row.group] || row.group}</Badge>
                      {isUploadCategory(row) && <Badge tone="approved">Tampil di upload</Badge>}
                      {inUse && (
                        <span className="text-xs text-[var(--muted)]">{row.itemsCount} barang</span>
                      )}
                    </div>
                    <p className="mt-1.5 font-display text-base font-semibold">{row.name}</p>
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <div className="space-y-3 border-t border-[var(--line)] bg-[#f8faf9] px-4 py-4">
                    {inUse && (
                      <p className="text-sm text-[var(--muted)]">
                        Dipakai {row.itemsCount} barang — lebih aman nonaktifkan daripada hapus.
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Nama kategori"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">Jenis kategori</span>
                        <select
                          className="field w-full"
                          value={editForm.group}
                          onChange={(e) => setEditForm((f) => ({ ...f, group: e.target.value }))}
                          disabled={inUse}
                        >
                          {JENIS_FORM.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.label}
                            </option>
                          ))}
                        </select>
                        {inUse && (
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            Jenis tidak bisa diubah karena masih dipakai barang.
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={saving} onClick={() => saveCategory(row)}>
                        {saving ? 'Menyimpan…' : 'Simpan'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleActive(row)}>
                        {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={inUse}
                        onClick={() => removeCategory(row)}
                      >
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
            {q || jenis !== 'all' || statusFilter !== 'all'
              ? 'Tidak ada kategori untuk filter ini.'
              : 'Belum ada kategori. Klik "Tambah kategori" untuk mulai.'}
          </p>
        )}
      </div>
    </div>
  )
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? 'bg-[var(--forest)] text-white' : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)]'
      }`}
    >
      {label}
    </button>
  )
}
