import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import {
  type DateRange,
  filterEntriesBefore,
  filterEntriesByRange,
} from './period'

export interface LedgerLine {
  entryId: string
  date: string
  documentNumber: string
  description: string
  debitCents: number
  creditCents: number
  /** Laufender Saldo Soll − Haben nach dieser Zeile. */
  runningBalanceCents: number
}

export interface AccountLedgerReport {
  account: Account | null
  accountNumber: string
  range: DateRange
  openingBalanceCents: number
  lines: LedgerLine[]
  closingBalanceCents: number
}

export function buildAccountLedger(
  entries: JournalEntry[],
  accountNumber: string,
  range: DateRange,
  accounts: Account[] = chartOfAccounts,
): AccountLedgerReport {
  const accountMap = getAccountMap(accounts)
  const account = accountMap.get(accountNumber) ?? null

  let openingBalanceCents = 0
  for (const entry of filterEntriesBefore(entries, range.from)) {
    for (const line of entry.lines) {
      if (line.accountNumber !== accountNumber) continue
      openingBalanceCents += line.debitCents - line.creditCents
    }
  }

  const chronologic = filterEntriesByRange(entries, range)
    .slice()
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return a.createdAt.localeCompare(b.createdAt)
    })

  let running = openingBalanceCents
  const lines: LedgerLine[] = []
  for (const entry of chronologic) {
    for (const line of entry.lines) {
      if (line.accountNumber !== accountNumber) continue
      if (line.debitCents === 0 && line.creditCents === 0) continue
      running += line.debitCents - line.creditCents
      lines.push({
        entryId: entry.id,
        date: entry.date,
        documentNumber: entry.documentNumber,
        description: entry.description,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
        runningBalanceCents: running,
      })
    }
  }

  return {
    account,
    accountNumber,
    range,
    openingBalanceCents,
    lines,
    closingBalanceCents: running,
  }
}
