import type { JournalEntryDraft } from '../types/accounting'
import type { Supplier, VendorInvoice } from '../types/purchase'
import { getAccountMap } from '../data/chart-of-accounts'
import { calculateInvoiceTotals, validateInvoiceLine } from '../sales/invoiceMath'
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

export type BookVendorResult =
  | { ok: true; drafts: JournalEntryDraft[] }
  | { ok: false; message: string }

/**
 * Bucht Eingangsrechnung: Aufwand (+ Vorsteuer) an Verbindlichkeiten.
 * Gruppiert nach Aufwandskonto und USt-Satz.
 */
export function buildVendorInvoiceBookingDrafts(
  invoice: VendorInvoice,
  supplier: Supplier | undefined,
  options?: { vatEnabled?: boolean },
): BookVendorResult {
  const vatEnabled = options?.vatEnabled !== false
  if (!vatEnabled) {
    invoice = {
      ...invoice,
      lines: invoice.lines.map((line) => ({ ...line, vatRate: 0 as const })),
    }
  }
  if (invoice.journalEntryIds.length > 0) {
    return {
      ok: false,
      message: 'Diese Eingangsrechnung wurde bereits gebucht.',
    }
  }
  if (!supplier) {
    return { ok: false, message: 'Lieferant zur Rechnung wurde nicht gefunden.' }
  }
  if (invoice.lines.length === 0) {
    return { ok: false, message: 'Die Rechnung enthält keine Positionen.' }
  }

  for (const line of toInvoiceLines(invoice)) {
    const error = validateInvoiceLine(line)
    if (error) return { ok: false, message: error }
  }

  const accountMap = getAccountMap()
  for (const line of invoice.lines) {
    const account = accountMap.get(line.expenseAccount)
    if (!account || account.type !== 'aufwand') {
      return {
        ok: false,
        message: `Aufwandskonto ${line.expenseAccount} ist ungültig oder kein Aufwandskonto.`,
      }
    }
  }

  const totals = calculateInvoiceTotals(toInvoiceLines(invoice))
  if (totals.grossCents <= 0) {
    return { ok: false, message: 'Der Rechnungsbetrag muss größer als 0 sein.' }
  }

  // Gruppe: expenseAccount + vatRate
  const groups = new Map<string, { expenseAccount: string; vatRate: 0 | 7 | 19; netCents: number }>()
  for (const line of invoice.lines) {
    const key = `${line.expenseAccount}:${line.vatRate}`
    const net = Math.round(line.quantity * line.netUnitPriceCents)
    const current = groups.get(key) ?? {
      expenseAccount: line.expenseAccount,
      vatRate: line.vatRate,
      netCents: 0,
    }
    current.netCents += net
    groups.set(key, current)
  }

  const drafts: JournalEntryDraft[] = []
  for (const group of groups.values()) {
    drafts.push({
      date: invoice.issueDate,
      documentNumber: invoice.internalNumber,
      description: `Eingangsrechnung ${invoice.internalNumber} von ${supplier.companyName}`,
      debitAccount: group.expenseAccount,
      creditAccount: '1600',
      netAmountCents: group.netCents,
      vatRate: group.vatRate,
    })
  }

  return { ok: true, drafts }
}
