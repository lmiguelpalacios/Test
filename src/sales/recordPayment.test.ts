import { describe, expect, it } from 'vitest'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { validateJournalEntry } from '../accounting/validateEntry'
import { calculateInvoiceTotals } from './invoiceMath'
import { deriveInvoiceStatus, openAmountCents } from './invoiceStatus'
import { buildPaymentBookingDraft } from './recordPayment'
import type { InvoicePayment, SalesInvoice } from '../types/sales'

const invoice: SalesInvoice = {
  id: 'inv-pay',
  number: 'RE-2026-0201',
  issueDate: '2026-10-10',
  dueDate: '2026-10-24',
  customerId: 'cust-001',
  lines: [
    {
      id: 'l1',
      description: 'Ware',
      quantity: 1,
      netUnitPriceCents: 10000,
      vatRate: 19,
    },
  ],
  journalEntryIds: ['je-1'],
  bookedAt: '2026-10-10T11:00:00',
  createdAt: '2026-10-10T10:00:00',
  updatedAt: '2026-10-10T11:00:00',
}

describe('Zahlungseingänge', () => {
  it('berechnet offenen Betrag und Status bei Teil-/Vollzahlung', () => {
    const gross = calculateInvoiceTotals(invoice.lines).grossCents
    expect(openAmountCents(invoice, [])).toBe(gross)
    expect(deriveInvoiceStatus(invoice, [])).toBe('offen')

    const partial: InvoicePayment[] = [
      {
        id: 'p1',
        invoiceId: invoice.id,
        date: '2026-10-11',
        amountCents: 5000,
        bankAccount: '280',
        journalEntryId: 'je-p1',
        createdAt: '2026-10-11T09:00:00',
      },
    ]
    expect(openAmountCents(invoice, partial)).toBe(gross - 5000)
    expect(deriveInvoiceStatus(invoice, partial)).toBe('teilweise_bezahlt')

    const full: InvoicePayment[] = [
      {
        ...partial[0]!,
        amountCents: gross,
      },
    ]
    expect(openAmountCents(invoice, full)).toBe(0)
    expect(deriveInvoiceStatus(invoice, full)).toBe('bezahlt')
  })

  it('erzeugt Bank/Forderung-Buchung und verhindert Überzahlung', () => {
    const ok = buildPaymentBookingDraft(invoice, [], {
      date: '2026-10-12',
      amountCents: 5000,
      bankAccount: '280',
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    const validated = validateJournalEntry(ok.draft, chartOfAccounts)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.entry.debitAccount).toBe('280')
    expect(validated.entry.creditAccount).toBe('240')

    const gross = calculateInvoiceTotals(invoice.lines).grossCents
    const over = buildPaymentBookingDraft(invoice, [], {
      date: '2026-10-12',
      amountCents: gross + 1,
      bankAccount: '280',
    })
    expect(over.ok).toBe(false)
  })

  it('lehnt Zahlung auf Entwürfe ab', () => {
    const draft = { ...invoice, journalEntryIds: [] }
    const result = buildPaymentBookingDraft(draft, [], {
      date: '2026-10-12',
      amountCents: 1000,
      bankAccount: '280',
    })
    expect(result.ok).toBe(false)
  })
})
