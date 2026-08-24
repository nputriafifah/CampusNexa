import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { BrandLogo } from '../BrandLogo'
import { useAuth } from '../../context/AuthContext'

export const landingLinks = [
  { href: '#about', label: 'Tentang' },
  { href: '#features', label: 'Fitur' },
  { href: '#how', label: 'Cara kerja' },
  { href: '#impact', label: 'Dampak' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingNav() {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function close() {
    setOpen(false)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-all duration-300 ${
        scrolled || open
          ? 'border-b border-white/10 bg-[var(--forest)]/92 shadow-[0_8px_24px_rgba(27,94,69,0.18)] backdrop-blur-md'
          : 'border-b border-transparent bg-[var(--forest)]/55 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
        <a href="#top" className="transition hover:opacity-90" onClick={close}>
          <BrandLogo size="md" tone="light" wordmarkClassName="text-xl md:text-2xl" />
        </a>

        <nav className="hidden items-center gap-7 text-sm text-white/80 lg:flex">
          {landingLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link to="/app">
              <Button size="sm" variant="light">
                Beranda
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  Masuk
                </Button>
              </Link>
              <Link to="/register" className="hidden sm:block">
                <Button size="sm" variant="light">
                  Daftar sekarang
                </Button>
              </Link>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white lg:hidden"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[var(--forest)]/95 px-5 py-4 backdrop-blur-md lg:hidden">
          <nav className="flex flex-col gap-1">
            {landingLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-xl px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <Link to="/login" onClick={close}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full border-white/25 bg-transparent text-white hover:bg-white/10"
                >
                  Masuk
                </Button>
              </Link>
              <Link to="/register" onClick={close}>
                <Button size="sm" variant="light" className="w-full">
                  Daftar
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
