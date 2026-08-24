import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, Leaf, Mail, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'
import { homePathForRole } from '../lib/roles'

const highlights = [
  { label: 'Khusus mahasiswa', icon: GraduationCap },
  { label: 'Email kampus', icon: Mail },
  { label: 'AI powered', icon: Sparkles },
  { label: 'Sustainable campus', icon: Leaf },
]

/** Email mahasiswa (.ac.id / .edu) atau akun staf demo CampusNexa. */
function isCampusEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e.includes('@')) return false
  if (/@(?:[a-z0-9-]+\.)+(?:ac\.id|edu)$/i.test(e)) return true
  // Akun super admin / staf demo (bukan Gmail)
  return /@campusnexa\.id$/i.test(e)
}

function loginErrorMessage(err) {
  if (err.code === 'ERR_NETWORK' || !err.response) {
    return 'Tidak terhubung ke server. Pastikan backend berjalan.'
  }
  // Pesan generik — jangan bocorkan apakah email terdaftar
  return 'Email atau kata sandi tidak sesuai.'
}

function emailHintFor(value) {
  const e = String(value || '').trim().toLowerCase()
  if (!e) return ''
  if (isCampusEmail(e)) return ''
  if (/@(gmail|yahoo|outlook|hotmail|icloud)\./i.test(e)) {
    return 'Gunakan email resmi perguruan tinggi Anda.'
  }
  if (e.includes('campusloop')) {
    return 'Email admin demo: superadmin@campusnexa.id'
  }
  return 'Gunakan email resmi perguruan tinggi Anda.'
}

export default function Login() {
  const { login, user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [emailHint, setEmailHint] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'Masuk · CampusNexa'
  }, [])

  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  function onEmailChange(value) {
    setEmail(value)
    setEmailHint(emailHintFor(value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Email dan kata sandi wajib diisi')
      return
    }
    const hint = emailHintFor(email)
    if (hint) {
      setEmailHint(hint)
      toast.error(hint)
      return
    }
    setLoading(true)
    try {
      const nextUser = await login({
        email: email.trim(),
        password,
        remember,
      })
      toast.success('Selamat datang kembali!')
      const dest = location.state?.from || homePathForRole(nextUser?.role)
      navigate(dest, { replace: true })
    } catch (err) {
      toast.error(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden mesh-bg lg:block">
        <div className="absolute inset-0 bg-[var(--forest-deep)]/55" />
        <div className="pointer-events-none absolute -left-10 bottom-24 h-56 w-56 rounded-full bg-[var(--leaf)]/25 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-28 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="transition hover:opacity-90">
            <BrandLogo size="md" tone="light" wordmarkClassName="text-2xl" />
          </Link>
          <div className="fade-up max-w-md">
            <div className="hero-line mb-5" />
            <p className="font-display text-4xl font-semibold leading-tight">
              Jaga sumber daya kampus tetap berputar.
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Masuk untuk berbagi sumber daya, menyelamatkan makanan, dan berkolaborasi dalam aksi
              keberlanjutan di kampus Anda.
            </p>
            <ul className="mt-8 grid max-w-sm grid-cols-2 gap-2">
              {highlights.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm"
                >
                  <Icon size={13} className="shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/45">CampusNexa · Khusus mahasiswa dengan email kampus</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#eef3f0] px-5 py-12">
        <form
          onSubmit={handleSubmit}
          className="page-enter w-full max-w-md space-y-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(19,66,50,0.06)] sm:p-8"
        >
          <div>
            <Link to="/" className="inline-block lg:hidden">
              <BrandLogo size="sm" tone="forest" wordmarkClassName="text-xl" />
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)] lg:mt-0">
              Akun mahasiswa
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">Masuk</h1>
            <p className="mt-2 text-[var(--muted)]">
              Gunakan email kampus Anda untuk melanjutkan ke CampusNexa.
            </p>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--ink)]">Email kampus</span>
            <input
              className="field w-full"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="nama@student.uns.ac.id"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
            {emailHint ? (
              <span className="text-xs text-[var(--danger)]">{emailHint}</span>
            ) : (
              <span className="text-xs text-[var(--muted)]">
                Gunakan domain email resmi perguruan tinggi Anda.
              </span>
            )}
          </label>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[var(--ink)]">Kata sandi</span>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-[var(--forest)] hover:underline"
              >
                Lupa kata sandi?
              </Link>
            </div>
            <div className="relative">
              <input
                className="field w-full pr-11"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--muted)] transition hover:text-[var(--ink)]"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--line)] accent-[var(--forest)]"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Ingat saya
          </label>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Memverifikasi…' : 'Masuk'}
          </Button>

          <p className="text-center text-sm text-[var(--muted)]">
            Belum punya akun?{' '}
            <Link to="/register" className="font-semibold text-[var(--forest)] hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
