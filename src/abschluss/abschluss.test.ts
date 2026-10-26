import { describe, expect, it } from 'vitest'
import { initialJournalEntries } from '../data/journal-entries'
import { buildBalanceSheet } from '../reports/balanceSheet'
import { buildIncomeStatement } from '../reports/incomeStatement'
import {
  balanceSheetSolutionDraft,
  evaluateBalanceSheet,
} from './evaluateBalanceSheet'
import {
  evaluateIncomeStatement,
  incomeStatementSolutionDraft,
} from './evaluateIncomeStatement'
import { evaluateTAccounts } from './evaluateTAccounts'
import { expectedTAccountsAsDraft } from './expectedBalances'

const AS_OF = '2026-10-08'
const OCTOBER = { from: '2026-10-01', to: '2026-10-31' }

describe('Abschluss-Evaluatoren', () => {
  it('T-Konten: Musterlösung aus Journal ist vollständig richtig', () => {
    const draft = expectedTAccountsAsDraft(initialJournalEntries, AS_OF)
    expect(draft.length).toBeGreaterThan(0)
    const result = evaluateTAccounts(initialJournalEntries, AS_OF, draft)
    expect(result.fullyCorrect).toBe(true)
    expect(result.score).toBe(result.maxPoints)
    expect(result.criteria.every((c) => c.ok)).toBe(true)
  })

  it('T-Konten: fehlendes Konto und Extra-Konto erzeugen Fehler', () => {
    const full = expectedTAccountsAsDraft(initialJournalEntries, AS_OF)
    const draft = full
      .filter((row) => row.accountNumber !== '280')
      .concat([
        { accountNumber: '282', balanceCents: 99, side: 'soll' },
      ])
    const result = evaluateTAccounts(initialJournalEntries, AS_OF, draft)
    expect(result.fullyCorrect).toBe(false)
    expect(
      result.criteria.some((c) => c.id === 't_account:280' && !c.ok),
    ).toBe(true)
    expect(
      result.criteria.some((c) => c.id === 't_account_extra:282' && !c.ok),
    ).toBe(true)
  })

  it('T-Konten: falsche Seite bei korrektem Betrag', () => {
    const draft = expectedTAccountsAsDraft(initialJournalEntries, AS_OF).map(
      (row) =>
        row.accountNumber === '240'
          ? { ...row, side: 'haben' as const }
          : row,
    )
    const result = evaluateTAccounts(initialJournalEntries, AS_OF, draft)
    const row = result.criteria.find((c) => c.id === 't_account:240')
    expect(row?.ok).toBe(false)
    expect(row?.feedback).toMatch(/Seite/)
  })

  it('Bilanz: Musterlösung aus buildBalanceSheet ist vollständig richtig', () => {
    const draft = balanceSheetSolutionDraft(initialJournalEntries, AS_OF)
    const truth = buildBalanceSheet(initialJournalEntries, AS_OF)
    expect(draft.totalAssetsCents).toBe(truth.totalAssetsCents)
    const result = evaluateBalanceSheet(initialJournalEntries, AS_OF, draft)
    expect(result.fullyCorrect).toBe(true)
    expect(truth.balanced).toBe(true)
  })

  it('Bilanz: Extra-Aktivkonto und falsches Periodenergebnis', () => {
    const draft = balanceSheetSolutionDraft(initialJournalEntries, AS_OF)
    draft.assets.push({ accountNumber: '282', amountCents: 1 })
    draft.periodResultCents = 0
    const result = evaluateBalanceSheet(initialJournalEntries, AS_OF, draft)
    expect(result.fullyCorrect).toBe(false)
    expect(
      result.criteria.some((c) => c.id === 'bilanz_asset_extra:282' && !c.ok),
    ).toBe(true)
    expect(
      result.criteria.some((c) => c.id === 'bilanz_period_result' && !c.ok),
    ).toBe(true)
  })

  it('GuV: Musterlösung aus buildIncomeStatement ist vollständig richtig', () => {
    const draft = incomeStatementSolutionDraft(initialJournalEntries, OCTOBER)
    const truth = buildIncomeStatement(initialJournalEntries, OCTOBER)
    expect(draft.resultCents).toBe(truth.resultCents)
    const result = evaluateIncomeStatement(
      initialJournalEntries,
      OCTOBER,
      draft,
    )
    expect(result.fullyCorrect).toBe(true)
  })

  it('GuV: fehlende Ertragszeile und Extra-Aufwand', () => {
    const draft = incomeStatementSolutionDraft(initialJournalEntries, OCTOBER)
    draft.revenueRows = draft.revenueRows.filter(
      (row) => row.accountNumber !== '501',
    )
    draft.expenseRows.push({ accountNumber: '613', amountCents: 50 })
    const result = evaluateIncomeStatement(
      initialJournalEntries,
      OCTOBER,
      draft,
    )
    expect(result.fullyCorrect).toBe(false)
    expect(
      result.criteria.some((c) => c.id === 'guv_revenue:501' && !c.ok),
    ).toBe(true)
    expect(
      result.criteria.some((c) => c.id === 'guv_expense_extra:613' && !c.ok),
    ).toBe(true)
  })
})
