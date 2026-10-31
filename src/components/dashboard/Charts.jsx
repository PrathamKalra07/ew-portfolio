import { useMemo } from 'react'

export function LineChart({ values, height = 180, positive = true, label = 'Performance chart' }) {
  const width = 600
  const padding = 12
  const points = useMemo(() => {
    if (!values?.length) return ''
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    return values.map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2)
      const y = padding + (1 - (value - min) / range) * (height - padding * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }, [height, values])

  const areaPoints = points ? `${padding},${height - padding} ${points} ${width - padding},${height - padding}` : ''
  const color = positive ? '#10b981' : '#f43f5e'

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={label} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((position) => (
        <line key={position} x1="0" x2={width} y1={height * position} y2={height * position} stroke="#052e26" strokeOpacity=".08" strokeDasharray="5 7" />
      ))}
      <polygon points={areaPoints} fill={`url(#area-${positive ? 'up' : 'down'})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function CandleChart({ candles }) {
  const width = 900
  const height = 360
  const chartTop = 18
  const chartBottom = 300
  const priceMin = Math.min(...candles.map((candle) => candle.low))
  const priceMax = Math.max(...candles.map((candle) => candle.high))
  const range = priceMax - priceMin || 1
  const candleWidth = Math.max(3, (width / candles.length) * 0.58)
  const xStep = width / candles.length
  const y = (price) => chartBottom - ((price - priceMin) / range) * (chartBottom - chartTop)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[320px] w-full" role="img" aria-label="Historical candlestick chart">
      {[0, 0.25, 0.5, 0.75, 1].map((position) => {
        const yPosition = chartTop + position * (chartBottom - chartTop)
        const price = priceMax - position * range
        return (
          <g key={position}>
            <line x1="0" x2={width - 58} y1={yPosition} y2={yPosition} stroke="#052e26" strokeOpacity=".08" strokeDasharray="4 6" />
            <text x={width - 52} y={yPosition + 4} fill="#052e26" fillOpacity=".5" fontSize="11">{price.toFixed(0)}</text>
          </g>
        )
      })}

      {candles.map((candle, index) => {
        const x = index * xStep + xStep / 2
        const openY = y(candle.open)
        const closeY = y(candle.close)
        const up = candle.close >= candle.open
        const color = up ? '#059669' : '#e11d48'
        const bodyTop = Math.min(openY, closeY)
        const bodyHeight = Math.max(1.5, Math.abs(closeY - openY))
        const volumeHeight = (candle.volume / Math.max(...candles.map((item) => item.volume))) * 35

        return (
          <g key={candle.time.toISOString()}>
            <line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.2" />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" fill={color} />
            <rect x={x - candleWidth / 2} y={height - volumeHeight - 4} width={candleWidth} height={volumeHeight} rx="1" fill={color} opacity=".16" />
          </g>
        )
      })}
    </svg>
  )
}
