import type { JournalEntry } from '../types/accounting'
import type { LearningState } from '../types/learning'
import type {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseState,
  Supplier,
  VendorInvoice,
} from '../types/purchase'
import type {
  Customer,
  InvoicePayment,
  Product,
  SalesInvoice,
  SalesState,
} from '../types/sales'
import type { DataBackendMode } from '../supabase/env'

export type ActionResult = { ok: true } | { ok: false; message: string }

export type PersistSource =
  | 'storage'
  | 'demo'
  | 'recovered-demo'
  | 'supabase'
  | 'empty'

export interface WorkspaceSnapshot {
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  learning: LearningState
  /** Local snapshot. Supabase reads organizations.vat_enabled via OrgContext. */
  vatEnabled?: boolean
  source: PersistSource
  warning?: string
}

/** Which write paths are available in the active backend. */
export interface ModuleCapabilities {
  manualJournal: boolean
  salesMasterData: boolean
  salesBookPay: boolean
  purchaseMasterData: boolean
  purchaseBookPay: boolean
  goodsReceipt: boolean
  learningProgress: boolean
  learningPracticeJournal: boolean
  workspaceImport: boolean
  resetDemo: boolean
}

export interface PaymentInput {
  date: string
  amountCents: number
  bankAccount: '280' | '282'
  reference?: string
}

export interface WorkspaceRepository {
  readonly mode: DataBackendMode
  readonly capabilities: ModuleCapabilities
  load(): Promise<WorkspaceSnapshot>
  /** Persist full snapshot (local only). Supabase repo no-ops or rejects. */
  saveSnapshot?(snapshot: Omit<WorkspaceSnapshot, 'source' | 'warning'>): Promise<void>
  resetToDemo?(): Promise<WorkspaceSnapshot>
  bookSalesInvoice(invoiceId: string): Promise<ActionResult>
  recordSalesPayment(invoiceId: string, input: PaymentInput): Promise<ActionResult>
  bookVendorInvoice(invoiceId: string): Promise<ActionResult>
  recordVendorPayment(invoiceId: string, input: PaymentInput): Promise<ActionResult>
  recordGoodsReceipt?(
    orderId: string,
    input: { receiptDate: string; lines: GoodsReceiptLine[] },
  ): Promise<ActionResult & { receipt?: GoodsReceipt }>
  upsertCustomer?(customer: Customer): Promise<ActionResult & { customer?: Customer }>
  upsertProduct?(product: Product): Promise<ActionResult & { product?: Product }>
  upsertSupplier?(supplier: Supplier): Promise<ActionResult & { supplier?: Supplier }>
  saveDraftInvoice?(invoice: SalesInvoice): Promise<ActionResult & { invoice?: SalesInvoice }>
  saveVendorInvoice?(
    invoice: VendorInvoice,
  ): Promise<ActionResult & { invoice?: VendorInvoice }>
  savePurchaseOrder?(
    order: PurchaseOrder,
  ): Promise<ActionResult & { order?: PurchaseOrder }>
  confirmPurchaseOrder?(orderId: string): Promise<ActionResult>
  saveLearningState?(learning: LearningState): Promise<ActionResult>
  importWorkspace?(payload: {
    contentHash: string
    workspace: {
      entries: JournalEntry[]
      sales: SalesState
      purchase: PurchaseState
      learning: LearningState
      /** Sets organizations.vat_enabled on the target org. Default on. */
      vatEnabled?: boolean
    }
    sourceLabel?: string
  }): Promise<ActionResult & { batchId?: string; alreadyImported?: boolean }>
}

export interface OrgMembership {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: 'owner' | 'teacher' | 'student' | 'viewer'
  /** organizations.vat_enabled. Missing/unknown values are treated as on. */
  vatEnabled: boolean
}

export type { InvoicePayment }
