import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { filterEntriesOnOrBefore } from '../reports/period'
import type { TAccountDraft, TAccountSide } from './types'

export interface ExpectedTAccount {
  accountNumber: string
  name: string
  /** Absoluter Saldo in Cent. */
  balanceCents: number
  side: TAccountSide
  /** Rohsaldo Soll − Haben. */
  signedCents: number
}

/**
 * Erwartete T-Konten-Endsalden bis Stichtag (nur Saldo ≠ 0).
 * Positiv (Soll−Haben) → Sollseite; negativ → Habenseite mit Betrag |Saldo|.
 */
export function expectedTAccounts(
  entries: JournalEntry[],
  asOf: string,
  accounts: Account[] = chartOfAccounts,
): ExpectedTAccount[] {
  const until = filterEntriesOnOrBefore(entries, asOf)
  const signed = new Map<string, number>()
  for (const entry of until) {
    for (const line of entry.lines) {
      signed.set(
        line.accountNumber,
        (signed.get(line.accountNumber) ?? 0) +
          line.debitCents -
          line.creditCents,
      )
    }
  }

  const map = getAccountMap(accounts)
  const result: ExpectedTAccount[] = []
  for (const [accountNumber, signedCents] of signed) {
    if (signedCents === 0) continue
    const side: TAccountSide = signedCents > 0 ? 'soll' : 'haben'
    result.push({
      accountNumber,
      name: map.get(accountNumber)?.name ?? `Konto ${accountNumber}`,
      balanceCents: Math.abs(signedCents),
      side,
      signedCents,
    })
  }
  return result.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
}

/** Konvertiert Ground Truth in denselben Draft-Shape wie die UI. */
export function expectedTAccountsAsDraft(
  entries: JournalEntry[],
  asOf: string,
  accounts: Account[] = chartOfAccounts,
): TAccountDraft[] {
  return expectedTAccounts(entries, asOf, accounts).map((row) => ({
    accountNumber: row.accountNumber,
    balanceCents: row.balanceCents,
    side: row.side,
  }))
}
