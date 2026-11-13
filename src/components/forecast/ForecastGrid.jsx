import { volatilityForecasts } from '../../lib/forecastData'
import ForecastCard from './ForecastCard'

export default function ForecastGrid({ market }) {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Tomorrow's risk map</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Five-day volatility forecasts</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-ink/42">Expected magnitude, not direction. Forecasts are fixed after the 08:30 batch run.</p></div><span className="rounded-full border border-ink/10 bg-white px-3 py-2 text-[10px] font-bold text-ink/45">Calculated 08:30 IST</span></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{volatilityForecasts.map((forecast) => <ForecastCard key={forecast.symbol} forecast={forecast} price={market.getQuote(forecast.symbol)?.price} />)}</div>
    </section>
  )
}
