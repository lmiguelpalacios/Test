import { describe, expect, it } from 'vitest'
import {
  JOURNAL_STORAGE_KEY,
  cloneDemoWorkspace,
  createMemoryStorage,
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
} from '../accounting/journalStore'
import { createDemoSalesState } from '../data/sales-demo'

describe('Verkaufs-Persistenz im Workspace', () => {
  it('speichert und lädt Verkaufsdaten zusammen mit dem Journal', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    saveWorkspace(demo, storage)
    const loaded = loadWorkspace(storage)
    expect(loaded.source).toBe('storage')
    expect(loaded.sales.invoices.length).toBe(demo.sales.invoices.length)
    expect(loaded.entries.length).toBe(demo.entries.length)
  })

  it('migriert Journal v1 und ergänzt Demo-Verkaufsdaten', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    storage.setItem(
      JOURNAL_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        entries: demo.entries,
      }),
    )
    const loaded = loadWorkspace(storage)
    expect(loaded.entries.length).toBe(demo.entries.length)
    expect(loaded.sales.customers.length).toBeGreaterThan(0)
    expect(loaded.warning).toMatch(/Migration/i)
  })

  it('setzt Journal und Verkauf gemeinsam zurück', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    demo.sales = createDemoSalesState()
    demo.sales.invoices = demo.sales.invoices.slice(0, 1)
    saveWorkspace(demo, storage)
    const reset = resetWorkspace(storage)
    expect(reset.sales.invoices.length).toBe(createDemoSalesState().invoices.length)
  })
})
