import { modelEvidence } from '../../lib/forecastData'
import DataSourceIndicator from '../DataSourceIndicator'

const metrics = [
  ['Range honesty', `${modelEvidence.intervalHonesty}%`, '90% promised'],
  ['Rank correlation', modelEvidence.rankCorrelation.toFixed(3), `${modelEvidence.baselineCorrelation.toFixed(3)} baseline`],
  ['Error reduction', `${modelEvidence.rmseImprovement}%`, 'vs persistence'],
  ['Windows won', modelEvidence.windowsWon, 'walk-forward'],
]

export default function ModelEvidenceStrip() {
  return <section className="surface grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, detail], index) => <div key={label} className={`p-5 sm:p-6 ${index ? 'border-t border-ink/[.06] sm:border-l sm:border-t-0' : ''}`}><div className="flex items-center justify-between gap-2"><p className="eyebrow">{label}</p>{index === 0 && <DataSourceIndicator source="demo" label={false} />}</div><p className="mt-3 text-2xl font-black tracking-[-.04em]">{value}</p><p className="mt-1 text-[11px] font-semibold text-ink/35">{detail}</p></div>)}</section>
}
