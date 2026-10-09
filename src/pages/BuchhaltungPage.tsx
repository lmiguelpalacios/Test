import { NavLink, Outlet } from 'react-router-dom'
import { AccountingProvider } from '../accounting/AccountingContext'
import { AccountingOverview } from '../components/buchhaltung/AccountingOverview'
import { ChartOfAccountsPanel } from '../components/buchhaltung/ChartOfAccountsPanel'
import { JournalEntryForm } from '../components/buchhaltung/JournalEntryForm'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'

export function BuchhaltungLayout() {
  return (
    <AccountingProvider>
      <Outlet />
    </AccountingProvider>
  )
}

export function BuchhaltungOverviewPage() {
  return <AccountingOverview />
}

export function ChartOfAccountsPage() {
  return (
    <div className="page-stack">
      <DemoBanner />
      <PageHeader
        title="Kontenplan"
        subtitle="Vereinfachter Lernkontenplan für die Nordlicht Handels GmbH"
        actions={
          <NavLink to="/buchhaltung" className="btn btn-secondary">
            Zur Übersicht
          </NavLink>
        }
      />
      <ChartOfAccountsPanel />
    </div>
  )
}

export function NewEntryPage() {
  return (
    <div className="page-stack">
      <DemoBanner />
      <PageHeader
        title="Neue Buchung"
        subtitle="Geschäftsvorfall erfassen — Soll und Haben müssen ausgeglichen sein"
        actions={
          <NavLink to="/buchhaltung" className="btn btn-secondary">
            Zur Übersicht
          </NavLink>
        }
      />
      <JournalEntryForm />
    </div>
  )
}
