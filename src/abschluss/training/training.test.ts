import { describe, expect, it } from 'vitest'
import { JOURNAL_STORAGE_KEY } from '../../accounting/journalStore'
import { VORSTEUER_ACCOUNT, UMSATZSTEUER_ACCOUNT } from '../../data/chart-of-accounts'
import { initialJournalEntries } from '../../data/journal-entries'
import type { JournalEntry } from '../../types/accounting'
import {
  buildJournalSteps,
  checkJournalStep,
  emptyJournalProgress,
  evaluateStepAccounts,
  JOURNAL_PRACTICE_ID,
  linesForPractice,
  loadJournalProgress,
  openJournalStep,
  resetJournalProgress,
  saveJournalProgress,
  setStepAccounts,
  solutionAccounts,
  solutionClosing,
  syncJournalProgress,
} from './journalPractice'
import { nordlichtCase } from './nordlichtCase'
import {
  createInitialProgress,
  loadCaseProgress,
  saveCaseProgress,
  TRAINING_STORAGE_KEY,
  type TrainingStorage,
} from './progress'
import { solveTrainingCase } from './solve'

function memory(): TrainingStorage & { keys(): string[] } {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
    keys: () => [...data.keys()],
  }
}

function passEvents(entries: JournalEntry[], vatEnabled: boolean) {
  const steps = buildJournalSteps(entries)
  let progress = syncJournalProgress(null, entries, vatEnabled)
  for (const step of steps) {
    if (step.kind !== 'vorfall' && step.kind !== 'eroeffnung') continue
    progress = setStepAccounts(progress, step.id, solutionAccounts(entries, step, vatEnabled))
    progress = checkJournalStep(progress, step.id, entries, vatEnabled)
  }
  return { progress, steps }
}

