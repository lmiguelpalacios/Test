import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents, parseEuroInput } from '../../accounting/money'
import { isVatRate } from '../../accounting/vat'
import {
  STOCK_SIMPLIFICATION_NOTICE,
  buildStockSnapshot,
} from '../../purchase/stock'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function ProductsStockPanel() {
  const { sales, purchase, upsertProduct, vatEnabled } = useAccounting()
  const snapshot = buildStockSnapshot(sales.products, purchase.stockMovements)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [vatRate, setVatRate] = useState(19)
  const [tracksStock, setTracksStock] = useState(true)
  const [minStock, setMinStock] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const ek = parseEuroInput(purchasePrice)
    const vk = parseEuroInput(salePrice)
    const rate = vatEnabled ? vatRate : 0
    if (!sku.trim() || !name.trim() || ek === null || vk === null || !isVatRate(rate)) {
      setError('Bitte Artikelnummer, Name, EK und VK gültig ausfüllen.')
      return
    }
    upsertProduct({
      sku,
      name,
      netPurchasePriceCents: ek,
      netUnitPriceCents: vk,
      vatRate: rate,
      tracksStock,
      minStockQuantity: minStock ? Number(minStock) : undefined,
    })
    setMessage('Produkt gespeichert. Bestehende Belege bleiben unverändert.')
    setSku('')
    setName('')
    setPurchasePrice('')
    setSalePrice('')
    setMinStock('')
  }

  return (
    <div className="page-stack">
      <DemoBanner detail={STOCK_SIMPLIFICATION_NOTICE} />
      <PageHeader
        title="Produkte und Bestände"
        subtitle="Gemeinsamer Katalog für Einkauf und Verkauf"
        actions={
          <div className="page-actions-row">
            <Link to="/verkauf/produkte" className="btn btn-secondary">
              Verkaufskatalog
            </Link>
            <Link to="/einkauf" className="btn btn-secondary">
              Zum Einkauf
            </Link>
          </div>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Bestandsübersicht</h2>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Art.-Nr.</th>
                <th>Bezeichnung</th>
                <th className="num">Bestand</th>
                <th className="num">Min.</th>
                <th className="num">EK</th>
                <th className="num">VK</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.map((row) => (
                <tr key={row.product.id}>
                  <td>
                    <code>{row.product.sku}</code>
                  </td>
                  <td>
                    {row.product.name}
                    {row.belowMinimum ? (
                      <>
                        <br />
                        <span className="status-badge open">unter Mindestbestand</span>
                      </>
                    ) : null}
                  </td>
                  <td className="num">{row.quantity}</td>
                  <td className="num">{row.product.minStockQuantity ?? '—'}</td>
                  <td className="num">
                    {formatCents(row.product.netPurchasePriceCents)}
                  </td>
                  <td className="num">{formatCents(row.product.netUnitPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Produkt anlegen / ergänzen</h2>
        </div>
        {message ? (
          <div className="form-alert success" role="status">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="form-alert error" role="alert">
            {error}
          </div>
        ) : null}
        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Artikelnummer</span>
              <input value={sku} onChange={(e) => setSku(e.target.value)} required />
            </label>
            <label className="form-field">
              <span>Bezeichnung</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="form-field">
              <span>Netto-EK (€)</span>
              <input
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Netto-VK (€)</span>
              <input
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
              />
            </label>
            {vatEnabled ? (
              <label className="form-field">
                <span>USt</span>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                >
                  <option value={0}>0 %</option>
                  <option value={7}>7 %</option>
                  <option value={19}>19 %</option>
                </select>
              </label>
            ) : null}
            <label className="form-field">
              <span>Mindestbestand</span>
              <input value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Bestand führen</span>
              <select
                value={tracksStock ? 'yes' : 'no'}
                onChange={(e) => setTracksStock(e.target.value === 'yes')}
              >
                <option value="yes">Ja</option>
                <option value="no">Nein (Dienstleistung)</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Produkt speichern
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
