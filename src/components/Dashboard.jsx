import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMarketData } from '../contexts/MarketDataContext'
import DataSourceIndicator from './DataSourceIndicator'
import OrderTicket from './dashboard/OrderTicket'

function Logo() {
  return <span className="grid h-10 w-10 grid-cols-4 items-end gap-1 rounded-xl bg-gold p-2.5" aria-hidden="true"><span className="h-2 rounded-full bg-forest" /><span className="h-3.5 rounded-full bg-forest" /><span className="h-5 rounded-full bg-forest" /><span className="h-3 rounded-full bg-forest" /></span>
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const market = useMarketData()
  const [order, setOrder] = useState(null)
  const [orderMessage, setOrderMessage] = useState('')
  const displayName = user?.signInDetails?.loginId || user?.username || 'Investor'
  const source = market.provider === 'mock' ? 'demo' : market.marketOpen ? 'fargate' : 'lambda'
  const links = [
    ['/overview', 'Overview'],
    ['/portfolio', 'Portfolio'],
    ['/recommendations', 'Recommendations'],
    ['/settings', 'Settings / Admin'],
  ]

  function placedOrder(result) {
    setOrder(null)
    setOrderMessage(`${result.side} order for ${result.quantity} ${result.symbol} simulated successfully.`)
    window.setTimeout(() => setOrderMessage(''), 4000)
  }

  return (
    <main className="min-h-screen bg-cream text-forest">
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Logo /><div><p className="font-semibold">Portfolio AI</p><p className="text-[10px] uppercase tracking-[.16em] text-forest/40">Market workspace</p></div></div>
          <div className="flex items-center gap-3"><DataSourceIndicator source={source} /><span className="hidden text-xs text-forest/45 lg:inline">{displayName}</span><button type="button" onClick={signOut} className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-xs font-semibold hover:bg-forest hover:text-white sm:px-4">Sign out</button></div>
        </div>
        <nav className="mx-auto mt-4 flex max-w-6xl gap-1 overflow-x-auto" aria-label="Primary navigation">
          {links.map(([path, label]) => <NavLink key={path} to={path} className={({ isActive }) => `shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${isActive ? 'bg-forest text-white' : 'text-forest/55 hover:bg-forest/5 hover:text-forest'}`}>{label}</NavLink>)}
        </nav>
      </header>
      {orderMessage && <div className="fixed right-5 top-28 z-40 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-semibold text-white shadow-xl">{orderMessage}</div>}
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><Outlet context={{ onOrder: setOrder }} /></div>
      <OrderTicket order={order} onClose={() => setOrder(null)} onPlaced={placedOrder} />
    </main>
  )
}
