import type { JournalEntryDraft } from '../types/accounting'
import type { VendorInvoice, VendorPayment } from '../types/purchase'
import { calculateInvoiceTotals } from '../sales/invoiceMath'
import type { InvoiceLine } from '../types/sales'

function toInvoiceLines(invoice: VendorInvoice): InvoiceLine[] {
  return invoice.lines.map((line) => ({
    id: line.id,
    productId: line.productId,
    description: line.description,
    quantity: line.quantity,
    netUnitPriceCents: line.netUnitPriceCents,
    vatRate: line.vatRate,
  }))
}

export function sumVendorPayments(
  invoiceId: string,
  payments: VendorPayment[],
): number {
  return payments
    .filter((payment) => payment.invoiceId === invoiceId)
    .reduce((sum, payment) => sum + payment.amountCents, 0)
}

export function openVendorAmountCents(
  invoice: VendorInvoice,
  payments: VendorPayment[],
): number {
  if (invoice.journalEntryIds.length === 0) return 0
  const { grossCents } = calculateInvoiceTotals(toInvoiceLines(invoice))
  return Math.max(0, grossCents - sumVendorPayments(invoice.id, payments))
}

export type VendorPaymentDraftResult =
  | { ok: true; draft: JournalEntryDraft; amountCents: number }
  | { ok: false; message: string }

export function buildVendorPaymentDraft(
  invoice: VendorInvoice,
  payments: VendorPayment[],
  input: {
    date: string
    amountCents: number
    bankAccount: '1200' | '1000'
    reference?: string
  },
): VendorPaymentDraftResult {
  if (invoice.journalEntryIds.length === 0) {
    return {
      ok: false,
      message: 'Zahlungen sind nur für gebuchte Eingangsrechnungen möglich.',
    }
  }
  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    return { ok: false, message: 'Bitte ein gültiges Zahlungsdatum angeben.' }
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, message: 'Der Zahlungsbetrag muss größer als 0,00 € sein.' }
  }

  const open = openVendorAmountCents(invoice, payments)
  if (open <= 0) {
    return { ok: false, message: 'Die Eingangsrechnung ist bereits vollständig bezahlt.' }
  }
  if (input.amountCents > open) {
    return {
      ok: false,
      message: `Zahlung übersteigt den offenen Betrag (${(open / 100).toFixed(2)} €).`,
    }
  }

  return {
    ok: true,
    amountCents: input.amountCents,
    draft: {
      date: input.date,
      documentNumber: `ZA-${invoice.internalNumber}`,
      description:
        input.reference?.trim() ||
        `Zahlungsausgang zu ${invoice.internalNumber}`,
      debitAccount: '1600',
      creditAccount: input.bankAccount,
      netAmountCents: input.amountCents,
      vatRate: 0,
    },
  }
}

export function deriveVendorInvoiceStatus(
  invoice: VendorInvoice,
  payments: VendorPayment[],
): 'entwurf' | 'offen' | 'teilweise_bezahlt' | 'bezahlt' {
  if (invoice.journalEntryIds.length === 0) return 'entwurf'
  const { grossCents } = calculateInvoiceTotals(toInvoiceLines(invoice))
  const paid = sumVendorPayments(invoice.id, payments)
  if (paid <= 0) return 'offen'
  if (paid >= grossCents) return 'bezahlt'
  return 'teilweise_bezahlt'
}
