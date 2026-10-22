import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { formatCents } from '../accounting/money'
import { buildBalanceSheet } from '../reports/balanceSheet'
import type {
  AbschlussEvaluationResult,
  BalanceSheetDraft,
  BalanceSheetDraftRow,
} from './types'

function rowMap(rows: BalanceSheetDraftRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.accountNumber, row.amountCents]))
}

function compareSection(
  sectionLabel: string,
  idPrefix: string,
  expected: { accountNumber: string; name: string; amountCents: number }[],
  given: BalanceSheetDraftRow[],
  map: ReturnType<typeof getAccountMap>,
): AbschlussEvaluationResult['criteria'] {
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const givenMap = rowMap(given)
  const expectedNumbers = new Set(expected.map((row) => row.accountNumber))

  for (const row of expected) {
    const amount = givenMap.get(row.accountNumber)
    const ok = amount === row.amountCents
    criteria.push({
      id: `${idPrefix}:${row.accountNumber}`,
      label: `${sectionLabel}: ${row.accountNumber} ${row.name}`,
      ok,
      points: ok ? 1 : 0,
      maxPoints: 1,
      feedback:
        amount === undefined
          ? `Zeile fehlt. Erwartet: ${formatCents(row.amountCents)}.`
          : ok
            ? `Betrag ${formatCents(row.amountCents)} ist korrekt.`
            : `Betrag weicht ab (eingetragen ${formatCents(amount)}, erwartet ${formatCents(row.amountCents)}).`,
    })
  }

  for (const row of given) {
    if (expectedNumbers.has(row.accountNumber)) continue
    if (row.amountCents === 0) continue
    const name = map.get(row.accountNumber)?.name ?? row.accountNumber
    criteria.push({
      id: `${idPrefix}_extra:${row.accountNumber}`,
      label: `${sectionLabel} Extra: ${row.accountNumber} ${name}`,
      ok: false,
      points: 0,
      maxPoints: 1,
      feedback: `Konto ${row.accountNumber} gehört in dieser Sektion nicht in die Bilanz (Saldo 0 oder anderer Typ).`,
    })
  }

  return criteria
}

/**
 * Vergleicht Nutzer-Bilanz mit `buildBalanceSheet` (centgenau).
 * Nur Konten mit Ausweisbetrag ≠ 0; Extra-Zeilen = Fehler.
 */
export function evaluateBalanceSheet(
  entries: JournalEntry[],
  asOf: string,
  draft: BalanceSheetDraft,
  accounts: Account[] = chartOfAccounts,
): AbschlussEvaluationResult {
  const truth = buildBalanceSheet(entries, asOf, accounts)
  const map = getAccountMap(accounts)
  const criteria: AbschlussEvaluationResult['criteria'] = [
    ...compareSection('Aktiva', 'bilanz_asset', truth.assets, draft.assets, map),
    ...compareSection(
      'Passiva',
      'bilanz_liability',
      truth.liabilities,
      draft.liabilities,
      map,
    ),
    ...compareSection(
      'Eigenkapital',
      'bilanz_equity',
      truth.equityAccounts,
      draft.equityAccounts,
      map,
    ),
  ]

  const periodOk = draft.periodResultCents === truth.periodResultCents
  criteria.push({
    id: 'bilanz_period_result',
    label: 'Periodenergebnis',
    ok: periodOk,
    points: periodOk ? 1 : 0,
    maxPoints: 1,
    feedback: periodOk
      ? `Periodenergebnis ${formatCents(truth.periodResultCents)} ist korrekt.`
      : `Periodenergebnis weicht ab (eingetragen ${formatCents(draft.periodResultCents)}, erwartet ${formatCents(truth.periodResultCents)} = GuV bis Stichtag).`,
  })

  const assetsOk = draft.totalAssetsCents === truth.totalAssetsCents
  criteria.push({
    id: 'bilanz_total_assets',
    label: 'Summe Aktiva',
    ok: assetsOk,
    points: assetsOk ? 1 : 0,
    maxPoints: 1,
    feedback: assetsOk
      ? `Summe Aktiva ${formatCents(truth.totalAssetsCents)} ist korrekt.`
      : `Summe Aktiva weicht ab (eingetragen ${formatCents(draft.totalAssetsCents)}, erwartet ${formatCents(truth.totalAssetsCents)}).`,
  })

  const passivaOk =
    draft.totalLiabilitiesAndEquityCents ===
    truth.totalLiabilitiesAndEquityCents
  criteria.push({
    id: 'bilanz_total_passiva',
    label: 'Summe Passiva + EK + PE',
    ok: passivaOk,
    points: passivaOk ? 1 : 0,
    maxPoints: 1,
    feedback: passivaOk
      ? `Passivseite ${formatCents(truth.totalLiabilitiesAndEquityCents)} ist korrekt.`
      : `Passivseite weicht ab (eingetragen ${formatCents(draft.totalLiabilitiesAndEquityCents)}, erwartet ${formatCents(truth.totalLiabilitiesAndEquityCents)}). Denk an Bilanzgleichung: Aktiva = Passiva + EK + Periodenergebnis.`,
  })

  const score = criteria.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = criteria.reduce((sum, item) => sum + item.maxPoints, 0)
  const fullyCorrect =
    maxPoints > 0 && score === maxPoints && criteria.every((item) => item.ok)

  let summary: string
  if (fullyCorrect) {
    summary =
      'Bilanz stimmt mit dem Journal überein — Aktiva = Passiva + Eigenkapital + Periodenergebnis.'
  } else if (score === 0) {
    summary =
      'Noch keine Treffer. Baue die Bilanz aus Bestandskonten-Salden bis Stichtag; Periodenergebnis kommt aus der GuV.'
  } else {
    summary = `Teilweise richtig (${score}/${maxPoints}). Siehe Hinweise zu Zeilen und Summen.`
  }

  return { score, maxPoints, fullyCorrect, criteria, summary }
}

/** Musterlösung als Draft aus dem Report-Builder. */
export function balanceSheetSolutionDraft(
  entries: JournalEntry[],
  asOf: string,
  accounts: Account[] = chartOfAccounts,
): BalanceSheetDraft {
  const truth = buildBalanceSheet(entries, asOf, accounts)
  return {
    assets: truth.assets.map((row) => ({
      accountNumber: row.accountNumber,
      amountCents: row.amountCents,
    })),
    liabilities: truth.liabilities.map((row) => ({
      accountNumber: row.accountNumber,
      amountCents: row.amountCents,
    })),
    equityAccounts: truth.equityAccounts.map((row) => ({
      accountNumber: row.accountNumber,
      amountCents: row.amountCents,
    })),
    periodResultCents: truth.periodResultCents,
    totalAssetsCents: truth.totalAssetsCents,
    totalLiabilitiesAndEquityCents: truth.totalLiabilitiesAndEquityCents,
  }
}
