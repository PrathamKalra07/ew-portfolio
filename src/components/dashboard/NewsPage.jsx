import { useState } from 'react'
import { useNewsFeed } from '../../hooks/useNewsFeed'
import { useNewsSentiment } from '../../hooks/useNewsSentiment'
import { useNewsWatchlists } from '../../hooks/useNewsWatchlists'
import NewsArticleCard from '../news/NewsArticleCard'
import NewsFilters from '../news/NewsFilters'
import NewsSummary from '../news/NewsSummary'
import SentimentPanel from '../news/SentimentPanel'
import Icon from '../ui/Icon'

export default function NewsPage() {
  const [scope, setScope] = useState('feed')
  const [days, setDays] = useState(30)
  const selection = useNewsWatchlists()
  const feed = useNewsFeed({ scope, watchlistId: selection.watchlistId, instrumentKey: selection.instrumentKey, limit: 20 })
  const sentiment = useNewsSentiment(scope === 'stock' ? selection.instrumentKey : '', days)

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">News intelligence</p><h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-5xl">Signals beyond price.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/45">Follow coverage across every watchlist, isolate a portfolio theme, or inspect the sentiment history behind an individual stock.</p></div>
        <div className="rounded-2xl border border-ink/[.07] bg-white px-4 py-3 text-right shadow-sm"><p className="text-[9px] font-black uppercase tracking-[.15em] text-ink/30">Pipeline</p><p className="mt-1 flex items-center gap-2 text-xs font-black"><span className="h-2 w-2 rounded-full bg-emerald-400" />S3 indexed feed</p></div>
      </section>

      <NewsFilters scope={scope} onScopeChange={setScope} selection={selection} onRefresh={feed.reload} refreshing={feed.loading} />
      <NewsSummary articles={feed.articles} />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/[.07] px-5 py-5 sm:px-6"><div><p className="eyebrow">Latest coverage</p><h2 className="mt-2 text-xl font-black">{scope === 'feed' ? 'All watchlist news' : scope === 'watchlist' ? 'Watchlist news' : `${selection.selectedStock?.symbol || 'Stock'} news`}</h2></div><span className="rounded-full bg-mist px-3 py-1.5 text-[9px] font-black text-ink/40">{feed.articles.length} loaded</span></div>

          {feed.error && <div className="m-5 rounded-2xl border border-coral/10 bg-coral/5 p-4"><p className="text-xs font-black text-coral">News API request failed</p><p className="mt-1 text-xs leading-5 text-coral/80">{feed.error}</p><button type="button" onClick={feed.reload} className="mt-3 text-[10px] font-black text-coral underline">Try again</button></div>}
          {feed.loading && <div className="space-y-3 p-5 sm:p-6">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-mist/70" />)}</div>}
          {!feed.loading && !feed.error && !feed.articles.length && <div className="grid min-h-80 place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/25 text-ink"><Icon name="news" /></span><p className="mt-4 text-base font-black">No indexed articles yet</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-ink/40">The API is working, but the ingestion and indexing pipelines have not populated S3 for this selection.</p></div></div>}
          {!feed.loading && feed.articles.length > 0 && <div className="space-y-3 p-4 sm:p-5">{feed.articles.map((article) => <NewsArticleCard key={article.id} article={article} />)}</div>}
          {feed.cursor && <div className="border-t border-ink/[.07] p-4 text-center"><button type="button" onClick={feed.loadMore} disabled={feed.loadingMore} className="button-primary min-w-36 disabled:opacity-50">{feed.loadingMore ? 'Loading...' : 'Load more news'}</button></div>}
        </div>

        <SentimentPanel stock={scope === 'stock' ? selection.selectedStock : null} days={days} onDaysChange={setDays} data={sentiment} />
      </section>
    </div>
  )
}
