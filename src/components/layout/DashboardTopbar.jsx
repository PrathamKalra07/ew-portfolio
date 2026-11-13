import DataSourceIndicator from '../DataSourceIndicator'
import BrandMark from '../ui/BrandMark'

export default function DashboardTopbar({ displayName, source, marketOpen, onSignOut }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/[.07] bg-cream/85 px-4 py-3 backdrop-blur-xl sm:px-7 lg:px-10">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="lg:hidden"><BrandMark /></div>
        <div className="hidden lg:block"><p className="text-xs font-semibold text-ink/40">Indian equities · {marketOpen ? 'Market session' : 'After hours'}</p></div>
        <div className="flex items-center gap-2 sm:gap-3"><DataSourceIndicator source={source} /><span className="hidden max-w-48 truncate text-xs font-semibold text-ink/45 sm:block lg:hidden xl:block">{displayName}</span><button type="button" onClick={onSignOut} className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-[11px] font-semibold text-ink/55 hover:border-ink hover:text-ink lg:hidden">Sign out</button></div>
      </div>
    </header>
  )
}
