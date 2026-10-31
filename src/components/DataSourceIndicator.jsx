const sources = {
  fargate: { label: 'Fargate · Live', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', title: 'Live Upstox WebSocket data delivered by Fargate and AppSync Events' },
  lambda: { label: 'Lambda · REST', className: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500', title: 'Upstox REST data delivered by API Gateway and Lambda' },
  demo: { label: 'Demo', className: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500', title: 'Dummy or generated demonstration data; not live market data' },
}

export default function DataSourceIndicator({ source, simulated, label = true, className = '' }) {
  const resolved = source || (simulated ? 'demo' : null)
  if (!resolved || !sources[resolved]) return null
  const config = sources[resolved]
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${config.className} ${className}`} title={config.title}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />{label && config.label}</span>
}
