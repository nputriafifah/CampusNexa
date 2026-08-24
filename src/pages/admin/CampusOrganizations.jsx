import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Badge, statusLabel } from '../../components/ui/Badge'

const TYPE_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'BEM', label: 'BEM' },
  { id: 'HIMA', label: 'HIMA' },
  { id: 'UKM', label: 'UKM' },
  { id: 'kantin', label: 'Kantin' },
  { id: 'other', label: 'Lainnya' },
]

const TYPE_GROUPS = [
  {
    label: 'Organisasi mahasiswa',
    options: [
      { id: 'BEM', label: 'BEM' },
      { id: 'HIMA', label: 'HIMA' },
      { id: 'UKM', label: 'UKM' },
    ],
  },
  {
    label: 'Unit kampus',
    options: [{ id: 'kantin', label: 'Kantin' }],
  },
  {
    label: 'Lainnya',
    options: [{ id: 'other', label: 'Fakultas, lab, koperasi, dll.' }],
  },
]

const TYPE_LABELS = {
  BEM: 'BEM',
  HIMA: 'HIMA',
  UKM: 'UKM',
  kantin: 'Kantin',
  other: 'Lainnya',
}

const NAME_PLACEHOLDERS = {
  BEM: 'BEM Fakultas Teknik',
  HIMA: 'HIMA Informatika',
  UKM: 'UKM Green Campus',
  kantin: 'Kantin Teknik',
  other: 'Fakultas Ekonomi / Lab Kimia / Koperasi Asrama',
}

const empty = { name: '', type: 'UKM', description: '' }

function typeLabel(type) {
  return TYPE_LABELS[type] || type
}

function categoryGroup(type) {
  if (['BEM', 'HIMA', 'UKM'].includes(type)) return 'Organisasi mahasiswa'
  if (type === 'kantin') return 'Unit kampus'
  return 'Lainnya'
}

function usageSummary(stats = {}) {
  const parts = []
  if (stats.members) parts.push(`${stats.members} anggota`)
  if (stats.foods) parts.push(`${stats.foods} food`)
  if (stats.events) parts.push(`${stats.events} event`)
  if (stats.volunteers) parts.push(`${stats.volunteers} relawan`)
  if (stats.items) parts.push(`${stats.items} listing`)
  return parts.length ? parts.join(' · ') : 'Belum memiliki aktivitas'
}

function totalUsage(stats = {}) {
  return (
    (stats.members ?? 0) +
    (stats.items ?? 0) +
    (stats.foods ?? 0) +
    (stats.events ?? 0) +
    (stats.volunteers ?? 0)
  )
}

const TYPE_BADGE_STYLES = {
  BEM: 'bg-sky-50 text-sky-800',
  HIMA: 'bg-violet-50 text-violet-800',
  UKM: 'bg-emerald-50 text-emerald-800',
  kantin: 'bg-amber-50 text-amber-900',
  other: 'bg-slate-100 text-slate-700',
}

function TypeBadge({ type }) {
  const label = typeLabel(type)
  const style = TYPE_BADGE_STYLES[type] || TYPE_BADGE_STYLES.other
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}>
      {label}
    </span>
  )
}

function summarizeOrgs(list = []) {
  return {
    total: list.length,
    BEM: list.filter((o) => o.type === 'BEM').length,
    HIMA: list.filter((o) => o.type === 'HIMA').length,
    UKM: list.filter((o) => o.type === 'UKM').length,
    kantin: list.filter((o) => o.type === 'kantin').length,
    other: list.filter((o) => o.type === 'other').length,
  }
}

