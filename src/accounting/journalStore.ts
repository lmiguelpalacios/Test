import type { JournalEntry, JournalLine, VatRate } from '../types/accounting'
import type { LearningState, TaskProgress } from '../types/learning'
import type { PurchaseState } from '../types/purchase'
import type { Product, SalesState } from '../types/sales'
import { initialJournalEntries } from '../data/journal-entries'
import { createEmptyLearningState } from '../data/learning-tasks'
import { createDemoPurchaseState } from '../data/purchase-demo'
import { createDemoSalesState } from '../data/sales-demo'
import { isBalanced } from './money'
import { sumLines } from './validateEntry'

export const JOURNAL_STORAGE_KEY = 'nordlicht.uebungsunternehmen.journal.v1'
export const JOURNAL_STORAGE_VERSION = 5 as const

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface WorkspacePersistPayload {
  version: typeof JOURNAL_STORAGE_VERSION
  savedAt: string
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  learning: LearningState
  /** Default an. Aus = neue Buchungen ohne USt-/VSt-Zeilen. */
  vatEnabled: boolean
}

export type JournalLoadSource = 'storage' | 'demo' | 'recovered-demo'

export interface WorkspaceLoadResult {
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  learning: LearningState
  vatEnabled: boolean
  source: JournalLoadSource
  warning?: string
}

export interface JournalLoadResult {
  entries: JournalEntry[]
  source: JournalLoadSource
  warning?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isVatRate(value: unknown): value is VatRate {
  return value === 0 || value === 7 || value === 19
}

function isNonNegInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isValidLine(value: unknown): value is JournalLine {
  if (!isRecord(value)) return false
  if (typeof value.accountNumber !== 'string' || value.accountNumber.trim() === '') {
    return false
  }
  if (!isNonNegInt(value.debitCents) || !isNonNegInt(value.creditCents)) return false
  const hasDebit = value.debitCents > 0
  const hasCredit = value.creditCents > 0
  return (hasDebit && !hasCredit) || (hasCredit && !hasDebit)
}

export function isValidStoredEntry(value: unknown): value is JournalEntry {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.trim() === '') return false
  if (typeof value.date !== 'string' || Number.isNaN(Date.parse(value.date))) return false
  if (typeof value.documentNumber !== 'string' || value.documentNumber.trim() === '') {
    return false
  }
  if (typeof value.description !== 'string' || value.description.trim() === '') return false
  if (typeof value.debitAccount !== 'string' || typeof value.creditAccount !== 'string') {
    return false
  }
  if (!isNonNegInt(value.netAmountCents) || value.netAmountCents <= 0) return false
  if (!isVatRate(value.vatRate)) return false
  if (!isNonNegInt(value.taxAmountCents) || !isNonNegInt(value.grossAmountCents)) return false
  if (!Array.isArray(value.lines) || value.lines.length < 2) return false
  if (!value.lines.every(isValidLine)) return false
  if (typeof value.explanation !== 'string') return false
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) {
    return false
  }

  const { debitCents, creditCents } = sumLines(value.lines)
  return isBalanced(debitCents, creditCents) && debitCents > 0
}

export function sanitizeEntries(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const entries: JournalEntry[] = []
  for (const item of raw) {
    if (!isValidStoredEntry(item)) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    entries.push(item)
  }
  return entries
}

function normalizeProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.sku !== 'string' ||
    typeof value.name !== 'string' ||
    !isNonNegInt(value.netUnitPriceCents) ||
    !isVatRate(value.vatRate)
  ) {
    return null
  }
  const purchase =
    isNonNegInt(value.netPurchasePriceCents)
      ? value.netPurchasePriceCents
      : Math.round(value.netUnitPriceCents * 0.6)
  return {
    id: value.id,
    sku: value.sku,
    name: value.name,
    description: typeof value.description === 'string' ? value.description : undefined,
    netUnitPriceCents: value.netUnitPriceCents,
    netPurchasePriceCents: purchase,
    vatRate: value.vatRate,
    tracksStock: typeof value.tracksStock === 'boolean' ? value.tracksStock : true,
    minStockQuantity: isNonNegInt(value.minStockQuantity)
      ? value.minStockQuantity
      : undefined,
  }
}

