import type { JournalEntry } from '../types/accounting'
import type { LearningState } from '../types/learning'
import type { PurchaseState } from '../types/purchase'
import type { SalesState } from '../types/sales'

export interface WorkspaceHashPayload {
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  learning: LearningState
}

/** Stable JSON for hashing (sorted keys, deterministic array order preserved). */
export function canonicalizeWorkspace(payload: WorkspaceHashPayload): string {
  return JSON.stringify({
    version: 4,
    entries: payload.entries,
    sales: payload.sales,
    purchase: payload.purchase,
    learning: payload.learning,
  })
}

/** SHA-256 hex of Workspace v4 payload (Web Crypto). */
export async function hashWorkspacePayload(
  payload: WorkspaceHashPayload,
): Promise<string> {
  const canonical = canonicalizeWorkspace(payload)
  const data = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function previewWorkspaceCounts(payload: WorkspaceHashPayload) {
  return {
    journalEntries: payload.entries.length,
    customers: payload.sales.customers.length,
    products: payload.sales.products.length,
    salesInvoices: payload.sales.invoices.length,
    salesPayments: payload.sales.payments.length,
    suppliers: payload.purchase.suppliers.length,
    purchaseOrders: payload.purchase.orders.length,
    goodsReceipts: payload.purchase.receipts.length,
    vendorInvoices: payload.purchase.vendorInvoices.length,
    vendorPayments: payload.purchase.vendorPayments.length,
    stockMovements: payload.purchase.stockMovements.length,
    learningProgress: payload.learning.progress.length,
  }
}
