import { describe, expect, it } from 'vitest'
import {
  JOURNAL_STORAGE_KEY,
  cloneDemoWorkspace,
  createMemoryStorage,
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
} from '../accounting/journalStore'
import { createEmptyLearningState } from '../data/learning-tasks'

describe('Lernmodus-Persistenz Workspace v4', () => {
  it('speichert und lädt Lernfortschritt mit dem Workspace', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    demo.learning = {
      progress: [
        {
          taskId: 'lt-01',
          attempts: 2,
          bestScore: 4,
          completed: true,
          lastAttemptAt: '2026-10-12T10:00:00',
        },
      ],
      lastTaskId: 'lt-01',
      totalPoints: 4,
    }
    saveWorkspace(demo, storage)
    const loaded = loadWorkspace(storage)
    expect(loaded.learning.totalPoints).toBe(4)
    expect(loaded.learning.progress[0]?.taskId).toBe('lt-01')
    expect(loaded.learning.progress[0]?.completed).toBe(true)
  })

  it('migriert v3 → v4 rückwärtskompatibel ohne Journalverlust', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    storage.setItem(
      JOURNAL_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        savedAt: new Date().toISOString(),
        entries: demo.entries,
        sales: demo.sales,
        purchase: demo.purchase,
      }),
    )
    const loaded = loadWorkspace(storage)
    expect(loaded.entries).toHaveLength(demo.entries.length)
    expect(loaded.learning.progress).toEqual([])
    expect(loaded.warning).toMatch(/v3/i)
  })

  it('Reset löscht Lernfortschritt zusammen mit Demo-Workspace', () => {
    const storage = createMemoryStorage()
    const demo = cloneDemoWorkspace()
    demo.learning = {
      progress: [
        {
          taskId: 'lt-02',
          attempts: 1,
          bestScore: 3,
          completed: false,
        },
      ],
      totalPoints: 0,
    }
    saveWorkspace(demo, storage)
    const reset = resetWorkspace(storage)
    expect(reset.learning).toEqual(createEmptyLearningState())
  })

  it('Lernfortschritt allein erzeugt keine Journalbuchungen', () => {
    const storage = createMemoryStorage()
    const before = cloneDemoWorkspace()
    const entryCount = before.entries.length
    before.learning = {
      progress: [
        {
          taskId: 'lt-03',
          attempts: 1,
          bestScore: 4,
          completed: true,
        },
      ],
      totalPoints: 4,
    }
    saveWorkspace(before, storage)
    const loaded = loadWorkspace(storage)
    expect(loaded.entries).toHaveLength(entryCount)
    expect(loaded.learning.totalPoints).toBe(4)
  })
})