describe('Abschluss üben aus dem Journal', () => {
  it('folgt der Journalreihenfolge und erzwingt keine Sortierung', () => {
    const reversed = [...initialJournalEntries].reverse()
    const steps = buildJournalSteps(reversed)
    const events = steps.filter((step) => step.kind === 'vorfall')
    expect(events.map((step) => step.entryIds[0])).toEqual(reversed.map((entry) => entry.id))
    expect(steps.some((step) => step.kind === 'eroeffnung')).toBe(false)
    expect(steps.at(-3)?.kind).toBe('abschluss')
    expect(steps.at(-2)?.kind).toBe('guv')
    expect(steps.at(-1)?.kind).toBe('bilanz')
  })

  it('erfindet keine Eröffnung ohne Konto 800', () => {
    expect(buildJournalSteps(initialJournalEntries).some((step) => step.id === 'eroeffnung')).toBe(false)
    const opening: JournalEntry = {
      ...initialJournalEntries[0],
      id: 'je-open',
      documentNumber: 'EB-1',
      description: 'Eröffnung',
      lines: [
        { accountNumber: '280', debitCents: 100, creditCents: 0 },
        { accountNumber: '800', debitCents: 0, creditCents: 100 },
      ],
    }
    const steps = buildJournalSteps([opening, initialJournalEntries[0]])
    expect(steps[0]).toMatchObject({ id: 'eroeffnung', entryIds: ['je-open'] })
    expect(steps[1].entryIds).toEqual([initialJournalEntries[0].id])
  })

  it('lässt einen falschen Vorgang die anderen korrekt', () => {
    const entries = initialJournalEntries.slice(0, 3)
    const { progress, steps } = passEvents(entries, true)
    const events = steps.filter((step) => step.kind === 'vorfall')
    expect(events.every((step) => progress.steps[step.id].status === 'korrekt')).toBe(true)
    const wrong = solutionAccounts(entries, events[1], true).map((row) => ({
      ...row,
      balanceCents: row.balanceCents + 1,
    }))
    const edited = checkJournalStep(
      setStepAccounts(progress, events[1].id, wrong),
      events[1].id,
      entries,
      true,
    )
    expect(edited.steps[events[0].id].status).toBe('korrekt')
    expect(edited.steps[events[1].id].status).toBe('fehlerhaft')
    expect(edited.steps[events[2].id].status).toBe('korrekt')
    expect(edited.steps.abschluss?.status ?? 'offen').not.toBe('korrekt')
  })

  it('wertet den Abschluss falsch, wenn die Abschlussbuchung fehlt', () => {
    const entries = initialJournalEntries.slice(0, 2)
    const { progress } = passEvents(entries, true)
    const checked = checkJournalStep(
      { ...progress, closing: { entries: [] } },
      'abschluss',
      entries,
      true,
    )
    expect(checked.steps.abschluss.status).toBe('fehlerhaft')
    expect(checked.steps.abschluss.evaluation?.fullyCorrect).toBe(false)
    const solved = checkJournalStep(
      { ...progress, closing: solutionClosing(entries, true) },
      'abschluss',
      entries,
      true,
    )
    expect(solved.steps.abschluss.status).toBe('korrekt')
  })

  it('erwartet ohne Umsatzsteuer keine 260 und keine 480', () => {
    const entry = initialJournalEntries[0]
    const on = linesForPractice(entry, true)
    const off = linesForPractice(entry, false)
    expect(on.some((line) => line.accountNumber === VORSTEUER_ACCOUNT)).toBe(true)
    expect(off.some((line) => line.accountNumber === VORSTEUER_ACCOUNT || line.accountNumber === UMSATZSTEUER_ACCOUNT)).toBe(false)
    const gross = on.reduce((sum, line) => sum + line.debitCents, 0)
    const expense = off.find((line) => line.accountNumber === '608')
    expect(expense?.debitCents).toBe(gross)
    const step = buildJournalSteps([entry])[0]
    const expected = solutionAccounts([entry], step, false)
    expect(expected.every((row) => row.accountNumber !== '260' && row.accountNumber !== '480')).toBe(true)
    expect(evaluateStepAccounts(expected, expected).fullyCorrect).toBe(true)
  })

  it('setzt Öffnen nicht auf Korrekt und löscht nur diesen Übungsstand', () => {
    const entries = initialJournalEntries.slice(0, 1)
    const opened = openJournalStep(syncJournalProgress(null, entries, true), 'entry:je-001')
    expect(opened.steps['entry:je-001'].status).toBe('in_bearbeitung')
    const storage = memory()
    saveCaseProgress(storage, createInitialProgress(nordlichtCase))
    saveJournalProgress(storage, emptyJournalProgress(true))
    storage.setItem(JOURNAL_STORAGE_KEY, 'workspace')
    const reset = resetJournalProgress(storage, entries, true)
    expect(reset.caseId).toBe(JOURNAL_PRACTICE_ID)
    expect(reset.steps['entry:je-001']?.status ?? 'offen').not.toBe('korrekt')
    expect(loadCaseProgress(storage, nordlichtCase).caseId).toBe(nordlichtCase.id)
    expect(storage.getItem(JOURNAL_STORAGE_KEY)).toBe('workspace')
    expect(storage.keys().filter((key) => key !== JOURNAL_STORAGE_KEY)).toEqual([TRAINING_STORAGE_KEY])
    const reloaded = loadJournalProgress(storage, entries, true)
    expect(reloaded.caseId).toBe(JOURNAL_PRACTICE_ID)
    expect(reloaded.caseId).not.toBe(nordlichtCase.id)
  })

  it('behält den Nordlicht-Fall für den Lernmodus ohne Sortierzwang', () => {
    const solved = solveTrainingCase(nordlichtCase)
    expect(solved.balanceSheet.balanced).toBe(true)
    expect(nordlichtCase.events.map((event) => event.id)).toEqual(
      nordlichtCase.events.map((event) => event.id),
    )
    expect(solved.byEventId.get('ev-02-einkauf')?.lines.some((line) => line.accountNumber === '260')).toBe(true)
  })
})
