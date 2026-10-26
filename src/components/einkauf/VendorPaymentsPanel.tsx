import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { formatDate } from '../../lib/format'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function VendorPaymentsPanel() {
  const { purchase } = useAccounting()
  const rows = [...purchase.vendorPayments].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="Zahlungsausgänge mindern Verbindlichkeiten (44) gegen Bank (280) — ohne erneute Aufwandbuchung." />
      <PageHeader
        title="Zahlungsausgänge"
        subtitle="Gebuchte Zahlungen zu Eingangsrechnungen"
        actions={
          <div className="page-actions-row">
            <Link to="/einkauf/rechnungen" className="btn btn-secondary">
              Eingangsrechnungen
            </Link>
            <Link to="/einkauf" className="btn btn-secondary">
              Zum Einkauf
            </Link>
          </div>
        }
      />
      <section className="panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Rechnung</th>
                <th>Bank</th>
                <th>Referenz</th>
                <th className="num">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Noch keine Zahlungsausgänge erfasst.
                  </td>
                </tr>
              ) : (
                rows.map((payment) => {
                  const invoice = purchase.vendorInvoices.find(
                    (item) => item.id === payment.invoiceId,
                  )
                  return (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.date)}</td>
                      <td>
                        {invoice ? (
                          <Link
                            className="text-link"
                            to={`/einkauf/rechnungen/${invoice.id}`}
                          >
                            {invoice.internalNumber}
                          </Link>
                        ) : (
                          payment.invoiceId
                        )}
                      </td>
                      <td>
                        <code>{payment.bankAccount}</code>
                      </td>
                      <td className="muted">{payment.reference ?? '—'}</td>
                      <td className="num">{formatCents(payment.amountCents)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
