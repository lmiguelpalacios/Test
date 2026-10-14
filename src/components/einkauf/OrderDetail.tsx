import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { calculateInvoiceTotals } from '../../sales/invoiceMath'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  derivePurchaseOrderStatus,
  remainingQuantityForLine,
} from '../../purchase/orderStatus'
import { formatDate } from '../../lib/format'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function OrderDetail() {
  const { orderId } = useParams()
  const { purchase, confirmPurchaseOrder, recordGoodsReceipt } = useAccounting()
  const order = purchase.orders.find((item) => item.id === orderId)
  const supplier = purchase.suppliers.find((item) => item.id === order?.supplierId)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [receiptDate, setReceiptDate] = useState('2026-10-09')
  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({})

  const status = order
    ? derivePurchaseOrderStatus(order, purchase.receipts)
    : null
  const totals = useMemo(() => {
    if (!order) return null
    return calculateInvoiceTotals(
      order.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        netUnitPriceCents: line.netUnitPriceCents,
        vatRate: line.vatRate,
      })),
    )
  }, [order])

  if (!order || !status || !totals) {
    return (
      <div className="page-stack">
        <PageHeader title="Bestellung nicht gefunden" />
        <Link to="/einkauf/bestellungen" className="text-link">
          Zurück
        </Link>
      </div>
    )
  }

  const receipts = purchase.receipts.filter((receipt) => receipt.orderId === order.id)

  const handleConfirm = () => {
    setError(null)
    const result = confirmPurchaseOrder(order.id)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setMessage('Bestellung bestätigt (ohne Journalbuchung).')
  }

  const handleReceipt = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const lines = order.lines
      .map((line) => {
        const raw = qtyByLine[line.id] ?? ''
        const quantity = Number(raw.replace(',', '.'))
        if (!(quantity > 0)) return null
        return { orderLineId: line.id, quantity }
      })
      .filter((line): line is { orderLineId: string; quantity: number } => line !== null)

    void recordGoodsReceipt(order.id, { receiptDate, lines }).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(`Wareneingang ${result.receipt?.number} erfasst.`)
      setQtyByLine({})
    })
  }

  return (
    <div className="page-stack">
      <DemoBanner detail="Wareneingang erhöht den Bestand; Aufwand entsteht erst mit gebuchter Eingangsrechnung." />
      <PageHeader
        title={order.number}
        subtitle={supplier?.companyName ?? 'Unbekannter Lieferant'}
        actions={
          <div className="page-actions-row">
            <span className="panel-badge">{PURCHASE_ORDER_STATUS_LABELS[status]}</span>
            <Link to="/einkauf/bestellungen" className="btn btn-secondary">
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
            <h2 className="panel-title">Bestelldaten</h2>
          </div>
          <p className="panel-note">
            Datum {formatDate(order.orderDate)} · Netto {formatCents(totals.netCents)} ·
            Brutto {formatCents(totals.grossCents)}
          </p>
          {status === 'entwurf' ? (
            <button type="button" className="btn btn-primary" onClick={handleConfirm}>
              Bestellung bestätigen
            </button>
          ) : null}
          <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Position</th>
                  <th className="num">Menge</th>
                  <th className="num">Rest</th>
                  <th className="num">EK</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td className="num">{line.quantity}</td>
                    <td className="num">
                      {remainingQuantityForLine(order, line.id, purchase.receipts)}
                    </td>
                    <td className="num">{formatCents(line.netUnitPriceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Lieferhistorie</h2>
          </div>
          {receipts.length === 0 ? (
            <p className="empty-state">Noch keine Wareneingänge.</p>
          ) : (
            <ul className="activity-list">
              {receipts.map((receipt) => (
                <li key={receipt.id} className="activity-item">
                  <div className="activity-body">
                    <p className="activity-title">{receipt.number}</p>
                    <p className="activity-description">
                      {formatDate(receipt.receiptDate)} ·{' '}
                      {receipt.lines
                        .map((line) => `${line.quantity} Stk.`)
                        .join(', ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {status !== 'entwurf' && status !== 'vollstaendig_geliefert' ? (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Wareneingang erfassen</h2>
          </div>
          <form className="booking-form" onSubmit={handleReceipt}>
            <label className="form-field">
              <span>Lieferdatum</span>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                required
              />
            </label>
            <div className="lines-editor">
              {order.lines.map((line) => {
                const remaining = remainingQuantityForLine(
                  order,
                  line.id,
                  purchase.receipts,
                )
                if (remaining <= 0) return null
                return (
                  <label key={line.id} className="form-field">
                    <span>
                      {line.description} (max. {remaining})
                    </span>
                    <input
                      value={qtyByLine[line.id] ?? ''}
                      onChange={(e) =>
                        setQtyByLine((prev) => ({
                          ...prev,
                          [line.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </label>
                )
              })}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Wareneingang speichern
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  )
}
