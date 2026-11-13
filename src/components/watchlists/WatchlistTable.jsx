import DataSourceIndicator from '../DataSourceIndicator'
import Icon from '../ui/Icon'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

function StockRow({ item, quote, pending, onRemove }) {
  const symbol = item.symbol || item.instrumentKey
  const change = quote?.changePercent
  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-ink/[.06] px-5 py-4 first:border-0 sm:px-6">
      <div className="min-w-0"><div className="flex items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-[10px] font-black text-forest">{symbol.slice(0, 2)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{symbol}</p><p className="mt-0.5 truncate text-[11px] text-ink/38">{quote?.name || item.name || 'NSE equity'}</p></div></div></div>
      <div className="text-right"><p className="text-sm font-bold tabular-nums">{quote ? money.format(quote.price) : '--'}</p><p className={`mt-1 text-[10px] font-bold ${change == null ? 'text-ink/30' : change >= 0 ? 'text-emerald-600' : 'text-coral'}`}>{change == null ? 'Awaiting price' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}</p></div>
      <button type="button" onClick={onRemove} disabled={pending || item.id == null} className="grid h-9 w-9 place-items-center rounded-xl text-ink/25 hover:bg-coral/10 hover:text-coral disabled:opacity-30" aria-label={`Remove ${symbol}`}><Icon name={pending ? 'clock' : 'close'} className="h-4 w-4" /></button>
    </div>
  )
}

export default function WatchlistTable({ items, market, loading, selectedId, pendingAction, onRemove }) {
  if (loading) return <div className="space-y-3 p-6">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-mist/70" />)}</div>
  if (!selectedId) return <div className="grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/40"><Icon name="plus" /></span><p className="mt-4 text-sm font-bold">Create your first watchlist</p><p className="mt-1 text-xs text-ink/40">Then search the market and add the stocks that matter.</p></div></div>
  if (!items.length) return <div className="grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mist"><Icon name="search" /></span><p className="mt-4 text-sm font-bold">Nothing here yet</p><p className="mt-1 text-xs text-ink/40">Use market search to add an NSE equity.</p></div></div>
  return <div>{items.map((item) => <StockRow key={item.id ?? item.instrumentKey} item={item} quote={market.getQuote(item.symbol)} pending={pendingAction === `remove:${item.id}`} onRemove={() => onRemove(item)} />)}<div className="flex items-center justify-between border-t border-ink/[.06] px-6 py-3"><p className="text-[10px] font-semibold text-ink/35">{items.length} instruments / selected watchlist</p><DataSourceIndicator source={market.marketOpen ? 'fargate' : 'lambda'} /></div></div>
}
