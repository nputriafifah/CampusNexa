import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, booting } = useAuth()

  if (booting) {
    return (
      <div className="flex min-h-svh items-center justify-center text-[var(--muted)]">
        Memuat sesi…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
