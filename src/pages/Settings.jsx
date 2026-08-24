import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Info,
  KeyRound,
  LogOut,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const PREFS_KEY = 'campusnexa_notif_prefs'

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { pushInApp: true, foodAlert: true, borrowAlert: true }
    return { pushInApp: true, foodAlert: true, borrowAlert: true, ...JSON.parse(raw) }
  } catch {
    return { pushInApp: true, foodAlert: true, borrowAlert: true }
  }
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--ink)]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-[var(--muted)]">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-[var(--forest)]' : 'bg-[#c9d5ce]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

export default function Settings() {
  const { user, useApi, logout, changePassword } = useAuth()
  const { resetDemoData, refreshAll } = useData()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [savingPw, setSavingPw] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  function setPref(key, value) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    toast.success('Disimpan di perangkat ini')
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

  async function onRefresh() {
    setRefreshing(true)
    try {
      if (useApi && refreshAll) await refreshAll({ silent: true })
      else resetDemoData()
      toast.success(useApi ? 'Data disegar ulang' : 'Data demo direset')
    } catch {
      toast.error('Gagal menyegarkan')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Pengaturan" description="Atur akun dan preferensimu." />

      <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[#e8efea] px-4 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--forest)] text-sm font-bold text-white">
          {user?.avatar || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--ink)]">{user?.name}</p>
          <p className="truncate text-sm text-[var(--muted)]">{user?.email}</p>
        </div>
        <Link
          to="/app/profile"
          className="shrink-0 text-sm font-semibold text-[var(--forest)] hover:underline"
        >
          Profil
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Akun
          </h2>
        </div>

        <Link
          to="/app/profile"
          className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#f5f8f6]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
            <UserRound size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Edit profil</span>
            <span className="block text-xs text-[var(--muted)]">
              Nama, fakultas, WhatsApp
            </span>
          </span>
          <ChevronRight size={16} className="text-[var(--muted)]" />
        </Link>

        <div className="border-t border-[var(--line)] px-5 py-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
              <KeyRound size={16} />
            </span>
            <div>
              <p className="text-sm font-medium">Kata sandi</p>
              <p className="text-xs text-[var(--muted)]">
                {useApi ? 'Ubah password akun' : 'Hanya tersedia saat mode online'}
              </p>
            </div>
          </div>

          {useApi ? (
            <form onSubmit={onChangePassword} className="space-y-3 pl-12">
              <input
                required
                type="password"
                autoComplete="current-password"
                placeholder="Password sekarang"
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                className="field"
              />
              <input
                required
                type="password"
                autoComplete="new-password"
                placeholder="Password baru"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                className="field"
              />
              <input
                required
                type="password"
                autoComplete="new-password"
                placeholder="Ulangi password baru"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                className="field"
              />
              <Button type="submit" size="sm" disabled={savingPw}>
                {savingPw ? 'Menyimpan…' : 'Ubah password'}
              </Button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Notifikasi
          </h2>
        </div>
        <div className="divide-y divide-[var(--line)] px-5">
          <Toggle
            label="Notifikasi di app"
            hint="Tampilkan badge & daftar notifikasi"
            checked={prefs.pushInApp}
            onChange={(v) => setPref('pushInApp', v)}
          />
          <Toggle
            label="Alert pinjam"
            hint="Permintaan & jatuh tempo"
            checked={prefs.borrowAlert}
            onChange={(v) => setPref('borrowAlert', v)}
          />
          <Toggle
            label="Alert makanan"
            hint="Sisa makanan baru / hampir habis waktu"
            checked={prefs.foodAlert}
            onChange={(v) => setPref('foodAlert', v)}
          />
        </div>
        <div className="border-t border-[var(--line)] px-5 py-3">
          <Link
            to="/app/notifications"
            className="text-sm font-semibold text-[var(--forest)] hover:underline"
          >
            Lihat semua notifikasi
          </Link>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Preferensi disimpan di perangkat ini.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Data & aplikasi
          </h2>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#f5f8f6] disabled:opacity-60"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {useApi ? 'Perbarui data aplikasi' : 'Reset data demo'}
            </span>
            <span className="block text-xs text-[var(--muted)]">
              {useApi
                ? 'Sinkronkan data terbaru dari server'
                : 'Hapus data lokal mode offline'}
            </span>
          </span>
        </button>

        <div className="flex items-start gap-3 border-t border-[var(--line)] px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3f0] text-[var(--forest)]">
            <Info size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">CampusNexa</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Tukar, pinjam, donasi, dan selamatkan makanan di kampus.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {user?.university || 'Kampus'} · Mahasiswa
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">v1.0 Demo · Build Competition 2026</p>
          </div>
        </div>
      </section>

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
  )
}
