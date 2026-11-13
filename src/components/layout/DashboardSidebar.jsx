import { NavLink } from 'react-router-dom'
import BrandMark from '../ui/BrandMark'
import Icon from '../ui/Icon'

const links = [
  { path: '/overview', label: 'Overview', icon: 'overview' },
  { path: '/portfolio', label: 'Portfolio', icon: 'portfolio' },
  { path: '/news', label: 'News', icon: 'news' },
  { path: '/recommendations', label: 'Forecasts', icon: 'forecast' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
]

export default function DashboardSidebar({ displayName, onSignOut }) {
  const initial = displayName?.charAt(0)?.toUpperCase() || 'I'
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden bg-ink px-4 py-5 text-white lg:flex">
      <div className="px-2"><BrandMark /></div>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[.045] p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-gold"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />System operational</div>
        <p className="mt-3 text-xs leading-5 text-white/45">Live prices for the eyes. Daily data for the model.</p>
      </div>
      <nav className="mt-8 space-y-1" aria-label="Primary navigation">
        {links.map((item) => <NavLink key={item.path} to={item.path} className={({ isActive }) => `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold ${isActive ? 'bg-gold text-ink' : 'text-white/55 hover:bg-white/[.06] hover:text-white'}`}><Icon name={item.icon} className="h-[18px] w-[18px]" />{item.label}<Icon name="chevron" className="ml-auto h-4 w-4 opacity-0 transition group-hover:opacity-50" /></NavLink>)}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 p-3">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-bold text-gold">{initial}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{displayName}</p><p className="mt-0.5 text-[10px] text-white/35">Authenticated workspace</p></div></div>
        <button type="button" onClick={onSignOut} className="mt-3 w-full rounded-xl border border-white/10 py-2 text-[11px] font-semibold text-white/50 hover:bg-white/5 hover:text-white">Sign out</button>
      </div>
    </aside>
  )
}
