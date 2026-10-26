import { describe, expect, it } from 'vitest'
import { initialJournalEntries } from '../data/journal-entries'
import { isBalanced } from './money'
import { sumLines } from './validateEntry'
import {
  JOURNAL_STORAGE_KEY,
  JOURNAL_STORAGE_VERSION,
  clearJournalStorage,
  createMemoryStorage,
  cloneDemoWorkspace,
  loadJournalEntries,
  loadWorkspace,
  resetJournalEntries,
  saveJournalEntries,
  saveWorkspace,
  sanitizeEntries,
} from './journalStore'

describe('Journal-Persistenz (localStorage)', () => {
  it('speichert und lädt Buchungen ohne Duplikate', () => {
    const storage = createMemoryStorage()
    saveJournalEntries(initialJournalEntries, storage)
    const loaded = loadJournalEntries(storage)

    expect(loaded.source).toBe('storage')
    expect(loaded.entries).toHaveLength(initialJournalEntries.length)
    const ids = loaded.entries.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('setzt auf Demo-Daten zurück', () => {
    const storage = createMemoryStorage()
    saveJournalEntries(initialJournalEntries.slice(0, 2), storage)
    const reset = resetJournalEntries(storage)

    expect(reset).toHaveLength(initialJournalEntries.length)
    const loaded = loadJournalEntries(storage)
    expect(loaded.entries).toHaveLength(initialJournalEntries.length)
    expect(loaded.entries.map((e) => e.id)).toEqual(
      initialJournalEntries.map((e) => e.id),
    )
  })

  it('behandelt fehlerhafte Speicherdaten robust', () => {
    const storage = createMemoryStorage({
      [JOURNAL_STORAGE_KEY]: '{not-json',
    })
    const loaded = loadJournalEntries(storage)
    expect(loaded.source).toBe('recovered-demo')
    expect(loaded.entries.length).toBeGreaterThan(0)
    expect(loaded.warning).toBeTruthy()
  })

  it('verwirft veraltete Versionen und unausgeglichene Buchungen', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      JOURNAL_STORAGE_KEY,
      JSON.stringify({
        version: JOURNAL_STORAGE_VERSION + 10,
        savedAt: new Date().toISOString(),
        entries: initialJournalEntries,
      }),
    )
    const outdated = loadJournalEntries(storage)
    expect(outdated.source).toBe('recovered-demo')

    const broken = [
      {
        ...initialJournalEntries[0],
        lines: [
          { accountNumber: '608', debitCents: 100, creditCents: 0 },
          { accountNumber: '44', debitCents: 0, creditCents: 50 },
        ],
      },
      initialJournalEntries[1],
    ]
    const sanitized = sanitizeEntries(broken)
    expect(sanitized).toHaveLength(1)
    expect(sanitized[0]?.id).toBe(initialJournalEntries[1]?.id)
  })

  it('speichert vatEnabled und migriert v4 mit Standard an', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    saveWorkspace({ ...demo, vatEnabled: false }, storage)
    const off = loadWorkspace(storage)
    expect(off.vatEnabled).toBe(false)
    expect(off.source).toBe('storage')

    const v4 = createMemoryStorage()
    v4.setItem(
      JOURNAL_STORAGE_KEY,
      JSON.stringify({
        version: 4,
        savedAt: new Date().toISOString(),
        entries: demo.entries,
        sales: demo.sales,
        purchase: demo.purchase,
        learning: demo.learning,
      }),
    )
    const migrated = loadWorkspace(v4)
    expect(migrated.vatEnabled).toBe(true)
    expect(migrated.entries).toHaveLength(demo.entries.length)
    expect(migrated.warning).toMatch(/v4/)
    const stored = JSON.parse(v4.getItem(JOURNAL_STORAGE_KEY) ?? '{}') as {
      version: number
      vatEnabled: boolean
    }
    expect(stored.version).toBe(JOURNAL_STORAGE_VERSION)
    expect(stored.vatEnabled).toBe(true)
  })

  it('hält geladene Demo-Buchungen ausgeglichen', () => {
    const storage = createMemoryStorage()
    clearJournalStorage(storage)
    const loaded = loadJournalEntries(storage)
    for (const entry of loaded.entries) {
      const { debitCents, creditCents } = sumLines(entry.lines)
      expect(isBalanced(debitCents, creditCents)).toBe(true)
    }
  })

  it('erzeugt keine doppelten Buchungen beim erneuten Laden', () => {
    const storage = createMemoryStorage()
    const first = loadJournalEntries(storage)
    const second = loadJournalEntries(storage)
    expect(second.entries).toHaveLength(first.entries.length)
    expect(second.entries.map((e) => e.id).sort()).toEqual(
      first.entries.map((e) => e.id).sort(),
    )
  })
})
