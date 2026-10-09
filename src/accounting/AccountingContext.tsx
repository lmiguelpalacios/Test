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
  Customer,
  InvoicePayment,
  SalesInvoice,
  SalesState,
} from '../types/sales'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { createJournalEntryId } from '../data/journal-entries'
import { createId, formatInvoiceNumber } from '../data/sales-demo'
import { validateJournalEntry } from './validateEntry'
import {
  BOOKING_PERIOD_LABEL,
  computeAccountingTotals,
  sortEntriesNewestFirst,
} from './totals'
import {
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
  type JournalLoadSource,
} from './journalStore'
import { buildInvoiceBookingDrafts } from '../sales/bookInvoice'
import { buildPaymentBookingDraft } from '../sales/recordPayment'
import { validateInvoiceLine } from '../sales/invoiceMath'

type AddEntryResult =
  | { ok: true; entry: JournalEntry }
  | { ok: false; issues: ValidationIssue[] }

type ActionResult = { ok: true } | { ok: false; message: string }

interface AccountingContextValue {
  entries: JournalEntry[]
  sales: SalesState
  periodLabel: string
  totals: ReturnType<typeof computeAccountingTotals>
  persistSource: JournalLoadSource
  persistWarning?: string
  isLocalDemoMode: true
  addEntry: (draft: JournalEntryDraft) => AddEntryResult
  resetToDemo: () => void
  upsertCustomer: (customer: Omit<Customer, 'id'> & { id?: string }) => Customer
  saveDraftInvoice: (
    input: Omit<SalesInvoice, 'id' | 'number' | 'journalEntryIds' | 'createdAt' | 'updatedAt' | 'bookedAt'> & {
      id?: string
      number?: string
    },
  ) => ActionResult & { invoice?: SalesInvoice }
  bookInvoice: (invoiceId: string) => ActionResult
  recordInvoicePayment: (
    invoiceId: string,
    input: {
      date: string
      amountCents: number
      bankAccount: '1200' | '1000'
      reference?: string
    },
  ) => ActionResult
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

export function AccountingProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const storage = getBrowserStorage()
    if (!storage) {
      const loaded = loadWorkspace(noopStorage())
      return {
        ...loaded,
        warning: 'localStorage ist nicht verfügbar — Änderungen bleiben nicht erhalten.',
      }
    }
    return loadWorkspace(storage)
  }, [])

  const [entries, setEntries] = useState<JournalEntry[]>(initial.entries)
  const [sales, setSales] = useState<SalesState>(initial.sales)
  const [persistSource, setPersistSource] = useState<JournalLoadSource>(initial.source)
  const [persistWarning, setPersistWarning] = useState<string | undefined>(
    initial.warning,
  )
  const bookingLocks = useRef(new Set<string>())

  useEffect(() => {
    const storage = getBrowserStorage()
    if (!storage) return
    try {
      saveWorkspace({ entries, sales }, storage)
    } catch {
      setPersistWarning(
        'Daten konnten nicht im Browser gespeichert werden (localStorage voll oder blockiert).',
      )
    }
  }, [entries, sales])

  const commitDrafts = useCallback((drafts: JournalEntryDraft[]): AddEntryResult => {
    const created: JournalEntry[] = []
    for (const draft of drafts) {
      const result = validateJournalEntry(draft, chartOfAccounts)
      if (!result.ok) {
        return result
      }
      created.push({
        ...result.entry,
        id: createJournalEntryId(),
        createdAt: new Date().toISOString(),
      })
    }
    setEntries((prev) => [...created, ...prev])
    setPersistSource('storage')
    return { ok: true, entry: created[0]! }
  }, [])

  const addEntry = useCallback(
    (draft: JournalEntryDraft): AddEntryResult => commitDrafts([draft]),
    [commitDrafts],
  )

  const resetToDemo = useCallback(() => {
    const storage = getBrowserStorage() ?? noopStorage()
    const demo = resetWorkspace(storage)
    setEntries(demo.entries)
    setSales(demo.sales)
    setPersistSource('demo')
    setPersistWarning(
      getBrowserStorage()
        ? undefined
        : 'localStorage ist nicht verfügbar — Demo nur im Arbeitsspeicher geladen.',
    )
  }, [])

  const upsertCustomer = useCallback(
    (input: Omit<Customer, 'id'> & { id?: string }): Customer => {
      const customer: Customer = {
        id: input.id ?? createId('cust'),
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
      setPersistSource('storage')
      return customer
    },
    [],
  )

  const saveDraftInvoice = useCallback(
    (
      input: Omit<
        SalesInvoice,
        'id' | 'number' | 'journalEntryIds' | 'createdAt' | 'updatedAt' | 'bookedAt'
      > & { id?: string; number?: string },
    ): ActionResult & { invoice?: SalesInvoice } => {
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
          id: existing?.id ?? createId('inv'),
          number:
            existing?.number ??
            input.number ??
            formatInvoiceNumber(prev.nextInvoiceSequence),
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          customerId: input.customerId,
          lines: input.lines.map((line) => ({ ...line })),
          journalEntryIds: [],
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        saved = invoice

        const invoices = existing
          ? prev.invoices.map((item) => (item.id === existing.id ? invoice : item))
          : [...prev.invoices, invoice]

        return {
          ...prev,
          invoices,
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

      setPersistSource('storage')
      return { ok: true, invoice: saved }
    },
    [],
  )

  const bookInvoice = useCallback(
    (invoiceId: string): ActionResult => {
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

        setEntries((prev) => [...createdEntries, ...prev])
        setPersistSource('storage')
        return { ok: true }
      } finally {
        bookingLocks.current.delete(`book:${invoiceId}`)
      }
    },
    [sales.invoices, sales.customers],
  )

  const recordInvoicePayment = useCallback(
    (
      invoiceId: string,
      input: {
        date: string
        amountCents: number
        bankAccount: '1200' | '1000'
        reference?: string
      },
    ): ActionResult => {
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
    [sales.invoices, sales.payments],
  )

  const value = useMemo<AccountingContextValue>(() => {
    const sorted = sortEntriesNewestFirst(entries)
    return {
      entries: sorted,
      sales,
      periodLabel: BOOKING_PERIOD_LABEL,
      totals: computeAccountingTotals(entries, BOOKING_PERIOD_LABEL),
      persistSource,
      persistWarning,
      isLocalDemoMode: true,
      addEntry,
      resetToDemo,
      upsertCustomer,
      saveDraftInvoice,
      bookInvoice,
      recordInvoicePayment,
    }
  }, [
    entries,
    sales,
    persistSource,
    persistWarning,
    addEntry,
    resetToDemo,
    upsertCustomer,
    saveDraftInvoice,
    bookInvoice,
    recordInvoicePayment,
  ])

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
