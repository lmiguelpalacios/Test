import type { MonthlySeriesPoint } from '../types'
import { formatCurrency } from '../lib/format'

interface RevenueChartProps {
  data: MonthlySeriesPoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1)
  const chartHeight = 180
  const barWidth = 18
  const gap = 28
  const leftPad = 8
  const width = data.length * (barWidth * 2 + gap) + leftPad

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span className="legend-item">
          <i className="swatch revenue" /> Umsatz
        </span>
        <span className="legend-item">
          <i className="swatch expenses" /> Ausgaben
        </span>
      </div>
      <svg
        className="revenue-chart"
        viewBox={`0 0 ${width} ${chartHeight + 36}`}
        role="img"
        aria-label="Umsatz und Ausgaben pro Monat (Demo)"
      >
        {data.map((point, index) => {
          const x = leftPad + index * (barWidth * 2 + gap)
          const revenueH = (point.revenue / maxValue) * chartHeight
          const expensesH = (point.expenses / maxValue) * chartHeight
          return (
            <g key={point.month}>
              <rect
                className="bar revenue"
                x={x}
                y={chartHeight - revenueH}
                width={barWidth}
                height={revenueH}
                rx={3}
              >
                <title>
                  {point.month}: Umsatz {formatCurrency(point.revenue)}
                </title>
              </rect>
              <rect
                className="bar expenses"
                x={x + barWidth + 4}
                y={chartHeight - expensesH}
                width={barWidth}
                height={expensesH}
                rx={3}
              >
                <title>
                  {point.month}: Ausgaben {formatCurrency(point.expenses)}
                </title>
              </rect>
              <text
                x={x + barWidth}
                y={chartHeight + 20}
                textAnchor="middle"
                className="chart-label"
              >
                {point.month}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
