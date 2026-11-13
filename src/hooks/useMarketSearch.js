import { useEffect, useState } from 'react'
import { searchMarket } from '../lib/upstoxRest'

export function useMarketSearch() {
  const [query, setQuery] = useState('')
  const [exchange, setExchange] = useState('ALL')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setError(''); return undefined }
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try { setResults(await searchMarket(query.trim(), exchange)) }
      catch (searchError) { setError(searchError.message); setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [query, exchange])

  return { query, setQuery, exchange, setExchange, results, loading, error }
}
