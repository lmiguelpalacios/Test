import type { Account } from '../types/accounting'
import type { JournalEntry } from '../types/accounting'
import type { ActivityItem, ActivityKind, KpiMetric } from '../types'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { addCents, centsToEuros } from './money'
import { sortEntriesNewestFirst } from './totals'

export interface AccountBalance {
  accountNumber: string
  name: string
  /** Soll − Haben in Cent (Aktiv-/Aufwandssicht). */
  balanceCents: number
}

/** Saldo eines Kontos aus Journalzeilen (ohne Anfangsbestand). */
export function computeAccountBalanceCents(
  entries: JournalEntry[],
  accountNumber: string,
): number {
  let balance = 0
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountNumber !== accountNumber) continue
      balance += line.debitCents - line.creditCents
    }
  }
  return balance
}

export function sumByAccountType(
  entries: JournalEntry[],
  accounts: Account[] = chartOfAccounts,
): { revenueCents: number; expenseCents: number } {
  const map = getAccountMap(accounts)
  let revenueCents = 0
  let expenseCents = 0

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = map.get(line.accountNumber)
      if (!account) continue
      if (account.type === 'ertrag') {
        // Erträge im Haben
        revenueCents = addCents(revenueCents, line.creditCents - line.debitCents)
      }
      if (account.type === 'aufwand') {
        // Aufwendungen im Soll
        expenseCents = addCents(expenseCents, line.debitCents - line.creditCents)
      }
    }
  }

  return { revenueCents, expenseCents }
}

function activityKindFor(entry: JournalEntry): ActivityKind {
  if (entry.debitAccount === '1200' || entry.creditAccount === '1200') {
    if (entry.debitAccount === '1400' || entry.creditAccount === '1400') {
      return 'zahlung'
    }
    if (entry.debitAccount === '1600' || entry.creditAccount === '1600') {
      return 'zahlung'
    }
  }
  if (entry.creditAccount === '8400' || entry.creditAccount === '8300') {
    return 'rechnung'
  }
  if (entry.debitAccount === '3400' || entry.debitAccount === '3300') {
    return 'einkauf'
  }
  return 'rechnung'
}

export function journalEntriesToActivities(
  entries: JournalEntry[],
  limit = 6,
): ActivityItem[] {
  return sortEntriesNewestFirst(entries)
    .slice(0, limit)
    .map((entry) => ({
      id: `journal-${entry.id}`,
      kind: activityKindFor(entry),
      title: entry.description,
      description: `${entry.documentNumber} · Soll ${entry.debitAccount} / Haben ${entry.creditAccount}`,
      amount: centsToEuros(entry.grossAmountCents),
      occurredAt: entry.createdAt,
    }))
}

export function buildJournalKpis(entries: JournalEntry[]): KpiMetric[] {
  const { revenueCents, expenseCents } = sumByAccountType(entries)
  const resultCents = revenueCents - expenseCents
  const bankCents = computeAccountBalanceCents(entries, '1200')
  const receivablesCents = computeAccountBalanceCents(entries, '1400')
  const payablesCents = -computeAccountBalanceCents(entries, '1600')

  return [
    {
      id: 'journal-revenue',
      label: 'Erlöse (Journal)',
      value: centsToEuros(revenueCents),
      format: 'currency',
      hint: 'Summe Ertragskonten aus gespeicherten Buchungen',
    },
    {
      id: 'journal-expenses',
      label: 'Aufwendungen (Journal)',
      value: centsToEuros(expenseCents),
      format: 'currency',
      hint: 'Summe Aufwandskonten aus gespeicherten Buchungen',
    },
    {
      id: 'journal-result',
      label: 'Ergebnis (Journal)',
      value: centsToEuros(resultCents),
      format: 'currency',
      hint: 'Erlöse − Aufwendungen im Lernjournal',
    },
    {
      id: 'journal-bank',
      label: 'Bankbewegung',
      value: centsToEuros(bankCents),
      format: 'currency',
      hint: 'Konto 1200 nur aus Journal — ohne Anfangsbestand',
    },
    {
      id: 'journal-receivables',
      label: 'Forderungen 1400',
      value: centsToEuros(receivablesCents),
      format: 'currency',
      hint: 'Saldo aus Journalbewegungen',
    },
    {
      id: 'journal-payables',
      label: 'Verbindlichkeiten 1600',
      value: centsToEuros(Math.max(0, payablesCents)),
      format: 'currency',
      hint: 'Saldo aus Journalbewegungen',
    },
  ]
}

export function getAccountBalances(
  entries: JournalEntry[],
  accountNumbers: string[],
): AccountBalance[] {
  const map = getAccountMap()
  return accountNumbers.map((accountNumber) => {
    const account = map.get(accountNumber)
    return {
      accountNumber,
      name: account?.name ?? accountNumber,
      balanceCents: computeAccountBalanceCents(entries, accountNumber),
    }
  })
}
