import { describe, expect, it } from 'vitest'
import { initialJournalEntries } from '../data/journal-entries'
import { createDemoPurchaseState } from '../data/purchase-demo'
import { createDemoSalesState } from '../data/sales-demo'
import { isBalanced } from '../accounting/money'
import { buildAccountLedger } from './accountLedger'
import { buildBalanceSheet } from './balanceSheet'
import { buildIncomeStatement } from './incomeStatement'
import { buildOpenItemsReport } from './openItems'
import { buildTrialBalance } from './trialBalance'

const OCTOBER: { from: string; to: string } = {
  from: '2026-10-01',
  to: '2026-10-31',
}

describe('Berichte aus Journal / Belegen', () => {
  it('SuSa: Perioden-Soll = Perioden-Haben', () => {
    const report = buildTrialBalance(initialJournalEntries, OCTOBER)
    expect(report.rows.length).toBeGreaterThan(0)
    expect(report.balanced).toBe(true)
    expect(
      isBalanced(report.totalPeriodDebitCents, report.totalPeriodCreditCents),
    ).toBe(true)
    expect(report.notices.some((n) => n.includes('Eröffnungsbuchungen'))).toBe(
      true,
    )
  })

  it('Kontenblatt: laufender Saldo Bank 280 nachvollziehbar', () => {
    const ledger = buildAccountLedger(initialJournalEntries, '280', OCTOBER)
    expect(ledger.openingBalanceCents).toBe(0)
    expect(ledger.lines.length).toBeGreaterThan(0)
    // ZE +198000, Miete brutto −214200, ZA −326001
    expect(ledger.closingBalanceCents).toBe(1_980_00 - 2_142_00 - 3_260_01)
    const last = ledger.lines[ledger.lines.length - 1]!
    expect(last.runningBalanceCents).toBe(ledger.closingBalanceCents)
  })

  it('GuV: Ergebnis = Erlöse − Aufwendungen im Zeitraum', () => {
    const guv = buildIncomeStatement(initialJournalEntries, OCTOBER)
    expect(guv.totalRevenueCents).toBe(4_050_42 + 1_803_78 + 5_369_75)
    expect(guv.resultCents).toBe(guv.totalRevenueCents - guv.totalExpenseCents)
    expect(guv.expenseRows.some((row) => row.accountNumber === '608')).toBe(
      true,
    )
  })

  it('Bilanz: Aktiva = Passiva + Eigenkapital + Periodenergebnis', () => {
    const bilanz = buildBalanceSheet(initialJournalEntries, '2026-10-08')
    expect(bilanz.balanced).toBe(true)
    expect(bilanz.totalAssetsCents).toBe(bilanz.totalLiabilitiesAndEquityCents)
    expect(bilanz.assets.some((row) => row.accountNumber === '240')).toBe(true)
    expect(bilanz.liabilities.some((row) => row.accountNumber === '44')).toBe(
      true,
    )
    // Kein Fake-Ausgleich — Periodenergebnis ist GuV-Ergebnis
    const guv = buildIncomeStatement(initialJournalEntries, {
      from: '0000-01-01',
      to: '2026-10-08',
    })
    expect(bilanz.periodResultCents).toBe(guv.resultCents)
  })

  it('Offene Posten: Restbeträge aus Verkauf/Einkauf, keine Entwürfe', () => {
    const sales = createDemoSalesState()
    const purchase = createDemoPurchaseState()
    const report = buildOpenItemsReport(sales, purchase)

    expect(report.receivables.every((row) => row.openCents > 0)).toBe(true)
    expect(report.payables.every((row) => row.openCents > 0)).toBe(true)
    // RE-0151 teilweise, RE-0142 und RE-0158 offen; Draft nicht
    expect(
      report.receivables.some((row) => row.documentNumber === 'RE-2026-0151'),
    ).toBe(true)
    expect(
      report.receivables.some((row) => row.documentNumber === 'RE-2026-0159'),
    ).toBe(false)
    // ER-0088 bezahlt → nicht offen; ER-0094 offen
    expect(
      report.payables.some((row) => row.documentNumber === 'ER-2026-0088'),
    ).toBe(false)
    expect(
      report.payables.some((row) => row.documentNumber === 'ER-2026-0094'),
    ).toBe(true)
  })
})
