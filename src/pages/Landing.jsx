import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  Check,
  GraduationCap,
  Leaf,
  Recycle,
  Sparkles,
} from 'lucide-react'
import { LandingNav, landingLinks } from '../components/layout/LandingNav'
import { BrandLogo } from '../components/BrandLogo'
import { Button } from '../components/ui/Button'
import { campusApi } from '../lib/api'

const orbitItems = [
  { label: 'Berbagi', angle: 0 },
  { label: 'Food Rescue', angle: 90 },
  { label: 'Aksi Komunitas', angle: 180 },
  { label: 'AI', angle: 270 },
]

const heroBadges = [
  { label: 'Khusus Mahasiswa', icon: GraduationCap },
  { label: 'Email Kampus', icon: Check },
  { label: 'AI Powered', icon: Sparkles },
  { label: 'Sustainable Campus', icon: Leaf },
]

/** Angka demo untuk presentasi bila data komunitas masih kosong. */
const DEMO_STATS = {
  eventsHeld: 18,
  activeVolunteers: 126,
}

function withDemoFloor(value, fallback) {
  const num = Number(value) || 0
  return num > 0 ? num : fallback
}

const features = [
  {
    title: 'Resource Exchange',
    body: 'Tukar, jual, pinjam, atau donasikan barang agar tetap bermanfaat bagi mahasiswa lain.',
  },
  {
    title: 'Food Rescue',
    body: 'Klaim makanan berlebih dari kantin maupun kegiatan kampus sebelum terbuang.',
  },
  {
    title: 'Aksi Komunitas',
    body: 'Ikuti kegiatan keberlanjutan dan daftar sebagai relawan untuk memberikan dampak nyata di kampus.',
  },
  {
    title: 'AI Assistant',
    body: 'AI membantu mengenali kategori barang, memperkirakan kondisi dan harga, serta membuat deskripsi secara otomatis.',
  },
]

const steps = [
  {
    title: 'Temukan kebutuhan atau peluang berbagi',
    body: 'Jelajahi barang, makanan, donasi, maupun kegiatan komunitas yang relevan di kampus Anda.',
  },
  {
    title: 'Berinteraksi dengan komunitas kampus',
    body: 'Chat, daftar event, atau bergabung sebagai relawan — semuanya dalam satu platform.',
  },
  {
    title: 'Ciptakan dampak bersama',
    body: 'Sumber daya tersalurkan, makanan terselamatkan, dan aksi keberlanjutan tercatat secara nyata.',
  },
]

const voices = [
  {
    quote: 'Modul semester lalu akhirnya dipakai mahasiswa lain, bukan menumpuk di kamar kos.',
    name: 'Alya · Fakultas Teknik',
  },
  {
    quote: 'Sisa katering himpunan langsung diklaim. Lebih baik daripada terbuang.',
    name: 'Bima · HIMTI',
  },
  {
    quote:
      'Sekarang informasi kegiatan lingkungan kampus lebih mudah ditemukan, dan pendaftaran relawan jadi lebih praktis.',
    name: 'Sinta · Fakultas MIPA',
  },
]

const faqs = [
  {
    q: 'Siapa yang dapat mendaftar?',
    a: 'Mahasiswa. Gunakan email kampus Anda agar komunitas di dalam CampusNexa tetap terbatas pada warga kampus.',
  },
  {
    q: 'Apakah layanan ini berbayar?',
    a: 'Tidak. CampusNexa gratis untuk mahasiswa. Untuk jual-beli, pembayaran dilakukan langsung antara kedua pihak saat serah terima.',
  },
  {
    q: 'Bagaimana AI membantu pengguna?',
    a: 'Saat mengunggah barang, AI membantu mengenali kategori, memperkirakan kondisi dan harga, serta menyusun deskripsi awal yang dapat Anda tinjau sebelum dipublikasikan.',
  },
]

function formatCount(n) {
  const num = Number(n) || 0
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K+`
  return String(num)
}

function formatKg(n) {
  const num = Number(n) || 0
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K kg`
  return `${Number.isInteger(num) ? num : num.toFixed(1)} kg`
}

const emptyCampus = {
  itemsSaved: 0,
  foodRescuedKg: 0,
  wasteReducedKg: 0,
  activeUsers: 0,
  eventsHeld: 0,
  activeVolunteers: 0,
}

function useRevealOnScroll() {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const nodes = root.querySelectorAll('.reveal')
    if (!nodes.length) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      nodes.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )

    nodes.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return rootRef
}

