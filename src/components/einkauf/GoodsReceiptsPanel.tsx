import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatDate } from '../../lib/format'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function GoodsReceiptsPanel() {
  const { purchase } = useAccounting()
  const rows = [...purchase.receipts].sort((a, b) =>
    b.receiptDate.localeCompare(a.receiptDate),
  )

  return (
    <div className="page-stack">
      <DemoBanner detail="Wareneingänge erhöhen den Bestand, buchen aber keinen Aufwand." />
      <PageHeader
        title="Wareneingänge"
        subtitle="Lieferhistorie zu Bestellungen"
        actions={
          <Link to="/einkauf" className="btn btn-secondary">
            Zum Einkauf
          </Link>
        }
      />
      <section className="panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Datum</th>
                <th>Bestellung</th>
                <th>Positionen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((receipt) => {
                const order = purchase.orders.find((item) => item.id === receipt.orderId)
                return (
                  <tr key={receipt.id}>
                    <td>
                      <code>{receipt.number}</code>
                    </td>
                    <td>{formatDate(receipt.receiptDate)}</td>
                    <td>
                      {order ? (
                        <Link
                          className="text-link"
                          to={`/einkauf/bestellungen/${order.id}`}
                        >
                          {order.number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {receipt.lines
                        .map((line) => `${line.quantity} Stk.`)
                        .join(', ')}
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
