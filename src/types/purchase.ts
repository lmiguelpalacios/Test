import type { VatRate } from './accounting'
import type { InvoiceTotals } from './sales'

export interface Supplier {
  id: string
  number: string
  companyName: string
  contactName?: string
  billingAddress: string
  email?: string
}

export type PurchaseOrderStatus =
  | 'entwurf'
  | 'bestellt'
  | 'teilweise_geliefert'
  | 'vollstaendig_geliefert'

export interface PurchaseOrderLine {
  id: string
  productId?: string
  description: string
  quantity: number
  netUnitPriceCents: number
  vatRate: VatRate
  /** Aufwandskonto für spätere Eingangsrechnung, z. B. 608 */
  expenseAccount: string
}

export interface PurchaseOrder {
  id: string
  number: string
  supplierId: string
  orderDate: string
  lines: PurchaseOrderLine[]
  /** Leer = Entwurf; gesetzt = bestellt (ohne Buchung). */
  confirmedAt?: string
  createdAt: string
  updatedAt: string
}

export interface GoodsReceiptLine {
  orderLineId: string
  quantity: number
}

export interface GoodsReceipt {
  id: string
  number: string
  orderId: string
  receiptDate: string
  lines: GoodsReceiptLine[]
  createdAt: string
}

export type VendorInvoiceStatus = 'entwurf' | 'offen' | 'teilweise_bezahlt' | 'bezahlt'

export interface VendorInvoiceLine {
  id: string
  productId?: string
  description: string
  quantity: number
  netUnitPriceCents: number
  vatRate: VatRate
  expenseAccount: string
}

export interface VendorInvoice {
  id: string
  /** Externe Lieferanten-Rechnungsnummer */
  externalNumber: string
  /** Interner Beleg, z. B. ER-2026-0088 */
  internalNumber: string
  supplierId: string
  issueDate: string
  dueDate: string
  lines: VendorInvoiceLine[]
  orderId?: string
  journalEntryIds: string[]
  bookedAt?: string
  createdAt: string
  updatedAt: string
}

export interface VendorPayment {
  id: string
  invoiceId: string
  date: string
  amountCents: number
  bankAccount: '280' | '282'
  reference?: string
  journalEntryId: string
  createdAt: string
}

export type StockMovementSource =
  | 'anfangsbestand'
  | 'wareneingang'
  | 'verkauf'
  | 'anpassung'

export interface StockMovement {
  id: string
  productId: string
  date: string
  /** Positiv = Zugang, negativ = Abgang */
  quantityDelta: number
  sourceType: StockMovementSource
  sourceId: string
  note?: string
  createdAt: string
}

export interface PurchaseState {
  suppliers: Supplier[]
  orders: PurchaseOrder[]
  receipts: GoodsReceipt[]
  vendorInvoices: VendorInvoice[]
  vendorPayments: VendorPayment[]
  stockMovements: StockMovement[]
  nextOrderSequence: number
  nextReceiptSequence: number
  nextVendorInvoiceSequence: number
}

export type { InvoiceTotals }
