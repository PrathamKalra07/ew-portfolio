import DataSourceIndicator from '../DataSourceIndicator'
import Icon from '../ui/Icon'

export default function MarketPulseHero({ market }) {
  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date())
  const source = market.provider === 'mock' ? 'demo' : market.marketOpen ? 'fargate' : 'lambda'
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-7 text-white shadow-card sm:px-8 sm:py-9 xl:px-10">
      <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-cobalt/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-1/3 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
        <div><div className="flex flex-wrap items-center gap-3"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold">{today}</p><DataSourceIndicator source={source} /></div><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-5xl xl:text-6xl">See the move before<br className="hidden sm:block" /> it becomes the risk.</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-white/45">SmartNifty forecasts how far a stock may move over five trading days. No directional claims—just calibrated ranges, live prices and a track record you can inspect.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:w-[430px]">
          <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><Icon name="pulse" className="h-5 w-5 text-gold" /><p className="mt-5 text-2xl font-black">0.315</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/35">Rank correlation</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><Icon name="shield" className="h-5 w-5 text-emerald-400" /><p className="mt-5 text-2xl font-black">89.5%</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/35">Range honesty</p></div>
          <div className="col-span-2 rounded-2xl border border-white/10 bg-gold p-4 text-ink sm:col-span-1"><Icon name="clock" className="h-5 w-5" /><p className="mt-5 text-2xl font-black">5 days</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink/50">Forecast horizon</p></div>
        </div>
      </div>
    </section>
  )
}
