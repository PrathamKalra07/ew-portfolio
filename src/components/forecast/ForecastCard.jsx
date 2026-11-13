import DataSourceIndicator from '../DataSourceIndicator'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function ForecastCard({ forecast, price }) {
  const livePrice = Number.isFinite(price) ? price : (forecast.low + forecast.high) / 2
  const regimeStyle = forecast.regime === 'High' ? 'bg-coral/10 text-coral' : forecast.regime === 'Elevated' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700'
  return (
    <article className="surface overflow-hidden p-5 hover:-translate-y-1 hover:shadow-card">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black tracking-[-.01em]">{forecast.symbol}</p><p className="mt-1 truncate text-[10px] text-ink/35">{forecast.name}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${regimeStyle}`}>{forecast.regime}</span></div>
      <div className="mt-6 flex items-end justify-between"><div><p className="text-[10px] font-semibold text-ink/35">5-day expected move</p><p className="mt-1 text-3xl font-black tracking-[-.05em]">±{forecast.expectedMove}%</p></div><DataSourceIndicator source="demo" /></div>
      <div className="mt-5 rounded-2xl bg-mist/70 p-4"><div className="flex items-center justify-between text-[10px] font-semibold text-ink/40"><span>{money.format(forecast.low)}</span><span>90% range</span><span>{money.format(forecast.high)}</span></div><div className="relative mt-3 h-2 rounded-full bg-white"><div className="absolute inset-y-0 rounded-full bg-cobalt/75" style={{ left: '8%', right: '8%' }} /><span className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${Math.min(90, Math.max(10, ((livePrice - forecast.low) / (forecast.high - forecast.low)) * 84 + 8))}%` }} /></div></div>
      <div className="mt-4 flex items-center justify-between border-t border-ink/[.06] pt-4"><span className="text-[10px] font-semibold text-ink/35">Annualised volatility</span><span className="text-xs font-black">{forecast.annualVolatility}%</span></div>
    </article>
  )
}
