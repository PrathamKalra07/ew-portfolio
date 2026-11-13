import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMarketData } from '../contexts/MarketDataContext'
import { addWatchlistItem, createWatchlist, deleteWatchlist, deleteWatchlistItem, getWatchlist, listWatchlists, normalizeWatchlistItems } from '../lib/watchlistApi'

export function useWatchlists() {
  const market = useMarketData()
  const [watchlists, setWatchlists] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState('')
  const [error, setError] = useState('')

  const selected = useMemo(() => watchlists.find((item) => String(item.id) === String(selectedId)), [watchlists, selectedId])
  const instrumentKeys = useMemo(() => new Set(items.map((item) => item.instrumentKey)), [items])

  const open = useCallback(async (id) => {
    if (!id) { setSelectedId(''); setItems([]); market.updateInstruments([]); return }
    setLoading(true)
    setError('')
    try {
      const nextItems = normalizeWatchlistItems(await getWatchlist(id))
      setSelectedId(String(id))
      setItems(nextItems)
      market.updateInstruments(nextItems)
      if (nextItems.some((item) => !item.symbol)) setError('Some items are missing trading_symbol, so live quotes cannot be matched.')
    } catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }, [market])

  const reload = useCallback(async (preferredId) => {
    setLoading(true)
    setError('')
    try {
      const rows = await listWatchlists()
      setWatchlists(rows)
      const next = rows.find((item) => String(item.id) === String(preferredId)) ?? rows.find((item) => String(item.id) === String(selectedId)) ?? rows.find((item) => item.isDefault) ?? rows[0]
      if (next) await open(next.id)
      else { setSelectedId(''); setItems([]); market.updateInstruments([]) }
    } catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }, [market, open, selectedId])

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function create(name) {
    setPendingAction('create')
    setError('')
    try { const created = await createWatchlist(name, watchlists.length === 0); await reload(created.id) }
    catch (requestError) { setError(requestError.message); throw requestError }
    finally { setPendingAction('') }
  }

  async function removeList() {
    if (!selectedId) return
    setPendingAction('delete-list')
    setError('')
    try { await deleteWatchlist(selectedId); setSelectedId(''); setItems([]); await reload() }
    catch (requestError) { setError(requestError.message) }
    finally { setPendingAction('') }
  }

  async function addStockTo(stock, targetWatchlistId = selectedId) {
    if (!targetWatchlistId) { setError('Create or select a watchlist before adding a stock.'); return }
    setPendingAction(`add:${targetWatchlistId}:${stock.instrumentKey}`)
    setError('')
    try {
      await addWatchlistItem({ instrumentKey: stock.instrumentKey, stockName: stock.name, tradingSymbol: stock.symbol }, targetWatchlistId)
      if (String(targetWatchlistId) === String(selectedId)) await open(selectedId)
      return true
    } catch (requestError) { setError(requestError.message); return false }
    finally { setPendingAction('') }
  }

  async function removeStock(item) {
    setPendingAction(`remove:${item.id}`)
    setError('')
    try { await deleteWatchlistItem(selectedId, item.id); await open(selectedId) }
    catch (requestError) { setError(requestError.message) }
    finally { setPendingAction('') }
  }

  return { watchlists, selected, selectedId, items, instrumentKeys, loading, pendingAction, error, open, create, removeList, addStockTo, removeStock }
}
