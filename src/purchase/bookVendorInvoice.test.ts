import { describe, expect, it } from 'vitest'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { demoSuppliers, demoVendorInvoices } from '../data/purchase-demo'
import { isBalanced } from '../accounting/money'
import { sumLines, validateJournalEntry } from '../accounting/validateEntry'
import { buildVendorInvoiceBookingDrafts } from './bookVendorInvoice'
import type { VendorInvoice } from '../types/purchase'

describe('Eingangsrechnungsbuchung', () => {
  it('erzeugt ausgeglichene Aufwand/VSt/Verbindlichkeiten-Buchungen', () => {
    const draft: VendorInvoice = {
      ...demoVendorInvoices[1]!,
      id: 'vinv-new',
      internalNumber: 'ER-2026-0200',
      journalEntryIds: [],
      bookedAt: undefined,
    }
    const result = buildVendorInvoiceBookingDrafts(draft, demoSuppliers[1])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const validated = validateJournalEntry(result.drafts[0]!, chartOfAccounts)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const { debitCents, creditCents } = sumLines(validated.entry.lines)
    expect(isBalanced(debitCents, creditCents)).toBe(true)
    expect(validated.entry.lines.some((line) => line.accountNumber === '44')).toBe(
      true,
    )
  })

  it('verhindert Doppelbuchung', () => {
    const result = buildVendorInvoiceBookingDrafts(
      demoVendorInvoices[0]!,
      demoSuppliers[0],
    )
    expect(result.ok).toBe(false)
  })

  it('lehnt Nicht-Aufwandskonten ab', () => {
    const draft: VendorInvoice = {
      ...demoVendorInvoices[1]!,
      id: 'vinv-bad',
      internalNumber: 'ER-2026-0201',
      journalEntryIds: [],
      bookedAt: undefined,
      lines: [
        {
          id: 'l1',
          description: 'Falsches Konto',
          quantity: 1,
          netUnitPriceCents: 1000,
          vatRate: 19,
          expenseAccount: '240',
        },
      ],
    }
    const result = buildVendorInvoiceBookingDrafts(draft, demoSuppliers[1])
    expect(result.ok).toBe(false)
  })
})
