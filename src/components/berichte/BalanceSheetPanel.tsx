import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { buildBalanceSheet } from '../../reports/balanceSheet'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { AsOfControl } from './PeriodControls'
import { ReportNotices } from './ReportNotices'

export function BalanceSheetPanel() {
  const { entries } = useAccounting()
  const [asOf, setAsOf] = useState('2026-10-08')
  const report = useMemo(() => buildBalanceSheet(entries, asOf), [entries, asOf])

  return (
    <div className="page-stack">
      <DemoBanner detail="Bilanz aus Salden bis Stichtag — Periodenergebnis schließt ohne künstlichen Ausgleich." />
      <PageHeader
        title="Bilanz"
        subtitle={`Stichtag ${asOf}`}
        actions={
          <Link to="/berichte" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />

      <section className="panel">
        <AsOfControl asOf={asOf} onChange={setAsOf} />
        <ReportNotices notices={report.notices} />
        <p className="panel-note">
          {report.balanced
            ? 'Aktiva = Passiva + Eigenkapital + Periodenergebnis'
            : 'Bilanz geht rechnerisch nicht auf — bitte Journal und Kontenzuordnung prüfen.'}
        </p>

        <div className="split-grid">
          <div>
            <h2 className="panel-title">Aktiva</h2>
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
                  {report.assets.map((row) => (
                    <tr key={row.accountNumber}>
                      <td>
                        <Link
                          className="text-link"
                          to={`/berichte/kontenblatt/${row.accountNumber}?to=${asOf}`}
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
                      <strong>Summe Aktiva</strong>
                    </td>
                    <td className="num">
                      <strong>{formatCents(report.totalAssetsCents)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="panel-title">Passiva</h2>
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
                  {report.liabilities.map((row) => (
                    <tr key={row.accountNumber}>
                      <td>
                        <Link
                          className="text-link"
                          to={`/berichte/kontenblatt/${row.accountNumber}?to=${asOf}`}
                        >
                          <code>{row.accountNumber}</code>
                        </Link>
                      </td>
                      <td>{row.name}</td>
                      <td className="num">{formatCents(row.amountCents)}</td>
                    </tr>
                  ))}
                  {report.equityAccounts.map((row) => (
                    <tr key={row.accountNumber}>
                      <td>
                        <code>{row.accountNumber}</code>
                      </td>
                      <td>{row.name}</td>
                      <td className="num">{formatCents(row.amountCents)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}>Periodenergebnis (GuV bis Stichtag)</td>
                    <td className="num">{formatCents(report.periodResultCents)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <strong>Summe Passiva</strong>
                    </td>
                    <td className="num">
                      <strong>
                        {formatCents(report.totalLiabilitiesAndEquityCents)}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
