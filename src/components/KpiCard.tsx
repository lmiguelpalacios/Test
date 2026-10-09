import { TrendingDown, TrendingUp } from 'lucide-react'
import type { KpiMetric } from '../types'
import { formatCurrency, formatPercent } from '../lib/format'

interface KpiCardProps {
  metric: KpiMetric
}

export function KpiCard({ metric }: KpiCardProps) {
  const value =
    metric.format === 'currency'
      ? formatCurrency(metric.value)
      : metric.value.toLocaleString('de-DE')

  const isPositive = (metric.changePercent ?? 0) >= 0

  return (
    <article className="kpi-card">
      <p className="kpi-label">{metric.label}</p>
      <p className="kpi-value">{value}</p>
      <div className="kpi-meta">
        {metric.changePercent !== undefined ? (
          <span
            className={isPositive ? 'kpi-change positive' : 'kpi-change negative'}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatPercent(metric.changePercent)}
          </span>
        ) : (
          <span />
        )}
        {metric.hint ? <span className="kpi-hint">{metric.hint}</span> : null}
      </div>
    </article>
  )
}
