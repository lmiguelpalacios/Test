import { describe, expect, it } from 'vitest'
import evaluateSource from './evaluate.ts?raw'
import nordlichtSource from './nordlichtCase.ts?raw'
import postEntrySource from './postEntry.ts?raw'
import progressSource from './progress.ts?raw'
import solveSource from './solve.ts?raw'
import typesSource from './types.ts?raw'
import { JOURNAL_STORAGE_KEY } from '../../accounting/journalStore'
import { validateJournalEntry } from '../../accounting/validateEntry'
import { chartOfAccounts } from '../../data/chart-of-accounts'
import { buildBalanceSheet } from '../../reports/balanceSheet'
import { buildIncomeStatement } from '../../reports/incomeStatement'
import {
  evaluateBalance,
  evaluateClosing,
  evaluateEventOrder,
  evaluateGuv,
  evaluatePostings,
  evaluateTAccounts,
} from './evaluate'
import { cogsCents, NORDLICHT_FACTS, nordlichtCase } from './nordlichtCase'
import {
  canonicalEventIds,
  checkPhase,
  createInitialProgress,
  isCaseComplete,
  lockReason,
  loadCaseProgress,
  openPhase,
  resetCaseProgress,
  saveCaseProgress,
  setPosting,
  TRAINING_PERSISTENCE,
  TRAINING_STORAGE_KEY,
  type TrainingStorage,
} from './progress'
import { postSimpleBooking } from './postEntry'
import {
  closeNominalAccounts,
  closeProfitToEquity,
  signedBalances,
  solutionBalanceDraft,
  solutionClosingDraft,
  solutionGuvDraft,
  solutionTDrafts,
  solveTrainingCase,
  worksheetsMatchJournal,
} from './solve'
import { PHASE_IDS, type CaseProgress, type TrainingCase } from './types'

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

function withSolutionPostings(progress: CaseProgress): CaseProgress {
  const solved = solveTrainingCase(nordlichtCase)
  let next = progress
  for (const event of nordlichtCase.events) {
    next = setPosting(
      next,
      event.id,
      solved.byEventId.get(event.id)!.lines.map((line) => ({ ...line })),
    )
  }
  return next
}

function correctProgress(): CaseProgress {
  let progress = withSolutionPostings(createInitialProgress(nordlichtCase))
  progress = {
    ...progress,
    eventOrder: canonicalEventIds(nordlichtCase),
    tAccounts: solutionTDrafts(solveTrainingCase(nordlichtCase)),
    closing: solutionClosingDraft(solveTrainingCase(nordlichtCase)),
    guv: solutionGuvDraft(solveTrainingCase(nordlichtCase)),
    balance: solutionBalanceDraft(solveTrainingCase(nordlichtCase)),
  }
  for (const phase of ['A', 'B', 'C', 'D', 'E', 'F'] as const) {
    progress = checkPhase(progress, phase, nordlichtCase)
  }
  return progress
}

