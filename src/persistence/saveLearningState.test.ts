import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { learningTasks } from '../data/learning-tasks'
import type { LearningState } from '../types/learning'
import { SupabaseWorkspaceRepository } from './supabaseWorkspaceRepository'

describe('saveLearningState', () => {
  it('upserts every code task id, including ones never seeded in learning_tasks', async () => {
    const upserts: Array<Record<string, unknown>> = []
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } } }),
      },
      from(table: string) {
        expect(table).toBe('learning_progress')
        return {
          upsert: async (row: Record<string, unknown>) => {
            upserts.push(row)
            return { error: null }
          },
        }
      },
    }
    const repo = new SupabaseWorkspaceRepository(
      client as unknown as SupabaseClient,
      'org-1',
    )
    const learning: LearningState = {
      progress: learningTasks.map((task) => ({
        taskId: task.id,
        attempts: 1,
        bestScore: 0,
        completed: false,
        lastAttemptAt: '2026-10-22T15:52:56.000Z',
      })),
      lastTaskId: learningTasks[0]?.id,
      totalPoints: 0,
    }

    const result = await repo.saveLearningState(learning)

    expect(result).toEqual({ ok: true })
    expect(upserts.map((row) => row.task_id)).toEqual([
      'lt-01',
      'lt-02',
      'lt-03',
      'lt-04',
      'lt-05',
      'lt-06',
      'lt-07',
      'lt-08',
      'lt-09',
      'lt-10',
      'lt-11',
      'lt-12',
      'lt-13',
      'lt-14',
      'lt-15',
    ])
    expect(upserts[0]).toMatchObject({
      organization_id: 'org-1',
      user_id: 'user-1',
      task_id: 'lt-01',
    })
  })
})
