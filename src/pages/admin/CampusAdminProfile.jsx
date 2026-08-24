import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Shield,
  University,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { campusApi } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { roleLabel } from '../../lib/roles'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function waHref(number) {
  const digits = String(number || '').replace(/\D/g, '')
  if (!digits) return null
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${normalized}`
}

export default function CampusAdminProfile() {
  const { user, updateProfile, changePassword, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [campus, setCampus] = useState(null)
  const [form, setForm] = useState({
    name: user?.name || '',
    whatsapp: user?.whatsapp || '',
  })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    campusApi
      .adminCampusSummary()
      .then(setCampus)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setForm({
      name: user?.name || '',
      whatsapp: user?.whatsapp || '',
    })
  }, [user?.name, user?.whatsapp])

  function startEdit() {
    setForm({
      name: user?.name || '',
      whatsapp: user?.whatsapp || '',
    })
    setEditing(true)
  }

  async function onSaveProfile(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim() || null,
      })
      toast.success('Profil disimpan')
      setEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal simpan profil')
    } finally {
      setSaving(false)
    }
  }

  async function onChangePassword(e) {
    e.preventDefault()
    if (pw.next.length < 6) {
      toast.error('Password baru minimal 6 karakter')
      return
    }
    if (pw.next !== pw.confirm) {
      toast.error('Konfirmasi password belum sama')
      return
    }
    setSavingPw(true)
    try {
      await changePassword({
        currentPassword: pw.current,
        password: pw.next,
        passwordConfirmation: pw.confirm,
      })
      toast.success('Password diganti')
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      const msg =
        err.response?.data?.errors?.current_password?.[0] ||
        err.response?.data?.message ||
        'Gagal ganti password'
      toast.error(msg)
    } finally {
      setSavingPw(false)
    }
  }

  const uni = campus?.university
  const stats = campus?.stats || {}
  const whatsappLink = waHref(user?.whatsapp)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Kampus"
        title="Profil"
        description="Data akun pengelola kampus."
        action={
          !editing ? (
            <Button size="sm" variant="secondary" onClick={startEdit}>
              <Pencil size={14} />
              Edit profil
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#e8efea]">
            <div className="bg-[linear-gradient(135deg,#d5e8de_0%,#eef3f0_55%,#e8efea_100%)] px-6 pb-6 pt-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--forest)] text-2xl font-bold text-white shadow-[0_8px_24px_rgba(15,92,76,0.25)]">
                  {user?.avatar || 'A'}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">{user?.name}</h2>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">{user?.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="available">{roleLabel(user?.role)}</Badge>
                    {(uni?.name || user?.university) && (
                      <Badge tone="borrow">{uni?.name || user.university}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--line)] bg-white px-6 py-5">
              {editing ? (
                <form onSubmit={onSaveProfile} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nama"
                      required
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <Field
                      label="WhatsApp"
                      placeholder="08…"
                      value={form.whatsapp}
                      onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                    />
                  </div>
                  <Field label="Email" value={user?.email || ''} disabled />
                  <p className="-mt-2 text-xs text-[var(--muted)]">Email tidak bisa diganti.</p>
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
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: University, label: 'Universitas', value: uni?.name || user?.university },
                    { icon: Building2, label: 'Kota kampus', value: uni?.city },
                    { icon: Shield, label: 'Peran', value: roleLabel(user?.role) },
                    {
                      icon: MessageCircle,
                      label: 'WhatsApp',
                      value: user?.whatsapp,
                      href: whatsappLink,
                    },
                    { icon: Mail, label: 'Email', value: user?.email },
                    {
                      icon: UserRound,
                      label: 'Bergabung sejak',
                      value: formatDate(user?.createdAt),
                    },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <li
                      key={label}
                      className="flex items-start gap-3 rounded-xl bg-[#f8faf9] px-4 py-3"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--muted)]">{label}</p>
                        {href && value ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[var(--forest)] hover:underline"
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="font-medium text-[var(--ink)]">{value || 'Belum diisi'}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {campus && (
            <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">Kampus yang dikelola</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {uni?.name || user?.university}
                    {uni?.city ? ` · ${uni.city}` : ''}
                  </p>
                </div>
                <Link
                  to="/admin/campus"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--forest)] hover:underline"
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Mahasiswa" value={stats.students ?? '—'} />
                <MiniStat label="Barang" value={stats.items ?? '—'} />
                <MiniStat label="Makanan" value={stats.foods ?? '—'} />
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <form
            onSubmit={onChangePassword}
            className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
          >
            <div className="mb-1 flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--forest)]" />
              <p className="text-sm font-semibold">Ganti password</p>
            </div>
            <p className="text-xs text-[var(--muted)]">Minimal 6 karakter.</p>
            <Field
              label="Password saat ini"
              type="password"
              autoComplete="current-password"
              required
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Password baru"
                type="password"
                autoComplete="new-password"
                required
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              />
              <Field
                label="Konfirmasi password baru"
                type="password"
                autoComplete="new-password"
                required
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={savingPw}>
              {savingPw ? 'Menyimpan…' : 'Ganti password'}
            </Button>
          </form>

          <Button
            variant="secondary"
            className="w-full border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => {
              logout()
              window.location.replace('/')
            }}
          >
            <LogOut size={16} />
            Keluar dari akun
          </Button>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-[#eef3f0] px-4 py-3 text-center sm:text-left">
      <p className="font-display text-2xl font-semibold text-[var(--forest)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  )
}
