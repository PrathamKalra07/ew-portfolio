import { events } from 'aws-amplify/data'
import { configureAmplify } from './amplify'

const channel = import.meta.env.VITE_APPSYNC_EVENT_CHANNEL || '/market/nse'
const storageKey = 'portfolio.marketSymbols'
const defaultSymbols = import.meta.env.VITE_MARKET_SYMBOLS || 'RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,SBIN'

function cleanSymbols(value) {
  return [...new Set(String(value || '').split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
}

export function getTrackedSymbols() {
  const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : ''
  if (saved?.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(saved)
      return cleanSymbols(parsed.map((item) => typeof item === 'string' ? item : item?.symbol).join(','))
    } catch { /* migrate the legacy value below */ }
  }
  return cleanSymbols(saved || defaultSymbols)
}

export function setTrackedSymbols(value) {
  const symbols = cleanSymbols(Array.isArray(value) ? value.join(',') : value)
  if (!symbols.length) throw new Error('Enter at least one NSE trading symbol.')
  window.localStorage.setItem(storageKey, JSON.stringify(symbols.map((symbol) => ({ symbol }))))
  window.dispatchEvent(new CustomEvent('market-symbols-changed', { detail: symbols }))
  return symbols
}

function parseJson(value) {
  let parsed = value

  for (let depth = 0; depth < 3 && typeof parsed === 'string'; depth += 1) {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      break
    }
  }

  return parsed
}

function collectPayloads(value) {
  const parsed = parseJson(value)

  if (Array.isArray(parsed)) {
    return parsed.flatMap(collectPayloads)
  }

  if (!parsed || typeof parsed !== 'object') {
    return []
  }

  const hasPrice = ['price', 'current_price', 'lastPrice', 'last_price', 'ltp', 'p'].some((key) => parsed[key] != null)

  if (hasPrice) return [parsed]

  for (const key of ['stocks', 'event', 'events', 'data', 'payload', 'message', 'tick', 'ticks']) {
    if (parsed[key] != null) {
      const nested = collectPayloads(parsed[key])
      if (nested.length) return nested
    }
  }

  return []
}

function firstNumber(payload, keys) {
  for (const key of keys) {
    const value = Number(payload[key])
    if (Number.isFinite(value)) return value
  }

  return null
}

function normalizeSymbol(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^NSE_EQ\|/i, '')
}

export function normalizeMarketEvents(message) {
  const source = message?.event ?? message

  return collectPayloads(source).flatMap((payload) => {
    const rawSymbol =
      payload.symbol ??
      payload.ticker ??
      payload.asset ??
      payload.trading_symbol ??
      payload.s ??
      ''
    const symbol = normalizeSymbol(rawSymbol)
    const price = firstNumber(payload, [
      'price',
      'current_price',
      'lastPrice',
      'last_price',
      'ltp',
      'p',
    ])

    if (!symbol || price == null) return []

    return [{
      id: payload.instrument_key || `NSE:${symbol}`,
      symbol,
      name: payload.name || symbol,
      exchange: 'NSE',
      price,
      previousClose: firstNumber(payload, ['previous_close', 'previousClose', 'close', 'cp']),
      volume: firstNumber(payload, ['total_volume', 'volume', 'v']),
      updatedAt: payload.received_at || payload.timestamp || payload.last_trade_time || new Date().toISOString(),
    }]
  }).map((tick) => ({
    ...tick,
    change: tick.previousClose == null ? null : tick.price - tick.previousClose,
    changePercent: tick.previousClose > 0 ? ((tick.price - tick.previousClose) / tick.previousClose) * 100 : null,
  }))
}

export async function connectToMarketStream({ onEvent, onError, onStatus }) {
  configureAmplify()
  onStatus?.('connecting')

  const tracked = new Set(getTrackedSymbols())
  let eventChannel
  let subscription

  try {
    eventChannel = await events.connect(channel)
    subscription = eventChannel.subscribe({
      next(message) {
        for (const tick of normalizeMarketEvents(message)) {
          if (!tracked.size || tracked.has(tick.symbol)) onEvent?.(tick)
        }
      },
      error(error) { onStatus?.('error'); onError?.(error) },
    })
  } catch (error) {
    onStatus?.('error')
    if (eventChannel) await eventChannel.close()
    throw error
  }

  onStatus?.('connected')

  return async () => {
    subscription?.unsubscribe()
    await eventChannel?.close()
    onStatus?.('closed')
  }
}

export function getMarketChannelPath() {
  return channel
}
