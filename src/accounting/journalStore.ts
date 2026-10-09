import type { JournalEntry, JournalLine, VatRate } from '../types/accounting'
import { initialJournalEntries } from '../data/journal-entries'
import { isBalanced } from './money'
import { sumLines } from './validateEntry'

export const JOURNAL_STORAGE_KEY = 'nordlicht.uebungsunternehmen.journal.v1'
export const JOURNAL_STORAGE_VERSION = 1 as const

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface JournalPersistPayload {
  version: typeof JOURNAL_STORAGE_VERSION
  savedAt: string
  entries: JournalEntry[]
}

export type JournalLoadSource = 'storage' | 'demo' | 'recovered-demo'

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

/**
 * Prüft Struktur und Soll/Haben-Ausgleich.
 * Verändert gespeicherte Buchungsdaten nicht (keine Neu-Kontierung).
 */
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
    // Bewusst unverändert übernehmen (kein stilles Recompute der Lines).
    entries.push(item)
  }
  return entries
}

export function cloneDemoEntries(): JournalEntry[] {
  return initialJournalEntries.map((entry) => ({
    ...entry,
    lines: entry.lines.map((line) => ({ ...line })),
  }))
}

export function saveJournalEntries(
  entries: JournalEntry[],
  storage: StorageLike,
): void {
  const payload: JournalPersistPayload = {
    version: JOURNAL_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    entries,
  }
  storage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(payload))
}

export function clearJournalStorage(storage: StorageLike): void {
  storage.removeItem(JOURNAL_STORAGE_KEY)
}

export function resetJournalEntries(storage: StorageLike): JournalEntry[] {
  const demo = cloneDemoEntries()
  saveJournalEntries(demo, storage)
  return demo
}

export function loadJournalEntries(storage: StorageLike): JournalLoadResult {
  const raw = storage.getItem(JOURNAL_STORAGE_KEY)
  if (raw == null || raw.trim() === '') {
    const demo = cloneDemoEntries()
    saveJournalEntries(demo, storage)
    return { entries: demo, source: 'demo' }
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== JOURNAL_STORAGE_VERSION) {
      const demo = cloneDemoEntries()
      saveJournalEntries(demo, storage)
      return {
        entries: demo,
        source: 'recovered-demo',
        warning:
          'Gespeicherte Journaldaten waren veraltet oder ungültig und wurden auf die Demo-Daten zurückgesetzt.',
      }
    }

    const entries = sanitizeEntries(parsed.entries)
    if (entries.length === 0) {
      const demo = cloneDemoEntries()
      saveJournalEntries(demo, storage)
      return {
        entries: demo,
        source: 'recovered-demo',
        warning:
          'Gespeicherte Journaldaten enthielten keine gültigen Buchungen und wurden zurückgesetzt.',
      }
    }

    return { entries, source: 'storage' }
  } catch {
    const demo = cloneDemoEntries()
    saveJournalEntries(demo, storage)
    return {
      entries: demo,
      source: 'recovered-demo',
      warning:
        'Gespeicherte Journaldaten konnten nicht gelesen werden und wurden auf die Demo-Daten zurückgesetzt.',
    }
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
