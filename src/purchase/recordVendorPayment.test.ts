import { describe, expect, it } from 'vitest'
import { chartOfAccounts } from '../data/chart-of-accounts'
import {
  createDemoPurchaseState,
  demoVendorInvoices,
} from '../data/purchase-demo'
import { validateJournalEntry } from '../accounting/validateEntry'
import { calculateInvoiceTotals } from '../sales/invoiceMath'
import {
  buildVendorPaymentDraft,
  deriveVendorInvoiceStatus,
  openVendorAmountCents,
} from './recordVendorPayment'

describe('Zahlungsausgang Eingangsrechnung', () => {
  it('Demo ER-2026-0088 ist nach Zahlung vollständig ausgeglichen (Cent-konsistent)', () => {
    const invoice = demoVendorInvoices[0]!
    const payments = createDemoPurchaseState().vendorPayments
    expect(openVendorAmountCents(invoice, payments)).toBe(0)
    expect(deriveVendorInvoiceStatus(invoice, payments)).toBe('bezahlt')
  })

  it('berechnet offenen Betrag und verhindert Überzahlung', () => {
    const invoice = demoVendorInvoices[1]!
    const gross = calculateInvoiceTotals(
      invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        netUnitPriceCents: line.netUnitPriceCents,
        vatRate: line.vatRate,
      })),
    ).grossCents
    expect(openVendorAmountCents(invoice, [])).toBe(gross)
    expect(deriveVendorInvoiceStatus(invoice, [])).toBe('offen')

    const over = buildVendorPaymentDraft(invoice, [], {
      date: '2026-10-12',
      amountCents: gross + 1,
      bankAccount: '1200',
    })
    expect(over.ok).toBe(false)

    const ok = buildVendorPaymentDraft(invoice, [], {
      date: '2026-10-12',
      amountCents: 1000,
      bankAccount: '1200',
    })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    const validated = validateJournalEntry(ok.draft, chartOfAccounts)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.entry.debitAccount).toBe('1600')
    expect(validated.entry.creditAccount).toBe('1200')
  })
})
