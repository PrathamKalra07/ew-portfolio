import { useEffect, useState } from 'react'
import { getStockSentiment } from '../lib/newsApi'

export function useNewsSentiment(instrumentKey, days) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!instrumentKey) { setHistory([]); setError(''); return undefined }
    let active = true
    setLoading(true)
    setError('')
    getStockSentiment(instrumentKey, days)
      .then((rows) => { if (active) setHistory(rows) })
      .catch((requestError) => { if (active) { setHistory([]); setError(requestError.message) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [instrumentKey, days])

  return { history, loading, error }
}
