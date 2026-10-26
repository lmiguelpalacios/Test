import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents, parseEuroInput } from '../../accounting/money'
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

export function VendorInvoiceDetail() {
  const { invoiceId } = useParams()
  const { purchase, bookVendorInvoice, recordVendorPayment, vatEnabled } = useAccounting()
  const invoice = purchase.vendorInvoices.find((item) => item.id === invoiceId)
  const supplier = purchase.suppliers.find((item) => item.id === invoice?.supplierId)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payDate, setPayDate] = useState('2026-10-09')
  const [payAmount, setPayAmount] = useState('')
  const [payAccount, setPayAccount] = useState<'280' | '282'>('280')
  const [payReference, setPayReference] = useState('')

  const totals = useMemo(() => {
    if (!invoice) return null
    return calculateInvoiceTotals(
      invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        netUnitPriceCents: line.netUnitPriceCents,
        vatRate: displayVatRate(
          line.vatRate,
          vatEnabled,
          (invoice?.journalEntryIds.length ?? 0) > 0,
        ),
      })),
    )
  }, [invoice, vatEnabled])
  const status = invoice
    ? deriveVendorInvoiceStatus(invoice, purchase.vendorPayments)
    : null
  const open = invoice ? openVendorAmountCents(invoice, purchase.vendorPayments) : 0
  const payments = purchase.vendorPayments.filter(
    (payment) => payment.invoiceId === invoice?.id,
  )

  if (!invoice || !totals || !status) {
    return (
      <div className="page-stack">
        <PageHeader title="Eingangsrechnung nicht gefunden" />
        <Link to="/einkauf/rechnungen" className="text-link">
          Zurück
        </Link>
      </div>
    )
  }

  const handleBook = () => {
    setError(null)
    void bookVendorInvoice(invoice.id).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage('Eingangsrechnung wurde ins zentrale Journal gebucht.')
    })
  }

  const handlePayment = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const amountCents = parseEuroInput(payAmount)
    if (amountCents === null) {
      setError('Bitte einen gültigen Betrag eingeben.')
      return
    }
    void recordVendorPayment(invoice.id, {
      date: payDate,
      amountCents,
      bankAccount: payAccount,
      reference: payReference,
    }).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage('Zahlungsausgang gebucht (Verbindlichkeit an Bank).')
      setPayAmount('')
    })
  }

  return (
    <div className="page-stack">
      <DemoBanner detail="Doppelbuchung und Überzahlung sind gesperrt." />
      <PageHeader
        title={invoice.internalNumber}
        subtitle={`${supplier?.companyName ?? '—'} · Extern ${invoice.externalNumber}`}
        actions={
          <div className="page-actions-row">
            <InvoiceStatusBadge status={status} />
            <Link to="/einkauf/rechnungen" className="btn btn-secondary">
              Zur Übersicht
            </Link>
          </div>
        }
      />
      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="form-alert success" role="status">
          {message}
        </div>
      ) : null}

      <section className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Beträge</h2>
          </div>
          <div className="amount-preview">
            <div>
              <span className="muted">Netto</span>
              <strong>{formatCents(totals.netCents)}</strong>
            </div>
            {vatEnabled || totals.taxCents > 0 ? (
              <>
                <div>
                  <span className="muted">Vorsteuer</span>
                  <strong>{formatCents(totals.taxCents)}</strong>
                </div>
                <div>
                  <span className="muted">Brutto</span>
                  <strong>{formatCents(totals.grossCents)}</strong>
                </div>
              </>
            ) : null}
            <div>
              <span className="muted">Offen</span>
              <strong>{status === 'entwurf' ? '—' : formatCents(open)}</strong>
            </div>
          </div>
          {status === 'entwurf' ? (
            <button type="button" className="btn btn-primary" onClick={handleBook}>
              Rechnung buchen
            </button>
          ) : (
            <p className="form-hint">
              Journal: {invoice.journalEntryIds.join(', ') || '—'} · Fällig{' '}
              {formatDate(invoice.dueDate)}
            </p>
          )}
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Positionen</h2>
          </div>
          <div className="table-scroll">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Bezeichnung</th>
                  <th>Konto</th>
                  <th className="num">Netto</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td>
                      <code>{line.expenseAccount}</code>
                    </td>
                    <td className="num">
                      {formatCents(Math.round(line.quantity * line.netUnitPriceCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {status !== 'entwurf' ? (
        <section className="split-grid">
          <article className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Zahlungen</h2>
            </div>
            {payments.length === 0 ? (
              <p className="empty-state">Noch keine Zahlungen.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th className="num">Betrag</th>
                      <th>Journal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.date)}</td>
                        <td className="num">{formatCents(payment.amountCents)}</td>
                        <td>
                          <code>{payment.journalEntryId}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
          {status !== 'bezahlt' ? (
            <article className="panel">
              <div className="panel-header">
                <h2 className="panel-title">Zahlungsausgang</h2>
                <span className="panel-badge">offen {formatCents(open)}</span>
              </div>
              <form className="booking-form" onSubmit={handlePayment}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Datum</span>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Betrag (€)</span>
                    <input
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Konto</span>
                    <select
                      value={payAccount}
                      onChange={(e) =>
                        setPayAccount(e.target.value as '280' | '282')
                      }
                    >
                      <option value="280">280 Bank</option>
                      <option value="282">282 Kasse</option>
                    </select>
                  </label>
                  <label className="form-field form-field-wide">
                    <span>Verwendungszweck</span>
                    <input
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Zahlung buchen
                  </button>
                </div>
              </form>
            </article>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