function sanitizeSales(raw: unknown): SalesState | null {
  if (!isRecord(raw)) return null
  if (!Array.isArray(raw.customers) || !Array.isArray(raw.products)) return null
  if (!Array.isArray(raw.invoices) || !Array.isArray(raw.payments)) return null
  const nextInvoiceSequence = raw.nextInvoiceSequence
  if (!Number.isInteger(nextInvoiceSequence) || Number(nextInvoiceSequence) < 1) {
    return null
  }

  const customers = raw.customers.filter(isValidCustomer)
  const products = raw.products
    .map(normalizeProduct)
    .filter((product): product is Product => product !== null)
  const invoices = raw.invoices.filter(isValidInvoice)
  const payments = raw.payments.filter(isValidPayment)

  if (customers.length === 0 || products.length === 0) return null

  return {
    customers,
    products,
    invoices,
    payments: payments.filter((payment) =>
      invoices.some((invoice) => invoice.id === payment.invoiceId),
    ),
    nextInvoiceSequence: nextInvoiceSequence as number,
  }
}

function sanitizePurchase(raw: unknown): PurchaseState | null {
  if (!isRecord(raw)) return null
  if (!Array.isArray(raw.suppliers) || !Array.isArray(raw.orders)) return null
  if (!Array.isArray(raw.receipts) || !Array.isArray(raw.vendorInvoices)) return null
  if (!Array.isArray(raw.vendorPayments) || !Array.isArray(raw.stockMovements)) return null
  if (
    !Number.isInteger(raw.nextOrderSequence) ||
    !Number.isInteger(raw.nextReceiptSequence) ||
    !Number.isInteger(raw.nextVendorInvoiceSequence)
  ) {
    return null
  }

  const suppliers = raw.suppliers.filter(isValidSupplier)
  const orders = raw.orders.filter(isValidOrder)
  const receipts = raw.receipts.filter(isValidReceipt)
  const vendorInvoices = raw.vendorInvoices.filter(isValidVendorInvoice)
  const vendorPayments = raw.vendorPayments.filter(isValidVendorPayment)
  const stockMovements = raw.stockMovements.filter(isValidStockMovement)

  if (suppliers.length === 0) return null

  return {
    suppliers,
    orders,
    receipts,
    vendorInvoices,
    vendorPayments: vendorPayments.filter((payment) =>
      vendorInvoices.some((invoice) => invoice.id === payment.invoiceId),
    ),
    stockMovements,
    nextOrderSequence: raw.nextOrderSequence as number,
    nextReceiptSequence: raw.nextReceiptSequence as number,
    nextVendorInvoiceSequence: raw.nextVendorInvoiceSequence as number,
  }
}

function isValidCustomer(value: unknown): value is SalesState['customers'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.number === 'string' &&
    typeof value.companyName === 'string' &&
    typeof value.billingAddress === 'string'
  )
}

function isValidInvoice(value: unknown): value is SalesState['invoices'][number] {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.number !== 'string') return false
  if (typeof value.issueDate !== 'string' || typeof value.dueDate !== 'string') return false
  if (typeof value.customerId !== 'string') return false
  if (!Array.isArray(value.lines) || value.lines.length === 0) return false
  if (!Array.isArray(value.journalEntryIds)) return false
  if (!value.journalEntryIds.every((id) => typeof id === 'string')) return false
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false
  return value.lines.every((line) => {
    if (!isRecord(line)) return false
    return (
      typeof line.id === 'string' &&
      typeof line.description === 'string' &&
      typeof line.quantity === 'number' &&
      line.quantity > 0 &&
      isNonNegInt(line.netUnitPriceCents) &&
      isVatRate(line.vatRate)
    )
  })
}

