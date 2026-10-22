import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents, parseEuroInput } from '../../accounting/money'
import { isVatRate } from '../../accounting/vat'
import { createId } from '../../data/sales-demo'
import { calculateInvoiceTotals } from '../../sales/invoiceMath'
import type { VatRate } from '../../types/accounting'
import type { InvoiceLine } from '../../types/sales'

interface LineDraft {
  key: string
  productId: string
  description: string
  quantity: string
  netUnitPrice: string
  vatRate: VatRate
}

function emptyLine(): LineDraft {
  return {
    key: createId('line'),
    productId: '',
    description: '',
    quantity: '1',
    netUnitPrice: '',
    vatRate: 19,
  }
}

export function InvoiceForm() {
  const navigate = useNavigate()
  const { sales, saveDraftInvoice, vatEnabled } = useAccounting()
  const [customerId, setCustomerId] = useState(sales.customers[0]?.id ?? '')
  const [issueDate, setIssueDate] = useState('2026-10-09')
  const [dueDate, setDueDate] = useState('2026-10-23')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [error, setError] = useState<string | null>(null)

  const previewLines: InvoiceLine[] = useMemo(() => {
    return lines.flatMap((line) => {
      const quantity = Number(line.quantity.replace(',', '.'))
      const net = parseEuroInput(line.netUnitPrice)
      if (!line.description.trim() || !(quantity > 0) || net === null) return []
      return [
        {
          id: line.key,
          productId: line.productId || undefined,
          description: line.description.trim(),
          quantity,
          netUnitPriceCents: net,
          vatRate: vatEnabled ? line.vatRate : 0,
        },
      ]
    })
  }, [lines, vatEnabled])

  const totals = useMemo(() => {
    try {
      return previewLines.length > 0 ? calculateInvoiceTotals(previewLines) : null
    } catch {
      return null
    }
  }, [previewLines])

  function applyProduct(index: number, productId: string) {
    const product = sales.products.find((item) => item.id === productId)
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line
        if (!product) return { ...line, productId: '' }
        return {
          ...line,
          productId,
          description: product.name,
          netUnitPrice: (product.netUnitPriceCents / 100).toFixed(2).replace('.', ','),
          vatRate: vatEnabled ? product.vatRate : 0,
        }
      }),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (previewLines.length === 0) {
      setError('Bitte mindestens eine gültige Position erfassen.')
      return
    }
    const result = await saveDraftInvoice({
      customerId,
      issueDate,
      dueDate,
      lines: previewLines,
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    if (!result.invoice) {
      setError('Speichern fehlgeschlagen.')
      return
    }
    navigate(`/verkauf/rechnungen/${result.invoice.id}`)
  }

  return (
    <form className="panel booking-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="panel-header">
        <h2 className="panel-title">Neue Ausgangsrechnung</h2>
        <span className="panel-badge">Entwurf · ohne Buchung</span>
      </div>

      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="form-grid">
        <label className="form-field">
          <span>Kunde</span>
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          >
            {sales.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.number} — {customer.companyName}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Rechnungsdatum</span>
          <input
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Fälligkeit</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </label>
      </div>

      <div className="lines-editor">
        <div className="panel-header">
          <h3 className="panel-title">Positionen</h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            Position hinzufügen
          </button>
        </div>

        {lines.map((line, index) => (
          <div key={line.key} className="line-row">
            <label className="form-field">
              <span>Produkt</span>
              <select
                value={line.productId}
                onChange={(event) => applyProduct(index, event.target.value)}
              >
                <option value="">Freie Position</option>
                {sales.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} — {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field form-field-wide">
              <span>Bezeichnung</span>
              <input
                value={line.description}
                onChange={(event) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
                required
              />
            </label>
            <label className="form-field">
              <span>Menge</span>
              <input
                value={line.quantity}
                onChange={(event) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, quantity: event.target.value } : item,
                    ),
                  )
                }
                required
              />
            </label>
            <label className="form-field">
              <span>Netto-Einzelpreis (€)</span>
              <input
                value={line.netUnitPrice}
                onChange={(event) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, netUnitPrice: event.target.value } : item,
                    ),
                  )
                }
                required
              />
            </label>
            {vatEnabled ? (
              <label className="form-field">
                <span>USt</span>
                <select
                  value={line.vatRate}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (!isVatRate(value)) return
                    setLines((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, vatRate: value } : item,
                      ),
                    )
                  }}
                >
                  <option value={0}>0 %</option>
                  <option value={7}>7 %</option>
                  <option value={19}>19 %</option>
                </select>
              </label>
            ) : null}
            {lines.length > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Entfernen
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="amount-preview">
        <div>
          <span className="muted">Netto</span>
          <strong>{totals ? formatCents(totals.netCents) : '—'}</strong>
        </div>
        {vatEnabled ? (
          <>
            <div>
              <span className="muted">USt</span>
              <strong>{totals ? formatCents(totals.taxCents) : '—'}</strong>
            </div>
            <div>
              <span className="muted">Brutto</span>
              <strong>{totals ? formatCents(totals.grossCents) : '—'}</strong>
            </div>
          </>
        ) : (
          <p className="panel-note">Beträge bleiben netto. Umsatzsteuer ist aus.</p>
        )}
      </div>

      <p className="form-hint">
        Speichern legt nur einen Entwurf an. Die Buchung ins Journal erfolgt erst über
        „Rechnung buchen“ in der Detailansicht.
      </p>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Entwurf speichern
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/verkauf')}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
