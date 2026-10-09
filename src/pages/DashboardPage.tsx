import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { ActivityList } from '../components/ActivityList'
import { DemoBanner } from '../components/DemoBanner'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { RevenueChart } from '../components/RevenueChart'
import { useAccounting } from '../accounting/AccountingContext'
import {
  buildJournalKpis,
  getAccountBalances,
  journalEntriesToActivities,
} from '../accounting/deriveFromJournal'
import { formatCents } from '../accounting/money'
import { companyInfo, monthlySeries } from '../data/demo-data'

export function DashboardPage() {
  const { entries, totals, periodLabel, persistWarning } = useAccounting()

  const journalKpis = useMemo(() => buildJournalKpis(entries).slice(0, 4), [entries])
  const activities = useMemo(() => journalEntriesToActivities(entries, 6), [entries])
  const balances = useMemo(
    () => getAccountBalances(entries, ['1200', '1400', '1600']),
    [entries],
  )

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          'Kennzahlen mit „Journal“ stammen aus denselben gespeicherten Buchungen wie die Buchhaltung.'
        }
      />
      <PageHeader
        title="Dashboard"
        subtitle={`${companyInfo.name} · ${companyInfo.businessPeriod}`}
        actions={
          <Link to="/buchhaltung" className="btn btn-secondary">
            Zur Buchhaltung
          </Link>
        }
      />

      <section className="kpi-grid" aria-label="Kennzahlen aus dem Journal">
        {journalKpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Journalstatus</h2>
          <span className="panel-badge">gemeinsame Datenquelle</span>
        </div>
        <p className="panel-note">
          {periodLabel} · {totals.entryCount} Buchungen · Soll{' '}
          {formatCents(totals.totalDebitCents)} · Haben{' '}
          {formatCents(totals.totalCreditCents)}
        </p>
        <div className="table-scroll">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Konto</th>
                <th>Name</th>
                <th className="num">Saldo (Journal)</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr key={row.accountNumber}>
                  <td>
                    <code>{row.accountNumber}</code>
                  </td>
                  <td>{row.name}</td>
                  <td className="num">{formatCents(row.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-footnote">
          Salden nur aus Journalbewegungen — ohne Anfangsbestände. Keine Aussage über den
          vollständigen YTD-Kontostand.
        </p>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-header">
            <h2 className="panel-title">Umsatz und Ausgaben (YTD)</h2>
            <span className="panel-badge">Demo-Grafik — nicht aus Journal</span>
          </div>
          <p className="panel-note">
            Die Monatsreihe ist eine separate YTD-Demoansicht und wird nicht aus dem
            aktuellen Lernjournal berechnet.
          </p>
          <RevenueChart data={monthlySeries} />
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Letzte Buchungssätze</h2>
            <span className="panel-badge">aus Journal</span>
          </div>
          {activities.length === 0 ? (
            <p className="empty-state">Noch keine Buchungen im Journal.</p>
          ) : (
            <ActivityList items={activities} />
          )}
        </article>
      </section>
    </div>
  )
}
