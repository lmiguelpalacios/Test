import { Link, Outlet } from 'react-router-dom'
import { CustomersPanel } from '../components/verkauf/CustomersPanel'
import { InvoiceDetail } from '../components/verkauf/InvoiceDetail'
import { InvoiceForm } from '../components/verkauf/InvoiceForm'
import { ProductsPanel } from '../components/verkauf/ProductsPanel'
import { SalesOverview } from '../components/verkauf/SalesOverview'
import { DemoBanner } from '../components/DemoBanner'
import { PageHeader } from '../components/PageHeader'

export function VerkaufLayout() {
  return <Outlet />
}

export function VerkaufOverviewPage() {
  return <SalesOverview />
}

export function NewInvoicePage() {
  return (
    <div className="page-stack">
      <DemoBanner detail="Entwurf speichern erzeugt keine Journalbuchung." />
      <PageHeader
        title="Rechnung erstellen"
        subtitle="Ausgangsrechnung als Entwurf anlegen"
        actions={
          <Link to="/verkauf" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />
      <InvoiceForm />
    </div>
  )
}

export function InvoiceDetailPage() {
  return <InvoiceDetail />
}

export function CustomersPage() {
  return <CustomersPanel />
}

export function ProductsPage() {
  return <ProductsPanel />
}
