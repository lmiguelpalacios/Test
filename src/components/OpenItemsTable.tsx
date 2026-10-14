import type { OpenItem } from '../types'
import { formatCurrency, formatDate } from '../lib/format'

interface OpenItemsTableProps {
  title: string
  totalLabel: string
  total: number
  items: OpenItem[]
  emptyLabel: string
}

export function OpenItemsTable({
  title,
  totalLabel,
  total,
  items,
  emptyLabel,
}: OpenItemsTableProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        <p className="panel-total">
          {totalLabel}: <strong>{formatCurrency(total)}</strong>
        </p>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Beleg</th>
                <th>Fällig</th>
                <th className="num">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.party}</td>
                  <td>
                    <code>{item.documentNumber}</code>
                  </td>
                  <td>{formatDate(item.dueDate)}</td>
                  <td className="num">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
