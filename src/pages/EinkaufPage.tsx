import { Link, Outlet } from 'react-router-dom'
import { GoodsReceiptsPanel } from '../components/einkauf/GoodsReceiptsPanel'
import { OrderDetail } from '../components/einkauf/OrderDetail'
import { OrderForm } from '../components/einkauf/OrderForm'
import { OrdersPanel } from '../components/einkauf/OrdersPanel'
import { ProductsStockPanel } from '../components/einkauf/ProductsStockPanel'
import { PurchaseOverview } from '../components/einkauf/PurchaseOverview'
import { SuppliersPanel } from '../components/einkauf/SuppliersPanel'
import { VendorInvoiceDetail } from '../components/einkauf/VendorInvoiceDetail'
import { VendorInvoiceForm } from '../components/einkauf/VendorInvoiceForm'
import { VendorInvoicesPanel } from '../components/einkauf/VendorInvoicesPanel'
import { VendorPaymentsPanel } from '../components/einkauf/VendorPaymentsPanel'
import { DemoBanner } from '../components/DemoBanner'
import { PageHeader } from '../components/PageHeader'

export function EinkaufLayout() {
  return <Outlet />
}

export function EinkaufOverviewPage() {
  return <PurchaseOverview />
}

export function OrdersPage() {
  return <OrdersPanel />
}

export function NewOrderPage() {
  return (
    <div className="page-stack">
      <DemoBanner detail="Bestellung allein erzeugt keine Journalbuchung." />
      <PageHeader
        title="Bestellung anlegen"
        subtitle="Einkaufsbestellung als Entwurf speichern"
        actions={
          <Link to="/einkauf/bestellungen" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />
      <OrderForm />
    </div>
  )
}

export function OrderDetailPage() {
  return <OrderDetail />
}

export function GoodsReceiptsPage() {
  return <GoodsReceiptsPanel />
}

export function VendorInvoicesPage() {
  return <VendorInvoicesPanel />
}

export function NewVendorInvoicePage() {
  return (
    <div className="page-stack">
      <DemoBanner detail="Entwurf speichern erzeugt keine Journalbuchung; buchen erst auf der Detailseite." />
      <PageHeader
        title="Eingangsrechnung erstellen"
        subtitle="Lieferantenrechnung als Entwurf anlegen"
        actions={
          <Link to="/einkauf/rechnungen" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />
      <VendorInvoiceForm />
    </div>
  )
}

export function VendorInvoiceDetailPage() {
  return <VendorInvoiceDetail />
}

export function VendorPaymentsPage() {
  return <VendorPaymentsPanel />
}

export function SuppliersPage() {
  return <SuppliersPanel />
}

export function PurchaseProductsPage() {
  return <ProductsStockPanel />
}
