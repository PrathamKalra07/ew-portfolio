export default function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-gold text-ink shadow-[0_8px_24px_rgba(215,243,107,.25)]" aria-hidden="true">
        <span className="absolute inset-x-2 bottom-2 h-px rotate-[-14deg] bg-ink/25" />
        <span className="text-sm font-black tracking-[-.08em]">SN</span>
      </span>
      {!compact && <div><p className="text-sm font-black tracking-[-.025em]">SmartNifty</p><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-current opacity-45">Volatility intelligence</p></div>}
    </div>
  )
}
