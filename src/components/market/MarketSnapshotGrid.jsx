import DataSourceIndicator from '../DataSourceIndicator'
import Icon from '../ui/Icon'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

function MoversCard({ title, eyebrow, items, tone, loading }) {
  const positive = tone === 'positive'
  return (
    <article className="surface overflow-hidden p-5 sm:p-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow">{eyebrow}</p><h3 className="mt-2 text-lg font-black">{title}</h3></div><span className={`grid h-10 w-10 place-items-center rounded-2xl ${positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-coral/10 text-coral'}`}><Icon name={positive ? 'arrowUp' : 'arrowDown'} className="h-4 w-4" /></span></div>
      <div className="mt-5 space-y-2">
        {loading && [1, 2, 3].map((item) => <div key={item} className="h-11 animate-pulse rounded-xl bg-mist/70" />)}
        {!loading && items.map((item, index) => (
          <div key={item.symbol} className="flex items-center justify-between rounded-xl border border-ink/[.06] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5"><span className="text-[9px] font-black text-ink/25">0{index + 1}</span><div className="min-w-0"><p className="truncate text-xs font-black">{item.symbol}</p><p className="mt-0.5 text-[9px] text-ink/35">{money.format(item.price)}</p></div></div>
            <span className={`text-xs font-black ${positive ? 'text-emerald-600' : 'text-coral'}`}>{item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
          </div>
        ))}
        {!loading && !items.length && <p className="grid h-32 place-items-center text-center text-xs text-ink/35">Market quote data is unavailable.</p>}
      </div>
    </article>
  )
}

function MomentumCard({ data }) {
  const change = data.averageChange
  const state = change == null
    ? 'Awaiting market quotes'
    : change >= 0.75
      ? 'Strong positive momentum'
      : change >= 0.15
        ? 'Positive market bias'
        : change <= -0.75
          ? 'Strong negative momentum'
          : change <= -0.15
            ? 'Defensive market bias'
            : 'Mixed market momentum'
  const markerPosition = change == null ? 50 : Math.min(100, Math.max(0, ((change + 3) / 6) * 100))

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] bg-ink p-5 text-white shadow-card sm:p-6">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold/10" />
      <div className="relative flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-gold">Market pulse</p><h3 className="mt-2 text-lg font-black">Average momentum</h3></div><DataSourceIndicator source="lambda" label={false} /></div>
      <div className="relative mt-8"><p className="text-3xl font-black tracking-[-.04em] tabular-nums">{change == null ? '--' : `${change >= 0 ? '+' : ''}${number.format(change)}%`}</p><p className={`mt-2 text-xs font-black ${change == null ? 'text-white/35' : change >= 0 ? 'text-emerald-300' : 'text-coral'}`}>{state}</p></div>
      <div className="relative mt-7">
        <div className="relative h-1.5 rounded-full bg-gradient-to-r from-coral via-white/20 to-emerald-400"><span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white shadow" style={{ left: `${markerPosition}%` }} /></div>
        <div className="mt-2 flex justify-between text-[8px] font-black uppercase tracking-wider text-white/25"><span>Bearish</span><span>Neutral</span><span>Bullish</span></div>
      </div>
      <p className="relative mt-5 border-t border-white/10 pt-4 text-[10px] leading-5 text-white/40">Average daily move across {data.coverage || 0} liquid NSE leaders.</p>
    </article>
  )
}

function BreadthCard({ data }) {
  const total = data.coverage || 1
  const advanceWidth = `${(data.advances / total) * 100}%`
  const declineWidth = `${(data.declines / total) * 100}%`
  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between"><div><p className="eyebrow">Participation</p><h3 className="mt-2 text-lg font-black">Market breadth</h3></div><DataSourceIndicator source="lambda" label={false} /></div>
      <div className="mt-7 flex items-end gap-3"><div><p className="text-3xl font-black tracking-[-.04em] text-emerald-600">{data.loading ? '--' : data.advances}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-ink/35">Advancing</p></div><span className="pb-4 text-ink/15">/</span><div><p className="text-3xl font-black tracking-[-.04em] text-coral">{data.loading ? '--' : data.declines}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-ink/35">Declining</p></div></div>
      <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-mist"><span className="bg-emerald-500" style={{ width: advanceWidth }} /><span className="bg-coral" style={{ width: declineWidth }} /></div>
      <p className="mt-4 text-[10px] leading-5 text-ink/40">Breadth across the configured liquid NSE universe. {data.unchanged ? `${data.unchanged} unchanged.` : ''}</p>
    </article>
  )
}

export default function MarketSnapshotGrid({ data }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Market snapshot</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em]">What is moving today</h2><p className="mt-1 text-[10px] font-semibold text-ink/35">Movers are ranked within the configured liquid NSE universe.</p></div><div className="flex items-center gap-2"><DataSourceIndicator source="lambda" /><span className="text-[10px] font-semibold text-ink/35">Refreshes every 5 min</span></div></div>
      {data.error && <p className="mb-3 rounded-2xl border border-coral/10 bg-coral/5 px-4 py-3 text-xs font-semibold text-coral">{data.error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MoversCard title="Top gainers" eyebrow="Momentum up" items={data.gainers} tone="positive" loading={data.loading} />
        <MoversCard title="Top losers" eyebrow="Momentum down" items={data.losers} tone="negative" loading={data.loading} />
        <MomentumCard data={data} />
        <BreadthCard data={data} />
      </div>
    </section>
  )
}
