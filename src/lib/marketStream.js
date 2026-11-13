import { events } from 'aws-amplify/data'
import { configureAmplify } from './amplify'

const channel = import.meta.env.VITE_APPSYNC_EVENT_CHANNEL || '/market/nse'
const storageKey = 'portfolio.marketSymbols'
const defaultSymbols = import.meta.env.VITE_MARKET_SYMBOLS || 'RELIANCE,TCS,HDFCBANK,INFY,ICICIBANK,SBIN'

function cleanSymbols(value) {
  return [...new Set(String(value || '').split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
}

function cleanInstruments(value) {
  const rows = Array.isArray(value) ? value : []
  const unique = new Map()
  for (const row of rows) {
    const symbol = String(typeof row === 'string' ? row : row?.symbol || row?.trading_symbol || '').trim().toUpperCase()
    if (!symbol) continue
    const instrumentKey = typeof row === 'string' ? '' : String(row?.instrumentKey || row?.instrument_key || '').trim()
    unique.set(instrumentKey || symbol, { symbol, instrumentKey })
  }
  return [...unique.values()]
}

export function getTrackedInstruments() {
  const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : ''
  if (saved?.trim().startsWith('[')) {
    try { return cleanInstruments(JSON.parse(saved)) } catch { /* use legacy fallback */ }
  }
  return cleanSymbols(saved || defaultSymbols).map((symbol) => ({ symbol, instrumentKey: '' }))
}

export function getTrackedSymbols() {
  return getTrackedInstruments().map((item) => item.symbol)
}

export function setTrackedSymbols(value) {
  const symbols = cleanSymbols(Array.isArray(value) ? value.join(',') : value)
  window.localStorage.setItem(storageKey, JSON.stringify(symbols.map((symbol) => ({ symbol }))))
  window.dispatchEvent(new CustomEvent('market-symbols-changed', { detail: symbols }))
  return symbols
}

export function setTrackedInstruments(value) {
  const instruments = cleanInstruments(value)
  window.localStorage.setItem(storageKey, JSON.stringify(instruments))
  window.dispatchEvent(new CustomEvent('market-symbols-changed', { detail: instruments.map((item) => item.symbol) }))
  return instruments
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

export function normalizeMarketEvents(message, symbolByInstrumentKey = new Map()) {
  const source = message?.event ?? message

  return collectPayloads(source).flatMap((payload) => {
    const instrumentKey = payload.instrument_key ?? payload.instrumentKey ?? payload.instrument_token ?? ''
    const rawSymbol =
      payload.symbol ??
      payload.ticker ??
      payload.asset ??
      payload.trading_symbol ??
      payload.s ??
      symbolByInstrumentKey.get(instrumentKey) ??
      ''
    const symbol = normalizeSymbol(rawSymbol || instrumentKey)
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
      id: instrumentKey || `NSE:${symbol}`,
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

  const trackedInstruments = getTrackedInstruments()
  const tracked = new Set(trackedInstruments.map((item) => item.symbol))
  const symbolByInstrumentKey = new Map(trackedInstruments.filter((item) => item.instrumentKey).map((item) => [item.instrumentKey, item.symbol]))
  let eventChannel
  let subscription

  try {
    eventChannel = await events.connect(channel)
    subscription = eventChannel.subscribe({
      next(message) {
        for (const tick of normalizeMarketEvents(message, symbolByInstrumentKey)) {
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
