import { connectToMarketStream } from './marketStream'

const provider = import.meta.env.VITE_MARKET_DATA_PROVIDER
const requestedTickMs = Number(import.meta.env.VITE_MARKET_TICK_MS || 1500)
const tickMs = Math.min(Math.max(requestedTickMs, 500), 10_000)

const mockInstruments = [
  { symbol: 'NIFTY 50', name: 'Nifty 50', exchange: 'NSE', type: 'index', basePrice: 25820.35, volatility: 0.0007 },
  { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE', type: 'index', basePrice: 84240.62, volatility: 0.0006 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', type: 'equity', basePrice: 1458.2, volatility: 0.0018 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', type: 'equity', basePrice: 3286.4, volatility: 0.0015 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', type: 'equity', basePrice: 1764.65, volatility: 0.0014 },
  { symbol: 'INFY', name: 'Infosys', exchange: 'NSE', type: 'equity', basePrice: 1598.75, volatility: 0.0017 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', type: 'equity', basePrice: 1378.3, volatility: 0.0015 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', type: 'equity', basePrice: 882.45, volatility: 0.0021 },
]

function round(value) {
  return Math.round(value * 100) / 100
}

function createInstrument(seed, index) {
  const openingMove = ((index % 3) - 1) * 0.0035
  const previousClose = round(seed.basePrice / (1 + openingMove))
  const price = round(seed.basePrice)
  const change = round(price - previousClose)

  return {
    id: `${seed.exchange}:${seed.symbol}`,
    symbol: seed.symbol,
    name: seed.name,
    exchange: seed.exchange,
    type: seed.type,
    price,
    previousClose,
    open: round(previousClose * (1 + openingMove / 2)),
    high: round(price * 1.004),
    low: round(price * 0.996),
    change,
    changePercent: round((change / previousClose) * 100),
    volume: seed.type === 'index' ? null : 750_000 + index * 415_000,
    history: [price],
    volatility: seed.volatility,
    updatedAt: new Date().toISOString(),
  }
}

function createNextTick(instrument) {
  const movement = (Math.random() - 0.48) * instrument.volatility
  const price = round(Math.max(0.05, instrument.price * (1 + movement)))
  const change = round(price - instrument.previousClose)

  return {
    ...instrument,
    price,
    high: round(Math.max(instrument.high, price)),
    low: round(Math.min(instrument.low, price)),
    change,
    changePercent: round((change / instrument.previousClose) * 100),
    volume: instrument.volume == null
      ? null
      : instrument.volume + Math.floor(800 + Math.random() * 12_000),
    history: [...instrument.history, price].slice(-60),
    updatedAt: new Date().toISOString(),
  }
}

function subscribeToMockMarket({ onSnapshot, onTick, onStatus }) {
  let instruments = mockInstruments.map(createInstrument)
  let closed = false

  onStatus?.('connecting')

  const readyTimer = window.setTimeout(() => {
    if (closed) return
    onSnapshot?.(instruments)
    onStatus?.('connected')
  }, 350)

  const interval = window.setInterval(() => {
    if (closed) return

    const updateCount = 2 + Math.floor(Math.random() * 3)
    const selected = new Set()

    while (selected.size < updateCount) {
      selected.add(Math.floor(Math.random() * instruments.length))
    }

    instruments = instruments.map((instrument, index) => {
      if (!selected.has(index)) return instrument
      const tick = createNextTick(instrument)
      onTick?.(tick)
      return tick
    })
  }, tickMs)

  return () => {
    closed = true
    window.clearTimeout(readyTimer)
    window.clearInterval(interval)
    onStatus?.('closed')
  }
}

export function subscribeToMarketData(callbacks) {
  if (provider === 'mock') {
    console.log(provider);
    return subscribeToMockMarket(callbacks)
  }
  
  if (provider === 'appsync' || provider === 'upstox') {
    console.log(provider);
    let close = null
    let cancelled = false
    const quotes = new Map()
    connectToMarketStream({
      onStatus: callbacks.onStatus,
      onError: callbacks.onError,
      onEvent(tick) {
        quotes.set(tick.symbol, tick)
        callbacks.onTick?.(tick)
        callbacks.onSnapshot?.([...quotes.values()])
      },
    }).then((cleanup) => {
      if (cancelled) cleanup()
      else close = cleanup
    }).catch((error) => callbacks.onError?.(error))
    return () => {
      cancelled = true
      callbacks.onStatus?.('closed')
      return close?.()
    }
  }

  throw new Error(`Market data provider "${provider}" is not implemented yet.`)
}

export function getMarketDataProvider() {
  return provider
}
