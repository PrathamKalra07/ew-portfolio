import { getAmplifySession } from './amplify'

const baseUrl = String(import.meta.env.VITE_NEWS_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function request(path) {
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is not configured.')
  const session = await getAmplifySession()
  const token = session.tokens?.accessToken?.toString() || session.tokens?.idToken?.toString()
  if (!token) throw new Error('Your session is unavailable. Please sign in again.')

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const requestId = payload?.request_id ? ` [Request ${payload.request_id}]` : ''
    throw new Error(`${payload?.error || payload?.message || `News request failed (${response.status}).`}${requestId}`)
  }
  return payload?.data ?? payload ?? {}
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

function safeHttpUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

function normalizeArticle(row, index) {
  const sentiment = row.sentiment ?? row.news_sentiment ?? {}
  const publishedAt = row.published_at ?? row.publishedAt ?? row.pub_date ?? row.date ?? row.created_at
  const scoreValue = row.sentiment_score ?? row.sentimentScore ?? sentiment.score ?? sentiment.average
  const score = Number(scoreValue)
  const instruments = asArray(row.instruments ?? row.instrument_keys ?? row.stocks ?? row.symbols ?? row.tickers)
    .map((item) => typeof item === 'object' ? item.trading_symbol ?? item.symbol ?? item.instrument_key : item)
    .filter(Boolean)
  return {
    ...row,
    id: row.id ?? row.article_id ?? row.news_id ?? row.url ?? `${publishedAt || 'article'}-${index}`,
    title: row.title ?? row.headline ?? 'Untitled market update',
    summary: row.summary ?? row.description ?? row.content_preview ?? row.snippet ?? '',
    url: safeHttpUrl(row.url ?? row.article_url ?? row.link),
    source: row.source_name ?? row.source ?? row.publisher ?? row.provider ?? 'Market news',
    publishedAt,
    sentimentLabel: String(row.sentiment_label ?? row.sentimentLabel ?? sentiment.label ?? '').toLowerCase(),
    sentimentScore: Number.isFinite(score) ? score : null,
    instruments,
  }
}

function normalizeArticles(payload) {
  const container = payload?.feed ?? payload
  const rows = Array.isArray(container) ? container : container?.articles ?? container?.items ?? container?.news ?? []
  return {
    articles: rows.map(normalizeArticle),
    nextCursor: container?.next_cursor ?? container?.nextCursor ?? container?.pagination?.next_cursor ?? payload?.next_cursor ?? payload?.meta?.next_cursor ?? null,
  }
}

function articleQuery(limit, cursor) {
  const params = new URLSearchParams({ limit: String(Math.min(Math.max(Number(limit) || 20, 1), 50)) })
  if (cursor) params.set('cursor', cursor)
  return params.toString()
}

export async function getNewsFeed({ limit = 20, cursor } = {}) {
  return normalizeArticles(await request(`/news/feed?${articleQuery(limit, cursor)}`))
}

export async function getWatchlistNews(watchlistId, { limit = 20, cursor } = {}) {
  if (!watchlistId) throw new Error('Choose a watchlist to load its news.')
  return normalizeArticles(await request(`/news/watchlists/${encodeURIComponent(watchlistId)}?${articleQuery(limit, cursor)}`))
}

export async function getStockNews(instrumentKey, { limit = 20, cursor } = {}) {
  if (!instrumentKey) throw new Error('Choose a stock to load its news.')
  return normalizeArticles(await request(`/news/stocks/${encodeURIComponent(instrumentKey)}?${articleQuery(limit, cursor)}`))
}

export async function getStockSentiment(instrumentKey, days = 30) {
  if (!instrumentKey) throw new Error('Choose a stock to load sentiment history.')
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365)
  const payload = await request(`/news/stocks/${encodeURIComponent(instrumentKey)}/sentiment?days=${safeDays}`)
  const container = payload?.sentiment ?? payload
  const rows = Array.isArray(container) ? container : container?.history ?? container?.daily ?? container?.items ?? []
  return rows.map((row) => {
    const score = Number(row.average_sentiment ?? row.avg_sentiment ?? row.avg_sentiment_score ?? row.sentiment_score ?? row.score)
    return {
      date: row.date ?? row.day ?? row.published_date,
      articleCount: Number(row.article_count ?? row.count ?? row.total_articles) || 0,
      positiveCount: Number(row.positive_count ?? row.positive) || 0,
      negativeCount: Number(row.negative_count ?? row.negative) || 0,
      neutralCount: Number(row.neutral_count ?? row.neutral) || 0,
      score: Number.isFinite(score) ? score : null,
    }
  }).filter((row) => row.date)
}
