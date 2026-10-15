import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { chartOfAccounts } from '../../data/chart-of-accounts'
import { formatDate } from '../../lib/format'
import { buildAccountLedger } from '../../reports/accountLedger'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { PeriodControls } from './PeriodControls'
import { formatSignedBalance } from './ReportNotices'

export function AccountLedgerPanel() {
  const { accountNumber: routeAccount } = useParams()
  const [searchParams] = useSearchParams()
  const { entries } = useAccounting()
  const [accountNumber, setAccountNumber] = useState(
    routeAccount ?? searchParams.get('account') ?? '1200',
  )
  const [from, setFrom] = useState(searchParams.get('from') ?? '2026-10-01')
  const [to, setTo] = useState(searchParams.get('to') ?? '2026-10-31')

  const report = useMemo(
    () => buildAccountLedger(entries, accountNumber, { from, to }),
    [entries, accountNumber, from, to],
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="Kontenblatt chronologisch aus dem Journal — Link über Belegnummer zur Buchhaltungsübersicht." />
      <PageHeader
        title="Kontenblatt"
        subtitle={
          report.account
            ? `${report.account.number} · ${report.account.name}`
            : accountNumber
        }
        actions={
          <Link to="/berichte" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />

      <section className="panel">
        <div className="sales-toolbar">
          <label className="form-field">
            <span>Konto</span>
            <select
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
            >
              {chartOfAccounts.map((account) => (
                <option key={account.number} value={account.number}>
                  {account.number} — {account.name}
                </option>
              ))}
            </select>
          </label>
          <PeriodControls
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>

        <p className="panel-note">
          Anfang{' '}
          {formatSignedBalance(report.openingBalanceCents, formatCents)} · Ende{' '}
          {formatSignedBalance(report.closingBalanceCents, formatCents)}
        </p>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Beleg</th>
                <th>Text</th>
                <th className="num">Soll</th>
                <th className="num">Haben</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Keine Buchungen auf diesem Konto im Zeitraum.
                  </td>
                </tr>
              ) : (
                report.lines.map((line, index) => (
                  <tr key={`${line.entryId}-${index}`}>
                    <td>{formatDate(line.date)}</td>
                    <td>
                      <Link to="/buchhaltung" className="text-link">
                        {line.documentNumber}
                      </Link>
                    </td>
                    <td>{line.description}</td>
                    <td className="num">
                      {line.debitCents > 0 ? formatCents(line.debitCents) : '—'}
                    </td>
                    <td className="num">
                      {line.creditCents > 0 ? formatCents(line.creditCents) : '—'}
                    </td>
                    <td className="num">
                      {formatSignedBalance(line.runningBalanceCents, formatCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
