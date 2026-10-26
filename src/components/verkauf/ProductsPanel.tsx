import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { buildStockSnapshot } from '../../purchase/stock'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function ProductsPanel() {
  const { sales, purchase, vatEnabled } = useAccounting()
  const snapshot = buildStockSnapshot(sales.products, purchase.stockMovements)
  const stockById = new Map(snapshot.map((row) => [row.product.id, row]))

  return (
    <div className="page-stack">
      <DemoBanner detail="Gemeinsamer Produktkatalog mit Einkauf — Bestand aus Wareneingang/Verkaufsbuchungen." />
      <PageHeader
        title="Produkte und Leistungen"
        subtitle="Katalog für Rechnungspositionen"
        actions={
          <div className="page-actions-row">
            <Link to="/einkauf/produkte" className="btn btn-secondary">
              Bestände bearbeiten
            </Link>
            <Link to="/verkauf" className="btn btn-secondary">
              Zum Verkauf
            </Link>
          </div>
        }
      />
      <section className="panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Art.-Nr.</th>
                <th>Bezeichnung</th>
                <th>Beschreibung</th>
                <th className="num">EK</th>
                <th className="num">VK</th>
                {vatEnabled ? <th>USt</th> : null}
                <th className="num">Bestand</th>
              </tr>
            </thead>
            <tbody>
              {sales.products.map((product) => {
                const stock = stockById.get(product.id)
                return (
                  <tr key={product.id}>
                    <td>
                      <code>{product.sku}</code>
                    </td>
                    <td>{product.name}</td>
                    <td className="muted">{product.description ?? '—'}</td>
                    <td className="num">{formatCents(product.netPurchasePriceCents)}</td>
                    <td className="num">{formatCents(product.netUnitPriceCents)}</td>
                    {vatEnabled ? <td>{product.vatRate} %</td> : null}
                    <td className="num">
                      {product.tracksStock ? (stock?.quantity ?? 0) : '—'}
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