function isValidPayment(value: unknown): value is SalesState['payments'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.invoiceId === 'string' &&
    typeof value.date === 'string' &&
    isNonNegInt(value.amountCents) &&
    value.amountCents > 0 &&
    (value.bankAccount === '280' || value.bankAccount === '282') &&
    typeof value.journalEntryId === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function isValidSupplier(value: unknown): value is PurchaseState['suppliers'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.number === 'string' &&
    typeof value.companyName === 'string' &&
    typeof value.billingAddress === 'string'
  )
}

function isValidOrder(value: unknown): value is PurchaseState['orders'][number] {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.number !== 'string') return false
  if (typeof value.supplierId !== 'string' || typeof value.orderDate !== 'string') return false
  if (!Array.isArray(value.lines) || value.lines.length === 0) return false
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false
  return value.lines.every((line) => {
    if (!isRecord(line)) return false
    return (
      typeof line.id === 'string' &&
      typeof line.description === 'string' &&
      typeof line.quantity === 'number' &&
      line.quantity > 0 &&
      isNonNegInt(line.netUnitPriceCents) &&
      isVatRate(line.vatRate) &&
      typeof line.expenseAccount === 'string'
    )
  })
}

function isValidReceipt(value: unknown): value is PurchaseState['receipts'][number] {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.number !== 'string') return false
  if (typeof value.orderId !== 'string' || typeof value.receiptDate !== 'string') return false
  if (!Array.isArray(value.lines) || value.lines.length === 0) return false
  if (typeof value.createdAt !== 'string') return false
  return value.lines.every((line) => {
    if (!isRecord(line)) return false
    return (
      typeof line.orderLineId === 'string' &&
      typeof line.quantity === 'number' &&
      line.quantity > 0
    )
  })
}

function isValidVendorInvoice(
  value: unknown,
): value is PurchaseState['vendorInvoices'][number] {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.externalNumber !== 'string' || typeof value.internalNumber !== 'string') {
    return false
  }
  if (typeof value.supplierId !== 'string') return false
  if (typeof value.issueDate !== 'string' || typeof value.dueDate !== 'string') return false
  if (!Array.isArray(value.lines) || value.lines.length === 0) return false
  if (!Array.isArray(value.journalEntryIds)) return false
  if (!value.journalEntryIds.every((id) => typeof id === 'string')) return false
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false
  return value.lines.every((line) => {
    if (!isRecord(line)) return false
    return (
      typeof line.id === 'string' &&
      typeof line.description === 'string' &&
      typeof line.quantity === 'number' &&
      line.quantity > 0 &&
      isNonNegInt(line.netUnitPriceCents) &&
      isVatRate(line.vatRate) &&
      typeof line.expenseAccount === 'string'
    )
  })
}

function isValidVendorPayment(
  value: unknown,
): value is PurchaseState['vendorPayments'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.invoiceId === 'string' &&
    typeof value.date === 'string' &&
    isNonNegInt(value.amountCents) &&
    value.amountCents > 0 &&
    (value.bankAccount === '280' || value.bankAccount === '282') &&
    typeof value.journalEntryId === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function isValidStockMovement(
  value: unknown,
): value is PurchaseState['stockMovements'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.productId === 'string' &&
    typeof value.date === 'string' &&
    typeof value.quantityDelta === 'number' &&
    value.quantityDelta !== 0 &&
    typeof value.sourceType === 'string' &&
    typeof value.sourceId === 'string' &&
    typeof value.createdAt === 'string'
  )
}

export function cloneDemoEntries(): JournalEntry[] {
  return initialJournalEntries.map((entry) => ({
    ...entry,
    lines: entry.lines.map((line) => ({ ...line })),
  }))
}

