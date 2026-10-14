import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  JournalEntry,
  JournalEntryDraft,
  ValidationIssue,
} from '../types/accounting'
import type {
  LearningAnswer,
  LearningState,
  TaskProgress,
} from '../types/learning'
import type {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseState,
  StockMovement,
  Supplier,
  VendorInvoice,
  VendorPayment,
} from '../types/purchase'
import type {
  Customer,
  InvoicePayment,
  Product,
  SalesInvoice,
  SalesState,
} from '../types/sales'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { createJournalEntryId } from '../data/journal-entries'
import {
  computeLearningTotalPoints,
  getLearningTaskById,
} from '../data/learning-tasks'
import {
  evaluateLearningAnswer,
  solutionToPracticeDraft,
} from '../learning/evaluateAnswer'
import type { EvaluationResult } from '../types/learning'
import {
  formatGoodsReceiptNumber,
  formatPurchaseOrderNumber,
  formatVendorInvoiceNumber,
} from '../data/purchase-demo'
import { createId, formatInvoiceNumber } from '../data/sales-demo'
import { buildVendorInvoiceBookingDrafts } from '../purchase/bookVendorInvoice'
import {
  aggregateReceiptQuantities,
  remainingQuantityForLine,
} from '../purchase/orderStatus'
import { buildVendorPaymentDraft } from '../purchase/recordVendorPayment'
import { buildGoodsReceiptStockMovements } from '../purchase/stock'
import { buildInvoiceBookingDrafts } from '../sales/bookInvoice'
import { validateInvoiceLine } from '../sales/invoiceMath'
import { buildPaymentBookingDraft } from '../sales/recordPayment'
import { useDataBackend } from '../persistence/DataBackendContext'
import type { ModuleCapabilities } from '../persistence/types'
import { ensureUuid } from '../persistence/supabaseWorkspaceRepository'
import {
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
  type JournalLoadSource,
} from './journalStore'
import {
  BOOKING_PERIOD_LABEL,
  computeAccountingTotals,
  sortEntriesNewestFirst,
} from './totals'
import { validateJournalEntry } from './validateEntry'

type AddEntryResult =
  | { ok: true; entry: JournalEntry }
  | { ok: false; issues: ValidationIssue[] }

type ActionResult = { ok: true } | { ok: false; message: string }

type PersistSource = JournalLoadSource | 'supabase' | 'empty'

interface AccountingContextValue {
  entries: JournalEntry[]
  sales: SalesState
  purchase: PurchaseState
  periodLabel: string
  totals: ReturnType<typeof computeAccountingTotals>
  persistSource: PersistSource
  persistWarning?: string
  isLocalDemoMode: boolean
  dataMode: 'local' | 'supabase'
  capabilities: ModuleCapabilities
  backendBusy: boolean
  reloadFromBackend: () => Promise<void>
  addEntry: (draft: JournalEntryDraft) => AddEntryResult
  resetToDemo: () => void
  upsertCustomer: (customer: Omit<Customer, 'id'> & { id?: string }) => Customer
  upsertProduct: (product: Omit<Product, 'id'> & { id?: string }) => Product
  saveDraftInvoice: (
    input: Omit<
      SalesInvoice,
      'id' | 'number' | 'journalEntryIds' | 'createdAt' | 'updatedAt' | 'bookedAt'
    > & { id?: string; number?: string },
  ) => Promise<ActionResult & { invoice?: SalesInvoice }>
  bookInvoice: (invoiceId: string) => Promise<ActionResult>
  recordInvoicePayment: (
    invoiceId: string,
    input: {
      date: string
      amountCents: number
      bankAccount: '1200' | '1000'
      reference?: string
    },
  ) => Promise<ActionResult>
  upsertSupplier: (supplier: Omit<Supplier, 'id'> & { id?: string }) => Supplier
  savePurchaseOrder: (
    input: Omit<PurchaseOrder, 'id' | 'number' | 'createdAt' | 'updatedAt'> & {
      id?: string
      number?: string
    },
  ) => Promise<ActionResult & { order?: PurchaseOrder }>
  confirmPurchaseOrder: (orderId: string) => Promise<ActionResult>
  recordGoodsReceipt: (
    orderId: string,
    input: { receiptDate: string; lines: GoodsReceiptLine[] },
  ) => Promise<ActionResult & { receipt?: GoodsReceipt }>
  saveVendorInvoice: (
    input: Omit<
      VendorInvoice,
      'id' | 'internalNumber' | 'journalEntryIds' | 'createdAt' | 'updatedAt' | 'bookedAt'
    > & { id?: string; internalNumber?: string },
  ) => Promise<ActionResult & { invoice?: VendorInvoice }>
  bookVendorInvoice: (invoiceId: string) => Promise<ActionResult>
  recordVendorPayment: (
    invoiceId: string,
    input: {
      date: string
      amountCents: number
      bankAccount: '1200' | '1000'
      reference?: string
    },
  ) => Promise<ActionResult>
  learning: LearningState
  /** Prüft Antwort — schreibt kein Journal. */
  submitLearningAnswer: (
    taskId: string,
    answer: LearningAnswer,
  ) => Promise<ActionResult & { evaluation?: EvaluationResult }>
  /** Markiert Aufgabe abgeschlossen (nach Bewertung). */
  completeLearningTask: (taskId: string) => Promise<ActionResult>
  /**
   * Übernimmt Musterlösung ins echte Journal — nur nach Nutzerbestätigung in der UI
   * und nur wenn die Aufgabe abgeschlossen ist.
   */
  postLearningPracticeEntry: (taskId: string) => ActionResult
}

