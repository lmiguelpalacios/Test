import { describe, expect, it } from 'vitest'
import { learningTasks } from '../data/learning-tasks'
import { validateJournalEntry } from '../accounting/validateEntry'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { evaluateLearningAnswer, solutionToPracticeDraft } from './evaluateAnswer'

describe('Lernmodus-Bewertung', () => {
  it('bewertet Musterlösungen aller Demo-Aufgaben als vollständig richtig', () => {
    expect(learningTasks.length).toBeGreaterThanOrEqual(10)
    for (const task of learningTasks) {
      const result = evaluateLearningAnswer(task, task.solution)
      expect(result.fullyCorrect).toBe(true)
      expect(result.score).toBe(task.maxPoints)
      const draft = solutionToPracticeDraft(task)
      const validated = validateJournalEntry(draft, chartOfAccounts)
      expect(validated.ok).toBe(true)
    }
  })

  it('gibt Teilpunkte und erklärendes Feedback bei Fehlern', () => {
    const task = learningTasks.find((item) => item.id === 'lt-04')!
    const result = evaluateLearningAnswer(task, {
      debitAccount: '3400',
      creditAccount: '1200',
      netAmountCents: 1_00_000,
      vatRate: 0,
    })
    expect(result.fullyCorrect).toBe(false)
    expect(result.score).toBe(2)
    expect(result.criteria.find((c) => c.id === 'credit')?.ok).toBe(false)
    expect(result.criteria.find((c) => c.id === 'vat')?.feedback).toMatch(/Steuersatz|USt/)
  })

  it('erklärt Brutto-als-Netto-Verwechslung bei Zahlungen', () => {
    const task = learningTasks.find((item) => item.id === 'lt-05')!
    const result = evaluateLearningAnswer(task, {
      ...task.solution,
      netAmountCents: 1_00_000,
    })
    expect(result.criteria.find((c) => c.id === 'amount')?.ok).toBe(false)
  })
})
