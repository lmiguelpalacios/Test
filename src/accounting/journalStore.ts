import type { JournalEntry, JournalLine, VatRate } from '../types/accounting'
import type { SalesState } from '../types/sales'
import { initialJournalEntries } from '../data/journal-entries'
import { createDemoSalesState } from '../data/sales-demo'
import { isBalanced } from './money'
import { sumLines } from './validateEntry'

export const JOURNAL_STORAGE_KEY = 'nordlicht.uebungsunternehmen.journal.v1'
export const JOURNAL_STORAGE_VERSION = 2 as const

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
}

/** @deprecated Alias — Payload heißt jetzt WorkspacePersistPayload */
export type JournalPersistPayload = WorkspacePersistPayload

export type JournalLoadSource = 'storage' | 'demo' | 'recovered-demo'

export interface WorkspaceLoadResult {
  entries: JournalEntry[]
  sales: SalesState
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

function sanitizeSales(raw: unknown): SalesState | null {
  if (!isRecord(raw)) return null
  if (!Array.isArray(raw.customers) || !Array.isArray(raw.products)) return null
  if (!Array.isArray(raw.invoices) || !Array.isArray(raw.payments)) return null
  const nextInvoiceSequence = raw.nextInvoiceSequence
  if (!Number.isInteger(nextInvoiceSequence) || Number(nextInvoiceSequence) < 1) {
    return null
  }

  const customers = raw.customers.filter(isValidCustomer)
  const products = raw.products.filter(isValidProduct)
  const invoices = raw.invoices.filter(isValidInvoice)
  const payments = raw.payments.filter(isValidPayment)

  if (customers.length === 0 || products.length === 0) return null

  // Gebuchte Rechnungen mit fehlendem Journal-Link nicht stillschweigend verwerfen:
  // ungültige Rechnungen werden gefiltert; gebuchte behalten journalEntryIds unverändert.
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

function isValidCustomer(value: unknown): value is SalesState['customers'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.number === 'string' &&
    typeof value.companyName === 'string' &&
    typeof value.billingAddress === 'string' &&
    (value.contactName === undefined || typeof value.contactName === 'string') &&
    (value.email === undefined || typeof value.email === 'string')
  )
}

function isValidProduct(value: unknown): value is SalesState['products'][number] {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.sku === 'string' &&
    typeof value.name === 'string' &&
    isNonNegInt(value.netUnitPriceCents) &&
    isVatRate(value.vatRate)
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
    (value.bankAccount === '1200' || value.bankAccount === '1000') &&
    typeof value.journalEntryId === 'string' &&
    typeof value.createdAt === 'string'
  )
}

export function cloneDemoEntries(): JournalEntry[] {
  return initialJournalEntries.map((entry) => ({
    ...entry,
    lines: entry.lines.map((line) => ({ ...line })),
  }))
}

export function cloneDemoWorkspace(): {
  entries: JournalEntry[]
  sales: SalesState
} {
  return {
    entries: cloneDemoEntries(),
    sales: createDemoSalesState(),
  }
}

export function saveWorkspace(
  data: { entries: JournalEntry[]; sales: SalesState },
  storage: StorageLike,
): void {
  const payload: WorkspacePersistPayload = {
    version: JOURNAL_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    entries: data.entries,
    sales: data.sales,
  }
  storage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(payload))
}

/** Speichert Journal inkl. unverändertem/angehängtem Sales-Stand. */
export function saveJournalEntries(
  entries: JournalEntry[],
  storage: StorageLike,
  sales: SalesState = createDemoSalesState(),
): void {
  saveWorkspace({ entries, sales }, storage)
}

export function clearJournalStorage(storage: StorageLike): void {
  storage.removeItem(JOURNAL_STORAGE_KEY)
}

export function resetWorkspace(storage: StorageLike): {
  entries: JournalEntry[]
  sales: SalesState
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

    // Migration v1 → v2 (nur Journal)
    if (parsed.version === 1) {
      const entries = sanitizeEntries(parsed.entries)
      if (entries.length === 0) {
        return recoverDemo(
          storage,
          'Gespeicherte Journaldaten enthielten keine gültigen Buchungen und wurden zurückgesetzt.',
        )
      }
      const sales = createDemoSalesState()
      saveWorkspace({ entries, sales }, storage)
      return {
        entries,
        sales,
        source: 'storage',
        warning:
          'Verkaufsdaten wurden ergänzt (Migration von Journal-Persistenz v1).',
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
    if (entries.length === 0 || !sales) {
      return recoverDemo(
        storage,
        'Gespeicherte Daten waren unvollständig und wurden auf die Demo-Daten zurückgesetzt.',
      )
    }

    return { entries, sales, source: 'storage' }
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
