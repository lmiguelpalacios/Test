import type { PurchaseState } from '../types/purchase'
import type { SalesState } from '../types/sales'
import { calculateInvoiceTotals } from '../sales/invoiceMath'
import {
  deriveInvoiceStatus,
  openAmountCents,
  sumPaymentsForInvoice,
} from '../sales/invoiceStatus'
import {
  deriveVendorInvoiceStatus,
  openVendorAmountCents,
  sumVendorPayments,
} from '../purchase/recordVendorPayment'

export type OpenItemKind = 'forderung' | 'verbindlichkeit'

export interface OpenItemRow {
  kind: OpenItemKind
  documentId: string
  documentNumber: string
  partnerName: string
  issueDate: string
  dueDate: string
  grossCents: number
  paidCents: number
  openCents: number
  status: 'offen' | 'teilweise_bezahlt' | 'bezahlt'
  detailPath: string
}

export interface OpenItemsReport {
  receivables: OpenItemRow[]
  payables: OpenItemRow[]
  totalReceivableOpenCents: number
  totalPayableOpenCents: number
  notices: string[]
}

/**
 * Offene Posten aus Verkaufs-/Einkaufsbelegen (nicht aus Kontensalden 1400/1600).
 * Entwürfe ohne Journalbuchung werden ausgelassen.
 */
export function buildOpenItemsReport(
  sales: SalesState,
  purchase: PurchaseState,
): OpenItemsReport {
  const receivables: OpenItemRow[] = sales.invoices
    .filter((invoice) => invoice.journalEntryIds.length > 0)
    .map((invoice) => {
      const customer = sales.customers.find((item) => item.id === invoice.customerId)
      const totals = calculateInvoiceTotals(invoice.lines)
      const status = deriveInvoiceStatus(invoice, sales.payments)
      const paid = sumPaymentsForInvoice(invoice.id, sales.payments)
      const open = openAmountCents(invoice, sales.payments)
      return {
        kind: 'forderung' as const,
        documentId: invoice.id,
        documentNumber: invoice.number,
        partnerName: customer?.companyName ?? 'Unbekannter Kunde',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        grossCents: totals.grossCents,
        paidCents: paid,
        openCents: open,
        status: status === 'entwurf' ? 'offen' : status,
        detailPath: `/verkauf/rechnungen/${invoice.id}`,
      }
    })
    .filter((row) => row.openCents > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const payables: OpenItemRow[] = purchase.vendorInvoices
    .filter((invoice) => invoice.journalEntryIds.length > 0)
    .map((invoice) => {
      const supplier = purchase.suppliers.find(
        (item) => item.id === invoice.supplierId,
      )
      const totals = calculateInvoiceTotals(
        invoice.lines.map((line) => ({
          id: line.id,
          description: line.description,
          quantity: line.quantity,
          netUnitPriceCents: line.netUnitPriceCents,
          vatRate: line.vatRate,
        })),
      )
      const status = deriveVendorInvoiceStatus(invoice, purchase.vendorPayments)
      const paid = sumVendorPayments(invoice.id, purchase.vendorPayments)
      const open = openVendorAmountCents(invoice, purchase.vendorPayments)
      return {
        kind: 'verbindlichkeit' as const,
        documentId: invoice.id,
        documentNumber: invoice.internalNumber,
        partnerName: supplier?.companyName ?? 'Unbekannter Lieferant',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        grossCents: totals.grossCents,
        paidCents: paid,
        openCents: open,
        status: status === 'entwurf' ? 'offen' : status,
        detailPath: `/einkauf/rechnungen/${invoice.id}`,
      }
    })
    .filter((row) => row.openCents > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return {
    receivables,
    payables,
    totalReceivableOpenCents: receivables.reduce((sum, row) => sum + row.openCents, 0),
    totalPayableOpenCents: payables.reduce((sum, row) => sum + row.openCents, 0),
    notices: [
      'Offene Beträge aus Rechnungs- und Zahlungsbelegen (Verkauf/Einkauf) — nicht erneut aus Konto 1400/1600 abgeleitet.',
      'Nur gebuchte Belege; Entwürfe ohne Journalbuchung erscheinen nicht.',
    ],
  }
}
