import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { generateCandles, holdings, recommendations } from '../../lib/portfolioData'
import { CandleChart } from './Charts'
import { useMarketData } from '../../contexts/MarketDataContext'
import DataSourceIndicator from '../DataSourceIndicator'

const symbols = [...new Set([...holdings.map((item) => item.symbol), ...recommendations.map((item) => item.symbol)])]
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

export default function ResearchPage() {
  const { onOrder } = useOutletContext()
  const market = useMarketData()
  const [symbol, setSymbol] = useState('RELIANCE')
  const [timeframe, setTimeframe] = useState('1D')
  const candles = useMemo(() => generateCandles(symbol, timeframe === '1D' ? 60 : timeframe === '1W' ? 48 : 36), [symbol, timeframe])
  const candleLatest = candles.at(-1)
  const latest = { ...candleLatest, close: market.getPrice(symbol, candleLatest.close) }
  const first = candles[0]
  const change = ((latest.close - first.open) / first.open) * 100
  const recommendation = recommendations.find((item) => item.symbol === symbol)

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-forest/40">Historical data</p><h1 className="mt-2 font-display text-4xl tracking-[-0.04em] sm:text-5xl">Research workspace</h1><p className="mt-3 text-sm text-forest/50">Study price action, volume, technical structure, and the current model view.</p></div>
        <div className="flex gap-2"><select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="h-11 rounded-xl border border-forest/15 bg-white px-4 text-sm font-semibold outline-none focus:border-forest">{symbols.map((item) => <option key={item}>{item}</option>)}</select><button type="button" onClick={() => onOrder({ symbol, price: latest.close, side: recommendation?.action === 'SELL' ? 'SELL' : 'BUY' })} className="h-11 rounded-xl bg-forest px-5 text-sm font-semibold text-white">Trade</button></div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-forest/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-end gap-4"><div><p className="text-xs text-forest/40">NSE</p><h2 className="mt-1 text-xl font-semibold">{symbol}</h2></div><div><p className="text-2xl font-semibold">{inr.format(latest.close)}</p><DataSourceIndicator source={market.getSource(symbol)} className="mt-1" /><p className={`mt-1 text-xs font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% selected range</p></div></div>
          <div className="flex rounded-xl bg-forest/5 p-1">{['1D', '1W', '1M'].map((item) => <button key={item} type="button" onClick={() => setTimeframe(item)} className={`rounded-lg px-4 py-2 text-xs font-semibold ${timeframe === item ? 'bg-white text-forest shadow-sm' : 'text-forest/45'}`}>{item}</button>)}</div>
        </div>
        <div className="overflow-x-auto p-3 sm:p-6"><div className="mb-2 flex justify-end"><DataSourceIndicator simulated /></div><div className="min-w-[720px]"><CandleChart candles={candles} /></div></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Open', inr.format(latest.open)],
          ['High', inr.format(latest.high)],
          ['Low', inr.format(latest.low)],
          ['Close', inr.format(latest.close)],
          ['Volume', compact.format(latest.volume)],
        ].map(([label, value]) => <article key={label} className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wider text-forest/35">{label}</p><p className="mt-2 font-semibold">{value}</p><DataSourceIndicator simulated={label !== 'Close' || !market.isLive(symbol)} label={false} className="mt-2" /></article>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <article className="rounded-3xl bg-forest p-6 text-white shadow-card">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">AI technical view</p><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">{recommendation?.confidence || 72}% confidence</span></div>
          <h2 className="mt-5 font-display text-3xl leading-tight">{recommendation?.action || 'WATCH'} {symbol}</h2>
          <p className="mt-4 text-sm leading-6 text-white/60">{recommendation?.reason || 'Price structure is neutral. Wait for a confirmed breakout with volume before committing fresh capital.'}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center"><div><p className="text-[10px] uppercase text-white/35">Trend</p><p className="mt-2 text-sm font-semibold text-gold">Bullish</p></div><div><p className="text-[10px] uppercase text-white/35">Momentum</p><p className="mt-2 text-sm font-semibold">Moderate</p></div><div><p className="text-[10px] uppercase text-white/35">Volatility</p><p className="mt-2 text-sm font-semibold">Normal</p></div></div>
        </article>

        <article className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-sm">
          <div className="border-b border-forest/10 px-6 py-5"><h2 className="text-lg font-semibold">Historical candles</h2><p className="mt-1 text-xs text-forest/40">Latest daily OHLCV records</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm"><thead className="bg-cream/60 text-left text-[10px] uppercase tracking-wider text-forest/40"><tr><th className="px-5 py-3">Date</th><th className="px-4 py-3 text-right">Open</th><th className="px-4 py-3 text-right">High</th><th className="px-4 py-3 text-right">Low</th><th className="px-4 py-3 text-right">Close</th><th className="px-5 py-3 text-right">Volume</th></tr></thead><tbody className="divide-y divide-forest/10">{candles.slice(-7).reverse().map((candle) => <tr key={candle.time.toISOString()}><td className="px-5 py-3 font-medium">{candle.time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td><td className="px-4 py-3 text-right">{candle.open.toFixed(2)}</td><td className="px-4 py-3 text-right text-emerald-700">{candle.high.toFixed(2)}</td><td className="px-4 py-3 text-right text-rose-600">{candle.low.toFixed(2)}</td><td className="px-4 py-3 text-right font-semibold">{candle.close.toFixed(2)}</td><td className="px-5 py-3 text-right">{compact.format(candle.volume)}</td></tr>)}</tbody></table>
          </div>
        </article>
      </section>
    </div>
  )
}
