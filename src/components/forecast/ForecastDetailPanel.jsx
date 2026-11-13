import DataSourceIndicator from '../DataSourceIndicator'
import ForecastDistribution from './ForecastDistribution'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function ForecastDetailPanel({ forecast, price }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <article className="relative overflow-hidden rounded-[1.75rem] bg-ink p-6 text-white shadow-card sm:p-8"><div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cobalt/30 blur-3xl" /><div className="relative"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">{forecast.symbol} · next 5 trading days</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em]">Likely move ±{forecast.expectedMove}%</h2></div><DataSourceIndicator source="demo" /></div><p className="mt-5 max-w-xl text-sm leading-6 text-white/45">The model forecasts magnitude, not direction. There is a {forecast.confidence}% probability the price remains inside this range.</p><div className="mt-8 grid grid-cols-3 gap-2"><div className="rounded-2xl border border-white/10 bg-white/[.05] p-4"><p className="text-[9px] font-bold uppercase text-white/30">Lower bound</p><p className="mt-2 text-xl font-black">{money.format(forecast.low)}</p></div><div className="rounded-2xl bg-gold p-4 text-ink"><p className="text-[9px] font-bold uppercase text-ink/45">Live price</p><p className="mt-2 text-xl font-black">{money.format(price)}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.05] p-4"><p className="text-[9px] font-bold uppercase text-white/30">Upper bound</p><p className="mt-2 text-xl font-black">{money.format(forecast.high)}</p></div></div></div></article>
      <article className="surface p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="eyebrow">Calibrated distribution</p><h3 className="mt-2 text-lg font-black">How wide could the move be?</h3></div><span className="rounded-full bg-mist px-3 py-1 text-[9px] font-black uppercase text-ink/45">{forecast.regime}</span></div><div className="mt-7"><ForecastDistribution expectedMove={forecast.expectedMove} /></div><div className="mt-7 flex items-center justify-between border-t border-ink/[.06] pt-5"><span className="text-[10px] font-semibold text-ink/35">Expected annualised volatility</span><span className="text-sm font-black">{forecast.annualVolatility}%</span></div></article>
    </section>
  )
}
