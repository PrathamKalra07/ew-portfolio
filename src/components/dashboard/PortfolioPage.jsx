import { allocation, getPortfolioMetrics, holdings as baseHoldings, portfolioHistory, positions as basePositions, recommendations } from '../../lib/portfolioData'
import { LineChart } from './Charts'
import { useOutletContext } from 'react-router-dom'
import { useMarketData } from '../../contexts/MarketDataContext'
import DataSourceIndicator from '../DataSourceIndicator'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

function Signal({ value }) {
  const styles = {
    ADD: 'bg-emerald-50 text-emerald-700',
    HOLD: 'bg-sky-50 text-sky-700',
    WATCH: 'bg-amber-50 text-amber-700',
    TRIM: 'bg-rose-50 text-rose-600',
  }
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[value] || 'bg-forest/5 text-forest/60'}`}>{value}</span>
}

export default function PortfolioPage() {
  const { onOrder } = useOutletContext()
  const market = useMarketData()
  const holdings = baseHoldings.map((item) => ({ ...item, price: market.getPrice(item.symbol, item.price) }))
  const positions = basePositions.map((item) => ({ ...item, price: market.getPrice(item.symbol, item.price) }))
  const metrics = getPortfolioMetrics(holdings)
  const gradient = allocation.reduce((result, item, index) => {
    const start = allocation.slice(0, index).reduce((sum, part) => sum + part.value, 0)
    return `${result}${index ? ', ' : ''}${item.color} ${start}% ${start + item.value}%`
  }, '')

  return (
    <div className="space-y-7">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest/40">Portfolio</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.04em] sm:text-5xl">Holdings and positions</h1>
        <p className="mt-3 text-sm text-forest/50">See what is working, what needs attention, and the next action for every position.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Portfolio value', inr.format(metrics.current), `${metrics.totalPnlPercent.toFixed(2)}% overall`],
          ['Invested value', inr.format(metrics.invested), `${holdings.length} holdings`],
          ['Unrealised P&L', inr.format(metrics.totalPnl), 'Since first purchase'],
          ["Today's P&L", inr.format(metrics.dayPnl), 'Live estimate'],
        ].map(([label, value, detail], index) => (
          <article key={label} className={`rounded-3xl p-5 shadow-sm ${index === 0 ? 'bg-forest text-white' : 'border border-forest/10 bg-white'}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${index === 0 ? 'text-white/45' : 'text-forest/40'}`}>{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <p className={`mt-2 text-xs ${index === 0 ? 'text-gold' : 'text-forest/40'}`}>{detail}</p>
            <DataSourceIndicator simulated className="mt-3" />
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <article className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-sm">
          <div className="flex items-start justify-between px-6 pt-6">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest/40">Equity curve</p><h2 className="mt-2 text-xl font-semibold">Cumulative portfolio value</h2></div>
            <div className="text-right"><p className="font-semibold text-emerald-700">+{metrics.totalPnlPercent.toFixed(2)}%</p><DataSourceIndicator simulated className="mt-1" /></div>
          </div>
          <div className="h-56 px-3 pb-3 pt-2"><LineChart values={portfolioHistory} /></div>
        </article>

        <article className="rounded-3xl border border-forest/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest/40">Allocation</p>
          <div className="mt-5 flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
              <div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center"><div><p className="text-xl font-semibold">100%</p><p className="text-[10px] text-forest/40">allocated</p></div></div>
            </div>
            <div className="flex-1 space-y-3">
              {allocation.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-forest/55"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><span className="font-semibold">{item.value}%</span></div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-forest/10 px-6 py-5"><div><h2 className="text-lg font-semibold">Holdings</h2><p className="mt-1 text-xs text-forest/40">Long-term delivery portfolio</p></div><span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold">{holdings.length} assets</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-cream/60 text-[10px] font-semibold uppercase tracking-[0.15em] text-forest/40"><tr><th className="px-6 py-4">Instrument</th><th className="px-4 py-4 text-right">Qty</th><th className="px-4 py-4 text-right">Avg. price</th><th className="px-4 py-4 text-right">LTP</th><th className="px-4 py-4 text-right">Current value</th><th className="px-4 py-4 text-right">P&L</th><th className="px-4 py-4 text-center">AI signal</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-forest/10">
              {holdings.map((item) => {
                const pnl = item.quantity * (item.price - item.averagePrice)
                const positive = pnl >= 0
                return (
                  <tr key={item.symbol} className="hover:bg-cream/35">
                    <td className="px-6 py-4"><p className="font-semibold">{item.symbol}</p><p className="mt-1 text-xs text-forest/35">{item.name} · {item.sector}</p></td>
                    <td className="px-4 py-4 text-right text-sm">{item.quantity}</td>
                    <td className="px-4 py-4 text-right text-sm tabular-nums">{price.format(item.averagePrice)}</td>
                    <td className="px-4 py-4 text-right text-sm font-semibold tabular-nums"><span className="inline-flex items-center justify-end gap-2">{price.format(item.price)}<DataSourceIndicator source={market.getSource(item.symbol)} /></span></td>
                    <td className="px-4 py-4 text-right text-sm tabular-nums">{inr.format(item.quantity * item.price)}</td>
                    <td className={`px-4 py-4 text-right text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>{positive ? '+' : ''}{inr.format(pnl)}</td>
                    <td className="px-4 py-4 text-center"><Signal value={item.signal} /></td>
                    <td className="px-6 py-4 text-right"><button type="button" onClick={() => onOrder({ symbol: item.symbol, price: item.price, side: item.signal === 'TRIM' ? 'SELL' : 'BUY' })} className="rounded-lg border border-forest/15 px-3 py-2 text-xs font-semibold hover:bg-forest hover:text-white">Trade</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-forest/10 bg-white shadow-sm">
        <div className="border-b border-forest/10 px-6 py-5"><h2 className="text-lg font-semibold">Open positions</h2><p className="mt-1 text-xs text-forest/40">Intraday and carry-forward positions</p></div>
        <div className="grid divide-y divide-forest/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {positions.map((item) => {
            const multiplier = item.side === 'BUY' ? 1 : -1
            const pnl = (item.price - item.averagePrice) * item.quantity * multiplier
            return (
              <article key={item.symbol} className="p-5">
                <div className="flex items-center justify-between"><div><p className="font-semibold">{item.symbol}</p><p className="mt-1 text-xs text-forest/35">{item.product} · {item.side} {item.quantity}</p></div><Signal value={pnl >= 0 ? 'HOLD' : 'WATCH'} /></div>
                <div className="mt-5 flex items-end justify-between"><div><p className="text-xs text-forest/35">LTP</p><p className="mt-1 font-semibold">{price.format(item.price)}</p></div><div className="text-right"><p className="text-xs text-forest/35">P&L</p><p className={`mt-1 font-semibold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{pnl >= 0 ? '+' : ''}{inr.format(pnl)}</p></div></div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-forest p-6 text-white shadow-card">
        <div className="grid gap-6 lg:grid-cols-[.55fr_1.45fr]">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">AI action plan</p><h2 className="mt-3 font-display text-3xl leading-tight">Three portfolio actions for today.</h2><p className="mt-3 text-sm leading-6 text-white/55">Prioritized by expected impact and risk.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            {recommendations.filter((item) => item.action !== 'HOLD').slice(0, 3).map((item, index) => (
              <article key={item.symbol} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between"><span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-bold text-forest">{index + 1}</span><span className="text-xs font-bold text-gold">{item.action}</span></div><h3 className="mt-4 font-semibold">{item.symbol}</h3><p className="mt-2 text-xs leading-5 text-white/55">{item.reason}</p><button type="button" onClick={() => onOrder({ symbol: item.symbol, price: item.price, side: item.action === 'SELL' ? 'SELL' : 'BUY' })} className="mt-4 text-xs font-semibold text-gold hover:underline">Review order →</button></article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