function sanitizeLearning(raw: unknown): LearningState {
  if (!isRecord(raw) || !Array.isArray(raw.progress)) {
    return createEmptyLearningState()
  }
  const seen = new Set<string>()
  const progress: TaskProgress[] = []
  for (const item of raw.progress) {
    if (!isRecord(item)) continue
    if (typeof item.taskId !== 'string' || item.taskId.trim() === '') continue
    if (seen.has(item.taskId)) continue
    if (!Number.isInteger(item.attempts) || Number(item.attempts) < 0) continue
    if (!Number.isInteger(item.bestScore) || Number(item.bestScore) < 0) continue
    if (typeof item.completed !== 'boolean') continue
    seen.add(item.taskId)
    progress.push({
      taskId: item.taskId,
      attempts: item.attempts as number,
      bestScore: item.bestScore as number,
      completed: item.completed,
      lastAttemptAt:
        typeof item.lastAttemptAt === 'string' ? item.lastAttemptAt : undefined,
      practicePostedAt:
        typeof item.practicePostedAt === 'string'
          ? item.practicePostedAt
          : undefined,
    })
  }
  const totalPoints = progress
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.bestScore, 0)
  return {
    progress,
    lastTaskId: typeof raw.lastTaskId === 'string' ? raw.lastTaskId : undefined,
    totalPoints,
  }
}

export function cloneDemoWorkspace(): {
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  learning: LearningState
  vatEnabled: boolean
} {
  return {
    entries: cloneDemoEntries(),
    sales: createDemoSalesState(),
    purchase: createDemoPurchaseState(),
    learning: createEmptyLearningState(),
    vatEnabled: true,
  }
}

export function saveWorkspace(
  data: {
    entries: JournalEntry[]
    sales: SalesState
    purchase: PurchaseState
    learning: LearningState
    vatEnabled?: boolean
  },
  storage: StorageLike,
): void {
  const payload: WorkspacePersistPayload = {
    version: JOURNAL_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    entries: data.entries,
    sales: data.sales,
    purchase: data.purchase,
    learning: data.learning,
    vatEnabled: data.vatEnabled !== false,
  }
  storage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(payload))
}

export function saveJournalEntries(
  entries: JournalEntry[],
  storage: StorageLike,
  sales: SalesState = createDemoSalesState(),
  purchase: PurchaseState = createDemoPurchaseState(),
  learning: LearningState = createEmptyLearningState(),
): void {
  saveWorkspace({ entries, sales, purchase, learning }, storage)
}

export function clearJournalStorage(storage: StorageLike): void {
  storage.removeItem(JOURNAL_STORAGE_KEY)
}

function readVatEnabled(value: unknown): boolean {
  return typeof value === 'boolean' ? value : true
}

export function resetWorkspace(storage: StorageLike): {
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  learning: LearningState
  vatEnabled: boolean
} {
  const demo = cloneDemoWorkspace()
  saveWorkspace(demo, storage)
  return demo
}

export function resetJournalEntries(storage: StorageLike): JournalEntry[] {
  return resetWorkspace(storage).entries
}

