import { ActivityList } from '../components/ActivityList'
import { DemoBanner } from '../components/DemoBanner'
import { KpiCard } from '../components/KpiCard'
import { OpenItemsTable } from '../components/OpenItemsTable'
import { PageHeader } from '../components/PageHeader'
import { RevenueChart } from '../components/RevenueChart'
import {
  companyInfo,
  kpiMetrics,
  monthlySeries,
  openPayables,
  openReceivables,
  recentActivities,
  totalOpenPayables,
  totalOpenReceivables,
} from '../data/demo-data'

export function DashboardPage() {
  return (
    <div className="page-stack">
      <DemoBanner />
      <PageHeader
        title="Dashboard"
        subtitle={`${companyInfo.name} · ${companyInfo.businessPeriod}`}
      />

      <section className="kpi-grid" aria-label="Kennzahlen">
        {kpiMetrics.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-header">
            <h2 className="panel-title">Umsatz und Ausgaben</h2>
            <span className="panel-badge">Demo-Grafik</span>
          </div>
          <RevenueChart data={monthlySeries} />
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Letzte Aktivitäten</h2>
            <span className="panel-badge">Demo</span>
          </div>
          <ActivityList items={recentActivities} />
        </article>
      </section>

      <section className="split-grid">
        <OpenItemsTable
          title="Offene Kundenforderungen"
          totalLabel="Summe"
          total={totalOpenReceivables}
          items={openReceivables}
          emptyLabel="Keine offenen Forderungen (Demo)"
        />
        <OpenItemsTable
          title="Offene Lieferantenverbindlichkeiten"
          totalLabel="Summe"
          total={totalOpenPayables}
          items={openPayables}
          emptyLabel="Keine offenen Verbindlichkeiten (Demo)"
        />
      </section>
    </div>
  )
}