export default function Landing() {
  const [campus, setCampus] = useState(emptyCampus)
  const [statsReady, setStatsReady] = useState(false)
  const pageRef = useRevealOnScroll()

  useEffect(() => {
    let cancelled = false
    campusApi
      .publicCampusStats()
      .then((data) => {
        if (!cancelled) {
          setCampus({
            itemsSaved: data.itemsSaved ?? 0,
            foodRescuedKg: data.foodRescuedKg ?? 0,
            wasteReducedKg: data.wasteReducedKg ?? 0,
            activeUsers: data.activeUsers ?? 0,
            eventsHeld: withDemoFloor(data.eventsHeld, DEMO_STATS.eventsHeld),
            activeVolunteers: withDemoFloor(
              data.activeVolunteers,
              DEMO_STATS.activeVolunteers,
            ),
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampus({
            ...emptyCampus,
            eventsHeld: DEMO_STATS.eventsHeld,
            activeVolunteers: DEMO_STATS.activeVolunteers,
          })
        }
      })
      .finally(() => {
        if (!cancelled) setStatsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = [
    {
      label: 'Resource tersalurkan',
      value: statsReady ? formatCount(campus.itemsSaved) : '—',
    },
    {
      label: 'Makanan terselamatkan',
      value: statsReady ? formatKg(campus.foodRescuedKg) : '—',
    },
    {
      label: 'Sampah berkurang',
      value: statsReady ? formatKg(campus.wasteReducedKg) : '—',
    },
    {
      label: 'Event terlaksana',
      value: statsReady ? formatCount(campus.eventsHeld) : '—',
    },
    {
      label: 'Relawan aktif',
      value: statsReady ? formatCount(campus.activeVolunteers) : '—',
    },
  ]

  return (
    <div id="top" ref={pageRef} className="overflow-x-hidden bg-[#e7eee9]">
      <section className="relative min-h-svh overflow-hidden text-white">
        <div className="absolute inset-0 mesh-bg mesh-bg-live" />
        <div className="absolute inset-0 bg-[var(--forest-deep)]/45" />
        <div className="hero-orb hero-orb-a" aria-hidden />
        <div className="hero-orb hero-orb-b" aria-hidden />
        <div className="hero-orb hero-orb-c" aria-hidden />
        <LandingNav />

        <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-5 pb-20 pt-28 md:px-8 md:pb-28">
          <div className="grid items-end gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-xl">
              <div className="fade-up">
                <BrandLogo
                  size="xl"
                  tone="light"
                  wordmarkClassName="text-4xl md:text-5xl"
                />
                <div className="hero-line mt-5" />
              </div>
              <h1 className="fade-up-delay mt-5 font-display text-3xl font-semibold leading-[1.15] md:text-5xl">
                Jaga sumber daya kampus tetap berputar.
              </h1>
              <p className="fade-up-delay-2 mt-4 max-w-md text-base leading-relaxed text-white/75 md:text-lg">
                Satu platform untuk berbagi sumber daya, menyelamatkan makanan, dan berkolaborasi
                dalam aksi keberlanjutan di lingkungan kampus.
              </p>
              <ul
                className="fade-up-delay-2 mt-5 grid max-w-md grid-cols-2 gap-2 sm:max-w-lg"
                style={{ animationDelay: '0.38s' }}
              >
                {heroBadges.map(({ label, icon: Icon }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm"
                  >
                    <Icon size={13} className="shrink-0 opacity-90" aria-hidden />
                    <span className="truncate">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="fade-up-delay-2 mt-8 flex flex-wrap gap-3" style={{ animationDelay: '0.45s' }}>
                <Link to="/register">
                  <Button size="lg" variant="light">
                    Daftar sekarang
                    <ArrowRight size={18} className="arrow-nudge" />
                  </Button>
                </Link>
                <a href="#how">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Cara kerja
                  </Button>
                </a>
              </div>
            </div>

            <div className="fade-up-delay-2 relative mx-auto hidden lg:block" style={{ animationDelay: '0.35s' }} aria-hidden>
              <div className="hero-orbit mx-auto">
                <div className="hero-orbit-ring" />
                <div className="hero-orbit-ring-inner" />
                <div className="hero-orbit-core">
                  <Recycle size={36} className="spin-slow text-white/90" />
                </div>
                <div className="hero-orbit-track">
                  {orbitItems.map((item) => (
                    <div
                      key={item.label}
                      className="hero-orbit-item"
                      style={{ '--item-angle': `${item.angle}deg` }}
                    >
                      <span className="hero-orbit-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <a
            href="#about"
            className="scroll-hint absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/55 transition hover:text-white/85"
            aria-label="Scroll ke konten"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Jelajahi</span>
            <ArrowDown size={16} />
          </a>
        </div>
      </section>

      <section id="about" className="border-b border-[var(--line)] bg-[#eef3f0]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-24">
          <div className="reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
              Tentang
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[var(--ink)] md:text-4xl">
              Kampus punya banyak sumber daya. Yang kurang adalah jalur sirkulasinya.
            </h2>
          </div>
          <div className="reveal reveal-delay-1 flex items-center">
            <p className="text-lg leading-relaxed text-[var(--muted)]">
              Setiap semester, buku dan elektronik sering menumpuk, sementara sisa makanan acara
              kampus terbuang. CampusNexa menghubungkan mahasiswa untuk berbagi sumber daya,
              mengurangi limbah, menyelamatkan makanan, dan berpartisipasi dalam aksi
              keberlanjutan di lingkungan kampus.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#e7eee9]">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="reveal max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
              Fitur
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--ink)] md:text-4xl">
              Apa yang bisa Anda lakukan
            </h2>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`reveal border-t border-[var(--line)] pt-5 ${
                  i % 3 === 0 ? 'reveal-delay-1' : i % 3 === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--leaf)]">
                  0{i + 1}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-sm leading-relaxed text-[var(--muted)]">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="bg-[var(--forest-deep)] text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--leaf)]">
              Dampak
            </p>
            <h2 className="mt-3 max-w-lg font-display text-3xl font-semibold md:text-4xl">
              Dampak yang tumbuh bersama komunitas kampus.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-white/65 md:text-base">
              Khusus mahasiswa dengan email kampus · Pilot project di Universitas Sebelas Maret
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-white/15 pt-8 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`reveal ${
                  i % 3 === 0 ? 'reveal-delay-1' : i % 3 === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
                }`}
              >
                <p
                  className={`font-display text-3xl font-semibold tracking-tight md:text-4xl ${
                    statsReady ? 'stat-pop' : ''
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-10 border-t border-white/15 pt-10 md:grid-cols-3">
            {voices.map((voice, i) => (
              <blockquote
                key={voice.name}
                className={`reveal max-w-md ${
                  i === 1 ? 'reveal-delay-1' : i === 2 ? 'reveal-delay-2' : ''
                }`}
              >
                <p className="text-lg leading-relaxed text-white/85 md:text-xl">
                  “{voice.quote}”
                </p>
                <footer className="mt-3 text-sm text-white/50">{voice.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#eef3f0]">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
              Cara kerja
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--ink)] md:text-4xl">
              Tiga langkah sederhana.
            </h2>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={`reveal relative ${
                  i === 0 ? 'reveal-delay-1' : i === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
                }`}
              >
                {i < steps.length - 1 && (
                  <div className="absolute left-8 top-5 hidden h-px w-[calc(100%-2rem)] bg-[var(--line)] md:block" />
                )}
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--forest)] text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-[var(--ink)]">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-[var(--muted)]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-[var(--line)] bg-[#e7eee9]">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <div className="reveal">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--forest)]">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--ink)] md:text-4xl">
              Pertanyaan yang sering diajukan
            </h2>
          </div>
          <div className="reveal reveal-delay-1 mt-10 max-w-3xl divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faqs.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="cursor-pointer list-none font-display text-lg font-semibold text-[var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-[var(--muted)] transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-[var(--muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[#eef3f0]">
        <div className="reveal mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center md:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold text-[var(--ink)] md:text-4xl">
              Siap bergabung dengan CampusNexa?
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              Daftarkan akun Anda dengan email kampus untuk mulai berbagi dan berkolaborasi.
            </p>
          </div>
          <Link to="/register">
            <Button size="lg">
              Daftar sekarang
              <ArrowRight size={18} className="arrow-nudge" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--forest-deep)] px-5 py-12 text-sm text-white/55 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <BrandLogo size="md" tone="light" wordmarkClassName="text-xl" />
            <p className="mt-2 max-w-xs leading-relaxed">
              Platform berbagi sumber daya dan aksi keberlanjutan untuk komunitas kampus.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
              Jelajahi
            </p>
            <ul className="space-y-2">
              {landingLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
              Akun
            </p>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="transition hover:text-white">
                  Masuk
                </Link>
              </li>
              <li>
                <Link to="/register" className="transition hover:text-white">
                  Daftar
                </Link>
              </li>
              <li>
                <a href="mailto:hello@campusnexa.id" className="transition hover:text-white">
                  hello@campusnexa.id
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col justify-between gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p>© 2026 CampusNexa</p>
          <p>Khusus mahasiswa · Email kampus</p>
        </div>
      </footer>
    </div>
  )
}
