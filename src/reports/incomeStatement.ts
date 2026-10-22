import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { addCents } from '../accounting/money'
import { REPORT_SIMPLIFICATION_NOTICE, type DateRange, filterEntriesByRange } from './period'

export interface IncomeStatementRow {
  accountNumber: string
  name: string
  /** Ertrag: Haben−Soll; Aufwand: Soll−Haben. */
  amountCents: number
}

export interface IncomeStatementReport {
  range: DateRange
  revenueRows: IncomeStatementRow[]
  expenseRows: IncomeStatementRow[]
  totalRevenueCents: number
  totalExpenseCents: number
  /** Erlöse − Aufwendungen. */
  resultCents: number
  notices: string[]
}

export function buildIncomeStatement(
  entries: JournalEntry[],
  range: DateRange,
  accounts: Account[] = chartOfAccounts,
): IncomeStatementReport {
  const inPeriod = filterEntriesByRange(entries, range)
  const map = getAccountMap(accounts)
  const revenue = new Map<string, number>()
  const expense = new Map<string, number>()

  for (const entry of inPeriod) {
    for (const line of entry.lines) {
      const account = map.get(line.accountNumber)
      if (!account) continue
      if (account.type === 'ertrag') {
        const amount = line.creditCents - line.debitCents
        revenue.set(
          line.accountNumber,
          (revenue.get(line.accountNumber) ?? 0) + amount,
        )
      }
      if (account.type === 'aufwand') {
        const amount = line.debitCents - line.creditCents
        expense.set(
          line.accountNumber,
          (expense.get(line.accountNumber) ?? 0) + amount,
        )
      }
    }
  }

  const revenueRows: IncomeStatementRow[] = [...revenue.entries()]
    .filter(([, amount]) => amount !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([accountNumber, amountCents]) => ({
      accountNumber,
      name: map.get(accountNumber)?.name ?? accountNumber,
      amountCents,
    }))

  const expenseRows: IncomeStatementRow[] = [...expense.entries()]
    .filter(([, amount]) => amount !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([accountNumber, amountCents]) => ({
      accountNumber,
      name: map.get(accountNumber)?.name ?? accountNumber,
      amountCents,
    }))

  const totalRevenueCents = addCents(...revenueRows.map((row) => row.amountCents))
  const totalExpenseCents = addCents(...expenseRows.map((row) => row.amountCents))

  return {
    range,
    revenueRows,
    expenseRows,
    totalRevenueCents,
    totalExpenseCents,
    resultCents: totalRevenueCents - totalExpenseCents,
    notices: [
      REPORT_SIMPLIFICATION_NOTICE,
      'GuV nur aus Ertrags-/Aufwandskonten im Zeitraum — ohne Abschlussbuchungen.',
    ],
  }
}
