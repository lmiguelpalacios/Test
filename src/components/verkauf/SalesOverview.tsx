import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, Package } from 'lucide-react'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { calculateInvoiceTotals } from '../../sales/invoiceMath'
import type { InvoiceStatus } from '../../types/sales'
import { deriveInvoiceStatus, openAmountCents } from '../../sales/invoiceStatus'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { formatDate } from '../../lib/format'

const STATUS_FILTERS: Array<{ id: 'alle' | InvoiceStatus; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'entwurf', label: 'Entwurf' },
  { id: 'offen', label: 'Offen' },
  { id: 'teilweise_bezahlt', label: 'Teilweise' },
  { id: 'bezahlt', label: 'Bezahlt' },
]

export function SalesOverview() {
  const { sales, persistWarning, isLocalDemoMode } = useAccounting()
  const [statusFilter, setStatusFilter] = useState<'alle' | InvoiceStatus>('alle')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sales.invoices
      .map((invoice) => {
        const customer = sales.customers.find((item) => item.id === invoice.customerId)
        const totals = calculateInvoiceTotals(invoice.lines)
        const status = deriveInvoiceStatus(invoice, sales.payments)
        const open = openAmountCents(invoice, sales.payments)
        return { invoice, customer, totals, status, open }
      })
      .filter((row) => (statusFilter === 'alle' ? true : row.status === statusFilter))
      .filter((row) => {
        if (!q) return true
        return (
          row.invoice.number.toLowerCase().includes(q) ||
          (row.customer?.companyName.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => b.invoice.issueDate.localeCompare(a.invoice.issueDate))
  }, [sales, statusFilter, query])

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          (isLocalDemoMode
            ? 'Verkauf erzeugt Buchungen nur über das zentrale Journal (localStorage).'
            : 'Verkauf bucht und zahlt über Supabase-RPCs (book_sales_invoice / record_sales_payment). Preview/Test — nicht Production.')
        }
      />
      <PageHeader
        title="Verkauf"
        subtitle={
          isLocalDemoMode
            ? 'Kundenrechnungen · lokale Lernsimulation'
            : 'Kundenrechnungen · Online-Preview (Review-Backend)'
        }
        actions={
          <div className="page-actions-row">
            <Link to="/verkauf/neu" className="btn btn-primary">
              <Plus size={16} aria-hidden />
              Rechnung erstellen
            </Link>
            <Link to="/verkauf/kunden" className="btn btn-secondary">
              <Users size={16} aria-hidden />
              Kunden
            </Link>
            <Link to="/verkauf/produkte" className="btn btn-secondary">
              <Package size={16} aria-hidden />
              Produkte
            </Link>
          </div>
        }
      />

      <section className="panel">
        <div className="sales-toolbar">
          <div className="filter-chips" role="group" aria-label="Statusfilter">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`chip-button ${statusFilter === filter.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="form-field search-inline">
            <span className="sr-only">Suche</span>
            <input
              type="search"
              placeholder="Nummer oder Kunde…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Datum</th>
                <th>Kunde</th>
                <th>Status</th>
                <th className="num">Netto</th>
                <th className="num">Brutto</th>
                <th className="num">Offen</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    Keine Rechnungen für diesen Filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.invoice.id}>
                    <td>
                      <Link className="text-link" to={`/verkauf/rechnungen/${row.invoice.id}`}>
                        {row.invoice.number}
                      </Link>
                    </td>
                    <td>{formatDate(row.invoice.issueDate)}</td>
                    <td>{row.customer?.companyName ?? '—'}</td>
                    <td>
                      <InvoiceStatusBadge status={row.status} />
                    </td>
                    <td className="num">{formatCents(row.totals.netCents)}</td>
                    <td className="num">{formatCents(row.totals.grossCents)}</td>
                    <td className="num">
                      {row.status === 'entwurf' ? '—' : formatCents(row.open)}
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
