import { NavLink } from 'react-router-dom'
import Icon from '../ui/Icon'

const links = [['/overview', 'Overview', 'overview'], ['/portfolio', 'Portfolio', 'portfolio'], ['/news', 'News', 'news'], ['/recommendations', 'Forecasts', 'forecast'], ['/settings', 'Settings', 'settings']]

export default function MobileNavigation() {
  return <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/10 bg-ink/95 p-1.5 text-white shadow-2xl backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">{links.map(([path, label, icon]) => <NavLink key={path} to={path} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold ${isActive ? 'bg-gold text-ink' : 'text-white/45'}`}><Icon name={icon} className="h-4 w-4" />{label}</NavLink>)}</nav>
}
