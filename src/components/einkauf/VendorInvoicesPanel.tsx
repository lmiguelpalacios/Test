import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { displayVatRate } from '../../accounting/vat'
import { calculateInvoiceTotals } from '../../sales/invoiceMath'
import {
  deriveVendorInvoiceStatus,
  openVendorAmountCents,
} from '../../purchase/recordVendorPayment'
import { formatDate } from '../../lib/format'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { InvoiceStatusBadge } from '../verkauf/InvoiceStatusBadge'

export function VendorInvoicesPanel() {
  const { purchase, vatEnabled } = useAccounting()
  const rows = [...purchase.vendorInvoices].sort((a, b) =>
    b.issueDate.localeCompare(a.issueDate),
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="Erst die Buchung der Eingangsrechnung erzeugt Aufwand/Vorsteuer/Verbindlichkeiten." />
      <PageHeader
        title="Eingangsrechnungen"
        subtitle="Lieferantenrechnungen und Zahlungsausgänge"
        actions={
          <div className="page-actions-row">
            <Link to="/einkauf/rechnungen/neu" className="btn btn-primary">
              Rechnung erfassen
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
                <th>Intern</th>
                <th>Extern</th>
                <th>Datum</th>
                <th>Lieferant</th>
                <th>Status</th>
                <th className="num">Brutto</th>
                <th className="num">Offen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const supplier = purchase.suppliers.find(
                  (item) => item.id === invoice.supplierId,
                )
                const totals = calculateInvoiceTotals(
                  invoice.lines.map((line) => ({
                    id: line.id,
                    description: line.description,
                    quantity: line.quantity,
                    netUnitPriceCents: line.netUnitPriceCents,
                    vatRate: displayVatRate(
                      line.vatRate,
                      vatEnabled,
                      invoice.journalEntryIds.length > 0,
                    ),
                  })),
                )
                const status = deriveVendorInvoiceStatus(
                  invoice,
                  purchase.vendorPayments,
                )
                const open = openVendorAmountCents(invoice, purchase.vendorPayments)
                return (
                  <tr key={invoice.id}>
                    <td>
                      <Link
                        className="text-link"
                        to={`/einkauf/rechnungen/${invoice.id}`}
                      >
                        {invoice.internalNumber}
                      </Link>
                    </td>
                    <td>{invoice.externalNumber}</td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{supplier?.companyName ?? '—'}</td>
                    <td>
                      <InvoiceStatusBadge status={status} />
                    </td>
                    <td className="num">{formatCents(totals.grossCents)}</td>
                    <td className="num">
                      {status === 'entwurf' ? '—' : formatCents(open)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
