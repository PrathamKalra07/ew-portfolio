import { getAmplifySession } from './amplify'

const baseUrl = String(import.meta.env.VITE_WATCHLIST_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const watchlistIdKey = 'portfolio.defaultWatchlistId'
let createPromise = null

async function request(path, options = {}) {
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is not configured.')
  const session = await getAmplifySession()
  const token = session.tokens?.accessToken?.toString()
  if (!token) throw new Error('Your session is unavailable. Please sign in again.')

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const requestId = payload?.request_id ? ` [Request ${payload.request_id}]` : ''
    throw new Error(`${payload?.error || payload?.message || `Watchlist request failed (${response.status}).`}${requestId}`)
  }
  return payload?.data ?? payload
}

export function getWatchlistId(value) {
  return value?.id ?? value?.watchlist_id ?? value?.watchlistId ?? value?.watchlist?.id ?? null
}

export function normalizeWatchlists(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.watchlists ?? payload?.items ?? []
  return rows.map((row) => ({
    ...row,
    id: getWatchlistId(row),
    name: row.name ?? row.watchlist_name ?? 'Watchlist',
    isDefault: Boolean(row.is_default ?? row.isDefault),
  })).filter((row) => row.id != null)
}

export function normalizeWatchlistItems(payload) {
  const container = payload?.watchlist ?? payload
  const rows = Array.isArray(container?.items) ? container.items : Array.isArray(payload?.watchlist_items) ? payload.watchlist_items : []
  return rows.map((row) => ({
    ...row,
    id: row.id ?? row.item_id ?? row.watchlist_item_id,
    instrumentKey: row.instrument_key ?? row.instrumentKey ?? row.instrument?.instrument_key,
    symbol: String(row.symbol ?? row.trading_symbol ?? row.tradingSymbol ?? row.instrument?.trading_symbol ?? '').toUpperCase(),
    name: row.stock_name ?? row.name ?? row.instrument_name ?? row.instrument?.name,
    exchange: row.exchange ?? row.instrument?.exchange,
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    addedAt: row.added_at ?? row.addedAt,
  })).filter((row) => row.instrumentKey).sort((left, right) => left.sortOrder - right.sortOrder)
}

export async function listWatchlists() {
  return normalizeWatchlists(await request('/watchlists'))
}

export async function getWatchlist(id) {
  return request(`/watchlists/${encodeURIComponent(id)}`)
}

export async function createWatchlist(name = 'My Favourites', isDefault = true) {
  const payload = await request('/watchlists', {
    method: 'POST',
    body: JSON.stringify({ name, is_default: isDefault }),
  })
  const id = getWatchlistId(payload)
  if (id == null) throw new Error('The watchlist was created, but its ID was missing from the response.')
  if (isDefault) window.localStorage.setItem(watchlistIdKey, String(id))
  return { ...payload, id }
}

export async function ensureDefaultWatchlist() {
  const savedId = window.localStorage.getItem(watchlistIdKey)
  if (savedId) return savedId
  if (createPromise) return createPromise

  createPromise = listWatchlists().then(async (watchlists) => {
    const existing = watchlists.find((item) => item.isDefault) ?? watchlists[0]
    const id = existing?.id ?? (await createWatchlist()).id
    window.localStorage.setItem(watchlistIdKey, String(id))
    return String(id)
  }).finally(() => { createPromise = null })
  return createPromise
}

export async function addWatchlistItem({ instrumentKey, stockName, tradingSymbol }, watchlistId) {
  if (!instrumentKey) throw new Error('The selected stock has no instrument key.')
  if (!stockName) throw new Error('The selected stock has no stock name.')
  if (!tradingSymbol) throw new Error('The selected stock has no trading symbol.')
  const id = watchlistId ?? await ensureDefaultWatchlist()
  const payload = await request(`/watchlists/${encodeURIComponent(id)}/items`, {
    method: 'POST',
    body: JSON.stringify({
      instrument_key: instrumentKey,
      stock_name: stockName,
      trading_symbol: tradingSymbol,
    }),
  })
  return { watchlistId: String(id), payload }
}

export async function deleteWatchlistItem(watchlistId, itemId) {
  if (itemId == null) throw new Error('The watchlist item ID is missing.')
  return request(`/watchlists/${encodeURIComponent(watchlistId)}/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
}

export async function deleteWatchlist(watchlistId) {
  const result = await request(`/watchlists/${encodeURIComponent(watchlistId)}`, { method: 'DELETE' })
  if (String(window.localStorage.getItem(watchlistIdKey)) === String(watchlistId)) window.localStorage.removeItem(watchlistIdKey)
  return result
}
