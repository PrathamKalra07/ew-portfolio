import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import OverviewPage from './components/dashboard/OverviewPage'
import PortfolioPage from './components/dashboard/PortfolioPage'
import ResearchPage from './components/dashboard/ResearchPage'
import SettingsPage from './components/dashboard/SettingsPage'
import LoginPage from './pages/LoginPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Dashboard />}>
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/recommendations" element={<ResearchPage />} />
          <Route path="/research" element={<Navigate to="/recommendations" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}
