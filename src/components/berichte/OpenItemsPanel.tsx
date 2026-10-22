import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { formatDate } from '../../lib/format'
import { buildOpenItemsReport } from '../../reports/openItems'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { ReportNotices } from './ReportNotices'
import { InvoiceStatusBadge } from '../verkauf/InvoiceStatusBadge'

export function OpenItemsPanel() {
  const { sales, purchase } = useAccounting()
  const [kind, setKind] = useState<'alle' | 'forderung' | 'verbindlichkeit'>('alle')
  const report = useMemo(
    () => buildOpenItemsReport(sales, purchase),
    [sales, purchase],
  )

  const rows = useMemo(() => {
    const list = [
      ...(kind === 'verbindlichkeit' ? [] : report.receivables),
      ...(kind === 'forderung' ? [] : report.payables),
    ]
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [report, kind])

  return (
    <div className="page-stack">
      <DemoBanner detail="Offene Posten aus gebuchten Rechnungen und Zahlungen — nicht aus Kontensalden neu berechnet." />
      <PageHeader
        title="Offene Posten"
        subtitle={`Forderungen ${formatCents(report.totalReceivableOpenCents)} · Verbindlichkeiten ${formatCents(report.totalPayableOpenCents)}`}
        actions={
          <Link to="/berichte" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />

      <section className="panel">
        <ReportNotices notices={report.notices} />
        <div className="filter-chips" role="group" aria-label="Art">
          {(
            [
              ['alle', 'Alle'],
              ['forderung', 'Forderungen'],
              ['verbindlichkeit', 'Verbindlichkeiten'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={kind === id ? 'chip active' : 'chip'}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Art</th>
                <th>Beleg</th>
                <th>Partner</th>
                <th>Datum</th>
                <th>Fällig</th>
                <th className="num">Brutto</th>
                <th className="num">Bezahlt</th>
                <th className="num">Offen</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    Keine offenen Posten.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.kind}-${row.documentId}`}>
                    <td>{row.kind === 'forderung' ? 'Forderung' : 'Verbindl.'}</td>
                    <td>
                      <Link className="text-link" to={row.detailPath}>
                        {row.documentNumber}
                      </Link>
                    </td>
                    <td>{row.partnerName}</td>
                    <td>{formatDate(row.issueDate)}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td className="num">{formatCents(row.grossCents)}</td>
                    <td className="num">{formatCents(row.paidCents)}</td>
                    <td className="num">{formatCents(row.openCents)}</td>
                    <td>
                      <InvoiceStatusBadge status={row.status} />
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
