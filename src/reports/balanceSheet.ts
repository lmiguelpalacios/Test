import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { addCents } from '../accounting/money'
import { buildIncomeStatement } from './incomeStatement'
import {
  NO_OPENING_BALANCE_NOTICE,
  REPORT_SIMPLIFICATION_NOTICE,
  filterEntriesOnOrBefore,
} from './period'

export interface BalanceSheetRow {
  accountNumber: string
  name: string
  group: Account['group']
  /** Ausweisbetrag in Cent (Aktiv: Soll−Haben; Passiv: Haben−Soll). */
  amountCents: number
}

export interface BalanceSheetReport {
  asOf: string
  assets: BalanceSheetRow[]
  liabilities: BalanceSheetRow[]
  equityAccounts: BalanceSheetRow[]
  /** Periodenergebnis bis Stichtag (Ertrag − Aufwand). */
  periodResultCents: number
  totalAssetsCents: number
  totalLiabilitiesAndEquityCents: number
  balanced: boolean
  notices: string[]
}

/**
 * Bilanz zum Stichtag aus Journalbewegungen bis einschließlich `asOf`.
 * Periodenergebnis schließt die Bilanz rechnerisch (ohne GuV-Abschlussbuchung).
 * Kein künstlicher Ausgleichsposten — bei Unstimmigkeit `balanced: false`.
 */
export function buildBalanceSheet(
  entries: JournalEntry[],
  asOf: string,
  accounts: Account[] = chartOfAccounts,
): BalanceSheetReport {
  const until = filterEntriesOnOrBefore(entries, asOf)
  const raw = new Map<string, number>()

  for (const entry of until) {
    for (const line of entry.lines) {
      raw.set(
        line.accountNumber,
        (raw.get(line.accountNumber) ?? 0) + line.debitCents - line.creditCents,
      )
    }
  }

  const assets: BalanceSheetRow[] = []
  const liabilities: BalanceSheetRow[] = []
  const equityAccounts: BalanceSheetRow[] = []

  for (const account of accounts) {
    const signed = raw.get(account.number) ?? 0
    if (signed === 0) continue

    if (account.type === 'aktiv') {
      assets.push({
        accountNumber: account.number,
        name: account.name,
        group: account.group,
        amountCents: signed,
      })
    } else if (account.type === 'passiv') {
      const amountCents = -signed
      const row: BalanceSheetRow = {
        accountNumber: account.number,
        name: account.name,
        group: account.group,
        amountCents,
      }
      if (account.group === 'Eigenkapital') {
        equityAccounts.push(row)
      } else {
        liabilities.push(row)
      }
    }
  }

  // Unbekannte Konten mit Saldo (nicht im Plan) — Hinweis, kein Fake-Ausgleich
  const known = new Set(accounts.map((account) => account.number))
  const unknownWithBalance: string[] = []
  for (const [number, signed] of raw) {
    if (!known.has(number) && signed !== 0) unknownWithBalance.push(number)
  }

  const guv = buildIncomeStatement(until, {
    from: '0000-01-01',
    to: asOf,
  }, accounts)
  const periodResultCents = guv.resultCents

  const totalAssetsCents = addCents(...assets.map((row) => row.amountCents))
  const totalLiabilitiesCents = addCents(
    ...liabilities.map((row) => row.amountCents),
  )
  const totalEquityAccountsCents = addCents(
    ...equityAccounts.map((row) => row.amountCents),
  )
  const totalLiabilitiesAndEquityCents =
    totalLiabilitiesCents + totalEquityAccountsCents + periodResultCents

  const notices = [
    REPORT_SIMPLIFICATION_NOTICE,
    NO_OPENING_BALANCE_NOTICE,
    'Periodenergebnis = Erträge − Aufwendungen bis Stichtag (kein GuV-Abschluss auf Eigenkapital gebucht).',
    'Bestandskonto 3980 bleibt unberührt — keine periodengerechte Warenbuchhaltung.',
  ]
  if (unknownWithBalance.length > 0) {
    notices.push(
      `Konten ohne Zuordnung im Kontenplan mit Saldo: ${unknownWithBalance.join(', ')} — nicht in der Bilanz ausgewiesen.`,
    )
  }
  if (equityAccounts.length === 0) {
    notices.push(
      'Keine Eigenkapitalbuchungen (z. B. 0800/0860) im Journal — nur Periodenergebnis als Eigenkapitalbestandteil.',
    )
  }

  return {
    asOf,
    assets: assets.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber)),
    liabilities: liabilities.sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber),
    ),
    equityAccounts: equityAccounts.sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber),
    ),
    periodResultCents,
    totalAssetsCents,
    totalLiabilitiesAndEquityCents,
    balanced: totalAssetsCents === totalLiabilitiesAndEquityCents,
    notices,
  }
}
