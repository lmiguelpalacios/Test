import { describe, expect, it } from 'vitest'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { initialJournalEntries } from '../data/journal-entries'
import { isTaxLineAccount } from './vat'
import { sumLines, validateJournalEntry } from './validateEntry'
import { isBalanced } from './money'

describe('Buchungsvalidierung / Soll-Haben-Ausgleich', () => {
  it('erzeugt ausgeglichene Aufwandbuchung mit Vorsteuer', () => {
    const result = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'ER-TEST-1',
        description: 'Wareneinkauf Test',
        debitAccount: '608',
        creditAccount: '44',
        netAmountCents: 10000,
        vatRate: 19,
      },
      chartOfAccounts,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { debitCents, creditCents } = sumLines(result.entry.lines)
    expect(isBalanced(debitCents, creditCents)).toBe(true)
    expect(debitCents).toBe(11900)
    expect(result.entry.taxAmountCents).toBe(1900)
    expect(result.entry.grossAmountCents).toBe(11900)
    expect(result.entry.lines.some((line) => line.accountNumber === '260')).toBe(
      true,
    )
    expect(result.entry.explanation.length).toBeGreaterThan(20)
  })

  it('bucht 0 % auf 608 ohne Steuerzeile und 7 % auf dieselbe Vorsteuer 260', () => {
    const zero = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'ER-ZERO',
        description: 'Wareneingang ohne Vorsteuer',
        debitAccount: '608',
        creditAccount: '44',
        netAmountCents: 5000,
        vatRate: 0,
      },
      chartOfAccounts,
    )
    expect(zero.ok).toBe(true)
    if (!zero.ok) return
    expect(zero.entry.lines).toEqual([
      { accountNumber: '608', debitCents: 5000, creditCents: 0 },
      { accountNumber: '44', debitCents: 0, creditCents: 5000 },
    ])
    expect(zero.entry.lines.some((line) => isTaxLineAccount(line.accountNumber))).toBe(false)

    const reduced = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'ER-7',
        description: 'Wareneingang 7 Prozent',
        debitAccount: '608',
        creditAccount: '44',
        netAmountCents: 5000,
        vatRate: 7,
      },
      chartOfAccounts,
    )
    expect(reduced.ok).toBe(true)
    if (!reduced.ok) return
    expect(reduced.entry.lines.some((line) => line.accountNumber === '260')).toBe(true)
    expect(reduced.entry.taxAmountCents).toBe(350)
  })

  it('erzeugt ausgeglichene Erlösbuchung mit Umsatzsteuer', () => {
    const result = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'RE-TEST-1',
        description: 'Warenverkauf Test',
        debitAccount: '240',
        creditAccount: '501',
        netAmountCents: 20000,
        vatRate: 19,
      },
      chartOfAccounts,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { debitCents, creditCents } = sumLines(result.entry.lines)
    expect(debitCents).toBe(creditCents)
    expect(creditCents).toBe(23800)
    expect(result.entry.lines.some((line) => line.accountNumber === '480')).toBe(
      true,
    )
  })

  it('buildLines erzeugt keine Steuerzeilen, wenn Umsatzsteuer aus ist', () => {
    const expense = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'ER-NOVAT',
        description: 'Wareneinkauf ohne USt',
        debitAccount: '608',
        creditAccount: '44',
        netAmountCents: 10000,
        vatRate: 19,
      },
      chartOfAccounts,
      { vatEnabled: false },
    )
    expect(expense.ok).toBe(true)
    if (!expense.ok) return
    expect(expense.entry.vatRate).toBe(0)
    expect(expense.entry.taxAmountCents).toBe(0)
    expect(expense.entry.grossAmountCents).toBe(10000)
    expect(expense.entry.lines.some((line) => isTaxLineAccount(line.accountNumber))).toBe(
      false,
    )
    const { debitCents, creditCents } = sumLines(expense.entry.lines)
    expect(debitCents).toBe(10000)
    expect(creditCents).toBe(10000)

    const revenue = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'RE-NOVAT',
        description: 'Warenverkauf ohne USt',
        debitAccount: '240',
        creditAccount: '501',
        netAmountCents: 20000,
        vatRate: 19,
      },
      chartOfAccounts,
      { vatEnabled: false },
    )
    expect(revenue.ok).toBe(true)
    if (!revenue.ok) return
    expect(revenue.entry.lines.some((line) => isTaxLineAccount(line.accountNumber))).toBe(
      false,
    )
    expect(revenue.entry.lines).toEqual([
      { accountNumber: '240', debitCents: 20000, creditCents: 0 },
      { accountNumber: '501', debitCents: 0, creditCents: 20000 },
    ])
  })

  it('lehnt USt>0 ohne Aufwand-/Erlöskonstellation ab (kein stilles Netto-ohne-Steuer)', () => {
    const result = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'XX-1',
        description: 'Falsche Konten mit USt',
        debitAccount: '240',
        creditAccount: '44',
        netAmountCents: 10000,
        vatRate: 19,
      },
      chartOfAccounts,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((issue) => issue.field === 'vatRate')).toBe(true)
  })

  it('lehnt ungültige Buchungen ab', () => {
    const result = validateJournalEntry(
      {
        date: '',
        documentNumber: '',
        description: 'x',
        debitAccount: '608',
        creditAccount: '608',
        netAmountCents: 0,
        vatRate: 19,
      },
      chartOfAccounts,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.length).toBeGreaterThan(1)
  })

  it('hält alle Demo-Buchungen ausgeglichen', () => {
    for (const entry of initialJournalEntries) {
      const { debitCents, creditCents } = sumLines(entry.lines)
      expect(isBalanced(debitCents, creditCents)).toBe(true)
    }
  })
})
