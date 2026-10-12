import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { buildIncomeStatement } from '../../reports/incomeStatement'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { PeriodControls } from './PeriodControls'
import { ReportNotices } from './ReportNotices'

export function IncomeStatementPanel() {
  const { entries } = useAccounting()
  const [from, setFrom] = useState('2026-10-01')
  const [to, setTo] = useState('2026-10-31')
  const report = useMemo(
    () => buildIncomeStatement(entries, { from, to }),
    [entries, from, to],
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="GuV aus Ertrags- und Aufwandskonten des Journals im gewählten Zeitraum." />
      <PageHeader
        title="Gewinn- und Verlustrechnung"
        subtitle={`${from} – ${to}`}
        actions={
          <Link to="/berichte" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />

      <section className="panel">
        <PeriodControls
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
        <ReportNotices notices={report.notices} />

        <div className="split-grid">
          <div>
            <h2 className="panel-title">Erträge</h2>
            <div className="table-scroll">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Konto</th>
                    <th>Name</th>
                    <th className="num">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {report.revenueRows.map((row) => (
                    <tr key={row.accountNumber}>
                      <td>
                        <Link
                          className="text-link"
                          to={`/berichte/kontenblatt/${row.accountNumber}?from=${from}&to=${to}`}
                        >
                          <code>{row.accountNumber}</code>
                        </Link>
                      </td>
                      <td>{row.name}</td>
                      <td className="num">{formatCents(row.amountCents)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}>
                      <strong>Summe Erträge</strong>
                    </td>
                    <td className="num">
                      <strong>{formatCents(report.totalRevenueCents)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="panel-title">Aufwendungen</h2>
            <div className="table-scroll">
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Konto</th>
                    <th>Name</th>
                    <th className="num">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenseRows.map((row) => (
                    <tr key={row.accountNumber}>
                      <td>
                        <Link
                          className="text-link"
                          to={`/berichte/kontenblatt/${row.accountNumber}?from=${from}&to=${to}`}
                        >
                          <code>{row.accountNumber}</code>
                        </Link>
                      </td>
                      <td>{row.name}</td>
                      <td className="num">{formatCents(row.amountCents)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}>
                      <strong>Summe Aufwendungen</strong>
                    </td>
                    <td className="num">
                      <strong>{formatCents(report.totalExpenseCents)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="panel-note">
          <strong>Periodenergebnis:</strong> {formatCents(report.resultCents)}
        </p>
      </section>
    </div>
  )
}
