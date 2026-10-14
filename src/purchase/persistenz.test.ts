import { describe, expect, it } from 'vitest'
import {
  JOURNAL_STORAGE_KEY,
  cloneDemoWorkspace,
  createMemoryStorage,
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
} from '../accounting/journalStore'
import { createDemoPurchaseState } from '../data/purchase-demo'
import { createDemoSalesState } from '../data/sales-demo'

describe('Einkaufs-Persistenz Workspace', () => {
  it('speichert und lädt Einkaufsdaten mit dem Journal', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    saveWorkspace(demo, storage)
    const loaded = loadWorkspace(storage)
    expect(loaded.purchase.suppliers.length).toBe(demo.purchase.suppliers.length)
    expect(loaded.purchase.vendorInvoices.length).toBe(
      demo.purchase.vendorInvoices.length,
    )
  })

  it('migriert v2 → v3 und ergänzt Einkaufs-Demo', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      JOURNAL_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        savedAt: new Date().toISOString(),
        entries: cloneDemoWorkspace().entries,
        sales: createDemoSalesState(),
      }),
    )
    const loaded = loadWorkspace(storage)
    expect(loaded.purchase.suppliers.length).toBeGreaterThan(0)
    expect(loaded.warning).toMatch(/v2/i)
  })

  it('setzt Verkauf und Einkauf gemeinsam zurück', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    demo.purchase = {
      ...createDemoPurchaseState(),
      suppliers: createDemoPurchaseState().suppliers.slice(0, 1),
    }
    saveWorkspace(demo, storage)
    const reset = resetWorkspace(storage)
    expect(reset.purchase.suppliers.length).toBe(
      createDemoPurchaseState().suppliers.length,
    )
  })
})
