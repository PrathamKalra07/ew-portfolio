import { getAmplifySession } from './amplify'

const baseUrl = String(import.meta.env.VITE_MARKET_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const quotesPath = import.meta.env.VITE_MARKET_QUOTES_PATH || '/market/quotes'

async function request(path) {
  if (!baseUrl) throw new Error('VITE_MARKET_API_URL is not configured.')
  const session = await getAmplifySession()
  const token = session.tokens?.accessToken?.toString()
  const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.details?.message || payload?.details?.code || (typeof payload?.details === 'string' ? payload.details : '')
    const requestId = payload?.request_id ? ` [Request ${payload.request_id}]` : ''
    throw new Error(`${payload?.error || payload?.message || `Market API request failed (${response.status}).`}${detail ? `: ${detail}` : ''}${requestId}`)
  }
  return payload?.data ?? payload
}

function normalizeQuote(item, symbol) {
  const value = item?.data ?? item ?? {}
  const lastPrice = Number(value.price ?? value.last_price ?? value.ltp ?? value.lastPrice)
  if (!Number.isFinite(lastPrice)) return null
  const previousClose = Number(value.previous_close ?? value.previousClose ?? value.close)
  return { id: value.instrument_key || `NSE:${symbol}`, symbol: String(value.symbol || value.trading_symbol || symbol).toUpperCase(), name: value.name || symbol, exchange: value.exchange || 'NSE', price: lastPrice, previousClose: Number.isFinite(previousClose) ? previousClose : null, change: Number.isFinite(previousClose) ? lastPrice - previousClose : null, changePercent: previousClose > 0 ? ((lastPrice - previousClose) / previousClose) * 100 : null, volume: Number(value.volume ?? value.total_volume) || null, updatedAt: value.updated_at || value.timestamp || new Date().toISOString(), source: 'lambda' }
}

export async function getBatchQuotes(symbols) {
  const requested = symbols.map((symbol) => String(symbol).toUpperCase())
  const separator = quotesPath.includes('?') ? '&' : '?'
  const payload = await request(`${quotesPath}${separator}symbols=${encodeURIComponent(requested.join(','))}`)
  const rows = Array.isArray(payload) ? payload : payload?.quotes || payload?.stocks || Object.entries(payload || {}).map(([symbol, value]) => ({ symbol, ...value }))
  return rows.map((row, index) => normalizeQuote(row, row.symbol || requested[index])).filter(Boolean)
}

export async function searchMarket(query, exchange = 'ALL') {
  const payload = await request(`/market/search?q=${encodeURIComponent(query)}&exchange=${encodeURIComponent(exchange)}&limit=12`)
  return payload?.instruments || []
}

export function isIndianMarketOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  if (values.weekday === 'Sat' || values.weekday === 'Sun') return false
  const minutes = Number(values.hour) * 60 + Number(values.minute)
  return minutes >= 555 && minutes < 930
}

export function hasMarketRestApi() { return Boolean(baseUrl) }
