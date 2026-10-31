import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center bg-cream text-forest"><div className="text-center"><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-forest/15 border-t-forest" /><p className="mt-4 text-sm font-medium text-forest/55">Restoring your session...</p></div></main>
}

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <LoadingScreen />
  if (status !== 'signedIn') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export function GuestRoute() {
  const { status } = useAuth()
  if (status === 'checking') return <LoadingScreen />
  if (status === 'signedIn') return <Navigate to="/overview" replace />
  return <Outlet />
}
