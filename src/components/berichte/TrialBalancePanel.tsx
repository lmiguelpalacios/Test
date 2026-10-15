import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { buildTrialBalance } from '../../reports/trialBalance'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { PeriodControls } from './PeriodControls'
import { ReportNotices, formatSignedBalance } from './ReportNotices'

export function TrialBalancePanel() {
  const { entries } = useAccounting()
  const [from, setFrom] = useState('2026-10-01')
  const [to, setTo] = useState('2026-10-31')

  const report = useMemo(
    () => buildTrialBalance(entries, { from, to }),
    [entries, from, to],
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="SuSa nur aus Journalzeilen — Soll und Haben der Periode müssen ausgeglichen sein." />
      <PageHeader
        title="Summen- und Saldenliste"
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
        <p className="panel-note">
          Periodensummen: Soll {formatCents(report.totalPeriodDebitCents)} · Haben{' '}
          {formatCents(report.totalPeriodCreditCents)}
          {report.balanced ? ' · ausgeglichen' : ' · nicht ausgeglichen'}
        </p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Konto</th>
                <th>Name</th>
                <th className="num">Anfang</th>
                <th className="num">Soll</th>
                <th className="num">Haben</th>
                <th className="num">Ende</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Keine Bewegungen im Zeitraum.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
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
                    <td className="num">
                      {formatSignedBalance(row.openingBalanceCents, formatCents)}
                    </td>
                    <td className="num">{formatCents(row.periodDebitCents)}</td>
                    <td className="num">{formatCents(row.periodCreditCents)}</td>
                    <td className="num">
                      {formatSignedBalance(row.closingBalanceCents, formatCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="panel-footnote">
          Anfang/Ende: positiv = Sollüberschuss, negativ bzw. „H“ = Habenüberschuss.
        </p>
      </section>
    </div>
  )
}
