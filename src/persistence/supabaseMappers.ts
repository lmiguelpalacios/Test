import type { JournalEntry, JournalLine, VatRate } from '../types/accounting'
import type { LearningState, TaskProgress } from '../types/learning'
import type {
  GoodsReceipt,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseState,
  StockMovement,
  Supplier,
  VendorInvoice,
  VendorInvoiceLine,
  VendorPayment,
} from '../types/purchase'
import type {
  Customer,
  InvoiceLine,
  InvoicePayment,
  Product,
  SalesInvoice,
  SalesState,
} from '../types/sales'

function asVat(value: number): VatRate {
  if (value === 0 || value === 7 || value === 19) return value
  return 0
}

export function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    number: String(row.number),
    companyName: String(row.company_name),
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    billingAddress: String(row.billing_address ?? ''),
    email: row.email ? String(row.email) : undefined,
  }
}

export function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    netUnitPriceCents: Number(row.net_unit_price_cents ?? 0),
    netPurchasePriceCents: Number(row.net_purchase_price_cents ?? 0),
    vatRate: asVat(Number(row.vat_rate ?? 0)),
    tracksStock: Boolean(row.tracks_stock),
    minStockQuantity:
      row.min_stock_quantity == null
        ? undefined
        : Number(row.min_stock_quantity),
  }
}

export function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    number: String(row.number),
    companyName: String(row.company_name),
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    billingAddress: String(row.billing_address ?? ''),
    email: row.email ? String(row.email) : undefined,
  }
}

export function mapJournalEntry(
  row: Record<string, unknown>,
  lines: JournalLine[],
): JournalEntry {
  return {
    id: String(row.id),
    date: String(row.entry_date),
    documentNumber: String(row.document_number),
    description: String(row.description),
    debitAccount: String(row.debit_account),
    creditAccount: String(row.credit_account),
    netAmountCents: Number(row.net_amount_cents),
    vatRate: asVat(Number(row.vat_rate)),
    taxAmountCents: Number(row.tax_amount_cents),
    grossAmountCents: Number(row.gross_amount_cents),
    lines,
    explanation: String(row.explanation ?? ''),
    createdAt: String(row.created_at),
  }
}

export function mapInvoiceLine(row: Record<string, unknown>): InvoiceLine {
  return {
    id: String(row.id),
    productId: row.product_id ? String(row.product_id) : undefined,
    description: String(row.description),
    quantity: Number(row.quantity),
    netUnitPriceCents: Number(row.net_unit_price_cents),
    vatRate: asVat(Number(row.vat_rate)),
  }
}

