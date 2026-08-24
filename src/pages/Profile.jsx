import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Building2,
  GraduationCap,
  History,
  Leaf,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Settings,
  Star,
  University,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { campusApi } from '../lib/api'
import { Badge, listingLabel, statusLabel } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { formatKg, formatTimeAgo, greenLevel, sustainabilityScore } from '../lib/format'
import { roleLabel } from '../lib/roles'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const { items, foods, borrows } = useData()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [form, setForm] = useState({
    name: user?.name || '',
    faculty: user?.faculty || '',
    whatsapp: user?.whatsapp || '',
    study_program: user?.studyProgram || '',
    organization_id: user?.organizationId || '',
  })

  useEffect(() => {
    let cancelled = false
    campusApi
      .campusOrganizations()
      .then((list) => {
        if (!cancelled) setOrgs(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setOrgs([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function startEdit() {
    setForm({
      name: user?.name || '',
      faculty: user?.faculty || '',
      whatsapp: user?.whatsapp || '',
      study_program: user?.studyProgram || '',
      organization_id: user?.organizationId || '',
    })
    setEditing(true)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        name: form.name.trim(),
        faculty: form.faculty.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        study_program: form.study_program.trim() || null,
        organization_id: form.organization_id ? Number(form.organization_id) : null,
      })
      toast.success('Profil disimpan')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const campusLine = [user?.university, user?.faculty].filter(Boolean).join(' · ')
  const uid = String(user?.id)

  const activity = useMemo(() => {
    const rows = []
    items
      .filter((i) => String(i.ownerId) === uid)
      .slice(0, 8)
      .forEach((i) => {
        rows.push({
          id: `item-${i.id}`,
          title: i.title,
          detail: `${listingLabel(i.listingType)} · ${statusLabel(i.status)}`,
          at: i.createdAt,
          to: `/app/exchange/${i.dbId || i.id}`,
        })
      })
    foods
      .filter((f) => String(f.ownerId) === uid || String(f.userId) === uid)
      .slice(0, 4)
      .forEach((f) => {
        rows.push({
          id: `food-${f.id}`,
          title: f.title,
          detail: `Makanan · ${statusLabel(f.status)}`,
          at: f.createdAt,
          to: '/app/food',
        })
      })
    borrows
      .filter((b) => String(b.borrowerId) === uid || String(b.ownerId) === uid)
      .slice(0, 4)
      .forEach((b) => {
        rows.push({
          id: `borrow-${b.id}`,
          title: b.itemTitle || b.title || 'Pinjam',
          detail: `Pinjam · ${statusLabel(b.status)}`,
          at: b.requestedAt || b.createdAt,
          to: '/app/borrow',
        })
      })
    return rows.slice(0, 10)
  }, [items, foods, borrows, uid])

  const borrowedCount = borrows.filter(
    (b) => String(b.borrowerId) === uid && ['approved', 'returned'].includes(b.status),
  ).length
  const impact = user?.impact || {}
  const score = sustainabilityScore(impact, borrowedCount)
  const badgeCount = [
    Number(impact.itemsSaved || 0) >= 1,
    Number(impact.foodRescuedKg || 0) >= 1,
    Number(impact.wasteReducedKg || 0) >= 5,
    activity.some((r) => r.detail.startsWith('Pinjam')),
  ].filter(Boolean).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Profil"
        description="Akun dan dampakmu di kampus."
        action={
          !editing ? (
            <Button size="sm" variant="secondary" onClick={startEdit}>
              <Pencil size={14} />
              Edit
            </Button>
          ) : null
        }
      />

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#e8efea]">
        <div className="bg-[linear-gradient(135deg,#d5e8de_0%,#eef3f0_55%,#e8efea_100%)] px-6 pb-6 pt-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--forest)] text-2xl font-bold text-white shadow-[0_8px_24px_rgba(15,92,76,0.25)]">
              {user?.avatar || 'U'}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold text-[var(--ink)] md:text-3xl">
                {user?.name}
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">{user?.email}</p>
              {campusLine && (
                <p className="mt-1 text-sm text-[var(--forest-deep)]">{campusLine}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="available">{roleLabel(user?.role) || 'Mahasiswa'}</Badge>
                {user?.organization && <Badge tone="borrow">{user.organization}</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--forest-deep)]">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1">
                  <Star size={12} />
                  {score.toLocaleString('id-ID')} poin
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1">
                  <Award size={12} />
                  {badgeCount} lencana
                </span>
                <span className="rounded-full bg-white/80 px-2.5 py-1">{greenLevel(score)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--line)] bg-white px-6 py-5">
          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Nama</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="field"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Email</span>
                <input value={user?.email || ''} disabled className="field opacity-60" />
                <span className="text-xs text-[var(--muted)]">Email tidak bisa diganti.</span>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Universitas</span>
                <input value={user?.university || ''} disabled className="field opacity-60" />
                <span className="text-xs text-[var(--muted)]">Universitas tidak bisa diganti.</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Fakultas</span>
                  <input
                    value={form.faculty}
                    onChange={(e) => setForm((p) => ({ ...p, faculty: e.target.value }))}
                    placeholder="Teknik"
                    className="field"
                  />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Program studi</span>
                  <input
                    value={form.study_program}
                    onChange={(e) => setForm((p) => ({ ...p, study_program: e.target.value }))}
                    placeholder="Opsional"
                    className="field"
                  />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Organisasi</span>
                <select
                  value={form.organization_id}
                  onChange={(e) => setForm((p) => ({ ...p, organization_id: e.target.value }))}
                  className="field"
                >
                  <option value="">Tidak ikut organisasi</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[var(--muted)]">
                  Opsional. Hanya isi kalau kamu memang anggota BEM, HIMA, atau UKM.
                </span>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">WhatsApp</span>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                  placeholder="08…"
                  className="field"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                >
                  Batal
                </Button>
              </div>
            </form>
          ) : (
            <ul className="space-y-3">
              {[
                { icon: University, label: 'Universitas', value: user?.university },
                { icon: Building2, label: 'Organisasi', value: user?.organization },
                { icon: GraduationCap, label: 'Fakultas', value: user?.faculty },
                { icon: GraduationCap, label: 'Program studi', value: user?.studyProgram },
                {
                  icon: MessageCircle,
                  label: 'WhatsApp',
                  value: user?.whatsapp,
                  emptyAction: 'Tambah nomor WhatsApp',
                },
                { icon: Mail, label: 'Email', value: user?.email },
              ].map(({ icon: Icon, label, value, emptyAction }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--muted)]">{label}</p>
                    {value ? (
                      <p className="font-medium text-[var(--ink)]">{value}</p>
                    ) : emptyAction ? (
                      <button
                        type="button"
                        onClick={startEdit}
                        className="font-semibold text-[var(--forest)] hover:underline"
                      >
                        {emptyAction}
                      </button>
                    ) : (
                      <p className="font-medium text-[var(--muted)]">Belum diisi</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Leaf size={18} className="text-[var(--leaf)]" />
            <h2 className="font-display text-lg font-semibold">Dampakmu</h2>
          </div>
          <Link
            to="/app/impact"
            className="text-sm font-semibold text-[var(--forest)] hover:underline"
          >
            Detail
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Barang', value: user?.impact?.itemsSaved ?? 0 },
            { label: 'Makanan', value: formatKg(user?.impact?.foodRescuedKg) },
            { label: 'Limbah', value: formatKg(user?.impact?.wasteReducedKg) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-[#eef3f0] px-4 py-4 text-center sm:text-left">
              <p className="font-display text-2xl font-semibold text-[var(--forest)]">{stat.value}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <History size={18} className="text-[var(--forest)]" />
          <h2 className="font-display text-lg font-semibold">Riwayat aktivitas</h2>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada aktivitas tercatat.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((row) => (
              <li key={row.id}>
                <Link
                  to={row.to}
                  className="flex flex-col rounded-xl border border-[var(--line)] bg-[#eef3f0] px-4 py-3 transition hover:bg-[#e4ece7]"
                >
                  <span className="font-semibold text-[var(--ink)]">{row.title}</span>
                  <span className="text-xs text-[var(--muted)]">{row.detail}</span>
                  {row.at && (
                    <span className="mt-0.5 text-xs text-[var(--muted)]">{formatTimeAgo(row.at)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/app/settings">
          <Button variant="secondary" size="sm">
            <Settings size={14} />
            Pengaturan
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="sm"
          className="border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => {
            logout()
            window.location.replace('/')
          }}
        >
          <LogOut size={14} />
          Keluar
        </Button>
      </div>
    </div>
  )
}
