import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMarketData } from '../contexts/MarketDataContext'
import OrderTicket from './dashboard/OrderTicket'
import DashboardSidebar from './layout/DashboardSidebar'
import DashboardTopbar from './layout/DashboardTopbar'
import MobileNavigation from './layout/MobileNavigation'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const market = useMarketData()
  const [order, setOrder] = useState(null)
  const [orderMessage, setOrderMessage] = useState('')
  const displayName = user?.signInDetails?.loginId || user?.username || 'Investor'
  const source = market.provider === 'mock' ? 'demo' : market.marketOpen ? 'fargate' : 'lambda'

  function placedOrder(result) {
    setOrder(null)
    setOrderMessage(`${result.side} order for ${result.quantity} ${result.symbol} simulated successfully.`)
    window.setTimeout(() => setOrderMessage(''), 4000)
  }

  return (
    <main className="min-h-screen bg-cream text-ink lg:pl-64">
      <DashboardSidebar displayName={displayName} onSignOut={signOut} />
      <DashboardTopbar displayName={displayName} source={source} marketOpen={market.marketOpen} onSignOut={signOut} />
      {orderMessage && <div className="fixed right-5 top-20 z-50 rounded-2xl bg-ink px-5 py-3 text-xs font-semibold text-white shadow-card">{orderMessage}</div>}
      <div className="mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-12 lg:pt-8"><Outlet context={{ onOrder: setOrder }} /></div>
      <MobileNavigation />
      <OrderTicket order={order} onClose={() => setOrder(null)} onPlaced={placedOrder} />
    </main>
  )
}
