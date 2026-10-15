import { describe, expect, it } from 'vitest'
import { createMemoryStorage } from '../accounting/journalStore'
import { LOCAL_CAPABILITIES } from './localCapabilities'
import { LocalWorkspaceRepository } from './localWorkspaceRepository'

describe('LocalWorkspaceRepository', () => {
  it('loads and resets demo workspace without supabase', async () => {
    const storage = createMemoryStorage()
    const repo = new LocalWorkspaceRepository(storage)
    expect(repo.mode).toBe('local')
    expect(repo.capabilities).toEqual(LOCAL_CAPABILITIES)

    const loaded = await repo.load()
    expect(loaded.entries.length).toBeGreaterThan(0)
    expect(loaded.sales.invoices.length).toBeGreaterThan(0)

    const reset = await repo.resetToDemo!()
    expect(reset.source).toBe('demo')
    expect(reset.entries.length).toBe(loaded.entries.length)
  })

  it('keeps booking methods as context-owned in local mode', async () => {
    const repo = new LocalWorkspaceRepository(createMemoryStorage())
    const book = await repo.bookSalesInvoice('inv-demo')
    expect(book.ok).toBe(false)
    if (!book.ok) expect(book.message).toMatch(/AccountingContext/)
  })
})
