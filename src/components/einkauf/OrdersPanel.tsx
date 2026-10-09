import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  derivePurchaseOrderStatus,
} from '../../purchase/orderStatus'
import { formatDate } from '../../lib/format'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function OrdersPanel() {
  const { purchase } = useAccounting()
  const rows = [...purchase.orders].sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate),
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="Bestellungen erzeugen keine Journalbuchung." />
      <PageHeader
        title="Bestellungen"
        subtitle="Einkaufsbestellungen und Lieferstatus"
        actions={
          <div className="page-actions-row">
            <Link to="/einkauf/bestellungen/neu" className="btn btn-primary">
              Bestellung anlegen
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
                <th>Nummer</th>
                <th>Datum</th>
                <th>Lieferant</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const supplier = purchase.suppliers.find(
                  (item) => item.id === order.supplierId,
                )
                const status = derivePurchaseOrderStatus(order, purchase.receipts)
                return (
                  <tr key={order.id}>
                    <td>
                      <Link
                        className="text-link"
                        to={`/einkauf/bestellungen/${order.id}`}
                      >
                        {order.number}
                      </Link>
                    </td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{supplier?.companyName ?? '—'}</td>
                    <td>{PURCHASE_ORDER_STATUS_LABELS[status]}</td>
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