export function mapSalesInvoice(
  row: Record<string, unknown>,
  lines: InvoiceLine[],
  journalEntryIds: string[],
): SalesInvoice {
  return {
    id: String(row.id),
    number: String(row.number),
    issueDate: String(row.issue_date),
    dueDate: String(row.due_date),
    customerId: String(row.customer_id),
    lines,
    journalEntryIds,
    bookedAt: row.booked_at ? String(row.booked_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapSalesPayment(row: Record<string, unknown>): InvoicePayment {
  return {
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    date: String(row.payment_date),
    amountCents: Number(row.amount_cents),
    bankAccount: row.bank_account === '1000' ? '1000' : '1200',
    reference: row.reference ? String(row.reference) : undefined,
    journalEntryId: String(row.journal_entry_id ?? ''),
    createdAt: String(row.created_at),
  }
}

export function mapPurchaseOrderLine(row: Record<string, unknown>): PurchaseOrderLine {
  return {
    id: String(row.id),
    productId: row.product_id ? String(row.product_id) : undefined,
    description: String(row.description),
    quantity: Number(row.quantity),
    netUnitPriceCents: Number(row.net_unit_price_cents),
    vatRate: asVat(Number(row.vat_rate)),
    expenseAccount: String(row.expense_account),
  }
}

export function mapPurchaseOrder(
  row: Record<string, unknown>,
  lines: PurchaseOrderLine[],
): PurchaseOrder {
  return {
    id: String(row.id),
    number: String(row.number),
    supplierId: String(row.supplier_id),
    orderDate: String(row.order_date),
    lines,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapGoodsReceipt(
  row: Record<string, unknown>,
  lines: { orderLineId: string; quantity: number }[],
): GoodsReceipt {
  return {
    id: String(row.id),
    number: String(row.number),
    orderId: String(row.order_id),
    receiptDate: String(row.receipt_date),
    lines,
    createdAt: String(row.created_at),
  }
}

export function mapVendorInvoiceLine(row: Record<string, unknown>): VendorInvoiceLine {
  return {
    id: String(row.id),
    productId: row.product_id ? String(row.product_id) : undefined,
    description: String(row.description),
    quantity: Number(row.quantity),
    netUnitPriceCents: Number(row.net_unit_price_cents),
    vatRate: asVat(Number(row.vat_rate)),
    expenseAccount: String(row.expense_account),
  }
}

export function mapVendorInvoice(
  row: Record<string, unknown>,
  lines: VendorInvoiceLine[],
  journalEntryIds: string[],
): VendorInvoice {
  return {
    id: String(row.id),
    externalNumber: String(row.external_number),
    internalNumber: String(row.internal_number),
    supplierId: String(row.supplier_id),
    issueDate: String(row.issue_date),
    dueDate: String(row.due_date),
    lines,
    orderId: row.order_id ? String(row.order_id) : undefined,
    journalEntryIds,
    bookedAt: row.booked_at ? String(row.booked_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapVendorPayment(row: Record<string, unknown>): VendorPayment {
  return {
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    date: String(row.payment_date),
    amountCents: Number(row.amount_cents),
    bankAccount: row.bank_account === '1000' ? '1000' : '1200',
    reference: row.reference ? String(row.reference) : undefined,
    journalEntryId: String(row.journal_entry_id ?? ''),
    createdAt: String(row.created_at),
  }
}

export function mapStockMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    date: String(row.movement_date),
    quantityDelta: Number(row.quantity_delta),
    sourceType: row.source_type as StockMovement['sourceType'],
    sourceId: String(row.source_id),
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at),
  }
}

export function mapLearningProgress(rows: Record<string, unknown>[]): LearningState {
  const progress: TaskProgress[] = rows.map((row) => ({
    taskId: String(row.task_id),
    attempts: Number(row.attempts ?? 0),
    bestScore: Number(row.best_score ?? 0),
    completed: Boolean(row.completed),
    lastAttemptAt: row.last_attempt_at ? String(row.last_attempt_at) : undefined,
    practicePostedAt: row.practice_posted_at
      ? String(row.practice_posted_at)
      : undefined,
  }))
  return {
    progress,
    totalPoints: progress
      .filter((item) => item.completed)
      .reduce((sum, item) => sum + item.bestScore, 0),
  }
}

export function emptySalesState(): SalesState {
  return {
    customers: [],
    products: [],
    invoices: [],
    payments: [],
    nextInvoiceSequence: 1,
  }
}

export function emptyPurchaseState(): PurchaseState {
  return {
    suppliers: [],
    orders: [],
    receipts: [],
    vendorInvoices: [],
    vendorPayments: [],
    stockMovements: [],
    nextOrderSequence: 1,
    nextReceiptSequence: 1,
    nextVendorInvoiceSequence: 1,
  }
}

export function rpcErrorMessage(error: { message?: string } | null): string {
  const raw = error?.message?.trim() || 'Unbekannter Serverfehler'
  if (/already_booked/i.test(raw)) return 'Beleg wurde bereits gebucht.'
  if (/forbidden/i.test(raw)) return 'Keine Berechtigung für diese Organisation.'
  if (/not authenticated/i.test(raw)) return 'Nicht angemeldet.'
  if (/overpay|exceeds/i.test(raw)) return 'Zahlung würde den offenen Betrag überschreiten.'
  if (/duplicate|unique/i.test(raw)) return 'Datensatz existiert bereits (Idempotenz).'
  return raw
}
