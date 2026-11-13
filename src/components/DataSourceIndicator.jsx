const sources = {
  fargate: { label: 'Fargate / Live', className: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-600', dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]', title: 'Live Upstox WebSocket data delivered by Fargate and AppSync Events' },
  lambda: { label: 'Lambda / REST', className: 'border-blue-300/40 bg-blue-400/10 text-blue-600', dot: 'bg-blue-500', title: 'Upstox REST data delivered by API Gateway and Lambda' },
  demo: { label: 'Model demo', className: 'border-amber-300/50 bg-amber-300/10 text-amber-600', dot: 'bg-amber-400', title: 'Generated demonstration data; not backed by a production model response' },
}

export default function DataSourceIndicator({ source, simulated, label = true, className = '' }) {
  const resolved = source || (simulated ? 'demo' : null)
  if (!resolved || !sources[resolved]) return null
  const config = sources[resolved]
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] ${config.className} ${className}`} title={config.title}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />{label && config.label}</span>
}
