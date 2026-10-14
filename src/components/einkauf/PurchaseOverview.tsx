import { Link } from 'react-router-dom'
import {
  Banknote,
  ClipboardList,
  FileInput,
  Package,
  Truck,
  Users,
} from 'lucide-react'
import { useAccounting } from '../../accounting/AccountingContext'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { STOCK_SIMPLIFICATION_NOTICE } from '../../purchase/stock'
import { derivePurchaseOrderStatus } from '../../purchase/orderStatus'
import { deriveVendorInvoiceStatus } from '../../purchase/recordVendorPayment'
import { InvoiceStatusBadge } from '../verkauf/InvoiceStatusBadge'

export function PurchaseOverview() {
  const { purchase, persistWarning, isLocalDemoMode } = useAccounting()
  const openOrders = purchase.orders.filter((order) => {
    const status = derivePurchaseOrderStatus(order, purchase.receipts)
    return status === 'bestellt' || status === 'teilweise_geliefert'
  }).length
  const openInvoices = purchase.vendorInvoices.filter((invoice) => {
    const status = deriveVendorInvoiceStatus(invoice, purchase.vendorPayments)
    return status === 'offen' || status === 'teilweise_bezahlt'
  }).length

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          'Eingangsrechnungen buchen ins zentrale Journal; Bestellung/WE allein erzeugen keine Buchung.'
        }
      />
      <PageHeader
        title="Einkauf"
        subtitle={
          isLocalDemoMode
            ? 'Bestellungen, Wareneingang, Eingangsrechnungen · lokale Lernsimulation'
            : 'Bestellungen, Wareneingang, Eingangsrechnungen · Online-Preview (Review-Backend)'
        }
      />

      <section className="kpi-grid accounting-kpi-grid" aria-label="Einkaufskennzahlen">
        <article className="kpi-card">
          <p className="kpi-label">Lieferanten</p>
          <p className="kpi-value">{purchase.suppliers.length}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Offene Bestellungen</p>
          <p className="kpi-value">{openOrders}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Wareneingänge</p>
          <p className="kpi-value">{purchase.receipts.length}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Offene Eingangsrechnungen</p>
          <p className="kpi-value">{openInvoices}</p>
        </article>
      </section>

      <section className="panel">
        <p className="panel-note">{STOCK_SIMPLIFICATION_NOTICE}</p>
        <div className="page-actions-row">
          <Link to="/einkauf/bestellungen" className="btn btn-primary">
            <ClipboardList size={16} aria-hidden />
            Bestellungen
          </Link>
          <Link to="/einkauf/rechnungen" className="btn btn-primary">
            <FileInput size={16} aria-hidden />
            Eingangsrechnungen
          </Link>
          <Link to="/einkauf/lieferanten" className="btn btn-secondary">
            <Users size={16} aria-hidden />
            Lieferanten
          </Link>
          <Link to="/einkauf/produkte" className="btn btn-secondary">
            <Package size={16} aria-hidden />
            Produkte / Bestände
          </Link>
          <Link to="/einkauf/wareneingaenge" className="btn btn-secondary">
            <Truck size={16} aria-hidden />
            Wareneingänge
          </Link>
          <Link to="/einkauf/zahlungen" className="btn btn-secondary">
            <Banknote size={16} aria-hidden />
            Zahlungsausgänge
          </Link>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Letzte Eingangsrechnungen</h2>
          </div>
          <ul className="activity-list">
            {purchase.vendorInvoices.slice(0, 4).map((invoice) => {
              const status = deriveVendorInvoiceStatus(
                invoice,
                purchase.vendorPayments,
              )
              return (
                <li key={invoice.id} className="activity-item">
                  <div className="activity-body">
                    <div className="activity-row">
                      <Link
                        className="text-link"
                        to={`/einkauf/rechnungen/${invoice.id}`}
                      >
                        {invoice.internalNumber}
                      </Link>
                      <InvoiceStatusBadge status={status} />
                    </div>
                    <p className="activity-description">{invoice.externalNumber}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Bestellungen</h2>
          </div>
          <ul className="activity-list">
            {purchase.orders.slice(0, 4).map((order) => {
              const status = derivePurchaseOrderStatus(order, purchase.receipts)
              return (
                <li key={order.id} className="activity-item">
                  <div className="activity-body">
                    <div className="activity-row">
                      <Link
                        className="text-link"
                        to={`/einkauf/bestellungen/${order.id}`}
                      >
                        {order.number}
                      </Link>
                      <span className="panel-badge">{status.replaceAll('_', ' ')}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </article>
      </section>
    </div>
  )
}
