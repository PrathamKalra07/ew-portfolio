import { useMarketData } from '../../contexts/MarketDataContext'
import { useMarketSnapshot } from '../../hooks/useMarketSnapshot'
import { useMarketSearch } from '../../hooks/useMarketSearch'
import { useWatchlists } from '../../hooks/useWatchlists'
import ForecastGrid from '../forecast/ForecastGrid'
import ModelEvidenceStrip from '../forecast/ModelEvidenceStrip'
import MarketSnapshotGrid from '../market/MarketSnapshotGrid'
import UnifiedWatchlistPanel from '../watchlists/UnifiedWatchlistPanel'
import MarketPulseHero from './MarketPulseHero'

export default function OverviewPage() {
  const market = useMarketData()
  const watchlist = useWatchlists()
  const search = useMarketSearch()
  const snapshot = useMarketSnapshot()

  return (
    <div className="space-y-7 xl:space-y-9">
      <MarketPulseHero market={market} />
      <MarketSnapshotGrid data={snapshot} />
      <UnifiedWatchlistPanel watchlist={watchlist} search={search} market={market} />
      <ModelEvidenceStrip />
      <ForecastGrid market={market} />
    </div>
  )
}
