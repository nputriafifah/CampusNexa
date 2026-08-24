import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { BrandLogo } from '../components/BrandLogo'
import {
  apiRequestPasswordResetOtp,
  apiResendPasswordResetOtp,
  apiResetPasswordWithOtp,
} from '../lib/api'

const highlights = [
  { label: 'Khusus mahasiswa', icon: GraduationCap },
  { label: 'Email kampus', icon: Mail },
  { label: 'AI powered', icon: Sparkles },
  { label: 'Sustainable campus', icon: Leaf },
]

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

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function isCampusEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!isValidEmailFormat(e)) return false
  return /@(?:[a-z0-9-]+\.)+(?:ac\.id|edu)$/i.test(e)
}

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

export default function ForgotPassword() {
  const [step, setStep] = useState('email') // email | otp | password | success
  const [email, setEmail] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [expiresIn, setExpiresIn] = useState(DEFAULT_OTP_TTL)

  useEffect(() => {
    const titles = {
      email: 'Lupa kata sandi · CampusNexa',
      otp: 'Verifikasi OTP · CampusNexa',
      password: 'Kata sandi baru · CampusNexa',
      success: 'Kata sandi diperbarui · CampusNexa',
    }
    document.title = titles[step] || titles.email
  }, [step])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  useEffect(() => {
    if ((step !== 'otp' && step !== 'password') || expiresIn <= 0) return undefined
    const t = setTimeout(() => setExpiresIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, expiresIn])

  function validateEmailField(value) {
    const v = value.trim()
    if (!v) return ''
    if (!isValidEmailFormat(v)) return 'Masukkan alamat email yang valid.'
    if (!isCampusEmail(v)) return 'Gunakan email resmi perguruan tinggi Anda.'
    return ''
  }

  function onEmailChange(value) {
    setEmail(value)
    setEmailHint(validateEmailField(value))
  }

  function startOtpTimers(expiresSeconds) {
    setExpiresIn(Number(expiresSeconds) > 0 ? Number(expiresSeconds) : DEFAULT_OTP_TTL)
    setResendIn(RESEND_COOLDOWN)
  }

  async function handleRequestOtp(e) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Email kampus wajib diisi')
      return
    }
    const hint = validateEmailField(trimmed)
    if (hint) {
      setEmailHint(hint)
      toast.error(hint)
      return
    }

    setLoading(true)
    try {
      const res = await apiRequestPasswordResetOtp(trimmed)
      setOtp('')
      setStep('otp')
      startOtpTimers(res?.expires_in)
      toast.success('Kode OTP telah dikirim ke email Anda')
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal mengirim OTP'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0) return
    setLoading(true)
    try {
      const res = await apiResendPasswordResetOtp(email.trim())
      setOtp('')
      startOtpTimers(res?.expires_in)
      toast.success('Kode OTP baru telah dikirim')
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal mengirim ulang OTP'))
    } finally {
      setLoading(false)
    }
  }

  function handleOtpContinue(e) {
    e.preventDefault()
    if (otp.trim().length !== 6) {
      toast.error('Masukkan 6 digit kode OTP')
      return
    }
    if (expiresIn <= 0) {
      toast.error('Kode OTP sudah kedaluwarsa. Minta kode baru.')
      return
    }
    setStep('password')
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Kata sandi minimal 8 karakter.')
      return
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error('Kata sandi harus mengandung huruf dan angka.')
      return
    }
    if (password !== passwordConfirmation) {
      toast.error('Konfirmasi kata sandi tidak sesuai.')
      return
    }

    setLoading(true)
    try {
      await apiResetPasswordWithOtp({
        email: email.trim(),
        code: otp.trim(),
        password,
        password_confirmation: passwordConfirmation,
      })
      setStep('success')
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal mengatur ulang kata sandi'))
      if (err.response?.data?.errors?.code) {
        setStep('otp')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden mesh-bg lg:block">
        <div className="absolute inset-0 bg-[var(--forest-deep)]/55" />
        <div className="pointer-events-none absolute -left-10 bottom-24 h-56 w-56 rounded-full bg-[var(--leaf)]/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="transition hover:opacity-90">
            <BrandLogo size="md" tone="light" wordmarkClassName="text-2xl" />
          </Link>
          <div className="fade-up max-w-md">
            <div className="hero-line mb-5" />
            <p className="font-display text-4xl font-semibold leading-tight">
              Pulihkan akses akun kampus Anda.
            </p>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Masukkan email kampus yang terdaftar. Kami kirim kode OTP untuk mengatur ulang kata
              sandi.
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
          <p className="text-xs text-white/45">CampusNexa · Reset kata sandi via OTP</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#eef3f0] px-5 py-12">
        <div className="page-enter w-full max-w-md space-y-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_12px_40px_rgba(19,66,50,0.06)] sm:p-8">
          {step === 'success' ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--forest)]">
                <CheckCircle2 size={36} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
                  Keamanan akun
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold">
                  Kata sandi berhasil diperbarui.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  Silakan masuk menggunakan kata sandi baru Anda.
                </p>
              </div>
              <Link to="/login" className="block">
                <Button type="button" className="w-full" size="lg">
                  Masuk
                </Button>
              </Link>
            </div>
          ) : step === 'otp' ? (
            <form onSubmit={handleOtpContinue} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
                  Verifikasi
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold">Masukkan kode OTP</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Kode 6 digit dikirim ke{' '}
                  <span className="font-semibold text-[var(--ink)]">{maskEmail(email)}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Berlaku {formatMmSs(expiresIn)}
                  {expiresIn <= 0 ? ' · kedaluwarsa' : ''}
                </p>
              </div>

              <OtpBoxes value={otp} onChange={setOtp} disabled={loading || expiresIn <= 0} />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || otp.length !== 6 || expiresIn <= 0}
              >
                Lanjut
              </Button>

              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  className="font-medium text-[var(--forest)] disabled:opacity-50"
                  disabled={loading || resendIn > 0}
                  onClick={handleResend}
                >
                  {resendIn > 0 ? `Kirim ulang (${resendIn} detik)` : 'Kirim ulang OTP'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => {
                    setStep('email')
                    setOtp('')
                  }}
                >
                  <ArrowLeft size={16} />
                  Ganti email
                </button>
              </div>
            </form>
          ) : step === 'password' ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
                  Keamanan akun
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold">Kata sandi baru</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Minimal 8 karakter, mengandung huruf dan angka.
                </p>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--ink)]">Kata sandi baru</span>
                <div className="relative">
                  <input
                    className="field w-full pr-11"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--ink)]">Konfirmasi kata sandi</span>
                <div className="relative">
                  <input
                    className="field w-full pr-11"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword
                        ? 'Sembunyikan konfirmasi kata sandi'
                        : 'Tampilkan konfirmasi kata sandi'
                    }
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan kata sandi'}
              </Button>

              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                <ArrowLeft size={16} />
                Kembali ke Masuk
              </Link>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="text-center sm:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint)] text-[var(--forest)] sm:mx-0">
                  <Mail size={26} aria-hidden />
                </div>
                <Link to="/" className="mt-4 inline-block lg:hidden">
                  <BrandLogo size="sm" tone="forest" wordmarkClassName="text-xl" />
                </Link>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
                  Keamanan akun
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold">Lupa kata sandi</h1>
                <p className="mt-2 text-[var(--muted)]">
                  Masukkan email kampus Anda. Kami kirim kode OTP untuk reset.
                </p>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--ink)]">Email kampus</span>
                <input
                  className="field w-full"
                  type="email"
                  required
                  autoComplete="email"
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

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Mengirim OTP…' : 'Kirim kode OTP'}
              </Button>

              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                <ArrowLeft size={16} />
                Kembali ke masuk
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
