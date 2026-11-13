import DataSourceIndicator from '../DataSourceIndicator'
import Icon from '../ui/Icon'

function scoreFor(item) {
  if (item.score != null) return item.score
  const total = item.positiveCount + item.negativeCount + item.neutralCount
  return total ? (item.positiveCount - item.negativeCount) / total : 0
}

export default function SentimentPanel({ stock, days, onDaysChange, data }) {
  const maxArticles = Math.max(1, ...data.history.map((item) => item.articleCount))
  const average = data.history.length ? data.history.reduce((sum, item) => sum + scoreFor(item), 0) / data.history.length : null

  return (
    <aside className="surface overflow-hidden xl:sticky xl:top-24">
      <div className="border-b border-ink/[.07] p-5"><div className="flex items-start justify-between"><div><p className="eyebrow">Sentiment history</p><h2 className="mt-2 text-lg font-black">{stock?.symbol || 'Choose a stock'}</h2><p className="mt-1 text-[10px] text-ink/35">Daily article volume and tone</p></div><DataSourceIndicator source="lambda" label={false} /></div><select value={days} onChange={(event) => onDaysChange(Number(event.target.value))} className="field mt-4 w-full text-xs font-bold"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></div>
      {!stock && <div className="grid min-h-64 place-items-center p-7 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mist"><Icon name="pulse" /></span><p className="mt-4 text-sm font-bold">Stock sentiment</p><p className="mt-1 text-xs leading-5 text-ink/40">Select “By stock” and choose an instrument to view its history.</p></div></div>}
      {stock && data.loading && <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded-xl bg-mist" />)}</div>}
      {stock && data.error && <p className="m-5 rounded-xl bg-coral/5 p-3 text-xs font-semibold text-coral">{data.error}</p>}
      {stock && !data.loading && !data.error && !data.history.length && <div className="grid min-h-64 place-items-center p-7 text-center"><div><p className="text-sm font-bold">No sentiment history yet</p><p className="mt-2 text-xs leading-5 text-ink/40">The ingestion and indexing pipelines have not produced sentiment records for this stock.</p></div></div>}
      {stock && !data.loading && data.history.length > 0 && <div className="p-5"><div className="rounded-2xl bg-ink p-4 text-white"><p className="text-[9px] font-black uppercase tracking-[.15em] text-white/35">Average score</p><p className={`mt-2 text-3xl font-black ${average >= 0 ? 'text-emerald-300' : 'text-coral'}`}>{average >= 0 ? '+' : ''}{average.toFixed(3)}</p></div><div className="mt-5 flex h-44 items-end gap-1.5 overflow-hidden">{data.history.slice(-30).map((item) => { const score = scoreFor(item); return <div key={item.date} className="group relative flex h-full min-w-0 flex-1 items-end"><span title={`${item.date}: ${item.articleCount} articles, score ${score.toFixed(3)}`} className={`w-full rounded-t-sm ${score >= 0 ? 'bg-emerald-400' : 'bg-coral'}`} style={{ height: `${Math.max(7, (item.articleCount / maxArticles) * 100)}%`, opacity: 0.45 + Math.min(Math.abs(score), 1) * 0.55 }} /></div> })}</div><div className="mt-3 flex justify-between text-[9px] font-bold text-ink/30"><span>{data.history.at(-30)?.date}</span><span>{data.history.at(-1)?.date}</span></div></div>}
    </aside>
  )
}
