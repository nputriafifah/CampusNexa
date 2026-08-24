import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathForRole, isAdmin, isCampusAdmin, isSuperAdmin } from '../lib/roles'

function BootScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--sand)] text-[var(--muted)]">
      Memuat sesi…
    </div>
  )
}

function AccessDenied({ role }) {
  const home = homePathForRole(role)
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[var(--sand)] px-4 text-center">
      <p className="font-display text-xl font-semibold text-[var(--ink)]">Akses terbatas</p>
      <p className="max-w-md text-sm text-[var(--muted)]">
        Halaman Super Admin hanya untuk akun super admin. Kamu sedang masuk dengan peran lain.
      </p>
      <Link
        to={home}
        className="mt-2 rounded-full bg-[var(--forest)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Kembali ke panel
      </Link>
    </div>
  )
}

/** Redirect authenticated users to the right home by role */
export function RoleHomeRedirect() {
  const { user, isAuthenticated, booting } = useAuth()

  if (booting) return <BootScreen />

  if (!isAuthenticated) return <Navigate to="/" replace />
  return <Navigate to={homePathForRole(user?.role)} replace />
}

/** Student app — admins get sent to their panel */
export function StudentRoute() {
  const { user, isAuthenticated, booting } = useAuth()

  if (booting) return <BootScreen />

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (isAdmin(user?.role)) {
    return <Navigate to={homePathForRole(user?.role)} replace />
  }

  return <Outlet />
}

/** Campus admin only */
export function CampusAdminRoute() {
  const { user, isAuthenticated, booting } = useAuth()

  if (booting) return <BootScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin/campus' }} />
  }

  if (!isCampusAdmin(user?.role)) {
    if (isSuperAdmin(user?.role)) {
      return <Navigate to="/admin/super" replace />
    }
    return <Navigate to={homePathForRole(user?.role)} replace />
  }

  return <Outlet />
}

/** Super admin only */
export function SuperAdminRoute() {
  const { user, isAuthenticated, booting } = useAuth()

  if (booting) return <BootScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin/super' }} />
  }

  if (!isSuperAdmin(user?.role)) {
    return <AccessDenied role={user?.role} />
  }

  return <Outlet />
}
