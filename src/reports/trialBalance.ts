import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { addCents } from '../accounting/money'
import {
  NO_OPENING_BALANCE_NOTICE,
  type DateRange,
  filterEntriesBefore,
  filterEntriesByRange,
} from './period'

export interface TrialBalanceRow {
  accountNumber: string
  name: string
  accountType: Account['type']
  /** Soll − Haben vor Periodenbeginn. */
  openingBalanceCents: number
  periodDebitCents: number
  periodCreditCents: number
  /** opening + Soll − Haben. */
  closingBalanceCents: number
}

export interface TrialBalanceReport {
  range: DateRange
  rows: TrialBalanceRow[]
  totalPeriodDebitCents: number
  totalPeriodCreditCents: number
  balanced: boolean
  notices: string[]
}

function accumulateLines(
  entries: JournalEntry[],
): Map<string, { debit: number; credit: number }> {
  const map = new Map<string, { debit: number; credit: number }>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = map.get(line.accountNumber) ?? { debit: 0, credit: 0 }
      current.debit += line.debitCents
      current.credit += line.creditCents
      map.set(line.accountNumber, current)
    }
  }
  return map
}

/**
 * Summen- und Saldenliste aus Journalzeilen.
 * Anfangssaldo = Bewegungen vor `range.from` (0 ohne Eröffnungsbuchungen).
 */
export function buildTrialBalance(
  entries: JournalEntry[],
  range: DateRange,
  accounts: Account[] = chartOfAccounts,
): TrialBalanceReport {
  const before = filterEntriesBefore(entries, range.from)
  const inPeriod = filterEntriesByRange(entries, range)
  const openingMap = accumulateLines(before)
  const periodMap = accumulateLines(inPeriod)
  const accountMap = getAccountMap(accounts)

  const accountNumbers = new Set<string>([
    ...accounts.map((account) => account.number),
    ...openingMap.keys(),
    ...periodMap.keys(),
  ])

  const rows: TrialBalanceRow[] = [...accountNumbers]
    .sort((a, b) => a.localeCompare(b))
    .map((accountNumber) => {
      const account = accountMap.get(accountNumber)
      const opening = openingMap.get(accountNumber) ?? { debit: 0, credit: 0 }
      const period = periodMap.get(accountNumber) ?? { debit: 0, credit: 0 }
      const openingBalanceCents = opening.debit - opening.credit
      const closingBalanceCents =
        openingBalanceCents + period.debit - period.credit
      return {
        accountNumber,
        name: account?.name ?? `Unbekanntes Konto ${accountNumber}`,
        accountType: account?.type ?? 'aktiv',
        openingBalanceCents,
        periodDebitCents: period.debit,
        periodCreditCents: period.credit,
        closingBalanceCents,
      }
    })
    .filter(
      (row) =>
        row.openingBalanceCents !== 0 ||
        row.periodDebitCents !== 0 ||
        row.periodCreditCents !== 0 ||
        row.closingBalanceCents !== 0,
    )

  const totalPeriodDebitCents = addCents(
    ...rows.map((row) => row.periodDebitCents),
  )
  const totalPeriodCreditCents = addCents(
    ...rows.map((row) => row.periodCreditCents),
  )

  const notices = [NO_OPENING_BALANCE_NOTICE]
  if (before.length === 0) {
    notices.push(
      'Im gewählten Zeitraum liegen keine Vorperioden-Buchungen vor — alle Anfangssalden sind 0.',
    )
  }

  return {
    range,
    rows,
    totalPeriodDebitCents,
    totalPeriodCreditCents,
    balanced: totalPeriodDebitCents === totalPeriodCreditCents,
    notices,
  }
}
