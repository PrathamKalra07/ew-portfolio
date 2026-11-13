import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'

const OverviewPage = lazy(() => import('./components/dashboard/OverviewPage'))
const PortfolioPage = lazy(() => import('./components/dashboard/PortfolioPage'))
const NewsPage = lazy(() => import('./components/dashboard/NewsPage'))
const ResearchPage = lazy(() => import('./components/dashboard/ResearchPage'))
const SettingsPage = lazy(() => import('./components/dashboard/SettingsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

function PageLoader() {
  return <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-ink/10 border-t-cobalt" /><p className="mt-3 text-xs font-semibold text-ink/35">Loading SmartNifty…</p></div></div>
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}><Route path="/login" element={<LazyPage><LoginPage /></LazyPage>} /></Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Dashboard />}>
          <Route path="/overview" element={<LazyPage><OverviewPage /></LazyPage>} />
          <Route path="/portfolio" element={<LazyPage><PortfolioPage /></LazyPage>} />
          <Route path="/news" element={<LazyPage><NewsPage /></LazyPage>} />
          <Route path="/recommendations" element={<LazyPage><ResearchPage /></LazyPage>} />
          <Route path="/research" element={<Navigate to="/recommendations" replace />} />
          <Route path="/settings" element={<LazyPage><SettingsPage /></LazyPage>} />
          <Route path="/admin" element={<Navigate to="/settings" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}
