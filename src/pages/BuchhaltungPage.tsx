import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AccountingProvider } from '../accounting/AccountingContext'
import { AccountingOverview } from '../components/buchhaltung/AccountingOverview'
import { ChartOfAccountsPanel } from '../components/buchhaltung/ChartOfAccountsPanel'
import { JournalEntryForm } from '../components/buchhaltung/JournalEntryForm'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'

function ChartOfAccountsPage() {
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

function NewEntryPage() {
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

export function BuchhaltungPage() {
  return (
    <AccountingProvider>
      <Routes>
        <Route index element={<AccountingOverview />} />
        <Route path="kontenplan" element={<ChartOfAccountsPage />} />
        <Route path="neu" element={<NewEntryPage />} />
        <Route path="*" element={<Navigate to="/buchhaltung" replace />} />
      </Routes>
    </AccountingProvider>
  )
}
