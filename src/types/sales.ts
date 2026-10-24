import type { VatRate } from './accounting'

export interface Customer {
  id: string
  number: string
  companyName: string
  contactName?: string
  billingAddress: string
  email?: string
}

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  /** Netto-Verkaufspreis */
  netUnitPriceCents: number
  /** Netto-Einkaufspreis */
  netPurchasePriceCents: number
  vatRate: VatRate
  /** Ob Bestandsbewegungen geführt werden (Dienstleistungen: false). */
  tracksStock: boolean
  minStockQuantity?: number
}

export type InvoiceStatus = 'entwurf' | 'offen' | 'teilweise_bezahlt' | 'bezahlt'

export interface InvoiceLine {
  id: string
  productId?: string
  description: string
  /** Menge > 0 */
  quantity: number
  netUnitPriceCents: number
  vatRate: VatRate
}

export interface SalesInvoice {
  id: string
  number: string
  issueDate: string
  dueDate: string
  customerId: string
  lines: InvoiceLine[]
  /** Leer = Entwurf (noch nicht gebucht). */
  journalEntryIds: string[]
  bookedAt?: string
  createdAt: string
  updatedAt: string
}

export interface InvoicePayment {
  id: string
  invoiceId: string
  date: string
  amountCents: number
  bankAccount: '280' | '282'
  reference?: string
  journalEntryId: string
  createdAt: string
}

export interface SalesState {
  customers: Customer[]
  products: Product[]
  invoices: SalesInvoice[]
  payments: InvoicePayment[]
  nextInvoiceSequence: number
}

export interface InvoiceTotals {
  netCents: number
  taxCents: number
  grossCents: number
}
