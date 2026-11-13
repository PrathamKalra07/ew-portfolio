import Icon from '../ui/Icon'

const scopes = [
  { id: 'feed', label: 'All watchlists' },
  { id: 'watchlist', label: 'By watchlist' },
  { id: 'stock', label: 'By stock' },
]

export default function NewsFilters({ scope, onScopeChange, selection, onRefresh, refreshing }) {
  return (
    <section className="surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex overflow-x-auto rounded-2xl bg-mist p-1">
          {scopes.map((item) => <button key={item.id} type="button" onClick={() => onScopeChange(item.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-[10px] font-black transition ${scope === item.id ? 'bg-ink text-white shadow-sm' : 'text-ink/40 hover:text-ink'}`}>{item.label}</button>)}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          {scope !== 'feed' && (
            <select value={selection.watchlistId} onChange={(event) => selection.setWatchlistId(event.target.value)} disabled={selection.loading || !selection.watchlists.length} className="field min-w-0 text-xs font-bold sm:w-52">
              {!selection.watchlists.length && <option value="">No watchlists</option>}
              {selection.watchlists.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
          {scope === 'stock' && (
            <select value={selection.instrumentKey} onChange={(event) => selection.setInstrumentKey(event.target.value)} disabled={selection.loading || !selection.stocks.length} className="field min-w-0 text-xs font-bold sm:w-56">
              {!selection.stocks.length && <option value="">No stocks in watchlist</option>}
              {selection.stocks.map((item) => <option key={item.instrumentKey} value={item.instrumentKey}>{item.symbol || item.name}</option>)}
            </select>
          )}
          <button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink/10 px-4 text-[10px] font-black text-ink/55 transition hover:border-ink/25 hover:text-ink disabled:opacity-40"><Icon name="refresh" className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>
      {selection.error && <p className="mt-3 rounded-xl bg-coral/5 px-3 py-2 text-xs font-semibold text-coral">{selection.error}</p>}
    </section>
  )
}
