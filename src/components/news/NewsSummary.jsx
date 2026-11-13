import DataSourceIndicator from '../DataSourceIndicator'

export default function NewsSummary({ articles }) {
  const positive = articles.filter((item) => item.sentimentLabel === 'positive' || (item.sentimentScore ?? 0) > 0.05).length
  const negative = articles.filter((item) => item.sentimentLabel === 'negative' || (item.sentimentScore ?? 0) < -0.05).length
  const sources = new Set(articles.map((item) => item.source).filter(Boolean)).size
  const metrics = [
    ['Loaded articles', articles.length, 'Current result set'],
    ['Positive', positive, 'Constructive coverage'],
    ['Negative', negative, 'Risk-oriented coverage'],
    ['Sources', sources, 'Distinct publishers'],
  ]
  return (
    <section className="surface grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value, detail], index) => <div key={label} className={`p-5 ${index ? 'border-t border-ink/[.06] sm:border-l sm:border-t-0' : ''}`}><div className="flex items-center justify-between"><p className="eyebrow">{label}</p>{index === 0 && <DataSourceIndicator source="lambda" label={false} />}</div><p className="mt-3 text-2xl font-black tracking-[-.04em]">{value}</p><p className="mt-1 text-[10px] font-semibold text-ink/35">{detail}</p></div>)}
    </section>
  )
}
