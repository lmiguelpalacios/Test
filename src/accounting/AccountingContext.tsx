import {
  createContext,
  useCallback,
  useContext,
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
import {
  createJournalEntryId,
  initialJournalEntries,
} from '../data/journal-entries'
import { validateJournalEntry } from './validateEntry'
import {
  BOOKING_PERIOD_LABEL,
  computeAccountingTotals,
  sortEntriesNewestFirst,
} from './totals'

type AddEntryResult =
  | { ok: true; entry: JournalEntry }
  | { ok: false; issues: ValidationIssue[] }

interface AccountingContextValue {
  entries: JournalEntry[]
  periodLabel: string
  totals: ReturnType<typeof computeAccountingTotals>
  addEntry: (draft: JournalEntryDraft) => AddEntryResult
}

const AccountingContext = createContext<AccountingContextValue | null>(null)

export function AccountingProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialJournalEntries)

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
    return { ok: true, entry }
  }, [])

  const value = useMemo<AccountingContextValue>(() => {
    const sorted = sortEntriesNewestFirst(entries)
    return {
      entries: sorted,
      periodLabel: BOOKING_PERIOD_LABEL,
      totals: computeAccountingTotals(entries, BOOKING_PERIOD_LABEL),
      addEntry,
    }
  }, [entries, addEntry])

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
