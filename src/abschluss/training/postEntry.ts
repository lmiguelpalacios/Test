import type { Account, JournalEntry, JournalLine } from '../../types/accounting'
import { chartOfAccounts } from '../../data/chart-of-accounts'
import { addCents, isBalanced } from '../../accounting/money'
import { sumLines, validateJournalEntry } from '../../accounting/validateEntry'
import type { CompoundBooking, SimpleBooking, TrainingLine } from './types'

const CREATED_AT = '2026-12-31T00:00:00.000Z'

export interface PostingIssue {
  message: string
}

export function postSimpleBooking(
  id: string,
  booking: SimpleBooking,
  accounts: Account[] = chartOfAccounts,
  vatEnabled = true,
): JournalEntry {
  const result = validateJournalEntry(booking.draft, accounts, { vatEnabled })
  if (!result.ok) {
    throw new Error(
      `Buchung ${id} ist nicht gültig: ${result.issues.map((issue) => issue.message).join(' ')}`,
    )
  }
  return {
    id,
    createdAt: CREATED_AT,
    ...result.entry,
  }
}

export function postCompoundBooking(
  id: string,
  date: string,
  documentNumber: string,
  booking: CompoundBooking,
  accounts: Account[] = chartOfAccounts,
): JournalEntry {
  const issues = compoundIssues(booking.lines, accounts)
  if (issues.length > 0) {
    throw new Error(`Buchung ${id} ist nicht gültig: ${issues.map((issue) => issue.message).join(' ')}`)
  }
  const totals = sumLines(booking.lines)
  const firstDebit = booking.lines.find((line) => line.debitCents > 0)
  const firstCredit = booking.lines.find((line) => line.creditCents > 0)
  return {
    id,
    createdAt: CREATED_AT,
    date,
    documentNumber,
    description: booking.description,
    debitAccount: firstDebit?.accountNumber ?? '',
    creditAccount: firstCredit?.accountNumber ?? '',
    netAmountCents: totals.debitCents,
    vatRate: 0,
    taxAmountCents: 0,
    grossAmountCents: totals.debitCents,
    lines: booking.lines.map((line) => ({ ...line })),
    explanation: booking.description,
  }
}

export function compoundIssues(
  lines: JournalLine[],
  accounts: Account[] = chartOfAccounts,
): PostingIssue[] {
  const issues: PostingIssue[] = []
  if (lines.length < 2) {
    issues.push({ message: 'Eine Buchung braucht mindestens zwei Zeilen.' })
  }
  const known = new Set(accounts.map((account) => account.number))
  for (const line of lines) {
    if (!known.has(line.accountNumber)) {
      issues.push({ message: `Konto ${line.accountNumber || '—'} fehlt im Kontenplan.` })
    }
    const debit = line.debitCents
    const credit = line.creditCents
    if (!Number.isInteger(debit) || !Number.isInteger(credit) || debit < 0 || credit < 0) {
      issues.push({ message: `Zeile ${line.accountNumber}: Beträge müssen ganze Cent ≥ 0 sein.` })
      continue
    }
    if (debit > 0 && credit > 0) {
      issues.push({ message: `Zeile ${line.accountNumber}: nicht gleichzeitig Soll und Haben.` })
    }
    if (debit === 0 && credit === 0) {
      issues.push({ message: `Zeile ${line.accountNumber}: Betrag fehlt.` })
    }
  }
  const totals = sumLines(lines)
  if (!isBalanced(totals.debitCents, totals.creditCents)) {
    issues.push({
      message: `Soll ${totals.debitCents} und Haben ${totals.creditCents} sind nicht ausgeglichen.`,
    })
  }
  return issues
}

/** Leere Zeilen ignorieren. Übrige Zeilen wie eine zusammengesetzte Buchung prüfen. */
export function studentLineIssues(
  lines: TrainingLine[],
  accounts: Account[] = chartOfAccounts,
): PostingIssue[] {
  const filled = filledLines(lines)
  if (filled.length === 0) {
    return [{ message: 'Noch keine Buchungszeile.' }]
  }
  return compoundIssues(filled, accounts)
}

export function filledLines(lines: TrainingLine[]): JournalLine[] {
  return lines
    .filter((line) => line.accountNumber.trim() !== '' || line.debitCents !== 0 || line.creditCents !== 0)
    .map((line) => ({
      accountNumber: line.accountNumber.trim(),
      debitCents: line.debitCents,
      creditCents: line.creditCents,
    }))
}

export function lineKey(line: JournalLine): string {
  return `${line.accountNumber}|${line.debitCents}|${line.creditCents}`
}

export function totalsOf(lines: JournalLine[]): { debitCents: number; creditCents: number } {
  return {
    debitCents: addCents(...lines.map((line) => line.debitCents)),
    creditCents: addCents(...lines.map((line) => line.creditCents)),
  }
}
