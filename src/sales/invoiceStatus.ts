import type {
  InvoicePayment,
  InvoiceStatus,
  SalesInvoice,
} from '../types/sales'
import { calculateInvoiceTotals } from './invoiceMath'

export function sumPaymentsForInvoice(
  invoiceId: string,
  payments: InvoicePayment[],
): number {
  return payments
    .filter((payment) => payment.invoiceId === invoiceId)
    .reduce((sum, payment) => sum + payment.amountCents, 0)
}

export function openAmountCents(
  invoice: SalesInvoice,
  payments: InvoicePayment[],
): number {
  if (invoice.journalEntryIds.length === 0) {
    return 0
  }
  const { grossCents } = calculateInvoiceTotals(invoice.lines)
  return Math.max(0, grossCents - sumPaymentsForInvoice(invoice.id, payments))
}

export function deriveInvoiceStatus(
  invoice: SalesInvoice,
  payments: InvoicePayment[],
): InvoiceStatus {
  if (invoice.journalEntryIds.length === 0) {
    return 'entwurf'
  }
  const { grossCents } = calculateInvoiceTotals(invoice.lines)
  const paid = sumPaymentsForInvoice(invoice.id, payments)
  if (paid <= 0) return 'offen'
  if (paid >= grossCents) return 'bezahlt'
  return 'teilweise_bezahlt'
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  entwurf: 'Entwurf',
  offen: 'Offen',
  teilweise_bezahlt: 'Teilweise bezahlt',
  bezahlt: 'Bezahlt',
}
