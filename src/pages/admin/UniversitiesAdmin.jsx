import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

const STATUS_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Nonaktif' },
  { id: 'no_admin', label: 'Tanpa admin' },
]

function uniStatusLabel(status) {
  return status === 'active' ? 'Aktif' : 'Nonaktif'
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UniversitiesAdmin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', city: '' })
  const [editForm, setEditForm] = useState({ name: '', code: '', city: '' })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(() => {
    setLoading(true)
    campusApi
      .adminUniversities({ q: debouncedQ || undefined })
      .then(setRows)
      .catch(() => toast.error('Gagal memuat universitas'))
      .finally(() => setLoading(false))
  }, [debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (statusFilter === 'active') return rows.filter((u) => u.status === 'active')
    if (statusFilter === 'inactive') return rows.filter((u) => u.status === 'inactive')
    if (statusFilter === 'no_admin') return rows.filter((u) => !u.hasCampusAdmin)
    return rows
  }, [rows, statusFilter])

  const summary = useMemo(() => {
    const all = rows
    return {
      total: all.length,
      active: all.filter((u) => u.status === 'active').length,
      inactive: all.filter((u) => u.status === 'inactive').length,
      withoutAdmin: all.filter((u) => !u.hasCampusAdmin).length,
    }
  }, [rows])

  async function createUniversity(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await campusApi.adminCreateUniversity(form)
      toast.success('Universitas ditambahkan')
      setForm({ name: '', code: '', city: '' })
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
          'Gagal menambah universitas',
      )
    } finally {
      setSaving(false)
    }
  }

  async function saveUniversity(uni) {
    setSaving(true)
    try {
      await campusApi.adminUpdateUniversity(uni.id, {
        name: editForm.name,
        code: editForm.code,
        city: editForm.city || null,
      })
      toast.success('Universitas diperbarui')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(uni) {
    try {
      await campusApi.adminUpdateUniversity(uni.id, {
        status: uni.status === 'active' ? 'inactive' : 'active',
      })
      toast.success(uni.status === 'active' ? 'Universitas dinonaktifkan' : 'Universitas diaktifkan')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah status')
    }
  }

  async function removeUniversity(uni) {
    if (!confirm(`Hapus universitas "${uni.name}"? Tindakan ini permanen.`)) return
    try {
      await campusApi.adminDeleteUniversity(uni.id)
      toast.success('Universitas dihapus')
      setOpenId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus universitas')
    }
  }

  function openEdit(uni) {
    setOpenId(uni.id)
    setEditForm({
      name: uni.name || '',
      code: uni.code || '',
      city: uni.city || '',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Kelola Universitas"
        description="Onboarding kampus baru, status aktif, dan kesiapan admin kampus."
        action={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Tutup form' : 'Tambah'}
          </Button>
        }
      />

      {!loading && rows.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryPill label="Total kampus" value={summary.total} />
          <SummaryPill label="Aktif" value={summary.active} />
          <SummaryPill label="Nonaktif" value={summary.inactive} />
          <SummaryPill label="Tanpa admin" value={summary.withoutAdmin} tone="warn" />
        </section>
      )}

      <SearchBar value={q} onChange={setQ} placeholder="Cari nama, kode, atau kota…" />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <FilterChip
            key={tab.id}
            active={statusFilter === tab.id}
            onClick={() => setStatusFilter(tab.id)}
            label={tab.label}
          />
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={createUniversity}
          className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 md:grid-cols-2"
        >
          <Field
            label="Nama"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Universitas Sebelas Maret"
          />
          <Field
            label="Kode"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="UNS"
          />
          <Field
            label="Kota"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Surakarta"
          />
          <div className="flex items-end md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan universitas'}
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
          filtered.map((u) => {
            const open = openId === u.id
            return (
              <div
                key={u.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => (open ? setOpenId(null) : openEdit(u))}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={u.status === 'active' ? 'available' : 'expired'}>
                        {uniStatusLabel(u.status)}
                      </Badge>
                      {!u.hasCampusAdmin && (
                        <Badge tone="expired">Belum ada admin</Badge>
                      )}
                      <span className="text-xs font-semibold text-[var(--forest)]">{u.code}</span>
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold">{u.name}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {u.city || 'Kota belum diisi'} · {u.studentsCount ?? 0} mahasiswa ·{' '}
                      {u.campusAdminsCount ?? 0} admin
                    </p>
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <div className="space-y-3 border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <MetaPill label="Mahasiswa" value={u.studentsCount ?? 0} />
                      <MetaPill label="Admin kampus" value={u.campusAdminsCount ?? 0} />
                      <MetaPill label="Bergabung" value={formatDate(u.createdAt)} />
                    </div>

                    <Field
                      label="Nama"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Kode"
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                        }
                      />
                      <Field
                        label="Kota"
                        value={editForm.city}
                        onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </div>

                    {!u.hasCampusAdmin && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-950">
                        Kampus ini belum punya admin — buat admin agar operasional kampus bisa jalan.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={saving} onClick={() => saveUniversity(u)}>
                        {saving ? 'Menyimpan…' : 'Simpan perubahan'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleStatus(u)}>
                        {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      {!u.hasCampusAdmin && (
                        <Link to={`/admin/super/admins?university=${u.id}`}>
                          <Button size="sm" variant="secondary" type="button">
                            Buat admin kampus
                          </Button>
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removeUniversity(u)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

        {!loading && filtered.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            {q || statusFilter !== 'all'
              ? 'Tidak ada universitas untuk filter ini.'
              : 'Belum ada universitas.'}
          </p>
        )}
      </div>
    </div>
  )
}

function SummaryPill({ label, value, tone = 'default' }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${
        tone === 'warn' && value > 0
          ? 'border border-amber-200 bg-amber-50/70'
          : 'border border-[var(--line)] bg-white'
      }`}
    >
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

function MetaPill({ label, value }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--line)]">
      <span className="text-[var(--muted)]">{label}</span>{' '}
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </span>
  )
}
