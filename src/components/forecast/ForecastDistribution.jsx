const bands = [
  { label: '5%', move: 1.1, note: 'Quiet week' },
  { label: '25%', move: 1.9, note: '' },
  { label: '50%', move: 2.8, note: 'Most likely' },
  { label: '75%', move: 3.9, note: '' },
  { label: '95%', move: 6.2, note: 'Turbulent week' },
]

export default function ForecastDistribution({ expectedMove }) {
  const scale = expectedMove / 2.8
  return <div className="space-y-3">{bands.map((band) => <div key={band.label} className="grid grid-cols-[36px_1fr_72px] items-center gap-3"><span className="text-[10px] font-black text-ink/35">{band.label}</span><div className="h-2 overflow-hidden rounded-full bg-mist"><div className={`h-full rounded-full ${band.label === '50%' ? 'bg-cobalt' : 'bg-ink/30'}`} style={{ width: `${Math.min(100, Number(band.label.replace('%', '')) + 12)}%` }} /></div><span className="text-right text-[10px] font-bold">±{(band.move * scale).toFixed(1)}%</span>{band.note && <span className="col-start-2 col-end-4 -mt-2 text-[9px] font-semibold text-ink/30">{band.note}</span>}</div>)}</div>
}
