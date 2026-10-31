import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMarketDataProvider, subscribeToMarketData } from '../lib/marketData'
import { getTrackedSymbols, setTrackedSymbols as persistTrackedSymbols } from '../lib/marketStream'
import { getBatchQuotes, hasMarketRestApi, isIndianMarketOpen } from '../lib/upstoxRest'

const MarketDataContext = createContext(null)

export function MarketDataProvider({ children }) {
  const [quotes, setQuotes] = useState({})
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const [generation, setGeneration] = useState(0)
  const [symbols, setSymbols] = useState(getTrackedSymbols)
  const provider = getMarketDataProvider()
  const [marketOpen, setMarketOpen] = useState(isIndianMarketOpen)

  useEffect(() => {
    const timer = window.setInterval(() => setMarketOpen(isIndianMarketOpen()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    let refreshTimer

    async function loadLambdaSnapshot() {
      setStatus('connecting')
      try {
        const snapshot = await getBatchQuotes(symbols)
        if (!active) return
        setQuotes(Object.fromEntries(snapshot.map((quote) => [quote.symbol.toUpperCase(), quote])))
        setError(null)
        setStatus('connected')
      } catch (feedError) {
        if (active) { setError(feedError); setStatus('error') }
      }
    }

    if (provider !== 'mock' && !marketOpen) {
      if (!hasMarketRestApi()) {
        setError(new Error('VITE_MARKET_API_URL is required for after-hours quotes.'))
        setStatus('error')
        return () => { active = false }
      }
      loadLambdaSnapshot()
      refreshTimer = window.setInterval(loadLambdaSnapshot, 5 * 60_000)
      return () => { active = false; window.clearInterval(refreshTimer) }
    }

    const closeStream = subscribeToMarketData({
      onSnapshot(snapshot) { setQuotes(Object.fromEntries(snapshot.map((quote) => [quote.symbol.toUpperCase(), { ...quote, source: provider === 'mock' ? 'demo' : 'fargate' }]))) },
      onTick(tick) { setQuotes((current) => ({ ...current, [tick.symbol.toUpperCase()]: { ...tick, source: provider === 'mock' ? 'demo' : 'fargate' } })) },
      onStatus: setStatus,
      onError(feedError) {
        setError(feedError)
        setStatus('error')
        if (provider !== 'mock' && hasMarketRestApi()) loadLambdaSnapshot()
      },
    })
    return () => { active = false; closeStream?.() }
  }, [generation, marketOpen, provider, symbols])

  const updateSymbols = useCallback((value) => {
    const saved = persistTrackedSymbols(value)
    setSymbols(saved)
    setQuotes({})
    setError(null)
    setGeneration((current) => current + 1)
    return saved
  }, [])

  const value = useMemo(() => ({
    provider, status, connected: status === 'connected', error, quotes, marketOpen,
    quoteList: Object.values(quotes), symbols, updateSymbols,
    getQuote(symbol) { return quotes[String(symbol).toUpperCase()] || null },
    getPrice(symbol, fallback) { return quotes[String(symbol).toUpperCase()]?.price ?? fallback },
    isLive(symbol) { return provider !== 'mock' && Boolean(quotes[String(symbol).toUpperCase()]) },
    getSource(symbol) { return quotes[String(symbol).toUpperCase()]?.source || 'demo' },
  }), [provider, status, error, quotes, symbols, updateSymbols, marketOpen])

  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>
}

export function useMarketData() {
  const value = useContext(MarketDataContext)
  if (!value) throw new Error('useMarketData must be used inside MarketDataProvider')
  return value
}
