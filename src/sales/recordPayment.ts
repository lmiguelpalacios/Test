import type { JournalEntryDraft } from '../types/accounting'
import type { InvoicePayment, SalesInvoice } from '../types/sales'
import { calculateInvoiceTotals } from './invoiceMath'
import { openAmountCents } from './invoiceStatus'

export type PaymentDraftResult =
  | {
      ok: true
      draft: JournalEntryDraft
      amountCents: number
    }
  | { ok: false; message: string }

export function buildPaymentBookingDraft(
  invoice: SalesInvoice,
  payments: InvoicePayment[],
  input: {
    date: string
    amountCents: number
    bankAccount: '1200' | '1000'
    reference?: string
  },
): PaymentDraftResult {
  if (invoice.journalEntryIds.length === 0) {
    return {
      ok: false,
      message: 'Zahlungen sind nur für gebuchte Rechnungen möglich.',
    }
  }
  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    return { ok: false, message: 'Bitte ein gültiges Zahlungsdatum angeben.' }
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, message: 'Der Zahlungsbetrag muss größer als 0,00 € sein.' }
  }
  if (input.bankAccount !== '1200' && input.bankAccount !== '1000') {
    return { ok: false, message: 'Bitte ein gültiges Bank-/Kassenkonto wählen.' }
  }

  const open = openAmountCents(invoice, payments)
  if (open <= 0) {
    return { ok: false, message: 'Die Rechnung ist bereits vollständig bezahlt.' }
  }
  if (input.amountCents > open) {
    return {
      ok: false,
      message: `Zahlung übersteigt den offenen Betrag (${(open / 100).toFixed(2)} €).`,
    }
  }

  const { grossCents } = calculateInvoiceTotals(invoice.lines)
  if (input.amountCents > grossCents) {
    return { ok: false, message: 'Zahlung darf den Rechnungsbruttobetrag nicht übersteigen.' }
  }

  return {
    ok: true,
    amountCents: input.amountCents,
    draft: {
      date: input.date,
      documentNumber: `ZE-${invoice.number}`,
      description:
        input.reference?.trim() ||
        `Zahlungseingang zu ${invoice.number}`,
      debitAccount: input.bankAccount,
      creditAccount: '1400',
      netAmountCents: input.amountCents,
      vatRate: 0,
    },
  }
}