export function loadWorkspace(storage: StorageLike): WorkspaceLoadResult {
  const raw = storage.getItem(JOURNAL_STORAGE_KEY)
  if (raw == null || raw.trim() === '') {
    const demo = cloneDemoWorkspace()
    saveWorkspace(demo, storage)
    return { ...demo, source: 'demo' }
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return recoverDemo(
        storage,
        'Gespeicherte Daten waren ungültig und wurden auf die Demo-Daten zurückgesetzt.',
      )
    }

    if (parsed.version === 1) {
      const entries = sanitizeEntries(parsed.entries)
      if (entries.length === 0) {
        return recoverDemo(
          storage,
          'Gespeicherte Journaldaten enthielten keine gültigen Buchungen und wurden zurückgesetzt.',
        )
      }
      const sales = createDemoSalesState()
      const purchase = createDemoPurchaseState()
      const learning = createEmptyLearningState()
      saveWorkspace({ entries, sales, purchase, learning }, storage)
      return {
        entries,
        sales,
        purchase,
        learning,
        vatEnabled: true,
        source: 'storage',
        warning:
          'Verkauf/Einkauf/Lernmodus wurden ergänzt (Migration von Persistenz v1).',
      }
    }

    if (parsed.version === 2) {
      const entries = sanitizeEntries(parsed.entries)
      const sales = sanitizeSales(parsed.sales)
      if (entries.length === 0 || !sales) {
        return recoverDemo(
          storage,
          'Gespeicherte Daten waren unvollständig und wurden zurückgesetzt.',
        )
      }
      const purchase = createDemoPurchaseState()
      const learning = createEmptyLearningState()
      saveWorkspace({ entries, sales, purchase, learning }, storage)
      return {
        entries,
        sales,
        purchase,
        learning,
        vatEnabled: true,
        source: 'storage',
        warning:
          'Einkauf/Lernmodus wurden ergänzt (Migration von Persistenz v2).',
      }
    }

    if (parsed.version === 3) {
      const entries = sanitizeEntries(parsed.entries)
      const sales = sanitizeSales(parsed.sales)
      const purchase = sanitizePurchase(parsed.purchase)
      if (entries.length === 0 || !sales || !purchase) {
        return recoverDemo(
          storage,
          'Gespeicherte Daten waren unvollständig und wurden zurückgesetzt.',
        )
      }
      const learning = createEmptyLearningState()
      saveWorkspace({ entries, sales, purchase, learning, vatEnabled: true }, storage)
      return {
        entries,
        sales,
        purchase,
        learning,
        vatEnabled: true,
        source: 'storage',
        warning: 'Lernfortschritt wurde ergänzt (Migration von Persistenz v3).',
      }
    }

    if (parsed.version === 4) {
      const entries = sanitizeEntries(parsed.entries)
      const sales = sanitizeSales(parsed.sales)
      const purchase = sanitizePurchase(parsed.purchase)
      const learning = sanitizeLearning(parsed.learning) ?? createEmptyLearningState()
      if (entries.length === 0 || !sales || !purchase) {
        return recoverDemo(
          storage,
          'Gespeicherte Daten waren unvollständig und wurden zurückgesetzt.',
        )
      }
      const vatEnabled = readVatEnabled(parsed.vatEnabled)
      saveWorkspace({ entries, sales, purchase, learning, vatEnabled }, storage)
      return {
        entries,
        sales,
        purchase,
        learning,
        vatEnabled,
        source: 'storage',
        warning:
          'Umsatzsteuer-Schalter ergänzt (Standard: an, Migration von Persistenz v4).',
      }
    }

    if (parsed.version !== JOURNAL_STORAGE_VERSION) {
      return recoverDemo(
        storage,
        'Gespeicherte Daten waren veraltet oder ungültig und wurden auf die Demo-Daten zurückgesetzt.',
      )
    }

    const entries = sanitizeEntries(parsed.entries)
    const sales = sanitizeSales(parsed.sales)
    const purchase = sanitizePurchase(parsed.purchase)
    const learning = sanitizeLearning(parsed.learning)
    if (entries.length === 0 || !sales || !purchase) {
      return recoverDemo(
        storage,
        'Gespeicherte Daten waren unvollständig und wurden auf die Demo-Daten zurückgesetzt.',
      )
    }

    const vatEnabled = readVatEnabled(parsed.vatEnabled)
    return { entries, sales, purchase, learning, vatEnabled, source: 'storage' }
  } catch {
    return recoverDemo(
      storage,
      'Gespeicherte Daten konnten nicht gelesen werden und wurden auf die Demo-Daten zurückgesetzt.',
    )
  }
}

function recoverDemo(storage: StorageLike, warning: string): WorkspaceLoadResult {
  const demo = cloneDemoWorkspace()
  saveWorkspace(demo, storage)
  return { ...demo, source: 'recovered-demo', warning }
}

export function loadJournalEntries(storage: StorageLike): JournalLoadResult {
  const loaded = loadWorkspace(storage)
  return {
    entries: loaded.entries,
    source: loaded.source,
    warning: loaded.warning,
  }
}

export function createMemoryStorage(
  initial: Record<string, string> = {},
): StorageLike {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}
