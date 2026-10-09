import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function ProductsPanel() {
  const { sales } = useAccounting()

  return (
    <div className="page-stack">
      <DemoBanner detail="Produktkatalog als lokale Demodaten — keine Lagerverwaltung in diesem Schritt." />
      <PageHeader
        title="Produkte und Leistungen"
        subtitle="Katalog für Rechnungspositionen"
        actions={
          <Link to="/verkauf" className="btn btn-secondary">
            Zum Verkauf
          </Link>
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
                <th className="num">Netto</th>
                <th>USt</th>
              </tr>
            </thead>
            <tbody>
              {sales.products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <code>{product.sku}</code>
                  </td>
                  <td>{product.name}</td>
                  <td className="muted">{product.description ?? '—'}</td>
                  <td className="num">{formatCents(product.netUnitPriceCents)}</td>
                  <td>{product.vatRate} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
