import { useEffect, useState } from 'react'
import { getWatchlist, listWatchlists, normalizeWatchlistItems } from '../lib/watchlistApi'

export function useNewsWatchlists() {
  const [watchlists, setWatchlists] = useState([])
  const [watchlistId, setWatchlistId] = useState('')
  const [stocks, setStocks] = useState([])
  const [instrumentKey, setInstrumentKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listWatchlists().then((rows) => {
      if (!active) return
      setWatchlists(rows)
      setWatchlistId(String(rows.find((item) => item.isDefault)?.id ?? rows[0]?.id ?? ''))
    }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!watchlistId) { setStocks([]); setInstrumentKey(''); return undefined }
    let active = true
    setLoading(true)
    getWatchlist(watchlistId).then((payload) => {
      if (!active) return
      const rows = normalizeWatchlistItems(payload)
      setStocks(rows)
      setInstrumentKey((current) => rows.some((item) => item.instrumentKey === current) ? current : rows[0]?.instrumentKey ?? '')
    }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [watchlistId])

  const selectedStock = stocks.find((item) => item.instrumentKey === instrumentKey)
  return { watchlists, watchlistId, setWatchlistId, stocks, instrumentKey, setInstrumentKey, selectedStock, loading, error }
}
