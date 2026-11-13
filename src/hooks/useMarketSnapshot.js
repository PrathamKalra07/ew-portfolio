import { useEffect, useMemo, useState } from 'react'
import { MARKET_UNIVERSE } from '../lib/marketUniverse'
import { getBatchQuotes } from '../lib/upstoxRest'

export function useMarketSnapshot() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const rows = await getBatchQuotes(MARKET_UNIVERSE)
        if (active) setQuotes(rows)
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const timer = window.setInterval(load, 5 * 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  return useMemo(() => {
    const ranked = quotes.filter((item) => Number.isFinite(item.changePercent)).sort((a, b) => b.changePercent - a.changePercent)
    const advances = ranked.filter((item) => item.changePercent > 0).length
    const declines = ranked.filter((item) => item.changePercent < 0).length
    const averageChange = ranked.length ? ranked.reduce((sum, item) => sum + item.changePercent, 0) / ranked.length : null
    return {
      gainers: ranked.slice(0, 3),
      losers: [...ranked].reverse().slice(0, 3),
      advances,
      declines,
      unchanged: ranked.length - advances - declines,
      coverage: ranked.length,
      averageChange,
      loading,
      error,
    }
  }, [quotes, loading, error])
}
