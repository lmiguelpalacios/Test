import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  JournalEntry,
  JournalEntryDraft,
  ValidationIssue,
} from '../types/accounting'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { createJournalEntryId } from '../data/journal-entries'
import { validateJournalEntry } from './validateEntry'
import {
  BOOKING_PERIOD_LABEL,
  computeAccountingTotals,
  sortEntriesNewestFirst,
} from './totals'
import {
  loadJournalEntries,
  resetJournalEntries,
  saveJournalEntries,
  type JournalLoadSource,
} from './journalStore'

type AddEntryResult =
  | { ok: true; entry: JournalEntry }
  | { ok: false; issues: ValidationIssue[] }

interface AccountingContextValue {
  entries: JournalEntry[]
  periodLabel: string
  totals: ReturnType<typeof computeAccountingTotals>
  persistSource: JournalLoadSource
  persistWarning?: string
  isLocalDemoMode: true
  addEntry: (draft: JournalEntryDraft) => AddEntryResult
  resetToDemo: () => void
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

export function AccountingProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const storage = getBrowserStorage()
    if (!storage) {
      return {
        entries: loadJournalEntries({
          getItem: () => null,
          setItem: () => undefined,
          removeItem: () => undefined,
        }).entries,
        source: 'demo' as const,
        warning: 'localStorage ist nicht verfügbar — Änderungen bleiben nicht erhalten.',
      }
    }
    const loaded = loadJournalEntries(storage)
    return {
      entries: loaded.entries,
      source: loaded.source,
      warning: loaded.warning,
    }
  }, [])

  const [entries, setEntries] = useState<JournalEntry[]>(initial.entries)
  const [persistSource, setPersistSource] = useState<JournalLoadSource>(initial.source)
  const [persistWarning, setPersistWarning] = useState<string | undefined>(
    initial.warning,
  )

  useEffect(() => {
    const storage = getBrowserStorage()
    if (!storage) return
    try {
      saveJournalEntries(entries, storage)
    } catch {
      setPersistWarning(
        'Journal konnte nicht im Browser gespeichert werden (localStorage voll oder blockiert).',
      )
    }
  }, [entries])

  const addEntry = useCallback((draft: JournalEntryDraft): AddEntryResult => {
    const result = validateJournalEntry(draft, chartOfAccounts)
    if (!result.ok) {
      return result
    }
    const entry: JournalEntry = {
      ...result.entry,
      id: createJournalEntryId(),
      createdAt: new Date().toISOString(),
    }
    setEntries((prev) => [entry, ...prev])
    setPersistSource('storage')
    return { ok: true, entry }
  }, [])

  const resetToDemo = useCallback(() => {
    const storage = getBrowserStorage()
    if (!storage) {
      setEntries(loadJournalEntries({
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      }).entries)
      setPersistWarning('localStorage ist nicht verfügbar — Demo nur im Arbeitsspeicher geladen.')
      setPersistSource('demo')
      return
    }
    const demo = resetJournalEntries(storage)
    setEntries(demo)
    setPersistSource('demo')
    setPersistWarning(undefined)
  }, [])

  const value = useMemo<AccountingContextValue>(() => {
    const sorted = sortEntriesNewestFirst(entries)
    return {
      entries: sorted,
      periodLabel: BOOKING_PERIOD_LABEL,
      totals: computeAccountingTotals(entries, BOOKING_PERIOD_LABEL),
      persistSource,
      persistWarning,
      isLocalDemoMode: true,
      addEntry,
      resetToDemo,
    }
  }, [entries, persistSource, persistWarning, addEntry, resetToDemo])

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