export default function CampusOrganizations() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingOriginal, setEditingOriginal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const refreshSummary = useCallback(() => {
    campusApi
      .adminOrganizations({})
      .then((list) => setSummary(summarizeOrgs(list)))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    campusApi
      .adminOrganizations({
        q: debouncedQ || undefined,
        type: type === 'all' ? undefined : type,
      })
      .then(setRows)
      .catch(() => toast.error('Gagal muat penyelenggara'))
      .finally(() => setLoading(false))
  }, [debouncedQ, type])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  const loadDetail = useCallback(async (id) => {
    setDetailLoading(true)
    try {
      const data = await campusApi.adminOrganization(id)
      setDetail(data)
    } catch {
      toast.error('Gagal memuat detail penyelenggara')
      setDetail(null)
      setOpenId(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (openId) loadDetail(openId)
    else setDetail(null)
  }, [openId, loadDetail])

  function toggleOpen(id) {
    setOpenId((prev) => (prev === id ? null : id))
  }

  function resetForm() {
    setForm(empty)
    setEditingId(null)
    setEditingOriginal(null)
  }

  function startCreate() {
    resetForm()
    setShowForm(true)
  }

  function startEdit(org) {
    setEditingId(org.id)
    setEditingOriginal(org)
    setForm({
      name: org.name || '',
      type: org.type || 'UKM',
      description: org.description || '',
    })
    setShowForm(true)
  }

  async function onSubmit(e) {
    e.preventDefault()

    if (editingId && editingOriginal?.name !== form.name.trim()) {
      const stats = editingOriginal?.stats || {}
      const postings = (stats.foods ?? 0) + (stats.events ?? 0) + (stats.volunteers ?? 0)
      if (postings > 0) {
        const ok = window.confirm(
          `Nama penyelenggara akan disinkronkan ke ${postings} posting food/event/relawan yang sudah ada. Lanjutkan?`,
        )
        if (!ok) return
      }
    }

    setSaving(true)
    try {
      if (editingId) {
        await campusApi.adminUpdateOrganization(editingId, form)
        toast.success('Penyelenggara diperbarui')
      } else {
        await campusApi.adminCreateOrganization(form)
        toast.success('Penyelenggara ditambahkan')
      }
      setShowForm(false)
      resetForm()
      load()
      refreshSummary()
      if (editingId && openId === editingId) loadDetail(editingId)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal simpan')
    } finally {
      setSaving(false)
    }
  }

  async function remove(org) {
    const stats = org.stats || {}
    const used = totalUsage(stats)

    let message = `Hapus "${org.name}"?`
    if (used > 0) {
      message = `Penyelenggara ini masih dipakai:\n${usageSummary(stats)}\n\nHapus hanya bisa jika tidak ada anggota dan posting terkait.`
      if (!window.confirm(message)) return
    } else if (!window.confirm(message)) {
      return
    }

    try {
      await campusApi.adminDeleteOrganization(org.id)
      toast.success('Penyelenggara dihapus')
      if (openId === org.id) setOpenId(null)
      load()
      refreshSummary()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal hapus')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Kelola Penyelenggara"
        description="BEM, HIMA, UKM, kantin, fakultas — siapa saja yang bisa jadi penyelenggara food, event, dan relawan."
        action={
          <Button size="sm" onClick={startCreate}>
            Tambah
          </Button>
        }
      />

      {summary && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryStat label="Total" value={summary.total} />
          <SummaryStat label="BEM" value={summary.BEM} />
          <SummaryStat label="HIMA" value={summary.HIMA} />
          <SummaryStat label="UKM" value={summary.UKM} />
          <SummaryStat label="Kantin" value={summary.kantin} />
          <SummaryStat label="Lainnya" value={summary.other} />
        </section>
      )}

      <div className="space-y-3">
        <SearchBar value={q} onChange={setQ} placeholder="Cari penyelenggara…" />
        <div className="flex flex-wrap gap-1.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setType(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                type === tab.id
                  ? 'bg-[var(--forest)] text-white'
                  : 'bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <p className="text-sm font-semibold">
            {editingId ? 'Edit penyelenggara' : 'Penyelenggara baru'}
          </p>
          {editingId && editingOriginal?.name !== form.name && totalUsage(editingOriginal?.stats) > 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Mengubah nama akan memperbarui label di food, event, dan relawan terkait.
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">Kategori</span>
            <select
              className="w-full border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            >
              {TYPE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {form.type === 'other' && (
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                Untuk fakultas, lab, koperasi asrama, atau unit kampus lain di luar BEM/HIMA/UKM/kantin.
              </p>
            )}
          </label>
          <Field
            label="Nama"
            required
            placeholder={NAME_PLACEHOLDERS[form.type] || 'Nama penyelenggara'}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Field
            as="textarea"
            label="Deskripsi"
            rows={2}
            placeholder="Singkat: peran atau cakupan unit ini di kampus"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="rounded-2xl border border-[var(--line)] bg-white py-10 text-center text-sm text-[var(--muted)]">
          Memuat…
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[#eef3f0] px-5 py-8 text-center text-sm text-[var(--muted)]">
          Belum ada penyelenggara. Tambah BEM, HIMA, UKM, kantin, atau unit lain.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((org) => {
            const stats = org.stats || {}
            const open = openId === org.id
            return (
              <div
                key={org.id}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  open ? 'border-[var(--forest)]/40 shadow-sm' : 'border-[var(--line)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(org.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[#f8faf9]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8efea] text-xs font-bold text-[var(--forest)]">
                    {typeLabel(org.type).slice(0, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                        {org.name}
                      </h3>
                      <TypeBadge type={org.type} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{usageSummary(stats)}</p>
                    {org.description ? (
                      <p className="mt-1 line-clamp-1 text-sm text-[var(--muted)]">{org.description}</p>
                    ) : null}
                  </div>
                  {open ? (
                    <ChevronUp size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown size={18} className="mt-1 shrink-0 text-[var(--muted)]" />
                  )}
                </button>

                {open && (
                  <OrgDetailBody
                    org={org}
                    detail={detail}
                    loading={detailLoading}
                    onEdit={() => {
                      setOpenId(null)
                      startEdit(org)
                    }}
                    onRemove={() => remove(org)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OrgDetailBody({ org, detail, loading, onEdit, onRemove }) {
  const [activityTab, setActivityTab] = useState('events')

  if (loading) {
    return (
      <div className="border-t border-[var(--line)] px-4 py-4">
        <p className="text-sm text-[var(--muted)]">Memuat detail…</p>
      </div>
    )
  }

  if (!detail) return null

  const stats = detail.stats || org.stats || {}
  const used = totalUsage(stats)

  const activityTabs = [
    { id: 'events', label: 'Event', items: detail.recentEvents || [], count: stats.events ?? 0 },
    { id: 'volunteers', label: 'Relawan', items: detail.recentVolunteers || [], count: stats.volunteers ?? 0 },
    { id: 'foods', label: 'Food', items: detail.recentFoods || [], count: stats.foods ?? 0 },
    { id: 'members', label: 'Anggota', items: detail.recentMembers || [], count: stats.members ?? 0 },
  ].filter((tab) => tab.count > 0 || tab.items.length > 0)

  const activeTab =
    activityTabs.find((tab) => tab.id === activityTab)?.items.length
      ? activityTab
      : activityTabs[0]?.id

  return (
    <div className="border-t border-[var(--line)] bg-[#f8faf9] px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <StatPill label="Anggota" value={stats.members ?? 0} />
        <StatPill label="Food" value={stats.foods ?? 0} />
        <StatPill label="Event" value={stats.events ?? 0} />
        <StatPill label="Relawan" value={stats.volunteers ?? 0} />
        <StatPill label="Listing" value={stats.items ?? 0} />
      </div>

      <p className="mt-3 text-sm text-[var(--muted)]">
        {categoryGroup(detail.type)} · {typeLabel(detail.type)} ·{' '}
        {used > 0 ? 'Aktif dipakai' : 'Belum memiliki aktivitas'}
      </p>
      {detail.description ? (
        <p className="mt-1 text-sm text-[var(--ink)]">{detail.description}</p>
      ) : null}

      {activityTabs.length > 0 ? (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-white">
          {activityTabs.length > 1 ? (
            <div className="flex flex-wrap gap-1 border-b border-[var(--line)] px-2 pt-1">
              {activityTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivityTab(tab.id)}
                  className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-[#f8faf9] text-[var(--forest)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          ) : (
            <p className="border-b border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
              {activityTabs[0].label} terbaru
            </p>
          )}
          <ul className="divide-y divide-[var(--line)]">
            {(activityTabs.find((tab) => tab.id === activeTab)?.items || []).slice(0, 3).map((item) => (
              <ActivityRow key={item.id} type={activeTab} item={item} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">Belum ada aktivitas food, event, atau relawan.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Hapus
        </Button>
      </div>
    </div>
  )
}

function ActivityRow({ type, item }) {
  if (type === 'members') {
    return (
      <li className="px-3 py-2.5 text-sm">
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-[var(--muted)]">{item.email}</p>
      </li>
    )
  }

  if (type === 'foods') {
    return (
      <li className="px-3 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <Badge tone={item.status}>{statusLabel(item.status)}</Badge>
          <span className="font-medium">{item.title}</span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Sisa {item.remaining}/{item.quantity} · {item.location || '—'}
        </p>
      </li>
    )
  }

  if (type === 'events') {
    return (
      <li className="px-3 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <Badge tone={item.status === 'closed' ? 'expired' : 'available'}>
            {item.status === 'closed' ? 'Ditutup' : 'Dibuka'}
          </Badge>
          <span className="font-medium">{item.title}</span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {item.registered}/{item.quota} peserta · {item.location || '—'}
        </p>
      </li>
    )
  }

  return (
    <li className="px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <Badge tone={item.status === 'closed' ? 'expired' : 'borrow'}>
          {item.status === 'closed' ? 'Ditutup' : 'Dibuka'}
        </Badge>
        <span className="font-medium">{item.title}</span>
      </div>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        {item.signedUp}/{item.quota} · {item.location || '—'}
      </p>
    </li>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-[var(--forest)]">{value}</p>
    </div>
  )
}

function StatPill({ label, value }) {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-[var(--line)]">
      <span className="text-[var(--muted)]">{label}</span>{' '}
      <span className="font-semibold text-[var(--forest)]">{value}</span>
    </span>
  )
}