describe('Geführtes Abschluss-Training', () => {
  const solved = solveTrainingCase(nordlichtCase)

  it('ordnet Phasen und Vorfälle stabil und chronologisch', () => {
    expect(PHASE_IDS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    const ids = nordlichtCase.events.map((event) => event.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(canonicalEventIds(nordlichtCase)).toEqual(ids)
    const dates = nordlichtCase.events.map((event) => event.date)
    expect([...dates].sort()).toEqual(dates)
    const initial = createInitialProgress(nordlichtCase)
    expect(initial.eventOrder).not.toEqual(ids)
    expect(evaluateEventOrder(ids, ids).fullyCorrect).toBe(true)
    expect(evaluateEventOrder(ids, initial.eventOrder).fullyCorrect).toBe(false)
  })

  it('erkennt richtige und falsche Buchungen', () => {
    const progress = withSolutionPostings(createInitialProgress(nordlichtCase))
    expect(evaluatePostings(solved, progress.postings).fullyCorrect).toBe(true)
    const wrong = progress.postings['ev-03-verkauf'].lines.map((line) => ({ ...line }))
    wrong[0] = { ...wrong[0], accountNumber: '282' }
    const failed = evaluatePostings(solved, {
      ...progress.postings,
      'ev-03-verkauf': { lines: wrong },
    })
    expect(failed.fullyCorrect).toBe(false)
  })

  it('erkennt vertauschte Soll- und Habenseiten', () => {
    const progress = withSolutionPostings(createInitialProgress(nordlichtCase))
    const swapped = progress.postings['ev-03-verkauf'].lines.map((line) => ({
      accountNumber: line.accountNumber,
      debitCents: line.creditCents,
      creditCents: line.debitCents,
    }))
    const failed = evaluatePostings(solved, {
      ...progress.postings,
      'ev-03-verkauf': { lines: swapped },
    })
    expect(failed.criteria.some((item) => item.id === 'event:ev-03-verkauf:debit_credit')).toBe(true)
    expect(failed.fullyCorrect).toBe(false)
  })

  it('erkennt abweichende Beträge', () => {
    const progress = withSolutionPostings(createInitialProgress(nordlichtCase))
    const lines = progress.postings['ev-07-zinsen'].lines.map((line) => ({ ...line }))
    const debit = lines.find((line) => line.debitCents > 0)!
    const credit = lines.find((line) => line.creditCents > 0)!
    debit.debitCents += 1
    credit.creditCents += 1
    const failed = evaluatePostings(solved, {
      ...progress.postings,
      'ev-07-zinsen': { lines },
    })
    expect(failed.criteria.some((item) => item.id === 'event:ev-07-zinsen:amount')).toBe(true)
    expect(failed.fullyCorrect).toBe(false)
  })

  it('erkennt fehlende Zeilen', () => {
    const progress = withSolutionPostings(createInitialProgress(nordlichtCase))
    const lines = progress.postings['ev-02-einkauf'].lines.slice(0, 2)
    const failed = evaluatePostings(solved, {
      ...progress.postings,
      'ev-02-einkauf': { lines },
    })
    expect(failed.criteria.some((item) => item.id === 'event:ev-02-einkauf:missing_line')).toBe(true)
    expect(failed.fullyCorrect).toBe(false)
  })

  it('lässt zusammengesetzte Buchungen mit mehr als zwei Zeilen zu', () => {
    const opening = solved.byEventId.get('ev-01-eroeffnung')!
    expect(opening.lines.length).toBeGreaterThan(2)
    const purchase = solved.byEventId.get('ev-02-einkauf')!
    expect(purchase.lines.length).toBe(3)
    const progress = withSolutionPostings(createInitialProgress(nordlichtCase))
    expect(evaluatePostings(solved, progress.postings).fullyCorrect).toBe(true)
    const onlyTwo = { ...progress.postings, 'ev-01-eroeffnung': { lines: opening.lines.slice(0, 2) } }
    expect(evaluatePostings(solved, onlyTwo).fullyCorrect).toBe(false)
  })

  it('lässt T-Konten mit dem Journal übereinstimmen', () => {
    expect(worksheetsMatchJournal(solved.operational, solved.worksheets)).toBe(true)
    expect(evaluateTAccounts(solved, solutionTDrafts(solved)).fullyCorrect).toBe(true)
    const wrong = solutionTDrafts(solved).map((draft) =>
      draft.accountNumber === '280' ? { ...draft, balanceCents: draft.balanceCents + 1 } : draft,
    )
    expect(evaluateTAccounts(solved, wrong).fullyCorrect).toBe(false)
  })

  it('leitet Salden, Wareneinsatz und Steuer aus dem Journal ab', () => {
    const goods = solved.worksheets.find((sheet) => sheet.accountNumber === '608')!
    const stock = solved.worksheets.find((sheet) => sheet.accountNumber === '221')!
    expect(goods.balanceCents).toBe(cogsCents())
    expect(goods.side).toBe('soll')
    expect(stock.balanceCents).toBe(NORDLICHT_FACTS.endingGoodsCents)
    expect(stock.balanceCents).not.toBe(
      NORDLICHT_FACTS.openingGoodsCents + NORDLICHT_FACTS.purchaseNetCents,
    )
    const purchase = solved.byEventId.get('ev-02-einkauf')!
    const einkauf = nordlichtCase.events.find((event) => event.id === 'ev-02-einkauf')!
    if (einkauf.booking.kind !== 'simple') throw new Error('Einkauf ist eine einfache Buchung')
    const validated = validateJournalEntry(einkauf.booking.draft, chartOfAccounts, { vatEnabled: true })
    expect(validated.ok).toBe(true)
    if (validated.ok) expect(validated.entry.lines).toEqual(purchase.lines)
    expect(purchase.lines.some((line) => line.accountNumber === '260' && line.debitCents > 0)).toBe(true)
    const sale = solved.byEventId.get('ev-03-verkauf')!
    expect(sale.lines.some((line) => line.accountNumber === '480' && line.creditCents > 0)).toBe(true)
  })

  it('leitet Abschlussbuchungen ab und weist auf unausgeglichene Buchungen hin', () => {
    expect(evaluateClosing(solved, solutionClosingDraft(solved)).fullyCorrect).toBe(true)
    const closed = [
      ...solved.operational,
      ...solved.nominalClosing,
      ...solved.resultClosing,
      ...solved.sbkClosing,
    ]
    for (const [, signed] of signedBalances(closed)) {
      expect(signed).toBe(0)
    }
    const unbalanced = evaluateClosing(solved, {
      entries: [{ lines: [{ accountNumber: '608', debitCents: 100, creditCents: 0 }] }],
    })
    expect(unbalanced.fullyCorrect).toBe(false)
    expect(unbalanced.criteria.some((item) => item.feedback.includes('Hinweis'))).toBe(true)
    const compound = {
      entries: [
        {
          lines: [...solved.nominalClosing, ...solved.resultClosing, ...solved.sbkClosing].flatMap(
            (entry) => entry.lines,
          ),
        },
      ],
    }
    expect(evaluateClosing(solved, compound).fullyCorrect).toBe(true)
  })

  it('baut die GuV aus den Erfolgssalden', () => {
    const income = buildIncomeStatement(solved.operational, nordlichtCase.range)
    expect(solved.income).toEqual(income)
    expect(evaluateGuv(solved, solutionGuvDraft(solved)).fullyCorrect).toBe(true)
    const swapped = solutionGuvDraft(solved)
    const expenses = swapped.rows.filter((row) => row.side === 'aufwand')
    expect(expenses.length).toBeGreaterThan(1)
    const first = expenses[0].amountCents
    expenses[0].amountCents = expenses[1].amountCents
    expenses[1].amountCents = first
    expect(swapped.totalExpenseCents).toBe(income.totalExpenseCents)
    expect(evaluateGuv(solved, swapped).fullyCorrect).toBe(false)
  })

  it('bewertet Gewinn und Verlust', () => {
    expect(solved.profitCents).toBe(388_000)
    expect(solutionGuvDraft(solved).resultKind).toBe('gewinn')
    const asLoss = { ...solutionGuvDraft(solved), resultKind: 'verlust' as const }
    expect(evaluateGuv(solved, asLoss).criteria.find((item) => item.id === 'guv:result')?.ok).toBe(false)
    const lossEntries = [
      postSimpleBooking(
        'loss-expense',
        {
          kind: 'simple',
          draft: {
            date: '2026-12-01',
            documentNumber: 'V-1',
            description: 'Aufwand für den Verlustfall',
            debitAccount: '600',
            creditAccount: '280',
            netAmountCents: 250_00,
            vatRate: 0,
          },
        },
        chartOfAccounts,
        true,
      ),
      postSimpleBooking(
        'loss-revenue',
        {
          kind: 'simple',
          draft: {
            date: '2026-12-02',
            documentNumber: 'E-1',
            description: 'Erlös für den Verlustfall',
            debitAccount: '280',
            creditAccount: '500',
            netAmountCents: 100_00,
            vatRate: 0,
          },
        },
        chartOfAccounts,
        true,
      ),
    ]
    const closing = closeProfitToEquity(closeNominalAccounts(lossEntries))
    expect(closing).toHaveLength(1)
    expect(closing[0].lines).toEqual([
      { accountNumber: '335', debitCents: 150_00, creditCents: 0 },
      { accountNumber: '802', debitCents: 0, creditCents: 150_00 },
    ])
  })

  it('ordnet die Schlussbilanz zu und übernimmt das Ergebnis ins Eigenkapital', () => {
    const sheet = buildBalanceSheet(
      [...solved.operational, ...solved.nominalClosing, ...solved.resultClosing],
      nordlichtCase.asOf,
    )
    expect(solved.balanceSheet).toEqual(sheet)
    expect(sheet.balanced).toBe(true)
    expect(sheet.totalAssetsCents).toBe(4_204_000)
    expect(sheet.periodResultCents).toBe(0)
    const resultRow = sheet.equityAccounts.find((row) => row.accountNumber === '335')
    expect(resultRow?.amountCents).toBe(solved.profitCents)
    expect(evaluateBalance(solved, solutionBalanceDraft(solved)).fullyCorrect).toBe(true)
    expect(solutionBalanceDraft(solved).sbkAccount).toBe('801')
  })

  it('lehnt eine ausgeglichene, aber falsch zugeordnete Schlussbilanz ab', () => {
    const draft = solutionBalanceDraft(solved)
    expect(draft.totalAssetsCents).toBe(draft.totalPassivaCents)
    const bank = draft.rows.find((row) => row.accountNumber === '280')!
    const payable = draft.rows.find((row) => row.accountNumber === '44')!
    bank.section = 'passiva'
    payable.section = 'aktiva'
    expect(draft.totalAssetsCents).toBe(draft.totalPassivaCents)
    const evaluation = evaluateBalance(solved, draft)
    expect(evaluation.fullyCorrect).toBe(false)
    expect(evaluation.criteria.some((item) => item.id.startsWith('bilanz:') && !item.ok)).toBe(true)
  })

  it('invalidiert spätere Phasen, wenn eine frühere Buchung geändert wird', () => {
    const done = correctProgress()
    expect(done.phases.C.status).toBe('korrekt')
    expect(done.phases.F.status).toBe('korrekt')
    const kept = done.tAccounts
    const changed = setPosting(done, 'ev-07-zinsen', [
      { accountNumber: '280', debitCents: 1, creditCents: 0 },
      { accountNumber: '571', debitCents: 0, creditCents: 1 },
    ])
    expect(changed.phases.B.status).toBe('in_bearbeitung')
    expect(changed.phases.C.status).toBe('in_bearbeitung')
    expect(changed.phases.E.status).toBe('in_bearbeitung')
    expect(changed.phases.F.status).toBe('in_bearbeitung')
    expect(changed.tAccounts).toEqual(kept)
    expect(changed.phases.C.evaluation).toBeNull()
  })

  it('behält den Fortschritt beim Neuladen', () => {
    const storage = memory()
    const done = correctProgress()
    saveCaseProgress(storage, done)
    expect(loadCaseProgress(storage, nordlichtCase)).toEqual(done)
  })

  it('trennt Fälle und lässt andere Arbeitsdaten stehen', () => {
    const storage = memory()
    const done = correctProgress()
    saveCaseProgress(storage, done)
    const other: TrainingCase = {
      ...nordlichtCase,
      id: 'anderer-fall',
      title: 'Anderer Fall',
      events: nordlichtCase.events.slice(0, 1),
    }
    const otherProgress = createInitialProgress(other)
    otherProgress.eventOrder = ['ev-01-eroeffnung']
    saveCaseProgress(storage, otherProgress)
    storage.setItem(JOURNAL_STORAGE_KEY, '{"workspace":true}')
    const reset = resetCaseProgress(storage, nordlichtCase)
    expect(reset.phases.A.status).toBe('offen')
    expect(loadCaseProgress(storage, other).eventOrder).toEqual(['ev-01-eroeffnung'])
    expect(storage.getItem(JOURNAL_STORAGE_KEY)).toBe('{"workspace":true}')
    expect(storage.keys().filter((key) => key !== JOURNAL_STORAGE_KEY)).toEqual([TRAINING_STORAGE_KEY])
  })

  it('schließt den Fall nur nach bestandenen Prüfungen ab', () => {
    let progress = createInitialProgress(nordlichtCase)
    progress = openPhase(progress, 'A')
    expect(progress.phases.A.status).toBe('in_bearbeitung')
    expect(isCaseComplete(progress)).toBe(false)
    const checked = correctProgress()
    expect(checked.phases.G.status).not.toBe('korrekt')
    expect(isCaseComplete(checked)).toBe(false)
    const finished = checkPhase(checked, 'G', nordlichtCase)
    expect(finished.phases.G.status).toBe('korrekt')
    expect(isCaseComplete(finished)).toBe(true)
    const reopened = openPhase(finished, 'G')
    expect(reopened.phases.G.status).toBe('korrekt')
    const broken = checkPhase({ ...finished, phases: { ...finished.phases, B: { ...finished.phases.B, status: 'fehlerhaft' } } }, 'G', nordlichtCase)
    expect(broken.phases.G.status).toBe('fehlerhaft')
    expect(isCaseComplete(broken)).toBe(false)
  })

  it('wertet blosses Öffnen nicht als Korrekt und sperrt die nächste Phase', () => {
    const opened = openPhase(createInitialProgress(nordlichtCase), 'A')
    expect(opened.phases.A.status).toBe('in_bearbeitung')
    expect(opened.phases.A.viewed).toBe(true)
    expect(lockReason(opened, 'B')).toMatch(/Gesperrt/)
    expect(openPhase(opened, 'B')).toBe(opened)
    expect(lockReason(opened, 'G')).toBeNull()
  })

  it('rechnet den Fall ohne Supabase', () => {
    expect(TRAINING_PERSISTENCE).toBe('local')
    expect(solved.operational.length).toBe(nordlichtCase.events.length)
    expect(solved.balanceSheet.balanced).toBe(true)
    expect(solved.byEventId.get('ev-02-einkauf')?.lines.some((line) => line.accountNumber === '260')).toBe(true)
  })

  it('schreibt den Trainingsstand nicht nach Supabase', () => {
    const sources = [evaluateSource, nordlichtSource, postEntrySource, progressSource, solveSource, typesSource].join('\n')
    expect(sources).not.toMatch(/@supabase|supabase\/client|learning_progress|service_role/)
    const storage = memory()
    saveCaseProgress(storage, createInitialProgress(nordlichtCase))
    expect(storage.keys()).toEqual([TRAINING_STORAGE_KEY])
  })
})
