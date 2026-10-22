import { describe, expect, it } from 'vitest'
import { learningTasks } from '../data/learning-tasks'
import { validateJournalEntry } from '../accounting/validateEntry'
import { chartOfAccounts } from '../data/chart-of-accounts'
import { expectedTAccountsAsDraft } from '../abschluss/expectedBalances'
import { balanceSheetSolutionDraft } from '../abschluss/evaluateBalanceSheet'
import { evaluateLearningAnswer, solutionToPracticeDraft } from './evaluateAnswer'

describe('Lernmodus-Bewertung', () => {
  it('bewertet Musterlösungen aller Buchungsaufgaben als vollständig richtig', () => {
    const bookingTasks = learningTasks.filter((task) => task.kind === 'booking')
    expect(bookingTasks.length).toBe(12)
    for (const task of bookingTasks) {
      const result = evaluateLearningAnswer(task, {
        kind: 'booking',
        answer: task.solution,
      })
      expect(result.fullyCorrect).toBe(true)
      expect(result.score).toBe(task.maxPoints)
      const draft = solutionToPracticeDraft(task)
      const validated = validateJournalEntry(draft, chartOfAccounts)
      expect(validated.ok).toBe(true)
    }
  })

  it('gibt Teilpunkte und erklärendes Feedback bei Fehlern', () => {
    const task = learningTasks.find((item) => item.id === 'lt-04')!
    if (task.kind !== 'booking') throw new Error('expected booking')
    const result = evaluateLearningAnswer(task, {
      kind: 'booking',
      answer: {
        debitAccount: '3400',
        creditAccount: '1200',
        netAmountCents: 1_00_000,
        vatRate: 0,
      },
    })
    expect(result.fullyCorrect).toBe(false)
    expect(result.score).toBe(2)
    expect(result.criteria.find((c) => c.id === 'credit')?.ok).toBe(false)
    expect(result.criteria.find((c) => c.id === 'vat')?.feedback).toMatch(
      /Steuersatz|USt/,
    )
  })

  it('erklärt Brutto-als-Netto-Verwechslung bei Zahlungen', () => {
    const task = learningTasks.find((item) => item.id === 'lt-05')!
    if (task.kind !== 'booking') throw new Error('expected booking')
    const result = evaluateLearningAnswer(task, {
      kind: 'booking',
      answer: {
        ...task.solution,
        netAmountCents: 1_00_000,
      },
    })
    expect(result.criteria.find((c) => c.id === 'amount')?.ok).toBe(false)
  })

  it('bewertet Abschluss-T-Konten-Aufgabe gegen Fixture-Journal', () => {
    const task = learningTasks.find((item) => item.id === 'lt-13')!
    if (task.kind !== 't_accounts') throw new Error('expected t_accounts')
    const draft = expectedTAccountsAsDraft(task.fixtureEntries, task.asOf)
    const result = evaluateLearningAnswer(task, {
      kind: 't_accounts',
      draft,
    })
    expect(result.fullyCorrect).toBe(true)
    expect(result.score).toBe(task.maxPoints)
  })

  it('bewertet Abschluss-Bilanz-Aufgabe gegen Fixture-Journal', () => {
    const task = learningTasks.find((item) => item.id === 'lt-14')!
    if (task.kind !== 'bilanz') throw new Error('expected bilanz')
    const draft = balanceSheetSolutionDraft(task.fixtureEntries, task.asOf)
    const result = evaluateLearningAnswer(task, {
      kind: 'bilanz',
      draft,
    })
    expect(result.fullyCorrect).toBe(true)
    expect(result.score).toBe(task.maxPoints)
  })
})
