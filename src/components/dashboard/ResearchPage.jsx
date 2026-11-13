import { useMemo, useState } from 'react'
import { useMarketData } from '../../contexts/MarketDataContext'
import { volatilityForecasts } from '../../lib/forecastData'
import { generateCandles } from '../../lib/portfolioData'
import ForecastDetailPanel from '../forecast/ForecastDetailPanel'
import ModelEvidenceStrip from '../forecast/ModelEvidenceStrip'
import DataSourceIndicator from '../DataSourceIndicator'
import { CandleChart } from './Charts'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

export default function ResearchPage() {
  const market = useMarketData()
  const [symbol, setSymbol] = useState(volatilityForecasts[0].symbol)
  const [timeframe, setTimeframe] = useState('1M')
  const forecast = volatilityForecasts.find((item) => item.symbol === symbol) || volatilityForecasts[0]
  const candles = useMemo(() => generateCandles(symbol, timeframe === '1M' ? 36 : timeframe === '3M' ? 60 : 90), [symbol, timeframe])
  const latest = market.getPrice(symbol, candles.at(-1).close)

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Model workspace</p><h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-5xl">Volatility forecasts</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/45">Explore the expected size of the next five-day move, its calibrated range and the price history behind it.</p></div><select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="field min-w-52 font-bold">{volatilityForecasts.map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></section>
      <ForecastDetailPanel forecast={forecast} price={latest} />
      <ModelEvidenceStrip />
      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-ink/[.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-3"><h2 className="text-lg font-black">Price context</h2><DataSourceIndicator source={market.getSource(symbol)} /></div><p className="mt-1 text-xs text-ink/38">{symbol} · latest {money.format(latest)}</p></div><div className="flex rounded-xl bg-mist p-1">{['1M', '3M', '6M'].map((item) => <button key={item} type="button" onClick={() => setTimeframe(item)} className={`rounded-lg px-4 py-2 text-[10px] font-bold ${timeframe === item ? 'bg-white text-ink shadow-sm' : 'text-ink/40'}`}>{item}</button>)}</div></div>
        <div className="overflow-x-auto p-4 sm:p-6"><div className="min-w-[720px]"><CandleChart candles={candles} /></div></div>
        <div className="grid border-t border-ink/[.07] sm:grid-cols-4">{[['Open', money.format(candles.at(-1).open)], ['High', money.format(candles.at(-1).high)], ['Low', money.format(candles.at(-1).low)], ['Volume', compact.format(candles.at(-1).volume)]].map(([label, value], index) => <div key={label} className={`p-4 sm:p-5 ${index ? 'border-t border-ink/[.06] sm:border-l sm:border-t-0' : ''}`}><p className="eyebrow">{label}</p><p className="mt-2 text-sm font-black">{value}</p></div>)}</div>
      </section>
    </div>
  )
}
