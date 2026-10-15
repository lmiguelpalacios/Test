import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { parseEuroInput } from '../../accounting/money'
import { createId } from '../../data/sales-demo'
import type { VatRate } from '../../types/accounting'
import type { PurchaseOrderLine } from '../../types/purchase'
import { isVatRate } from '../../accounting/vat'

interface LineDraft {
  key: string
  productId: string
  description: string
  quantity: string
  netUnitPrice: string
  vatRate: VatRate
  expenseAccount: string
}

function emptyLine(): LineDraft {
  return {
    key: createId('pol'),
    productId: '',
    description: '',
    quantity: '1',
    netUnitPrice: '',
    vatRate: 19,
    expenseAccount: '3400',
  }
}

export function OrderForm() {
  const navigate = useNavigate()
  const { purchase, sales, savePurchaseOrder } = useAccounting()
  const [supplierId, setSupplierId] = useState(purchase.suppliers[0]?.id ?? '')
  const [orderDate, setOrderDate] = useState('2026-10-09')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [error, setError] = useState<string | null>(null)

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
          netUnitPrice: (product.netPurchasePriceCents / 100)
            .toFixed(2)
            .replace('.', ','),
          vatRate: product.vatRate,
          expenseAccount: product.vatRate === 7 ? '3300' : '3400',
        }
      }),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const parsed: PurchaseOrderLine[] = []
    for (const line of lines) {
      const quantity = Number(line.quantity.replace(',', '.'))
      const net = parseEuroInput(line.netUnitPrice)
      if (!line.description.trim() || !(quantity > 0) || net === null) {
        setError('Bitte gültige Positionen erfassen.')
        return
      }
      parsed.push({
        id: line.key,
        productId: line.productId || undefined,
        description: line.description.trim(),
        quantity,
        netUnitPriceCents: net,
        vatRate: line.vatRate,
        expenseAccount: line.expenseAccount,
      })
    }
    const result = await savePurchaseOrder({
      supplierId,
      orderDate,
      lines: parsed,
    })
    if (!result.ok || !result.order) {
      setError(result.ok === false ? result.message : 'Speichern fehlgeschlagen.')
      return
    }
    navigate(`/einkauf/bestellungen/${result.order.id}`)
  }

  return (
    <form className="panel booking-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="panel-header">
        <h2 className="panel-title">Neue Bestellung</h2>
        <span className="panel-badge">ohne Buchung</span>
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
          <span>Bestelldatum</span>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="lines-editor">
        {lines.map((line, index) => (
          <div key={line.key} className="line-row">
            <label className="form-field">
              <span>Produkt</span>
              <select
                value={line.productId}
                onChange={(e) => applyProduct(index, e.target.value)}
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
              <span>Netto-EK (€)</span>
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
                <option value="3400">3400 Wareneingang 19 %</option>
                <option value="3300">3300 Wareneingang 7 %</option>
                <option value="4920">4920 Bürobedarf</option>
              </select>
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
          onClick={() => navigate('/einkauf/bestellungen')}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
