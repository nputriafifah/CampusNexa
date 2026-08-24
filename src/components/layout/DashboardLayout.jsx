import { NavLink, Outlet } from 'react-router-dom'
import {
  Bell,
  Heart,
  Home,
  Leaf,
  LogOut,
  Package,
  PlusCircle,
  Settings,
  UserRound,
  Users,
  Utensils,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { BrandLogo } from '../BrandLogo'

const mainNav = [
  { to: '/app', end: true, label: 'Beranda', icon: Home },
  { to: '/app/exchange', label: 'Barang', icon: Package },
  { to: '/app/food', label: 'Makanan', icon: Utensils },
  { to: '/app/posting', label: 'Posting', icon: PlusCircle },
  { to: '/app/community', label: 'Komunitas', icon: Users },
  { to: '/app/impact', label: 'Dampak', icon: Leaf },
  { to: '/app/favorites', label: 'Favorit', icon: Heart },
]

const accountNav = [
  { to: '/app/notifications', label: 'Notifikasi', icon: Bell },
  { to: '/app/profile', label: 'Profil', icon: UserRound },
  { to: '/app/settings', label: 'Pengaturan', icon: Settings },
]

function NavItem({ to, end, label, icon: Icon, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
          isActive
            ? 'bg-[var(--mint)] font-semibold text-[var(--forest-deep)]'
            : 'text-[var(--muted)] hover:bg-[#dde7e1] hover:text-[var(--ink)]'
        }`
      }
    >
      <Icon size={17} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-[var(--ember)] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const { notifications } = useData()
  const notifPrefs = (() => {
    try {
      return JSON.parse(localStorage.getItem('campusnexa_notif_prefs') || '{}')
    } catch {
      return {}
    }
  })()
  const showBadge = notifPrefs.pushInApp !== false
  const unread = showBadge ? notifications.filter((n) => !n.read).length : 0

  function handleLogout() {
    logout()
    window.location.replace('/')
  }

  return (
    <div className="h-svh overflow-hidden bg-[var(--sand)] lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden h-svh border-r border-[var(--line)] bg-[#e8efea] lg:flex lg:flex-col">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <NavLink to="/app">
            <BrandLogo size="sm" tone="forest" wordmarkClassName="text-xl" />
          </NavLink>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 scrollbar-thin">
          <div className="space-y-0.5">
            {mainNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          <div className="my-3 border-t border-[var(--line)]" />

          <div className="space-y-0.5">
            {accountNav.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                badge={item.to.includes('notifications') ? unread : 0}
              />
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[var(--line)] p-3">
          <NavLink
            to="/app/profile"
            className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[#dde7e1]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--forest)] text-[11px] font-bold text-white">
              {user?.avatar || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{user?.name}</p>
              <p className="truncate text-[10px] text-[var(--muted)]">{user?.university}</p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-[#dde7e1] hover:text-[var(--ink)]"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex h-svh min-h-0 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[#e8efea]/90 px-4 py-3 backdrop-blur md:px-8 lg:hidden">
          <NavLink to="/app">
            <BrandLogo size="sm" tone="forest" wordmarkClassName="text-xl" />
          </NavLink>
          <div className="flex items-center gap-2">
            <NavLink
              to="/app/notifications"
              className="relative rounded-full border border-[var(--line)] bg-white p-2"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--ember)]" />
              )}
            </NavLink>
            <NavLink
              to="/app/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--forest)] text-xs font-bold text-white"
            >
              {user?.avatar || 'U'}
            </NavLink>
          </div>
        </header>

        <main className="page-enter min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>

        <nav className="z-10 grid shrink-0 grid-cols-5 border-t border-[var(--line)] bg-[#e8efea]/95 px-1 py-2 backdrop-blur lg:hidden">
          {mainNav.slice(0, 5).map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] ${
                  isActive ? 'text-[var(--forest)]' : 'text-[var(--muted)]'
                }`
              }
            >
              <Icon size={18} />
              <span className="truncate">{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
