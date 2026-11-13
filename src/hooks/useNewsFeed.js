import { useCallback, useEffect, useRef, useState } from 'react'
import { getNewsFeed, getStockNews, getWatchlistNews } from '../lib/newsApi'

export function useNewsFeed({ scope, watchlistId, instrumentKey, limit = 20 }) {
  const [articles, setArticles] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const requestSequence = useRef(0)

  const fetchPage = useCallback(async (nextCursor, append = false) => {
    const requestId = ++requestSequence.current
    if ((scope === 'watchlist' && !watchlistId) || (scope === 'stock' && !instrumentKey)) {
      setArticles([])
      setCursor(null)
      setLoading(false)
      return
    }
    append ? setLoadingMore(true) : setLoading(true)
    setError('')
    try {
      const options = { limit, cursor: nextCursor }
      const result = scope === 'watchlist'
        ? await getWatchlistNews(watchlistId, options)
        : scope === 'stock'
          ? await getStockNews(instrumentKey, options)
          : await getNewsFeed(options)
      if (requestId !== requestSequence.current) return
      setArticles((current) => {
        const combined = append ? [...current, ...result.articles] : result.articles
        return [...new Map(combined.map((item) => [item.id, item])).values()]
      })
      setCursor(result.nextCursor)
    } catch (requestError) {
      if (requestId !== requestSequence.current) return
      setError(requestError.message)
      if (!append) setArticles([])
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [scope, watchlistId, instrumentKey, limit])

  useEffect(() => { fetchPage(null, false) }, [fetchPage])

  return { articles, cursor, loading, loadingMore, error, reload: () => fetchPage(null, false), loadMore: () => fetchPage(cursor, true) }
}
