import type { AccountingTotals, JournalEntry } from '../types/accounting'
import { addCents } from './money'
import { sumLines } from './validateEntry'

export const BOOKING_PERIOD_LABEL = 'Buchungszeitraum Oktober 2026 (Demo)'

export function computeAccountingTotals(
  entries: JournalEntry[],
  periodLabel: string = BOOKING_PERIOD_LABEL,
): AccountingTotals {
  let totalDebitCents = 0
  let totalCreditCents = 0

  for (const entry of entries) {
    const { debitCents, creditCents } = sumLines(entry.lines)
    totalDebitCents = addCents(totalDebitCents, debitCents)
    totalCreditCents = addCents(totalCreditCents, creditCents)
  }

  return {
    entryCount: entries.length,
    totalDebitCents,
    totalCreditCents,
    periodLabel,
  }
}

export function sortEntriesNewestFirst(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.createdAt.localeCompare(a.createdAt)
  })
}
