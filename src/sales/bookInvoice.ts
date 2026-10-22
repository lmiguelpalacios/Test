import type { JournalEntryDraft } from '../types/accounting'
import type { Customer, SalesInvoice } from '../types/sales'
import {
  calculateInvoiceTotals,
  groupLinesByVatRate,
  revenueAccountForVat,
  validateInvoiceLine,
} from './invoiceMath'

export type BookInvoiceResult =
  | { ok: true; drafts: JournalEntryDraft[] }
  | { ok: false; message: string }

/** Erzeugt Journal-Entwürfe für eine Ausgangsrechnung (noch nicht persistiert). */
export function buildInvoiceBookingDrafts(
  invoice: SalesInvoice,
  customer: Customer | undefined,
  options?: { vatEnabled?: boolean },
): BookInvoiceResult {
  const vatEnabled = options?.vatEnabled !== false
  const lines = vatEnabled
    ? invoice.lines
    : invoice.lines.map((line) => ({ ...line, vatRate: 0 as const }))
  invoice = { ...invoice, lines }
  if (invoice.journalEntryIds.length > 0) {
    return {
      ok: false,
      message: 'Diese Rechnung wurde bereits gebucht und darf nicht erneut gebucht werden.',
    }
  }
  if (!customer) {
    return { ok: false, message: 'Kunde zur Rechnung wurde nicht gefunden.' }
  }
  if (invoice.lines.length === 0) {
    return { ok: false, message: 'Die Rechnung enthält keine Positionen.' }
  }
  for (const line of invoice.lines) {
    const error = validateInvoiceLine(line)
    if (error) return { ok: false, message: error }
  }

  const totals = calculateInvoiceTotals(invoice.lines)
  if (totals.grossCents <= 0) {
    return { ok: false, message: 'Der Rechnungsbetrag muss größer als 0 sein.' }
  }

  const groups = groupLinesByVatRate(invoice.lines)
  const drafts: JournalEntryDraft[] = []

  for (const [vatRate, group] of groups) {
    drafts.push({
      date: invoice.issueDate,
      documentNumber: invoice.number,
      description: `Ausgangsrechnung ${invoice.number} an ${customer.companyName}`,
      debitAccount: '1400',
      creditAccount: revenueAccountForVat(vatRate),
      netAmountCents: group.netCents,
      vatRate,
    })
  }

  return { ok: true, drafts }
}
