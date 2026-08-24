import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { roleLabel } from '../../lib/roles'

const STATUS_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Nonaktif' },
]

function accountStatusLabel(status) {
  return status === 'inactive' ? 'Nonaktif' : 'Aktif'
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CampusAdminsPage() {
  const [searchParams] = useSearchParams()
  const preselectUni = searchParams.get('university')

  const [admins, setAdmins] = useState([])
  const [universities, setUniversities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [uniFilter, setUniFilter] = useState(preselectUni || 'all')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    university_id: '',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    university_id: '',
  })
  const [resetForm, setResetForm] = useState({
    password: '',
    password_confirmation: '',
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    if (preselectUni) setUniFilter(preselectUni)
  }, [preselectUni])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [users, unis] = await Promise.all([
        campusApi.adminCampusAdmins(),
        campusApi.adminUniversities(),
      ])
      setAdmins(users)
      setUniversities(unis)
    } catch {
      toast.error('Gagal memuat admin kampus')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = admins
    const needle = debouncedQ.toLowerCase()
    if (needle) {
      list = list.filter((a) => {
        const hay = [a.name, a.email, a.university, a.universityCode]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    if (statusFilter === 'active') {
      list = list.filter((a) => a.accountStatus !== 'inactive')
    }
    if (statusFilter === 'inactive') {
      list = list.filter((a) => a.accountStatus === 'inactive')
    }
    if (uniFilter !== 'all') {
      list = list.filter((a) => String(a.universityId) === uniFilter)
    }
    return list
  }, [admins, debouncedQ, statusFilter, uniFilter])

  useEffect(() => {
    if (universities.length === 0) return
    const defaultUni = preselectUni && universities.some((u) => String(u.id) === preselectUni)
      ? preselectUni
      : String(universities[0].id)
    setForm((f) => (f.university_id ? f : { ...f, university_id: defaultUni }))
  }, [universities, preselectUni])

  useEffect(() => {
    if (!preselectUni || universities.length === 0) return
    if (!universities.some((u) => String(u.id) === preselectUni)) return
    setForm((f) => ({ ...f, university_id: preselectUni }))
    setShowForm(true)
  }, [preselectUni, universities])

  const unisWithoutAdmin = useMemo(
    () => universities.filter((u) => !u.hasCampusAdmin),
    [universities],
  )

  const preselectedUni = useMemo(
    () => universities.find((u) => String(u.id) === preselectUni),
    [universities, preselectUni],
  )

  const summary = useMemo(() => {
    const active = admins.filter((a) => a.accountStatus !== 'inactive').length
    return {
      total: admins.length,
      active,
      inactive: admins.length - active,
      withoutAdmin: unisWithoutAdmin.length,
    }
  }, [admins, unisWithoutAdmin.length])

  function openAdmin(admin) {
    setOpenId(admin.id)
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      whatsapp: admin.whatsapp || '',
      university_id: String(
        admin.universityId || universities.find((u) => u.name === admin.university)?.id || '',
      ),
    })
    setResetForm({ password: '', password_confirmation: '' })
  }

  async function createAdmin(e) {
    e.preventDefault()
    if (!form.university_id) {
      toast.error('Pilih universitas')
      return
    }
    try {
      await campusApi.adminCreateCampusAdmin({
        ...form,
        university_id: Number(form.university_id),
      })
      toast.success('Admin kampus dibuat')
      setForm((f) => ({ ...f, name: '', email: '', password: '' }))
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
          'Gagal membuat admin',
      )
    }
  }

  async function saveAdmin(admin) {
    if (!editForm.university_id) {
      toast.error('Pilih universitas')
      return
    }
    setSaving(true)
    try {
      await campusApi.adminUpdateCampusAdmin(admin.id, {
        name: editForm.name,
        email: editForm.email,
        whatsapp: editForm.whatsapp.trim() || null,
        university_id: Number(editForm.university_id),
      })
      toast.success('Admin diperbarui')
      load()
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
          'Gagal menyimpan',
      )
    } finally {
      setSaving(false)
    }
  }

  async function resetPassword(admin) {
    if (resetForm.password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter')
      return
    }
    if (resetForm.password !== resetForm.password_confirmation) {
      toast.error('Konfirmasi kata sandi tidak cocok')
      return
    }
    setSaving(true)
    try {
      await campusApi.adminResetCampusAdminPassword(admin.id, resetForm)
      toast.success('Kata sandi direset')
      setResetForm({ password: '', password_confirmation: '' })
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
          'Gagal reset kata sandi',
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeAdmin(admin) {
    if (!confirm(`Hapus admin "${admin.name}"?`)) return
    try {
      await campusApi.adminDeleteCampusAdmin(admin.id)
      toast.success('Admin dihapus')
      setOpenId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus admin')
    }
  }

  async function toggleStatus(admin) {
    const next = admin.accountStatus === 'inactive' ? 'active' : 'inactive'
    try {
      await campusApi.adminUpdateCampusAdmin(admin.id, { account_status: next })
      toast.success(next === 'active' ? 'Admin diaktifkan' : 'Admin dinonaktifkan')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah status')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Super Admin"
        title="Kelola Campus Admin"
        description="Buat dan kelola admin operasional untuk setiap universitas."
        action={
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            disabled={universities.length === 0}
          >
            {showForm ? 'Tutup form' : 'Buat admin'}
          </Button>
        }
      />

      {universities.length === 0 && !loading && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <p className="text-sm text-amber-950">Belum ada universitas terdaftar.</p>
          <Link to="/admin/super/universities" className="mt-2 inline-block text-sm font-semibold text-[var(--forest)] hover:underline">
            Tambah universitas dulu →
          </Link>
        </section>
      )}

      {preselectedUni && !loading && (
        <p className="rounded-2xl border border-[var(--forest)]/25 bg-[#eef3f0] px-4 py-3 text-sm">
          Membuat admin untuk{' '}
          <span className="font-semibold">
            {preselectedUni.code} · {preselectedUni.name}
          </span>
        </p>
      )}

      {unisWithoutAdmin.length > 0 && !loading && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <p className="text-sm font-medium text-amber-950">
            {unisWithoutAdmin.length} kampus belum punya admin
          </p>
          <ul className="mt-2 space-y-1">
            {unisWithoutAdmin.slice(0, 4).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {u.code} · {u.name}
                </span>
                <button
                  type="button"
                  className="font-semibold text-[var(--forest)] hover:underline"
                  onClick={() => {
                    setForm((f) => ({ ...f, university_id: String(u.id) }))
                    setUniFilter(String(u.id))
                    setShowForm(true)
                  }}
                >
                  Buat admin
                </button>
              </li>
            ))}
          </ul>
          {unisWithoutAdmin.length > 4 && (
            <p className="mt-2 text-xs text-amber-800">+{unisWithoutAdmin.length - 4} kampus lainnya</p>
          )}
        </section>
      )}

      {!loading && (admins.length > 0 || universities.length > 0) && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryPill label="Total admin" value={summary.total} />
          <SummaryPill label="Aktif" value={summary.active} />
          <SummaryPill label="Nonaktif" value={summary.inactive} />
          <SummaryPill
            label="Kampus tanpa admin"
            value={summary.withoutAdmin}
            tone={summary.withoutAdmin > 0 ? 'warn' : 'default'}
          />
        </section>
      )}

      <SearchBar value={q} onChange={setQ} placeholder="Cari nama, email, atau kampus…" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <label className="block text-sm sm:min-w-[220px]">
          <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Filter kampus</span>
          <select
            className="w-full border border-[var(--line)] bg-white px-3 py-2 text-sm"
            value={uniFilter}
            onChange={(e) => setUniFilter(e.target.value)}
          >
            <option value="all">Semua kampus</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} — {u.name}
                {!u.hasCampusAdmin ? ' (belum ada admin)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showForm && (
        <form
          onSubmit={createAdmin}
          className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 md:grid-cols-2"
        >
          <Field
            label="Nama"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Field
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Field
            label="Kata sandi"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Universitas</span>
            <select
              className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.university_id}
              onChange={(e) => setForm((f) => ({ ...f, university_id: e.target.value }))}
              required
            >
              <option value="">Pilih universitas</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                  {!u.hasCampusAdmin ? ' · belum ada admin' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Buat admin kampus</Button>
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
                  onClick={() => (open ? setOpenId(null) : openAdmin(u))}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--forest)] text-sm font-bold text-white">
                    {u.avatar || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="available">{roleLabel(u.role)}</Badge>
                      <Badge tone={u.accountStatus === 'inactive' ? 'expired' : 'approved'}>
                        {accountStatusLabel(u.accountStatus)}
                      </Badge>
                      {u.universityCode && (
                        <span className="text-xs font-semibold text-[var(--forest)]">{u.universityCode}</span>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold">{u.name}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {u.email} · {u.university || '—'}
                    </p>
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <div className="space-y-4 border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <MetaPill label="Email" value={u.email} />
                      <MetaPill label="Kampus" value={u.university || '—'} />
                      <MetaPill label="Bergabung" value={formatDate(u.createdAt)} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Nama"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <Field
                        label="Email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="WhatsApp"
                        value={editForm.whatsapp}
                        onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                      />
                      <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">Universitas</span>
                        <select
                          className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                          value={editForm.university_id}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, university_id: e.target.value }))
                          }
                        >
                          <option value="">Pilih universitas</option>
                          {universities.map((uni) => (
                            <option key={uni.id} value={uni.id}>
                              {uni.code} — {uni.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={saving} onClick={() => saveAdmin(u)}>
                        {saving ? 'Menyimpan…' : 'Simpan perubahan'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleStatus(u)}>
                        {u.accountStatus === 'inactive' ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeAdmin(u)}>
                        Hapus
                      </Button>
                    </div>

                    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                      <p className="text-sm font-medium">Reset kata sandi</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Admin akan logout otomatis setelah password direset.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Kata sandi baru"
                          type="password"
                          minLength={6}
                          value={resetForm.password}
                          onChange={(e) =>
                            setResetForm((f) => ({ ...f, password: e.target.value }))
                          }
                        />
                        <Field
                          label="Konfirmasi"
                          type="password"
                          minLength={6}
                          value={resetForm.password_confirmation}
                          onChange={(e) =>
                            setResetForm((f) => ({ ...f, password_confirmation: e.target.value }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                        disabled={saving}
                        onClick={() => resetPassword(u)}
                      >
                        Reset kata sandi
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

        {!loading && filtered.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] py-10 text-center text-sm text-[var(--muted)]">
            {q || statusFilter !== 'all' || uniFilter !== 'all'
              ? 'Tidak ada admin untuk filter ini.'
              : 'Belum ada admin kampus.'}
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
