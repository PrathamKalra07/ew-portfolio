import Icon from '../ui/Icon'

const dateTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

function sentimentClasses(label, score) {
  if (label === 'positive' || (score ?? 0) > 0.05) return 'bg-emerald-500/10 text-emerald-700'
  if (label === 'negative' || (score ?? 0) < -0.05) return 'bg-coral/10 text-coral'
  return 'bg-ink/5 text-ink/45'
}

export default function NewsArticleCard({ article }) {
  const sentiment = article.sentimentLabel || (article.sentimentScore == null ? 'unscored' : article.sentimentScore > 0.05 ? 'positive' : article.sentimentScore < -0.05 ? 'negative' : 'neutral')
  const published = article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime()) ? dateTime.format(new Date(article.publishedAt)) : 'Publication time unavailable'

  return (
    <article className="group rounded-2xl border border-ink/[.07] bg-white p-5 transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-soft">
      <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-ink/35"><span>{article.source}</span><span className="h-1 w-1 rounded-full bg-ink/15" /><time>{published}</time><span className={`ml-auto rounded-full px-2.5 py-1 ${sentimentClasses(article.sentimentLabel, article.sentimentScore)}`}>{sentiment}</span></div>
      <h3 className="mt-4 text-lg font-black leading-6 tracking-[-.02em] text-ink">{article.title}</h3>
      {article.summary && <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/45">{article.summary}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {article.instruments.slice(0, 4).map((item) => <span key={item} className="rounded-lg bg-mist px-2 py-1 text-[9px] font-black text-ink/45">{item}</span>)}
        {article.sentimentScore != null && <span className="text-[9px] font-bold text-ink/30">Score {article.sentimentScore.toFixed(3)}</span>}
        {article.url && <a href={article.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-black text-cobalt hover:underline">Read source <Icon name="external" className="h-3 w-3" /></a>}
      </div>
    </article>
  )
}