const AccountingContext = createContext<AccountingContextValue | null>(null)

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function noopStorage() {
  return {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  }
}

function createStockMovementsForSalesInvoice(
  invoice: SalesInvoice,
  products: Product[],
): StockMovement[] {
  const now = new Date().toISOString()
  const movements: StockMovement[] = []
  for (const line of invoice.lines) {
    if (!line.productId) continue
    const product = products.find((item) => item.id === line.productId)
    if (!product?.tracksStock) continue
    movements.push({
      id: createId('sm'),
      productId: line.productId,
      date: invoice.issueDate,
      quantityDelta: -line.quantity,
      sourceType: 'verkauf',
      sourceId: invoice.id,
      note: invoice.number,
      createdAt: now,
    })
  }
  return movements
}

export function AccountingProvider({ children }: { children: ReactNode }) {
  const {
    mode,
    repository,
    capabilities,
    awaitingRemoteSession,
  } = useDataBackend()
  const isLocal = mode === 'local'

  const initial = useMemo(() => {
    if (!isLocal) {
      return {
        entries: [] as JournalEntry[],
        sales: {
          customers: [],
          products: [],
          invoices: [],
          payments: [],
          nextInvoiceSequence: 1,
        } as SalesState,
        purchase: {
          suppliers: [],
          orders: [],
          receipts: [],
          vendorInvoices: [],
          vendorPayments: [],
          stockMovements: [],
          nextOrderSequence: 1,
          nextReceiptSequence: 1,
          nextVendorInvoiceSequence: 1,
        } as PurchaseState,
        learning: { progress: [], totalPoints: 0 } as LearningState,
        source: 'empty' as PersistSource,
        warning: awaitingRemoteSession
          ? 'Supabase-Modus: warte auf Anmeldung/Organisation…'
          : undefined,
      }
    }
    const storage = getBrowserStorage()
    if (!storage) {
      const loaded = loadWorkspace(noopStorage())
      return {
        ...loaded,
        warning: 'localStorage ist nicht verfügbar — Änderungen bleiben nicht erhalten.',
      }
    }
    return loadWorkspace(storage)
  }, [isLocal, awaitingRemoteSession])

  const [entries, setEntries] = useState<JournalEntry[]>(initial.entries)
  const [sales, setSales] = useState<SalesState>(initial.sales)
  const [purchase, setPurchase] = useState<PurchaseState>(initial.purchase)
  const [learning, setLearning] = useState<LearningState>(initial.learning)
  const [persistSource, setPersistSource] = useState<PersistSource>(initial.source)
  const [persistWarning, setPersistWarning] = useState<string | undefined>(
    initial.warning,
  )
  const [backendBusy, setBackendBusy] = useState(false)
  const bookingLocks = useRef(new Set<string>())

  const applySnapshot = useCallback(
    (snapshot: {
      entries: JournalEntry[]
      sales: SalesState
      purchase: PurchaseState
      learning: LearningState
      source: PersistSource
      warning?: string
    }) => {
      setEntries(snapshot.entries)
      setSales(snapshot.sales)
      setPurchase(snapshot.purchase)
      setLearning(snapshot.learning)
      setPersistSource(snapshot.source)
      setPersistWarning(snapshot.warning)
    },
    [],
  )

  const reloadFromBackend = useCallback(async () => {
    if (!repository || mode !== 'supabase') return
    setBackendBusy(true)
    try {
      const snapshot = await repository.load()
      applySnapshot(snapshot)
    } catch (error) {
      setPersistWarning(
        error instanceof Error
          ? `Supabase-Laden fehlgeschlagen: ${error.message}`
          : 'Supabase-Laden fehlgeschlagen.',
      )
    } finally {
      setBackendBusy(false)
    }
  }, [repository, mode, applySnapshot])

  useEffect(() => {
    if (mode !== 'supabase' || !repository) return
    void reloadFromBackend()
  }, [mode, repository, reloadFromBackend])

  useEffect(() => {
    if (!isLocal) return
    const storage = getBrowserStorage()
    if (!storage) return
    try {
      saveWorkspace({ entries, sales, purchase, learning }, storage)
    } catch {
      setPersistWarning(
        'Daten konnten nicht im Browser gespeichert werden (localStorage voll oder blockiert).',
      )
    }
  }, [isLocal, entries, sales, purchase, learning])

  const addEntry = useCallback((draft: JournalEntryDraft): AddEntryResult => {
    if (!capabilities.manualJournal) {
      return {
        ok: false,
        issues: [
          {
            field: 'general',
            message:
              'Manuelle Journalbuchungen sind im Supabase-Modus nicht freigeschaltet (nur DEFINER-RPCs).',
          },
        ],
      }
    }
    const result = validateJournalEntry(draft, chartOfAccounts)
    if (!result.ok) return result
    const entry: JournalEntry = {
      ...result.entry,
      id: createJournalEntryId(),
      createdAt: new Date().toISOString(),
    }
    setEntries((prev) => [entry, ...prev])
    setPersistSource('storage')
    return { ok: true, entry }
  }, [capabilities.manualJournal])

  const resetToDemo = useCallback(() => {
    if (!capabilities.resetDemo) {
      setPersistWarning('Demo-Reset ist im Supabase-Modus deaktiviert (Org-Daten bleiben).')
      return
    }
    const storage = getBrowserStorage() ?? noopStorage()
    const demo = resetWorkspace(storage)
    setEntries(demo.entries)
    setSales(demo.sales)
    setPurchase(demo.purchase)
    setLearning(demo.learning)
    setPersistSource('demo')
    setPersistWarning(
      getBrowserStorage()
        ? undefined
        : 'localStorage ist nicht verfügbar — Demo nur im Arbeitsspeicher geladen.',
    )
  }, [capabilities.resetDemo])

  const persistLearningState = useCallback(
    async (next: LearningState): Promise<ActionResult> => {
      if (isLocal || !capabilities.learningProgress) {
        setPersistSource(isLocal ? 'storage' : 'supabase')
        return { ok: true }
      }
      if (!repository?.saveLearningState) {
        return { ok: false, message: 'Lernfortschritt kann online nicht gespeichert werden.' }
      }
      const result = await repository.saveLearningState(next)
      if (result.ok) setPersistSource('supabase')
      else setPersistWarning(result.message)
      return result
    },
    [isLocal, capabilities.learningProgress, repository],
  )

  const submitLearningAnswer = useCallback(
    async (
      taskId: string,
      answer: LearningAnswer,
    ): Promise<ActionResult & { evaluation?: EvaluationResult }> => {
      const task = getLearningTaskById(taskId)
      if (!task) return { ok: false, message: 'Lernaufgabe nicht gefunden.' }
      const evaluation = evaluateLearningAnswer(task, answer)
      const now = new Date().toISOString()
      let nextState: LearningState | undefined
      setLearning((prev) => {
        const existing = prev.progress.find((item) => item.taskId === taskId)
        const nextItem: TaskProgress = {
          taskId,
          attempts: (existing?.attempts ?? 0) + 1,
          bestScore: Math.max(existing?.bestScore ?? 0, evaluation.score),
          completed: existing?.completed ?? false,
          lastAttemptAt: now,
          practicePostedAt: existing?.practicePostedAt,
        }
        if (evaluation.fullyCorrect) {
          nextItem.completed = true
        }
        const progress = existing
          ? prev.progress.map((item) =>
              item.taskId === taskId ? nextItem : item,
            )
          : [...prev.progress, nextItem]
        nextState = {
          progress,
          lastTaskId: taskId,
          totalPoints: computeLearningTotalPoints(progress),
        }
        return nextState
      })
      if (!nextState) return { ok: false, message: 'Lernfortschritt konnte nicht berechnet werden.' }
      const persist = await persistLearningState(nextState)
      if (!persist.ok) return persist
      return { ok: true, evaluation }
    },
    [persistLearningState],
  )

  const completeLearningTask = useCallback(
    async (taskId: string): Promise<ActionResult> => {
      const task = getLearningTaskById(taskId)
      if (!task) return { ok: false, message: 'Lernaufgabe nicht gefunden.' }
      let nextState: LearningState | undefined
      setLearning((prev) => {
        const existing = prev.progress.find((item) => item.taskId === taskId)
        if (!existing) {
          nextState = prev
          return prev
        }
        const progress = prev.progress.map((item) =>
          item.taskId === taskId ? { ...item, completed: true } : item,
        )
        nextState = {
          ...prev,
          progress,
          lastTaskId: taskId,
          totalPoints: computeLearningTotalPoints(progress),
        }
        return nextState
      })
      if (!nextState) return { ok: false, message: 'Aufgabe nicht gefunden.' }
      return persistLearningState(nextState)
    },
    [persistLearningState],
  )

  const postLearningPracticeEntry = useCallback(
    (taskId: string): ActionResult => {
      if (!capabilities.learningPracticeJournal) {
        return {
          ok: false,
          message:
            'Übungsbuchung ins Journal ist im Supabase-Modus noch nicht freigeschaltet (RPC stub).',
        }
      }
      const task = getLearningTaskById(taskId)
      if (!task) return { ok: false, message: 'Lernaufgabe nicht gefunden.' }
      if (!task.allowPracticeJournalPost) {
        return {
          ok: false,
          message: 'Diese Aufgabe erlaubt keine Übungsbuchung ins Journal.',
        }
      }
      const progress = learning.progress.find((item) => item.taskId === taskId)
      if (!progress?.completed) {
        return {
          ok: false,
          message:
            'Erst die Aufgabe vollständig lösen und abschließen — danach optional ins Journal übernehmen.',
        }
      }
      if (progress.practicePostedAt) {
        return {
          ok: false,
          message: 'Die Übungsbuchung wurde für diese Aufgabe bereits übernommen.',
        }
      }
      const lockKey = `learn-post:${taskId}`
      if (bookingLocks.current.has(lockKey)) {
        return { ok: false, message: 'Übernahme läuft bereits.' }
      }
      bookingLocks.current.add(lockKey)
      try {
        const draft = solutionToPracticeDraft(task)
        const result = validateJournalEntry(draft, chartOfAccounts)
        if (!result.ok) {
          return {
            ok: false,
            message: result.issues[0]?.message ?? 'Übungsbuchung ungültig.',
          }
        }
        const entry: JournalEntry = {
          ...result.entry,
          id: createJournalEntryId(),
          createdAt: new Date().toISOString(),
        }
        setEntries((prev) => [entry, ...prev])
        setLearning((prev) => ({
          ...prev,
          progress: prev.progress.map((item) =>
            item.taskId === taskId
              ? { ...item, practicePostedAt: entry.createdAt }
              : item,
          ),
        }))
        setPersistSource('storage')
        return { ok: true }
      } finally {
        bookingLocks.current.delete(lockKey)
      }
    },
    [learning.progress, capabilities.learningPracticeJournal],
  )

  const upsertCustomer = useCallback(
    (input: Omit<Customer, 'id'> & { id?: string }): Customer => {
      const customer: Customer = {
        id: input.id ?? (isLocal ? createId('cust') : ensureUuid(undefined)),
        number: input.number.trim(),
        companyName: input.companyName.trim(),
        contactName: input.contactName?.trim() || undefined,
        billingAddress: input.billingAddress.trim(),
        email: input.email?.trim() || undefined,
      }
      setSales((prev) => {
        const exists = prev.customers.some((item) => item.id === customer.id)
        return {
          ...prev,
          customers: exists
            ? prev.customers.map((item) => (item.id === customer.id ? customer : item))
            : [...prev.customers, customer],
        }
      })
      setPersistSource(isLocal ? 'storage' : 'supabase')
      if (!isLocal && repository?.upsertCustomer) {
        void repository.upsertCustomer(customer)
      }
      return customer
    },
    [isLocal, repository],
  )

  const upsertProduct = useCallback(
    (input: Omit<Product, 'id'> & { id?: string }): Product => {
      const product: Product = {
        id: input.id ?? (isLocal ? createId('prod') : ensureUuid(undefined)),
        sku: input.sku.trim(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        netUnitPriceCents: input.netUnitPriceCents,
        netPurchasePriceCents: input.netPurchasePriceCents,
        vatRate: input.vatRate,
        tracksStock: input.tracksStock,
        minStockQuantity: input.minStockQuantity,
      }
      setSales((prev) => {
        const exists = prev.products.some((item) => item.id === product.id)
        return {
          ...prev,
          products: exists
            ? prev.products.map((item) => (item.id === product.id ? product : item))
            : [...prev.products, product],
        }
      })
      setPersistSource(isLocal ? 'storage' : 'supabase')
      if (!isLocal && repository?.upsertProduct) {
        void repository.upsertProduct(product)
      }
      return product
    },
    [isLocal, repository],
  )

  const saveDraftInvoice = useCallback(
    async (
      input: Omit<
        SalesInvoice,
        'id' | 'number' | 'journalEntryIds' | 'createdAt' | 'updatedAt' | 'bookedAt'
      > & { id?: string; number?: string },
    ): Promise<ActionResult & { invoice?: SalesInvoice }> => {
      if (input.lines.length === 0) {
        return { ok: false, message: 'Mindestens eine Position ist erforderlich.' }
      }
      for (const line of input.lines) {
        const error = validateInvoiceLine(line)
        if (error) return { ok: false, message: error }
      }

      const now = new Date().toISOString()
      let saved: SalesInvoice | undefined
      let blocked = false

      setSales((prev) => {
        if (!prev.customers.some((customer) => customer.id === input.customerId)) {
          blocked = true
          return prev
        }
        const existing = input.id
          ? prev.invoices.find((invoice) => invoice.id === input.id)
          : undefined
        if (existing && existing.journalEntryIds.length > 0) {
          blocked = true
          return prev
        }
        const invoice: SalesInvoice = {
          id:
            existing?.id ??
            (isLocal ? createId('inv') : ensureUuid(input.id)),
          number:
            existing?.number ??
            input.number ??
            formatInvoiceNumber(prev.nextInvoiceSequence),
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          customerId: input.customerId,
          lines: input.lines.map((line) => ({
            ...line,
            id: isLocal ? line.id : ensureUuid(line.id),
          })),
          journalEntryIds: [],
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        saved = invoice
        return {
          ...prev,
          invoices: existing
            ? prev.invoices.map((item) => (item.id === existing.id ? invoice : item))
            : [...prev.invoices, invoice],
          nextInvoiceSequence: existing
            ? prev.nextInvoiceSequence
            : prev.nextInvoiceSequence + 1,
        }
      })

      if (blocked || !saved) {
        return {
          ok: false,
          message:
            'Rechnung konnte nicht gespeichert werden (ungültiger Kunde oder bereits gebucht).',
        }
      }

      if (!isLocal) {
        if (!repository?.saveDraftInvoice) {
          return {
            ok: false,
            message: 'Entwurf speichern ist online nicht verfügbar.',
          }
        }
        setBackendBusy(true)
        try {
          const result = await repository.saveDraftInvoice(saved)
          if (!result.ok) return result
          await reloadFromBackend()
          setPersistSource('supabase')
          return result
        } finally {
          setBackendBusy(false)
        }
      }

      setPersistSource('storage')
      return { ok: true, invoice: saved }
    },
    [isLocal, repository, reloadFromBackend],
  )

  const bookInvoice = useCallback(
    async (invoiceId: string): Promise<ActionResult> => {
      if (!isLocal) {
        if (!repository) return { ok: false, message: 'Supabase-Repository nicht bereit.' }
        setBackendBusy(true)
        try {
          const result = await repository.bookSalesInvoice(invoiceId)
          if (result.ok) await reloadFromBackend()
          return result
        } finally {
          setBackendBusy(false)
        }
      }
      if (bookingLocks.current.has(`book:${invoiceId}`)) {
        return { ok: false, message: 'Buchung läuft bereits — Doppelklick verhindert.' }
      }
      bookingLocks.current.add(`book:${invoiceId}`)
      try {
        const invoice = sales.invoices.find((item) => item.id === invoiceId)
        if (!invoice) return { ok: false, message: 'Rechnung nicht gefunden.' }
        if (invoice.journalEntryIds.length > 0) {
          return { ok: false, message: 'Diese Rechnung wurde bereits gebucht.' }
        }
        const customer = sales.customers.find((item) => item.id === invoice.customerId)
        const built = buildInvoiceBookingDrafts(invoice, customer)
        if (!built.ok) return built

        const createdEntries: JournalEntry[] = []
        for (const draft of built.drafts) {
          const result = validateJournalEntry(draft, chartOfAccounts)
          if (!result.ok) {
            return {
              ok: false,
              message: result.issues[0]?.message ?? 'Buchung ungültig.',
            }
          }
          createdEntries.push({
            ...result.entry,
            id: createJournalEntryId(),
            createdAt: new Date().toISOString(),
          })
        }
        const createdIds = createdEntries.map((entry) => entry.id)
        const bookedAt = new Date().toISOString()
        const stockMoves = createStockMovementsForSalesInvoice(invoice, sales.products)

        let linked = false
        setSales((prev) => {
          const current = prev.invoices.find((item) => item.id === invoiceId)
          if (!current || current.journalEntryIds.length > 0) return prev
          linked = true
          return {
            ...prev,
            invoices: prev.invoices.map((item) =>
              item.id === invoiceId
                ? {
                    ...item,
                    journalEntryIds: createdIds,
                    bookedAt,
                    updatedAt: bookedAt,
                  }
                : item,
            ),
          }
        })
        if (!linked) {
          return { ok: false, message: 'Diese Rechnung wurde bereits gebucht.' }
        }

        if (stockMoves.length > 0) {
          setPurchase((prev) => ({
            ...prev,
            stockMovements: [...prev.stockMovements, ...stockMoves],
          }))
        }
        setEntries((prev) => [...createdEntries, ...prev])
        setPersistSource('storage')
        return { ok: true }
      } finally {
        bookingLocks.current.delete(`book:${invoiceId}`)
      }
    },
    [isLocal, repository, reloadFromBackend, sales.invoices, sales.customers, sales.products],
  )

  const recordInvoicePayment = useCallback(
    async (
      invoiceId: string,
      input: {
        date: string
        amountCents: number
        bankAccount: '1200' | '1000'
        reference?: string
      },
    ): Promise<ActionResult> => {
      if (!isLocal) {
        if (!repository) return { ok: false, message: 'Supabase-Repository nicht bereit.' }
        setBackendBusy(true)
        try {
          const result = await repository.recordSalesPayment(invoiceId, input)
          if (result.ok) await reloadFromBackend()
          return result
        } finally {
          setBackendBusy(false)
        }
      }
      const lockKey = `pay:${invoiceId}`
      if (bookingLocks.current.has(lockKey)) {
        return { ok: false, message: 'Zahlung wird bereits verarbeitet.' }
      }
      bookingLocks.current.add(lockKey)
      try {
        const invoice = sales.invoices.find((item) => item.id === invoiceId)
        if (!invoice) return { ok: false, message: 'Rechnung nicht gefunden.' }
        const built = buildPaymentBookingDraft(invoice, sales.payments, input)
        if (!built.ok) return built
        const result = validateJournalEntry(built.draft, chartOfAccounts)
        if (!result.ok) {
          return {
            ok: false,
            message: result.issues[0]?.message ?? 'Zahlungsbuchung ungültig.',
          }
        }
        const entry: JournalEntry = {
          ...result.entry,
          id: createJournalEntryId(),
          createdAt: new Date().toISOString(),
        }
        const payment: InvoicePayment = {
          id: createId('pay'),
          invoiceId,
          date: input.date,
          amountCents: built.amountCents,
          bankAccount: input.bankAccount,
          reference: input.reference?.trim() || undefined,
          journalEntryId: entry.id,
          createdAt: entry.createdAt,
        }
        let accepted = false
        setSales((prev) => {
          const current = prev.invoices.find((item) => item.id === invoiceId)
          if (!current || current.journalEntryIds.length === 0) return prev
          const openCheck = buildPaymentBookingDraft(current, prev.payments, input)
          if (!openCheck.ok) return prev
          accepted = true
          return {
            ...prev,
            payments: [...prev.payments, payment],
            invoices: prev.invoices.map((item) =>
              item.id === invoiceId
                ? { ...item, updatedAt: new Date().toISOString() }
                : item,
            ),
          }
        })
        if (!accepted) {
          return {
            ok: false,
            message: 'Zahlung konnte nicht gespeichert werden (Status geändert).',
          }
        }
        setEntries((prev) => [entry, ...prev])
        setPersistSource('storage')
        return { ok: true }
      } finally {
        bookingLocks.current.delete(lockKey)
      }
    },
    [isLocal, repository, reloadFromBackend, sales.invoices, sales.payments],
  )

  const upsertSupplier = useCallback(
    (input: Omit<Supplier, 'id'> & { id?: string }): Supplier => {
      const supplier: Supplier = {
        id: input.id ?? (isLocal ? createId('sup') : ensureUuid(undefined)),
        number: input.number.trim(),
        companyName: input.companyName.trim(),
        contactName: input.contactName?.trim() || undefined,
        billingAddress: input.billingAddress.trim(),
        email: input.email?.trim() || undefined,
      }
      setPurchase((prev) => {
        const exists = prev.suppliers.some((item) => item.id === supplier.id)
        return {
          ...prev,
          suppliers: exists
            ? prev.suppliers.map((item) => (item.id === supplier.id ? supplier : item))
            : [...prev.suppliers, supplier],
        }
      })
      setPersistSource(isLocal ? 'storage' : 'supabase')
      if (!isLocal && repository?.upsertSupplier) {
        void repository.upsertSupplier(supplier)
      }
      return supplier
    },
    [isLocal, repository],
  )

  const savePurchaseOrder = useCallback(
    async (
      input: Omit<PurchaseOrder, 'id' | 'number' | 'createdAt' | 'updatedAt'> & {
        id?: string
        number?: string
      },
    ): Promise<ActionResult & { order?: PurchaseOrder }> => {
      if (input.lines.length === 0) {
        return { ok: false, message: 'Mindestens eine Bestellposition ist erforderlich.' }
      }
      const now = new Date().toISOString()
      let saved: PurchaseOrder | undefined
      let blocked = false
      setPurchase((prev) => {
        if (!prev.suppliers.some((supplier) => supplier.id === input.supplierId)) {
          blocked = true
          return prev
        }
        const existing = input.id
          ? prev.orders.find((order) => order.id === input.id)
          : undefined
        if (existing?.confirmedAt) {
          blocked = true
          return prev
        }
        const order: PurchaseOrder = {
          id: existing?.id ?? (isLocal ? createId('po') : ensureUuid(input.id)),
          number:
            existing?.number ??
            input.number ??
            formatPurchaseOrderNumber(prev.nextOrderSequence),
          supplierId: input.supplierId,
          orderDate: input.orderDate,
          lines: input.lines.map((line) => ({
            ...line,
            id: isLocal ? line.id : ensureUuid(line.id),
          })),
          confirmedAt: existing?.confirmedAt,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        saved = order
        return {
          ...prev,
          orders: existing
            ? prev.orders.map((item) => (item.id === existing.id ? order : item))
            : [...prev.orders, order],
          nextOrderSequence: existing
            ? prev.nextOrderSequence
            : prev.nextOrderSequence + 1,
        }
      })
      if (blocked || !saved) {
        return {
          ok: false,
          message: 'Bestellung konnte nicht gespeichert werden.',
        }
      }

      if (!isLocal) {
        if (!repository?.savePurchaseOrder) {
          return { ok: false, message: 'Bestellung speichern ist online nicht verfügbar.' }
        }
        setBackendBusy(true)
        try {
          const result = await repository.savePurchaseOrder(saved)
          if (!result.ok) return result
          await reloadFromBackend()
          setPersistSource('supabase')
          return result
        } finally {
          setBackendBusy(false)
        }
      }

      setPersistSource('storage')
      return { ok: true, order: saved }
    },
    [isLocal, repository, reloadFromBackend],
  )

  const confirmPurchaseOrder = useCallback(
    async (orderId: string): Promise<ActionResult> => {
      if (!isLocal) {
        if (!repository?.confirmPurchaseOrder) {
          return { ok: false, message: 'Bestätigung ist online nicht verfügbar.' }
        }
        setBackendBusy(true)
        try {
          const result = await repository.confirmPurchaseOrder(orderId)
          if (result.ok) {
            await reloadFromBackend()
            setPersistSource('supabase')
          }
          return result
        } finally {
          setBackendBusy(false)
        }
      }

      let ok = false
      setPurchase((prev) => {
        const order = prev.orders.find((item) => item.id === orderId)
        if (!order || order.confirmedAt) return prev
        ok = true
        const confirmedAt = new Date().toISOString()
        return {
          ...prev,
          orders: prev.orders.map((item) =>
            item.id === orderId
              ? { ...item, confirmedAt, updatedAt: confirmedAt }
              : item,
          ),
        }
      })
      if (!ok) {
        return { ok: false, message: 'Bestellung nicht gefunden oder bereits bestätigt.' }
      }
      setPersistSource('storage')
      return { ok: true }
    },
    [isLocal, repository, reloadFromBackend],
  )

  const recordGoodsReceipt = useCallback(
    async (
      orderId: string,
      input: { receiptDate: string; lines: GoodsReceiptLine[] },
    ): Promise<ActionResult & { receipt?: GoodsReceipt }> => {
      if (!isLocal) {
        if (!repository?.recordGoodsReceipt) {
          return { ok: false, message: 'Wareneingang-RPC nicht verfügbar.' }
        }
        setBackendBusy(true)
        try {
          const result = await repository.recordGoodsReceipt(orderId, input)
          if (result.ok) await reloadFromBackend()
          return result
        } finally {
          setBackendBusy(false)
        }
      }
      const order = purchase.orders.find((item) => item.id === orderId)
      if (!order) return { ok: false, message: 'Bestellung nicht gefunden.' }
      if (!order.confirmedAt) {
        return { ok: false, message: 'Wareneingang nur für bestätigte Bestellungen.' }
      }
      if (input.lines.length === 0) {
        return { ok: false, message: 'Bitte gelieferte Mengen angeben.' }
      }
      for (const line of input.lines) {
        if (!(line.quantity > 0)) {
          return { ok: false, message: 'Liefermengen müssen größer als 0 sein.' }
        }
      }
      const aggregated = aggregateReceiptQuantities(input.lines)
      for (const [orderLineId, quantity] of aggregated) {
        const remaining = remainingQuantityForLine(order, orderLineId, purchase.receipts)
        if (quantity > remaining) {
          return {
            ok: false,
            message: `Überlieferung verhindert (max. noch ${remaining}).`,
          }
        }
      }

      const now = new Date().toISOString()
      let receipt: GoodsReceipt | undefined

      setPurchase((prev) => {
        const current = prev.orders.find((item) => item.id === orderId)
        if (!current?.confirmedAt) return prev
        const aggregatedInUpdater = aggregateReceiptQuantities(input.lines)
        for (const [orderLineId, quantity] of aggregatedInUpdater) {
          const remaining = remainingQuantityForLine(current, orderLineId, prev.receipts)
          if (quantity > remaining) return prev
        }
        const nextReceipt: GoodsReceipt = {
          id: createId('gr'),
          number: formatGoodsReceiptNumber(prev.nextReceiptSequence),
          orderId,
          receiptDate: input.receiptDate,
          lines: input.lines.map((line) => ({ ...line })),
          createdAt: now,
        }
        // Rein lokal im Updater — kein geteiltes Array (Strict Mode).
        const newMoves = buildGoodsReceiptStockMovements({
          order: current,
          receipt: nextReceipt,
          lines: input.lines,
          products: sales.products,
          createMovementId: () => createId('sm'),
          createdAt: now,
        })
        receipt = nextReceipt
        return {
          ...prev,
          receipts: [...prev.receipts, nextReceipt],
          stockMovements: [...prev.stockMovements, ...newMoves],
          nextReceiptSequence: prev.nextReceiptSequence + 1,
          orders: prev.orders.map((item) =>
            item.id === orderId ? { ...item, updatedAt: now } : item,
          ),
        }
      })

      if (!receipt) {
        return { ok: false, message: 'Wareneingang konnte nicht gespeichert werden.' }
      }
      setPersistSource('storage')
      return { ok: true, receipt }
    },
    [isLocal, repository, reloadFromBackend, purchase.orders, purchase.receipts, sales.products],
  )

  const saveVendorInvoice = useCallback(
    async (
      input: Omit<
        VendorInvoice,
        'id' | 'internalNumber' | 'journalEntryIds' | 'createdAt' | 'updatedAt' | 'bookedAt'
      > & { id?: string; internalNumber?: string },
    ): Promise<ActionResult & { invoice?: VendorInvoice }> => {
      if (input.lines.length === 0) {
        return { ok: false, message: 'Mindestens eine Position ist erforderlich.' }
      }
      const now = new Date().toISOString()
      let saved: VendorInvoice | undefined
      let blocked = false
      setPurchase((prev) => {
        if (!prev.suppliers.some((supplier) => supplier.id === input.supplierId)) {
          blocked = true
          return prev
        }
        const existing = input.id
          ? prev.vendorInvoices.find((invoice) => invoice.id === input.id)
          : undefined
        if (existing && existing.journalEntryIds.length > 0) {
          blocked = true
          return prev
        }
        const invoice: VendorInvoice = {
          id: existing?.id ?? (isLocal ? createId('vinv') : ensureUuid(input.id)),
          externalNumber: input.externalNumber.trim(),
          internalNumber:
            existing?.internalNumber ??
            input.internalNumber ??
            formatVendorInvoiceNumber(prev.nextVendorInvoiceSequence),
          supplierId: input.supplierId,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          lines: input.lines.map((line) => ({
            ...line,
            id: isLocal ? line.id : ensureUuid(line.id),
          })),
          orderId: input.orderId,
          journalEntryIds: [],
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        saved = invoice
        return {
          ...prev,
          vendorInvoices: existing
            ? prev.vendorInvoices.map((item) =>
                item.id === existing.id ? invoice : item,
              )
            : [...prev.vendorInvoices, invoice],
          nextVendorInvoiceSequence: existing
            ? prev.nextVendorInvoiceSequence
            : prev.nextVendorInvoiceSequence + 1,
        }
      })
      if (blocked || !saved) {
        return {
          ok: false,
          message: 'Eingangsrechnung konnte nicht gespeichert werden.',
        }
      }

      if (!isLocal) {
        if (!repository?.saveVendorInvoice) {
          return {
            ok: false,
            message: 'Eingangsrechnung speichern ist online nicht verfügbar.',
          }
        }
        setBackendBusy(true)
        try {
          const result = await repository.saveVendorInvoice(saved)
          if (!result.ok) return result
          await reloadFromBackend()
          setPersistSource('supabase')
          return result
        } finally {
          setBackendBusy(false)
        }
      }

      setPersistSource('storage')
      return { ok: true, invoice: saved }
    },
    [isLocal, repository, reloadFromBackend],
  )

  const bookVendorInvoice = useCallback(
    async (invoiceId: string): Promise<ActionResult> => {
      if (!isLocal) {
        if (!repository) return { ok: false, message: 'Supabase-Repository nicht bereit.' }
        setBackendBusy(true)
        try {
          const result = await repository.bookVendorInvoice(invoiceId)
          if (result.ok) await reloadFromBackend()
          return result
        } finally {
          setBackendBusy(false)
        }
      }
      if (bookingLocks.current.has(`vbook:${invoiceId}`)) {
        return { ok: false, message: 'Buchung läuft bereits.' }
      }
      bookingLocks.current.add(`vbook:${invoiceId}`)
      try {
        const invoice = purchase.vendorInvoices.find((item) => item.id === invoiceId)
        if (!invoice) return { ok: false, message: 'Eingangsrechnung nicht gefunden.' }
        if (invoice.journalEntryIds.length > 0) {
          return { ok: false, message: 'Diese Eingangsrechnung wurde bereits gebucht.' }
        }
        const supplier = purchase.suppliers.find((item) => item.id === invoice.supplierId)
        const built = buildVendorInvoiceBookingDrafts(invoice, supplier)
        if (!built.ok) return built

        const createdEntries: JournalEntry[] = []
        for (const draft of built.drafts) {
          const result = validateJournalEntry(draft, chartOfAccounts)
          if (!result.ok) {
            return {
              ok: false,
              message: result.issues[0]?.message ?? 'Buchung ungültig.',
            }
          }
          createdEntries.push({
            ...result.entry,
            id: createJournalEntryId(),
            createdAt: new Date().toISOString(),
          })
        }
        const createdIds = createdEntries.map((entry) => entry.id)
        const bookedAt = new Date().toISOString()
        let linked = false
        setPurchase((prev) => {
          const current = prev.vendorInvoices.find((item) => item.id === invoiceId)
          if (!current || current.journalEntryIds.length > 0) return prev
          linked = true
          return {
            ...prev,
            vendorInvoices: prev.vendorInvoices.map((item) =>
              item.id === invoiceId
                ? {
                    ...item,
                    journalEntryIds: createdIds,
                    bookedAt,
                    updatedAt: bookedAt,
                  }
                : item,
            ),
          }
        })
        if (!linked) {
          return { ok: false, message: 'Diese Eingangsrechnung wurde bereits gebucht.' }
        }
        setEntries((prev) => [...createdEntries, ...prev])
        setPersistSource('storage')
        return { ok: true }
      } finally {
        bookingLocks.current.delete(`vbook:${invoiceId}`)
      }
    },
    [isLocal, repository, reloadFromBackend, purchase.vendorInvoices, purchase.suppliers],
  )

  const recordVendorPayment = useCallback(
    async (
      invoiceId: string,
      input: {
        date: string
        amountCents: number
        bankAccount: '1200' | '1000'
        reference?: string
      },
    ): Promise<ActionResult> => {
      if (!isLocal) {
        if (!repository) return { ok: false, message: 'Supabase-Repository nicht bereit.' }
        setBackendBusy(true)
        try {
          const result = await repository.recordVendorPayment(invoiceId, input)
          if (result.ok) await reloadFromBackend()
          return result
        } finally {
          setBackendBusy(false)
        }
      }
      const lockKey = `vpay:${invoiceId}`
      if (bookingLocks.current.has(lockKey)) {
        return { ok: false, message: 'Zahlung wird bereits verarbeitet.' }
      }
      bookingLocks.current.add(lockKey)
      try {
        const invoice = purchase.vendorInvoices.find((item) => item.id === invoiceId)
        if (!invoice) return { ok: false, message: 'Eingangsrechnung nicht gefunden.' }
        const built = buildVendorPaymentDraft(invoice, purchase.vendorPayments, input)
        if (!built.ok) return built
        const result = validateJournalEntry(built.draft, chartOfAccounts)
        if (!result.ok) {
          return {
            ok: false,
            message: result.issues[0]?.message ?? 'Zahlungsbuchung ungültig.',
          }
        }
        const entry: JournalEntry = {
          ...result.entry,
          id: createJournalEntryId(),
          createdAt: new Date().toISOString(),
        }
        const payment: VendorPayment = {
          id: createId('vpay'),
          invoiceId,
          date: input.date,
          amountCents: built.amountCents,
          bankAccount: input.bankAccount,
          reference: input.reference?.trim() || undefined,
          journalEntryId: entry.id,
          createdAt: entry.createdAt,
        }
        let accepted = false
        setPurchase((prev) => {
          const current = prev.vendorInvoices.find((item) => item.id === invoiceId)
          if (!current || current.journalEntryIds.length === 0) return prev
          const openCheck = buildVendorPaymentDraft(current, prev.vendorPayments, input)
          if (!openCheck.ok) return prev
          accepted = true
          return {
            ...prev,
            vendorPayments: [...prev.vendorPayments, payment],
            vendorInvoices: prev.vendorInvoices.map((item) =>
              item.id === invoiceId
                ? { ...item, updatedAt: new Date().toISOString() }
                : item,
            ),
          }
        })
        if (!accepted) {
          return { ok: false, message: 'Zahlung konnte nicht gespeichert werden.' }
        }
        setEntries((prev) => [entry, ...prev])
        setPersistSource('storage')
        return { ok: true }
      } finally {
        bookingLocks.current.delete(lockKey)
      }
    },
    [isLocal, repository, reloadFromBackend, purchase.vendorInvoices, purchase.vendorPayments],
  )

  const value = useMemo<AccountingContextValue>(
    () => ({
      entries: sortEntriesNewestFirst(entries),
      sales,
      purchase,
      learning,
      periodLabel: BOOKING_PERIOD_LABEL,
      totals: computeAccountingTotals(entries, BOOKING_PERIOD_LABEL),
      persistSource,
      persistWarning,
      isLocalDemoMode: isLocal,
      dataMode: mode,
      capabilities,
      backendBusy,
      reloadFromBackend,
      addEntry,
      resetToDemo,
      upsertCustomer,
      upsertProduct,
      saveDraftInvoice,
      bookInvoice,
      recordInvoicePayment,
      upsertSupplier,
      savePurchaseOrder,
      confirmPurchaseOrder,
      recordGoodsReceipt,
      saveVendorInvoice,
      bookVendorInvoice,
      recordVendorPayment,
      submitLearningAnswer,
      completeLearningTask,
      postLearningPracticeEntry,
    }),
    [
      entries,
      sales,
      purchase,
      learning,
      persistSource,
      persistWarning,
      isLocal,
      mode,
      capabilities,
      backendBusy,
      reloadFromBackend,
      addEntry,
      resetToDemo,
      upsertCustomer,
      upsertProduct,
      saveDraftInvoice,
      bookInvoice,
      recordInvoicePayment,
      upsertSupplier,
      savePurchaseOrder,
      confirmPurchaseOrder,
      recordGoodsReceipt,
      saveVendorInvoice,
      bookVendorInvoice,
      recordVendorPayment,
      submitLearningAnswer,
      completeLearningTask,
      postLearningPracticeEntry,
    ],
  )

  return (
    <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>
  )
}

export function useAccounting(): AccountingContextValue {
  const ctx = useContext(AccountingContext)
  if (!ctx) {
    throw new Error('useAccounting muss innerhalb von AccountingProvider verwendet werden.')
  }
  return ctx
}
