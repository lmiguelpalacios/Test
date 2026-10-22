import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents, parseEuroInput } from '../../accounting/money'
import { displayVatRate } from '../../accounting/vat'
import { calculateInvoiceTotals, lineNetCents } from '../../sales/invoiceMath'
import {
  deriveInvoiceStatus,
  openAmountCents,
} from '../../sales/invoiceStatus'
import { formatDate } from '../../lib/format'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'

export function InvoiceDetail() {
  const { invoiceId } = useParams()
  const { sales, bookInvoice, recordInvoicePayment, vatEnabled } = useAccounting()
  const invoice = sales.invoices.find((item) => item.id === invoiceId)
  const customer = sales.customers.find((item) => item.id === invoice?.customerId)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payDate, setPayDate] = useState('2026-10-09')
  const [payAmount, setPayAmount] = useState('')
  const [payAccount, setPayAccount] = useState<'1200' | '1000'>('1200')
  const [payReference, setPayReference] = useState('')

  const booked = (invoice?.journalEntryIds.length ?? 0) > 0
  const displayLines = useMemo(() => {
    if (!invoice) return []
    return invoice.lines.map((line) => ({
      ...line,
      vatRate: displayVatRate(line.vatRate, vatEnabled, booked),
    }))
  }, [invoice, vatEnabled, booked])
  const totals = useMemo(
    () => (invoice ? calculateInvoiceTotals(displayLines) : null),
    [invoice, displayLines],
  )
  const showVat = vatEnabled || displayLines.some((line) => line.vatRate > 0)
  const status = invoice ? deriveInvoiceStatus(invoice, sales.payments) : null
  const open = invoice ? openAmountCents(invoice, sales.payments) : 0
  const payments = sales.payments.filter((payment) => payment.invoiceId === invoice?.id)

  if (!invoice || !totals || !status) {
    return (
      <div className="page-stack">
        <DemoBanner />
        <PageHeader title="Rechnung nicht gefunden" />
        <p>
          <Link to="/verkauf" className="text-link">
            Zurück zur Übersicht
          </Link>
        </p>
      </div>
    )
  }

  const handleBook = () => {
    setError(null)
    setMessage(null)
    void bookInvoice(invoice.id).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage('Rechnung wurde ins zentrale Journal gebucht.')
    })
  }

  const handlePayment = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const amountCents = parseEuroInput(payAmount)
    if (amountCents === null) {
      setError('Bitte einen gültigen Zahlungsbetrag eingeben.')
      return
    }
    void recordInvoicePayment(invoice.id, {
      date: payDate,
      amountCents,
      bankAccount: payAccount,
      reference: payReference,
    }).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage('Zahlungseingang gebucht (Bank an Forderung).')
      setPayAmount('')
      setPayReference('')
    })
  }

  return (
    <div className="page-stack">
      <DemoBanner detail="Gebuchte Rechnungen ändern das Journal; Entwürfe erzeugen keine Buchung." />
      <PageHeader
        title={invoice.number}
        subtitle={customer ? customer.companyName : 'Unbekannter Kunde'}
        actions={
          <div className="page-actions-row">
            <InvoiceStatusBadge status={status} />
            <Link to="/verkauf" className="btn btn-secondary">
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
            <h2 className="panel-title">Rechnungsdaten</h2>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Rechnungsdatum</dt>
              <dd>{formatDate(invoice.issueDate)}</dd>
            </div>
            <div>
              <dt>Fälligkeit</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </div>
            <div>
              <dt>Kunde</dt>
              <dd>
                {customer?.companyName}
                {customer?.billingAddress ? (
                  <>
                    <br />
                    <span className="muted">{customer.billingAddress}</span>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Journal</dt>
              <dd>
                {invoice.journalEntryIds.length > 0
                  ? invoice.journalEntryIds.join(', ')
                  : 'noch nicht gebucht'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Beträge</h2>
          </div>
          <div className="amount-preview">
            <div>
              <span className="muted">Netto</span>
              <strong>{formatCents(totals.netCents)}</strong>
            </div>
            {showVat ? (
              <>
                <div>
                  <span className="muted">USt</span>
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
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleBook}>
                Rechnung buchen
              </button>
            </div>
          ) : (
            <p className="form-hint">
              Bereits gebucht — erneutes Buchen ist gesperrt. Zahlungen belasten nur Bank und
              Forderung.
            </p>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Positionen</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bezeichnung</th>
                <th className="num">Menge</th>
                <th className="num">Einzelpreis</th>
                {showVat ? <th>USt</th> : null}
                <th className="num">Netto</th>
              </tr>
            </thead>
            <tbody>
              {displayLines.map((line) => (
                <tr key={line.id}>
                  <td>{line.description}</td>
                  <td className="num">{line.quantity}</td>
                  <td className="num">{formatCents(line.netUnitPriceCents)}</td>
                  {showVat ? <td>{line.vatRate} %</td> : null}
                  <td className="num">
                    {formatCents(lineNetCents(line.quantity, line.netUnitPriceCents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {status !== 'entwurf' ? (
        <section className="split-grid">
          <article className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Zahlungen</h2>
            </div>
            {payments.length === 0 ? (
              <p className="empty-state">Noch keine Zahlungen erfasst.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Konto</th>
                      <th className="num">Betrag</th>
                      <th>Journal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.date)}</td>
                        <td>
                          <code>{payment.bankAccount}</code>
                        </td>
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
                <h2 className="panel-title">Zahlung erfassen</h2>
                <span className="panel-badge">offen {formatCents(open)}</span>
              </div>
              <form className="booking-form" onSubmit={handlePayment}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Datum</span>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(event) => setPayDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Betrag (€)</span>
                    <input
                      value={payAmount}
                      onChange={(event) => setPayAmount(event.target.value)}
                      placeholder="0,00"
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Konto</span>
                    <select
                      value={payAccount}
                      onChange={(event) =>
                        setPayAccount(event.target.value as '1200' | '1000')
                      }
                    >
                      <option value="1200">1200 Bank</option>
                      <option value="1000">1000 Kasse</option>
                    </select>
                  </label>
                  <label className="form-field form-field-wide">
                    <span>Verwendungszweck (optional)</span>
                    <input
                      value={payReference}
                      onChange={(event) => setPayReference(event.target.value)}
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
