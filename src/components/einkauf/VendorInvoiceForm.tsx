import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { parseEuroInput } from '../../accounting/money'
import { isVatRate } from '../../accounting/vat'
import {
  GOODS_EXPENSE_ACCOUNT,
  purchaseExpenseChoices,
} from '../../data/chart-of-accounts'
import { createId } from '../../data/sales-demo'
import type { VatRate } from '../../types/accounting'
import type { VendorInvoiceLine } from '../../types/purchase'

interface LineDraft {
  key: string
  description: string
  quantity: string
  netUnitPrice: string
  vatRate: VatRate
  expenseAccount: string
}

function emptyLine(): LineDraft {
  return {
    key: createId('vil'),
    description: '',
    quantity: '1',
    netUnitPrice: '',
    vatRate: 19,
    expenseAccount: GOODS_EXPENSE_ACCOUNT,
  }
}

export function VendorInvoiceForm() {
  const navigate = useNavigate()
  const { purchase, saveVendorInvoice, vatEnabled } = useAccounting()
  const [supplierId, setSupplierId] = useState(purchase.suppliers[0]?.id ?? '')
  const [externalNumber, setExternalNumber] = useState('')
  const [issueDate, setIssueDate] = useState('2026-10-09')
  const [dueDate, setDueDate] = useState('2026-10-23')
  const [orderId, setOrderId] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const parsed: VendorInvoiceLine[] = []
    for (const line of lines) {
      const quantity = Number(line.quantity.replace(',', '.'))
      const net = parseEuroInput(line.netUnitPrice)
      if (!line.description.trim() || !(quantity > 0) || net === null) {
        setError('Bitte gültige Positionen erfassen.')
        return
      }
      parsed.push({
        id: line.key,
        description: line.description.trim(),
        quantity,
        netUnitPriceCents: net,
        vatRate: vatEnabled ? line.vatRate : 0,
        expenseAccount: line.expenseAccount,
      })
    }
    const result = await saveVendorInvoice({
      supplierId,
      externalNumber,
      issueDate,
      dueDate,
      orderId: orderId || undefined,
      lines: parsed,
    })
    if (!result.ok || !result.invoice) {
      setError(result.ok === false ? result.message : 'Speichern fehlgeschlagen.')
      return
    }
    navigate(`/einkauf/rechnungen/${result.invoice.id}`)
  }

  return (
    <form className="panel booking-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="panel-header">
        <h2 className="panel-title">Eingangsrechnung erfassen</h2>
        <span className="panel-badge">Entwurf · ohne Buchung</span>
      </div>
      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="form-grid">
        <label className="form-field">
          <span>Lieferant</span>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
          >
            {purchase.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.number} — {supplier.companyName}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Externe Rechnungsnr.</span>
          <input
            value={externalNumber}
            onChange={(e) => setExternalNumber(e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Rechnungsdatum</span>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Fälligkeit</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </label>
        <label className="form-field form-field-wide">
          <span>Bestellung (optional)</span>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">Keine Verknüpfung</option>
            {purchase.orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.number}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="lines-editor">
        {lines.map((line, index) => (
          <div key={line.key} className="line-row">
            <label className="form-field form-field-wide">
              <span>Bezeichnung</span>
              <input
                value={line.description}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, description: e.target.value } : item,
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
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, quantity: e.target.value } : item,
                    ),
                  )
                }
                required
              />
            </label>
            <label className="form-field">
              <span>Netto (€)</span>
              <input
                value={line.netUnitPrice}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, netUnitPrice: e.target.value } : item,
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
                  onChange={(e) => {
                    const value = Number(e.target.value)
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
            <label className="form-field">
              <span>Aufwandskonto</span>
              <select
                value={line.expenseAccount}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index
                        ? { ...item, expenseAccount: e.target.value }
                        : item,
                    ),
                  )
                }
              >
                {purchaseExpenseChoices(line.expenseAccount).map((account) => (
                  <option key={account.number} value={account.number}>
                    {account.number} {account.name}
                  </option>
                ))}
              </select>
              <span className="muted">
                608 Aufwendungen für Handelswaren gilt auch für 0 % und bucht dann keine Vorsteuer.
              </span>
            </label>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setLines((prev) => [...prev, emptyLine()])}
        >
          Position hinzufügen
        </button>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Entwurf speichern
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/einkauf/rechnungen')}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
