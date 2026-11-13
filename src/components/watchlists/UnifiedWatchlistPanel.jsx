import { useState } from 'react'
import DataSourceIndicator from '../DataSourceIndicator'
import Icon from '../ui/Icon'
import WatchlistTable from './WatchlistTable'

function WatchlistTabs({ watchlists, selectedId, onSelect }) {
  return (
    <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Watchlists">
      {watchlists.map((item) => {
        const active = String(item.id) === String(selectedId)
        return (
          <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => onSelect(item.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-black transition ${active ? 'bg-ink text-white shadow-soft' : 'border border-ink/[.07] bg-white text-ink/45 hover:border-ink/20 hover:text-ink'}`}>
            {item.name}
            {item.isDefault && <span className={`ml-2 text-[8px] uppercase tracking-wider ${active ? 'text-gold' : 'text-cobalt'}`}>Default</span>}
          </button>
        )
      })}
    </div>
  )
}

function AddDestinationMenu({ stock, watchlists, pendingAction, onAdd, onClose }) {
  const [completedId, setCompletedId] = useState('')

  async function add(target) {
    const success = await onAdd(stock, target.id)
    if (success) {
      setCompletedId(String(target.id))
      window.setTimeout(onClose, 650)
    }
  }

  return (
    <div className="absolute right-0 top-11 z-20 w-64 overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 text-ink shadow-card">
      <div className="flex items-center justify-between px-2 py-2">
        <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-ink/35">Add {stock.symbol} to</p><p className="mt-1 text-[10px] text-ink/35">Choose a destination watchlist</p></div>
        <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-ink/35 hover:bg-mist" aria-label="Close menu"><Icon name="close" className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-1 max-h-52 space-y-1 overflow-y-auto">
        {watchlists.map((item) => {
          const pending = pendingAction === `add:${item.id}:${stock.instrumentKey}`
          const done = completedId === String(item.id)
          return (
            <button key={item.id} type="button" onClick={() => add(item)} disabled={Boolean(pendingAction) || done} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-mist disabled:opacity-60">
              <span className="min-w-0 truncate text-xs font-bold">{item.name}</span>
              <span className={`text-[9px] font-black ${done ? 'text-emerald-600' : 'text-cobalt'}`}>{done ? 'Added' : pending ? 'Adding...' : 'Add'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SearchResult({ item, watchlists, pendingAction, onAdd }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-ink/[.06] px-5 py-4 first:border-0 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-[10px] font-black text-forest">{item.symbol.slice(0, 2)}</span>
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-black">{item.symbol}</p><span className="rounded-md bg-cobalt/10 px-1.5 py-0.5 text-[8px] font-black text-cobalt">{item.exchange}</span></div><p className="mt-1 truncate text-[11px] text-ink/40">{item.name}</p></div>
      </div>
      <button type="button" onClick={() => setMenuOpen((value) => !value)} disabled={!watchlists.length} className="inline-flex h-9 items-center gap-2 rounded-xl bg-ink px-3 text-[10px] font-black text-white transition hover:-translate-y-0.5 disabled:bg-mist disabled:text-ink/25"><Icon name="plus" className="h-3.5 w-3.5" />Add to...</button>
      {menuOpen && <AddDestinationMenu stock={item} watchlists={watchlists} pendingAction={pendingAction} onAdd={onAdd} onClose={() => setMenuOpen(false)} />}
    </div>
  )
}

export default function UnifiedWatchlistPanel({ watchlist, search, market }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const searchingMode = search.query.trim().length >= 2

  async function create(event) {
    event.preventDefault()
    if (!newName.trim()) return
    try {
      await watchlist.create(newName.trim())
      setNewName('')
      setShowCreate(false)
    } catch {
      // The hook exposes the request error in the panel.
    }
  }

  function deleteSelected() {
    if (window.confirm(`Delete "${watchlist.selected?.name}" and all its items?`)) watchlist.removeList()
  }

  return (
    <section className="surface overflow-visible">
      <div className="border-b border-ink/[.07] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="shrink-0">
            <div className="flex items-center gap-2"><p className="eyebrow">Market workspace</p><DataSourceIndicator source={market.marketOpen ? 'fargate' : 'lambda'} /></div>
            <h2 className="mt-2 text-xl font-black tracking-[-.025em]">Watchlists</h2>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
            <WatchlistTabs watchlists={watchlist.watchlists} selectedId={watchlist.selectedId} onSelect={watchlist.open} />
            <label className="relative min-w-0 md:w-72 md:shrink-0">
              <Icon name="search" className="absolute left-3 top-3 h-5 w-5 text-ink/25" />
              <input value={search.query} onChange={(event) => search.setQuery(event.target.value)} placeholder="Search stocks..." className="field w-full pl-10 pr-9" />
              {search.query && <button type="button" onClick={() => search.setQuery('')} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-ink/25 hover:bg-mist" aria-label="Clear search"><Icon name="close" className="h-3.5 w-3.5" /></button>}
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 px-3 text-[10px] font-black text-ink/55 transition hover:border-ink/25 hover:text-ink"><Icon name="plus" className="h-3.5 w-3.5" />New watchlist</button>
          <button type="button" onClick={deleteSelected} disabled={!watchlist.selectedId || watchlist.pendingAction === 'delete-list'} className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[10px] font-black text-coral transition hover:bg-coral/5 disabled:opacity-30"><Icon name="trash" className="h-3.5 w-3.5" />Delete selected</button>
          {searchingMode && <div className="ml-auto flex items-center gap-2"><select value={search.exchange} onChange={(event) => search.setExchange(event.target.value)} className="h-9 rounded-xl border border-ink/10 bg-white px-3 text-[10px] font-black outline-none"><option>ALL</option><option>NSE</option><option>BSE</option></select><span className="text-[10px] font-semibold text-ink/35">{search.results.length} results</span></div>}
        </div>

        {showCreate && (
          <form onSubmit={create} className="mt-3 flex max-w-md gap-2 rounded-2xl bg-mist/70 p-2">
            <input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="e.g. Banking momentum" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-xs font-semibold outline-none placeholder:text-ink/30" />
            <button type="submit" disabled={!newName.trim() || watchlist.pendingAction === 'create'} className="rounded-xl bg-ink px-4 text-[10px] font-black text-white disabled:opacity-40">{watchlist.pendingAction === 'create' ? 'Creating...' : 'Create'}</button>
          </form>
        )}
      </div>

      {watchlist.error && <p className="border-b border-coral/10 bg-coral/5 px-6 py-3 text-xs font-semibold text-coral">{watchlist.error}</p>}
      {search.error && <p className="border-b border-coral/10 bg-coral/5 px-6 py-3 text-xs font-semibold text-coral">{search.error}</p>}

      {searchingMode ? (
        <div className="min-h-64">
          <div className="flex items-center justify-between border-b border-ink/[.06] px-5 py-3 sm:px-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-ink/35">Search results for "{search.query.trim()}"</p><p className="hidden text-[10px] text-ink/30 sm:block">Choose Add to... then select a watchlist</p></div>
          {search.loading && <div className="space-y-3 p-6">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-mist/70" />)}</div>}
          {!search.loading && search.results.map((item) => <SearchResult key={item.instrumentKey} item={item} watchlists={watchlist.watchlists} pendingAction={watchlist.pendingAction} onAdd={watchlist.addStockTo} />)}
          {!search.loading && !search.results.length && !search.error && <div className="grid min-h-52 place-items-center text-center"><div><Icon name="search" className="mx-auto h-7 w-7 text-ink/20" /><p className="mt-3 text-sm font-bold">No instruments found</p><p className="mt-1 text-xs text-ink/35">Try a trading symbol or company name.</p></div></div>}
        </div>
      ) : <WatchlistTable items={watchlist.items} market={market} loading={watchlist.loading} selectedId={watchlist.selectedId} pendingAction={watchlist.pendingAction} onRemove={watchlist.removeStock} />}
    </section>
  )
}
