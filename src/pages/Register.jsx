import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Leaf,
  Mail,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'
import { homePathForRole } from '../lib/roles'

const highlights = [
  { label: 'Khusus mahasiswa', icon: GraduationCap },
  { label: 'Email kampus', icon: Mail },
  { label: 'AI powered', icon: Sparkles },
  { label: 'Sustainable campus', icon: Leaf },
]

const AVAILABLE_UNIVERSITIES = [{ value: 'Universitas Sebelas Maret', label: 'Universitas Sebelas Maret' }]
const DEFAULT_OTP_TTL = 600
const RESEND_COOLDOWN = 60

function errorMessage(err, fallback) {
  return (
    err.response?.data?.message ||
    Object.values(err.response?.data?.errors || {})?.[0]?.[0] ||
    (err.code === 'ERR_NETWORK' || !err.response
      ? 'Tidak terhubung ke server. Pastikan backend berjalan.'
      : fallback)
  )
}

function strongPassword(pw) {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
}

/** Samarkan email: a********@student.uns.ac.id */
function maskEmail(email) {
  const raw = String(email || '').trim()
  const at = raw.indexOf('@')
  if (at <= 0) return raw || '—'
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const visible = local.slice(0, Math.min(1, local.length))
  const stars = '*'.repeat(Math.max(local.length - 1, 3))
  return `${visible}${stars}@${domain}`
}

function formatMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function AuthShell({ children }) {
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
              Bergabung dengan komunitas keberlanjutan kampus.
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Satu akun agar Anda dapat berbagi sumber daya, menyelamatkan makanan, dan
              berpartisipasi dalam aksi keberlanjutan di lingkungan kampus.
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
          <p className="text-xs text-white/45">CampusNexa · Verifikasi email kampus via OTP</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#eef3f0] px-5 py-12">{children}</div>
    </div>
  )
}

function LegalModal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[80svh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="legal-title" className="font-display text-xl font-semibold text-[var(--ink)]">
          {title}
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--muted)]">{children}</div>
        <Button type="button" className="mt-5 w-full" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </div>
  )
}

function OtpBoxes({ value, onChange, disabled }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  function focusAt(i) {
    const el = refs.current[i]
    if (el) el.focus()
  }

  function setDigit(index, char) {
    const next = digits.slice()
    next[index] = char
    onChange(next.join('').replace(/\D/g, '').slice(0, 6))
  }

  function handleChange(index, e) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setDigit(index, '')
      return
    }
    if (raw.length > 1) {
      const merged = (value.slice(0, index) + raw).replace(/\D/g, '').slice(0, 6)
      onChange(merged)
      focusAt(Math.min(merged.length, 5))
      return
    }
    setDigit(index, raw)
    if (index < 5) focusAt(index + 1)
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        setDigit(index - 1, '')
        focusAt(index - 1)
      }
      e.preventDefault()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1)
      e.preventDefault()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      focusAt(index + 1)
      e.preventDefault()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    onChange(pasted)
    focusAt(Math.min(pasted.length, 5))
  }

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={d}
          aria-label={`Digit OTP ${i + 1}`}
          className="field h-12 w-11 flex-1 px-0 text-center font-display text-xl font-semibold tracking-widest sm:h-14 sm:w-12"
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}

