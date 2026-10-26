import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAccounting } from '../accounting/AccountingContext'
import { AccountingOverview } from '../components/buchhaltung/AccountingOverview'
import { ChartOfAccountsPanel } from '../components/buchhaltung/ChartOfAccountsPanel'
import { JournalEntryForm } from '../components/buchhaltung/JournalEntryForm'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'

export function BuchhaltungLayout() {
  return <Outlet />
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
        subtitle="Schulkontenrahmen Industrie für die Nordlicht Handels GmbH"
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
  const { capabilities } = useAccounting()
  if (!capabilities.manualJournal) {
    return <Navigate to="/buchhaltung" replace />
  }
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
