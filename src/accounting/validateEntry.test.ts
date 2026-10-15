import { describe, expect, it } from 'vitest'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { initialJournalEntries } from '../data/journal-entries'
import { sumLines, validateJournalEntry } from './validateEntry'
import { isBalanced } from './money'

describe('Buchungsvalidierung / Soll-Haben-Ausgleich', () => {
  it('erzeugt ausgeglichene Aufwandbuchung mit Vorsteuer', () => {
    const result = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'ER-TEST-1',
        description: 'Wareneinkauf Test',
        debitAccount: '3400',
        creditAccount: '1600',
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
    expect(result.entry.lines.some((line) => line.accountNumber === '1576')).toBe(
      true,
    )
    expect(result.entry.explanation.length).toBeGreaterThan(20)
  })

  it('erzeugt ausgeglichene Erlösbuchung mit Umsatzsteuer', () => {
    const result = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'RE-TEST-1',
        description: 'Warenverkauf Test',
        debitAccount: '1400',
        creditAccount: '8400',
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
    expect(result.entry.lines.some((line) => line.accountNumber === '1776')).toBe(
      true,
    )
  })

  it('lehnt USt>0 ohne Aufwand-/Erlöskonstellation ab (kein stilles Netto-ohne-Steuer)', () => {
    const result = validateJournalEntry(
      {
        date: '2026-10-09',
        documentNumber: 'XX-1',
        description: 'Falsche Konten mit USt',
        debitAccount: '1400',
        creditAccount: '1600',
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
        debitAccount: '3400',
        creditAccount: '3400',
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
