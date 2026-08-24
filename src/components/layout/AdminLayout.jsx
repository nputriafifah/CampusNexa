import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Shield,
  Sparkles,
  Tags,
  UserRound,
  Users,
  Utensils,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { roleLabel } from '../../lib/roles'
import { BrandLogo } from '../BrandLogo'

const campusNav = [
  { to: '/admin/campus', end: true, label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/admin/campus/users', label: 'Kelola Mahasiswa', short: 'Mhs', icon: Users },
  { to: '/admin/campus/organizations', label: 'Penyelenggara', short: 'Org', icon: Building2 },
  { to: '/admin/campus/items', label: 'Kelola Barang', short: 'Barang', icon: Package },
  { to: '/admin/campus/foods', label: 'Kelola Makanan', short: 'Makanan', icon: Utensils },
  { to: '/admin/campus/community', label: 'Aksi Komunitas', short: 'Aksi', icon: CalendarDays },
  { to: '/admin/campus/impact', label: 'Analitik Kampus', short: 'Analitik', icon: BarChart3 },
  { to: '/admin/campus/announcements', label: 'Pengumuman', short: 'Info', icon: Megaphone },
  { to: '/admin/campus/profile', label: 'Profil', short: 'Profil', icon: UserRound },
]

const superNav = [
  { to: '/admin/super', end: true, label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/admin/super/universities', label: 'Kelola Universitas', short: 'Univ', icon: Building2 },
  { to: '/admin/super/admins', label: 'Kelola Campus Admin', short: 'Admin', icon: Shield },
  { to: '/admin/super/categories', label: 'Kelola Kategori', short: 'Kat', icon: Tags },
  { to: '/admin/super/ai-settings', label: 'Pengaturan AI', short: 'AI', icon: Sparkles },
  { to: '/admin/super/analytics', label: 'Analitik Nasional', short: 'Analitik', icon: BarChart3 },
  { to: '/admin/super/profile', label: 'Profil', short: 'Profil', icon: UserRound },
]

export function AdminLayout({ variant = 'campus' }) {
  const { user, logout } = useAuth()
  const nav = variant === 'super' ? superNav : campusNav
  const title = variant === 'super' ? 'Super Admin' : 'Admin Kampus'
  const accent = variant === 'super' ? 'bg-[#1a1f1c]' : 'bg-[var(--forest-deep)]'

  function handleLogout() {
    logout()
    window.location.replace('/')
  }

  return (
    <div className="h-svh overflow-hidden lg:grid lg:grid-cols-[272px_1fr]">
      <aside
        className={`relative hidden h-svh overflow-hidden text-white lg:flex lg:flex-col ${accent}`}
      >
        <div className="pointer-events-none absolute -right-10 top-24 h-40 w-40 rounded-full bg-[var(--ember)]/20 blur-3xl" />
        <div className="relative shrink-0 border-b border-white/10 px-6 py-6">
          <NavLink to={nav[0].to}>
            <BrandLogo size="sm" tone="light" wordmarkClassName="text-2xl" />
          </NavLink>
          <p className="mt-1 text-sm text-[var(--ember)]">{title}</p>
          <p className="mt-0.5 truncate text-xs text-white/50">
            {variant === 'campus' ? user?.university || 'Kampus' : 'Semua universitas'}
          </p>
        </div>
        <nav className="relative min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {nav.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-white/12 text-white shadow-[inset_3px_0_0_var(--ember)]'
                    : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="leading-snug">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="relative shrink-0 border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-[var(--ember)] text-sm font-bold text-white">
              {user?.avatar || 'A'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-white/55">{roleLabel(user?.role)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex h-svh min-h-0 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--sand)]/85 px-4 py-3 backdrop-blur-md md:px-8 lg:hidden">
          <div className="min-w-0">
            <BrandLogo size="sm" tone="forest" wordmarkClassName="text-lg" />
            <p className="truncate text-xs text-[var(--ember)]">
              {title}
              {variant === 'campus' && user?.university ? ` · ${user.university}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 border border-[var(--line)] bg-white px-3 py-2 text-sm"
          >
            Keluar
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>

        <nav className="sticky bottom-0 z-10 flex shrink-0 gap-1 overflow-x-auto border-t border-[var(--line)] bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
          {nav.map(({ to, end, short, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-[4.25rem] flex-col items-center gap-1 px-1 py-1.5 text-[10px] ${
                  isActive ? 'text-[var(--forest)]' : 'text-[var(--muted)]'
                }`
              }
            >
              <Icon size={18} />
              <span className="truncate">{short}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
