import { Outlet } from 'react-router-dom'
import { AccountLedgerPanel } from '../components/berichte/AccountLedgerPanel'
import { BalanceSheetPanel } from '../components/berichte/BalanceSheetPanel'
import { IncomeStatementPanel } from '../components/berichte/IncomeStatementPanel'
import { OpenItemsPanel } from '../components/berichte/OpenItemsPanel'
import { ReportsOverview } from '../components/berichte/ReportsOverview'
import { TrialBalancePanel } from '../components/berichte/TrialBalancePanel'

export function BerichteLayout() {
  return <Outlet />
}

export function BerichteOverviewPage() {
  return <ReportsOverview />
}

export function TrialBalancePage() {
  return <TrialBalancePanel />
}

export function AccountLedgerPage() {
  return <AccountLedgerPanel />
}

export function IncomeStatementPage() {
  return <IncomeStatementPanel />
}

export function BalanceSheetPage() {
  return <BalanceSheetPanel />
}

export function OpenItemsPage() {
  return <OpenItemsPanel />
}
