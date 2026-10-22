import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { formatCents } from '../accounting/money'
import { buildIncomeStatement } from '../reports/incomeStatement'
import type { DateRange } from '../reports/period'
import type {
  AbschlussEvaluationResult,
  IncomeStatementDraft,
  IncomeStatementDraftRow,
} from './types'

function compareRows(
  sectionLabel: string,
  idPrefix: string,
  expected: { accountNumber: string; name: string; amountCents: number }[],
  given: IncomeStatementDraftRow[],
  map: ReturnType<typeof getAccountMap>,
): AbschlussEvaluationResult['criteria'] {
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const givenMap = new Map(
    given.map((row) => [row.accountNumber, row.amountCents]),
  )
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
      feedback: `Konto ${row.accountNumber} gehört nicht in diese GuV-Sektion (kein Ertrag/Aufwand mit Saldo ≠ 0 in der Periode).`,
    })
  }

  return criteria
}

/**
 * Vergleicht Nutzer-GuV mit `buildIncomeStatement` (centgenau).
 * Nur Konten mit Betrag ≠ 0; Extra-Zeilen = Fehler.
 */
export function evaluateIncomeStatement(
  entries: JournalEntry[],
  range: DateRange,
  draft: IncomeStatementDraft,
  accounts: Account[] = chartOfAccounts,
): AbschlussEvaluationResult {
  const truth = buildIncomeStatement(entries, range, accounts)
  const map = getAccountMap(accounts)
  const criteria: AbschlussEvaluationResult['criteria'] = [
    ...compareRows(
      'Erträge',
      'guv_revenue',
      truth.revenueRows,
      draft.revenueRows,
      map,
    ),
    ...compareRows(
      'Aufwendungen',
      'guv_expense',
      truth.expenseRows,
      draft.expenseRows,
      map,
    ),
  ]

  const revenueOk = draft.totalRevenueCents === truth.totalRevenueCents
  criteria.push({
    id: 'guv_total_revenue',
    label: 'Summe Erträge',
    ok: revenueOk,
    points: revenueOk ? 1 : 0,
    maxPoints: 1,
    feedback: revenueOk
      ? `Summe Erträge ${formatCents(truth.totalRevenueCents)} ist korrekt.`
      : `Summe Erträge weicht ab (eingetragen ${formatCents(draft.totalRevenueCents)}, erwartet ${formatCents(truth.totalRevenueCents)}).`,
  })

  const expenseOk = draft.totalExpenseCents === truth.totalExpenseCents
  criteria.push({
    id: 'guv_total_expense',
    label: 'Summe Aufwendungen',
    ok: expenseOk,
    points: expenseOk ? 1 : 0,
    maxPoints: 1,
    feedback: expenseOk
      ? `Summe Aufwendungen ${formatCents(truth.totalExpenseCents)} ist korrekt.`
      : `Summe Aufwendungen weicht ab (eingetragen ${formatCents(draft.totalExpenseCents)}, erwartet ${formatCents(truth.totalExpenseCents)}).`,
  })

  const resultOk = draft.resultCents === truth.resultCents
  criteria.push({
    id: 'guv_result',
    label: 'Periodenergebnis',
    ok: resultOk,
    points: resultOk ? 1 : 0,
    maxPoints: 1,
    feedback: resultOk
      ? `Ergebnis ${formatCents(truth.resultCents)} (= Erträge − Aufwendungen) ist korrekt.`
      : `Ergebnis weicht ab (eingetragen ${formatCents(draft.resultCents)}, erwartet ${formatCents(truth.resultCents)}).`,
  })

  const score = criteria.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = criteria.reduce((sum, item) => sum + item.maxPoints, 0)
  const fullyCorrect =
    maxPoints > 0 && score === maxPoints && criteria.every((item) => item.ok)

  let summary: string
  if (fullyCorrect) {
    summary =
      'GuV stimmt mit dem Journal in der Periode überein — Ergebnis = Erträge − Aufwendungen.'
  } else if (score === 0) {
    summary =
      'Noch keine Treffer. Nur Ertrags- und Aufwandskonten der Periode; Bestandskonten gehören in die Bilanz.'
  } else {
    summary = `Teilweise richtig (${score}/${maxPoints}). Siehe Hinweise zu Zeilen und Summen.`
  }

  return { score, maxPoints, fullyCorrect, criteria, summary }
}

/** Musterlösung als Draft aus dem Report-Builder. */
export function incomeStatementSolutionDraft(
  entries: JournalEntry[],
  range: DateRange,
  accounts: Account[] = chartOfAccounts,
): IncomeStatementDraft {
  const truth = buildIncomeStatement(entries, range, accounts)
  return {
    revenueRows: truth.revenueRows.map((row) => ({
      accountNumber: row.accountNumber,
      amountCents: row.amountCents,
    })),
    expenseRows: truth.expenseRows.map((row) => ({
      accountNumber: row.accountNumber,
      amountCents: row.amountCents,
    })),
    totalRevenueCents: truth.totalRevenueCents,
    totalExpenseCents: truth.totalExpenseCents,
    resultCents: truth.resultCents,
  }
}