export default function Register() {
  const { requestRegisterOtp, resendRegisterOtp, verifyRegisterOtp, user, isAuthenticated } =
    useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('form') // form | otp | success
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [expiresIn, setExpiresIn] = useState(DEFAULT_OTP_TTL)
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [legal, setLegal] = useState(null)
  const [destPath, setDestPath] = useState('/app')
  const [form, setForm] = useState({
    name: '',
    studentId: '',
    email: '',
    university: AVAILABLE_UNIVERSITIES[0].value,
    password: '',
  })

  useEffect(() => {
    document.title =
      step === 'otp'
        ? 'Verifikasi OTP · CampusNexa'
        : step === 'success'
          ? 'Berhasil · CampusNexa'
          : 'Daftar · CampusNexa'
  }, [step])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => {
    if (step !== 'otp' || expiresIn <= 0) return undefined
    const t = setTimeout(() => setExpiresIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, expiresIn])

  useEffect(() => {
    if (step !== 'success') return undefined
    const t = setTimeout(() => {
      navigate(destPath, { replace: true })
    }, 1200)
    return () => clearTimeout(t)
  }, [step, destPath, navigate])

  if (isAuthenticated && user && step !== 'success' && step !== 'otp') {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function startOtpTimers(expiresSeconds) {
    setExpiresIn(Number(expiresSeconds) > 0 ? Number(expiresSeconds) : DEFAULT_OTP_TTL)
    setResendIn(RESEND_COOLDOWN)
  }

  async function handleRequestOtp(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Nama lengkap wajib diisi')
      return
    }
    if (!form.studentId.trim()) {
      toast.error('NIM wajib diisi')
      return
    }
    if (!form.email.trim()) {
      toast.error('Email kampus wajib diisi')
      return
    }
    if (!strongPassword(form.password)) {
      toast.error('Kata sandi minimal 8 karakter, kombinasi huruf dan angka')
      return
    }
    if (!agreed) {
      toast.error('Anda perlu menyetujui Syarat & Ketentuan serta Kebijakan Privasi')
      return
    }
    setLoading(true)
    try {
      const res = await requestRegisterOtp({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        university: form.university,
        studentId: form.studentId.trim(),
      })
      setOtp('')
      setStep('otp')
      startOtpTimers(res?.expires_in)
      toast.success('Kode OTP dikirim ke email Anda. Cek inbox / spam.')
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal mengirim OTP'))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (expiresIn <= 0) {
      toast.error('Kode telah kedaluwarsa. Kirim ulang kode baru.')
      return
    }
    if (otp.trim().length !== 6) {
      toast.error('Masukkan 6 digit kode OTP')
      return
    }
    setLoading(true)
    try {
      const nextUser = await verifyRegisterOtp({
        email: form.email.trim(),
        code: otp.trim(),
      })
      setDestPath(homePathForRole(nextUser?.role))
      setStep('success')
    } catch (err) {
      toast.error(errorMessage(err, 'Kode OTP tidak valid'))
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0) return
    setLoading(true)
    try {
      const res = await resendRegisterOtp(form.email.trim())
      setOtp('')
      startOtpTimers(res?.expires_in)
      toast.success('Kode baru sudah dikirim ke email Anda.')
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal kirim ulang'))
    } finally {
      setLoading(false)
    }
  }

  function goBackToForm() {
    setStep('form')
    setOtp('')
    setExpiresIn(DEFAULT_OTP_TTL)
  }

  return (
    <>
      <AuthShell>
        {step === 'form' ? (
          <form
            onSubmit={handleRequestOtp}
            className="page-enter w-full max-w-md space-y-4 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(19,66,50,0.06)] sm:p-8"
          >
            <div>
              <Link to="/" className="inline-block lg:hidden">
                <BrandLogo size="sm" tone="forest" wordmarkClassName="text-xl" />
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)] lg:mt-0">
                Buat akun
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold">Daftar</h1>
              <p className="mt-2 text-[var(--muted)]">
                Verifikasi dengan kode OTP yang dikirim ke email kampus Anda.
              </p>
            </div>

            <Field
              label="Nama lengkap"
              required
              autoComplete="name"
              value={form.name}
              placeholder="Nama lengkap Anda"
              onChange={(e) => update('name', e.target.value)}
            />
            <Field
              label="NIM"
              required
              value={form.studentId}
              placeholder="Contoh: M0123456"
              onChange={(e) => update('studentId', e.target.value)}
              hint="Nomor Induk Mahasiswa sesuai kartu identitas kampus."
            />
            <Field
              label="Email kampus"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={form.email}
              placeholder="nama@student.uns.ac.id"
              onChange={(e) => update('email', e.target.value)}
              hint="Gunakan domain email resmi perguruan tinggi Anda."
            />

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--ink)]">Universitas</span>
              <select
                className="field w-full"
                required
                value={form.university}
                onChange={(e) => update('university', e.target.value)}
              >
                {AVAILABLE_UNIVERSITIES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-[var(--muted)]">
                Saat ini pendaftaran tersedia untuk Universitas Sebelas Maret (pilot project).
              </span>
            </label>

            <div className="space-y-1.5 text-sm">
              <span className="font-medium text-[var(--ink)]">Kata sandi</span>
              <div className="relative">
                <input
                  className="field w-full pr-11"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
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
              <span className="text-xs text-[var(--muted)]">
                Minimal 8 karakter, kombinasi huruf dan angka.
              </span>
            </div>

            <label className="flex items-start gap-2.5 text-sm leading-snug text-[var(--muted)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--line)] accent-[var(--forest)]"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                Saya menyetujui{' '}
                <button
                  type="button"
                  className="font-semibold text-[var(--forest)] underline-offset-2 hover:underline"
                  onClick={() => setLegal('terms')}
                >
                  Syarat &amp; Ketentuan
                </button>{' '}
                serta{' '}
                <button
                  type="button"
                  className="font-semibold text-[var(--forest)] underline-offset-2 hover:underline"
                  onClick={() => setLegal('privacy')}
                >
                  Kebijakan Privasi
                </button>
                .
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" disabled={loading || !agreed}>
              {loading ? 'Mengirim OTP…' : 'Lanjutkan'}
            </Button>

            <p className="text-center text-sm text-[var(--muted)]">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-semibold text-[var(--forest)] hover:underline">
                Masuk
              </Link>
            </p>
          </form>
        ) : step === 'otp' ? (
          <form
            onSubmit={handleVerifyOtp}
            className="page-enter w-full max-w-md space-y-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(19,66,50,0.06)] sm:p-8"
          >
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--forest)]">
                <Mail size={26} aria-hidden />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
                Langkah 2 dari 2
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold">Masukkan OTP</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">Kode 6 digit telah dikirim ke</p>
              <p className="mt-1 font-semibold text-[var(--ink)]">{maskEmail(form.email)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Cek juga folder spam.</p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[#f8faf9] px-4 py-3 text-center">
              {expiresIn > 0 ? (
                <>
                  <p className="text-xs text-[var(--muted)]">Kode berlaku selama</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--forest)]">
                    {formatMmSs(expiresIn)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-[var(--danger)]">Kode telah kedaluwarsa.</p>
              )}
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium text-[var(--ink)]">Kode OTP</span>
              <OtpBoxes
                value={otp}
                onChange={setOtp}
                disabled={loading || expiresIn <= 0}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || otp.length !== 6 || expiresIn <= 0}
            >
              {loading ? 'Memverifikasi…' : 'Verifikasi & buat akun'}
            </Button>

            <div className="space-y-3 text-center text-sm text-[var(--muted)]">
              <div>
                <p>Belum menerima kode?</p>
                <button
                  type="button"
                  className="mt-1 font-semibold text-[var(--forest)] hover:underline disabled:opacity-50"
                  disabled={loading || resendIn > 0}
                  onClick={handleResend}
                >
                  {resendIn > 0 ? `Kirim ulang (${resendIn} detik)` : 'Kirim ulang'}
                </button>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[var(--muted)] transition hover:text-[var(--ink)]"
                disabled={loading}
                onClick={goBackToForm}
              >
                <ArrowLeft size={16} />
                Kembali
              </button>
            </div>
          </form>
        ) : (
          <div className="page-enter w-full max-w-md space-y-4 rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-[0_12px_40px_rgba(19,66,50,0.06)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--forest)]">
              <CheckCircle2 size={36} aria-hidden />
            </div>
            <h1 className="font-display text-2xl font-semibold">Verifikasi berhasil!</h1>
            <p className="text-[var(--muted)]">Membuat akun…</p>
          </div>
        )}
      </AuthShell>

      <LegalModal
        open={legal === 'terms'}
        onClose={() => setLegal(null)}
        title="Syarat & Ketentuan"
      >
        <p>
          CampusNexa adalah platform berbagi sumber daya dan aksi keberlanjutan untuk mahasiswa.
          Dengan mendaftar, Anda setuju menggunakan layanan secara bertanggung jawab dan sesuai
          peraturan kampus.
        </p>
        <p>
          Akun hanya untuk mahasiswa dengan email kampus yang valid. Penyalahgunaan, penipuan, atau
          konten yang melanggar dapat mengakibatkan penonaktifan akun oleh admin kampus.
        </p>
        <p>
          Transaksi jual-beli dilakukan langsung antar pengguna. CampusNexa tidak menahan dana
          pihak ketiga.
        </p>
      </LegalModal>

      <LegalModal
        open={legal === 'privacy'}
        onClose={() => setLegal(null)}
        title="Kebijakan Privasi"
      >
        <p>
          Kami menyimpan data yang Anda berikan saat daftar (nama, NIM, email kampus, universitas)
          untuk keperluan autentikasi, verifikasi mahasiswa, dan operasional platform.
        </p>
        <p>
          Data tidak dijual kepada pihak ketiga. Akses admin kampus terbatas pada kebutuhan
          moderasi dan pengelolaan komunitas di universitas masing-masing.
        </p>
        <p>Anda dapat memperbarui profil melalui halaman pengaturan setelah masuk.</p>
      </LegalModal>
    </>
  )
}
