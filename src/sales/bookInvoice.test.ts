import { describe, expect, it } from 'vitest'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { demoCustomers } from '../data/sales-demo'
import { validateJournalEntry } from '../accounting/validateEntry'
import { sumLines } from '../accounting/validateEntry'
import { isBalanced } from '../accounting/money'
import { buildInvoiceBookingDrafts } from './bookInvoice'
import { calculateInvoiceTotals } from './invoiceMath'
import type { SalesInvoice } from '../types/sales'

const draftInvoice: SalesInvoice = {
  id: 'inv-x',
  number: 'RE-2026-0200',
  issueDate: '2026-10-10',
  dueDate: '2026-10-24',
  customerId: 'cust-001',
  lines: [
    {
      id: 'l1',
      description: 'Set',
      quantity: 2,
      netUnitPriceCents: 10000,
      vatRate: 19,
    },
  ],
  journalEntryIds: [],
  createdAt: '2026-10-10T10:00:00',
  updatedAt: '2026-10-10T10:00:00',
}

describe('Rechnungsbuchung', () => {
  it('erzeugt ausgeglichene Journalentwürfe (1400/Erlöse/USt)', () => {
    const result = buildInvoiceBookingDrafts(draftInvoice, demoCustomers[0])
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.drafts).toHaveLength(1)
    const validated = validateJournalEntry(result.drafts[0]!, chartOfAccounts)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const { debitCents, creditCents } = sumLines(validated.entry.lines)
    expect(isBalanced(debitCents, creditCents)).toBe(true)
    expect(validated.entry.lines.some((line) => line.accountNumber === '1400')).toBe(
      true,
    )
    expect(validated.entry.lines.some((line) => line.accountNumber === '8400')).toBe(
      true,
    )
    expect(validated.entry.lines.some((line) => line.accountNumber === '1776')).toBe(
      true,
    )
  })

  it('bucht bei ausgeschalteter Umsatzsteuer netto ohne 1776', () => {
    const result = buildInvoiceBookingDrafts(draftInvoice, demoCustomers[0], {
      vatEnabled: false,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.drafts).toHaveLength(1)
    expect(result.drafts[0]?.vatRate).toBe(0)
    expect(result.drafts[0]?.creditAccount).toBe('8000')
    const validated = validateJournalEntry(result.drafts[0]!, chartOfAccounts, {
      vatEnabled: false,
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.entry.lines.some((line) => line.accountNumber === '1776')).toBe(false)
    expect(validated.entry.grossAmountCents).toBe(validated.entry.netAmountCents)
  })

  it('verhindert Doppelbuchung bereits gebuchter Rechnungen', () => {
    const booked = { ...draftInvoice, journalEntryIds: ['je-abc'] }
    const result = buildInvoiceBookingDrafts(booked, demoCustomers[0])
    expect(result.ok).toBe(false)
  })

  it('erzeugt je USt-Satz einen Entwurf', () => {
    const mixed: SalesInvoice = {
      ...draftInvoice,
      lines: [
        {
          id: 'l1',
          description: 'A',
          quantity: 1,
          netUnitPriceCents: 10000,
          vatRate: 19,
        },
        {
          id: 'l2',
          description: 'B',
          quantity: 1,
          netUnitPriceCents: 10000,
          vatRate: 7,
        },
      ],
    }
    const result = buildInvoiceBookingDrafts(mixed, demoCustomers[0])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.drafts).toHaveLength(2)
  })

  it('Journal-Brutto entspricht Rechnungsbrutto bei Bruchmengen gleichem USt-Satz', () => {
    const invoice: SalesInvoice = {
      ...draftInvoice,
      lines: [
        {
          id: 'l1',
          description: 'A',
          quantity: 1.1,
          netUnitPriceCents: 1999,
          vatRate: 19,
        },
        {
          id: 'l2',
          description: 'B',
          quantity: 2.3,
          netUnitPriceCents: 1999,
          vatRate: 19,
        },
        {
          id: 'l3',
          description: 'C',
          quantity: 0.5,
          netUnitPriceCents: 1999,
          vatRate: 19,
        },
      ],
    }
    const built = buildInvoiceBookingDrafts(invoice, demoCustomers[0])
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const validated = validateJournalEntry(built.drafts[0]!, chartOfAccounts)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.entry.grossAmountCents).toBe(
      calculateInvoiceTotals(invoice.lines).grossCents,
    )
  })
})
