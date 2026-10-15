import { describe, expect, it } from 'vitest'
import { createEmptyLearningState } from '../data/learning-tasks'
import { createDemoPurchaseState } from '../data/purchase-demo'
import { createDemoSalesState } from '../data/sales-demo'
import { initialJournalEntries } from '../data/journal-entries'
import {
  canonicalizeWorkspace,
  hashWorkspacePayload,
  previewWorkspaceCounts,
} from './workspaceHash'

describe('Workspace v4 import hash', () => {
  const payload = {
    entries: initialJournalEntries,
    sales: createDemoSalesState(),
    purchase: createDemoPurchaseState(),
    learning: createEmptyLearningState(),
  }

  it('produces stable canonicalize + sha-256', async () => {
    const a = canonicalizeWorkspace(payload)
    const b = canonicalizeWorkspace(payload)
    expect(a).toBe(b)
    const hash1 = await hashWorkspacePayload(payload)
    const hash2 = await hashWorkspacePayload(payload)
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('changes hash when content changes', async () => {
    const hash1 = await hashWorkspacePayload(payload)
    const hash2 = await hashWorkspacePayload({
      ...payload,
      learning: {
        ...payload.learning,
        totalPoints: 1,
        progress: [
          {
            taskId: 'task-1',
            attempts: 1,
            bestScore: 1,
            completed: true,
          },
        ],
      },
    })
    expect(hash1).not.toBe(hash2)
  })

  it('previews entity counts', () => {
    const counts = previewWorkspaceCounts(payload)
    expect(counts.journalEntries).toBe(payload.entries.length)
    expect(counts.customers).toBe(payload.sales.customers.length)
    expect(counts.salesInvoices).toBe(payload.sales.invoices.length)
  })
})
