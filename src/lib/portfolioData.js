export const recommendations = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    action: 'BUY',
    confidence: 87,
    price: 1458.2,
    entry: '₹1,440–1,465',
    target: 1548,
    stopLoss: 1398,
    horizon: '10–15 sessions',
    reason: 'Price reclaimed its 20-day average with improving delivery volume and positive sector momentum.',
    factors: ['Momentum', 'Volume', 'Energy strength'],
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    action: 'BUY',
    confidence: 82,
    price: 1764.65,
    entry: '₹1,750–1,770',
    target: 1845,
    stopLoss: 1718,
    horizon: '2–4 weeks',
    reason: 'A higher-low structure and improving relative strength suggest accumulation near support.',
    factors: ['Trend', 'Relative strength', 'Risk/reward'],
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    action: 'HOLD',
    confidence: 74,
    price: 3286.4,
    entry: 'Hold existing',
    target: 3420,
    stopLoss: 3180,
    horizon: '3–6 weeks',
    reason: 'The long-term trend remains constructive, but near-term momentum needs a close above resistance.',
    factors: ['Quality', 'Resistance', 'Earnings stability'],
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    action: 'SELL',
    confidence: 79,
    price: 882.45,
    entry: 'Reduce on strength',
    target: 835,
    stopLoss: 910,
    horizon: '5–10 sessions',
    reason: 'Momentum divergence and repeated rejection near resistance increase downside risk.',
    factors: ['Divergence', 'Resistance', 'Risk control'],
  },
]

export const holdings = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', quantity: 42, averagePrice: 1324.4, price: 1458.2, dayChange: 1.24, signal: 'ADD', sector: 'Energy' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', quantity: 55, averagePrice: 1688.1, price: 1764.65, dayChange: 0.78, signal: 'HOLD', sector: 'Banking' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', quantity: 18, averagePrice: 3155.75, price: 3286.4, dayChange: -0.32, signal: 'HOLD', sector: 'Technology' },
  { symbol: 'INFY', name: 'Infosys', quantity: 36, averagePrice: 1654.2, price: 1598.75, dayChange: 0.41, signal: 'WATCH', sector: 'Technology' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', quantity: 64, averagePrice: 1198.6, price: 1378.3, dayChange: 1.08, signal: 'HOLD', sector: 'Banking' },
  { symbol: 'SBIN', name: 'State Bank of India', quantity: 75, averagePrice: 742.9, price: 882.45, dayChange: -1.12, signal: 'TRIM', sector: 'Banking' },
]

export const positions = [
  { symbol: 'NIFTY 50', side: 'BUY', quantity: 25, averagePrice: 25742.3, price: 25820.35, product: 'MIS' },
  { symbol: 'RELIANCE', side: 'BUY', quantity: 20, averagePrice: 1449.1, price: 1458.2, product: 'MIS' },
  { symbol: 'INFY', side: 'SELL', quantity: 15, averagePrice: 1612.4, price: 1598.75, product: 'MIS' },
]

export const gainers = [
  { symbol: 'BEL', price: 438.7, change: 4.82, volume: '31.2M' },
  { symbol: 'TRENT', price: 4864.5, change: 3.91, volume: '4.8M' },
  { symbol: 'RELIANCE', price: 1458.2, change: 2.34, volume: '18.7M' },
  { symbol: 'ICICIBANK', price: 1378.3, change: 1.86, volume: '22.1M' },
]

export const losers = [
  { symbol: 'SBIN', price: 882.45, change: -2.18, volume: '27.5M' },
  { symbol: 'MARUTI', price: 12642.8, change: -1.74, volume: '1.2M' },
  { symbol: 'TATASTEEL', price: 166.35, change: -1.31, volume: '45.8M' },
  { symbol: 'SUNPHARMA', price: 1728.6, change: -0.96, volume: '5.6M' },
]

export const portfolioHistory = [
  421500, 428200, 425900, 438600, 446100, 452800, 449700, 461300, 474900,
  482400, 479800, 493600, 506200, 518900, 526400, 541800, 553200, 568450,
]

export const allocation = [
  { label: 'Banking', value: 34, color: '#052e26' },
  { label: 'Technology', value: 27, color: '#0f766e' },
  { label: 'Energy', value: 21, color: '#f5cf74' },
  { label: 'Cash', value: 18, color: '#d6d3d1' },
]

function seededRandom(seed) {
  let value = seed || 1
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

export function generateCandles(symbol, count = 60) {
  const seed = [...symbol].reduce((total, character) => total + character.charCodeAt(0), 0)
  const random = seededRandom(seed)
  const holding = holdings.find((item) => item.symbol === symbol)
  let close = holding?.price || recommendations.find((item) => item.symbol === symbol)?.price || 1200
  const candles = []
  const now = Date.now()

  for (let index = count - 1; index >= 0; index -= 1) {
    const open = close * (1 + (random() - 0.5) * 0.012)
    close = open * (1 + (random() - 0.46) * 0.018)
    const high = Math.max(open, close) * (1 + random() * 0.008)
    const low = Math.min(open, close) * (1 - random() * 0.008)

    candles.push({
      time: new Date(now - index * 86_400_000),
      open,
      high,
      low,
      close,
      volume: Math.floor(800_000 + random() * 4_500_000),
    })
  }

  return candles
}

export function getPortfolioMetrics(items = holdings) {
  const invested = items.reduce((total, item) => total + item.quantity * item.averagePrice, 0)
  const current = items.reduce((total, item) => total + item.quantity * item.price, 0)
  const dayPnl = items.reduce(
    (total, item) => total + item.quantity * item.price * (item.dayChange / 100),
    0,
  )

  return {
    invested,
    current,
    totalPnl: current - invested,
    totalPnlPercent: ((current - invested) / invested) * 100,
    dayPnl,
  }
}
