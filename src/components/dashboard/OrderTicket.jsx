import { useEffect, useState } from 'react'
import DataSourceIndicator from '../DataSourceIndicator'
import { useMarketData } from '../../contexts/MarketDataContext'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export default function OrderTicket({ order, onClose, onPlaced }) {
  const market = useMarketData()
  const [side, setSide] = useState(order?.side || 'BUY')
  const [quantity, setQuantity] = useState(1)
  const [orderType, setOrderType] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState(order?.price || 0)
  const [product, setProduct] = useState('DELIVERY')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!order) return
    setSide(order.side || 'BUY')
    setLimitPrice(order.price || 0)
    setQuantity(1)
  }, [order])

  if (!order) return null

  const estimatedPrice = orderType === 'LIMIT' ? Number(limitPrice) : Number(order.price)
  const estimatedValue = Math.max(0, Number(quantity)) * estimatedPrice

  async function placeDemoOrder(event) {
    event.preventDefault()
    setPlacing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    onPlaced?.({ symbol: order.symbol, side, quantity: Number(quantity), orderType, product })
    setPlacing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]" role="dialog" aria-modal="true" aria-labelledby="order-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest/40">Demo order ticket</p>
            <h2 id="order-title" className="mt-2 text-2xl font-semibold">{order.symbol}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-forest/50">LTP {inr.format(order.price)}<DataSourceIndicator simulated={!market.isLive(order.symbol)} label={false} /></p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-forest/5 text-lg text-forest/60 hover:bg-forest/10" aria-label="Close order ticket">×</button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={placeDemoOrder}>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-forest/5 p-1">
            {['BUY', 'SELL'].map((option) => (
              <button key={option} type="button" onClick={() => setSide(option)} className={`rounded-lg py-2.5 text-sm font-bold transition ${side === option ? option === 'BUY' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm' : 'text-forest/50'}`}>
                {option}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Quantity
              <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-forest/15 px-3 outline-none focus:border-forest" />
            </label>
            <label className="text-sm font-semibold">Product
              <select value={product} onChange={(event) => setProduct(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-forest/15 bg-white px-3 outline-none focus:border-forest">
                <option value="DELIVERY">Delivery</option>
                <option value="INTRADAY">Intraday</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Order type
              <select value={orderType} onChange={(event) => setOrderType(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-forest/15 bg-white px-3 outline-none focus:border-forest">
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Limit price
              <input type="number" step="0.05" value={limitPrice} disabled={orderType !== 'LIMIT'} onChange={(event) => setLimitPrice(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-forest/15 px-3 outline-none disabled:bg-forest/5 disabled:text-forest/35" />
            </label>
          </div>

          <div className="rounded-2xl bg-cream p-4">
            <div className="flex justify-between text-sm"><span className="text-forest/50">Estimated value</span><span className="font-semibold">{inr.format(estimatedValue || 0)}</span></div>
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-forest/45"><DataSourceIndicator simulated label={false} className="mt-1" />This is a simulated order. No broker request or real trade will be placed.</p>
          </div>

          <button type="submit" disabled={placing || quantity < 1} className={`h-12 w-full rounded-xl text-sm font-bold text-white transition disabled:opacity-60 ${side === 'BUY' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-500 hover:bg-rose-600'}`}>
            {placing ? 'Placing demo order...' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${order.symbol}`}
          </button>
        </form>
      </section>
    </div>
  )
}
