import type { Account, JournalEntry, JournalLine } from '../../types/accounting'
import {
  chartOfAccounts,
  getAccountMap,
  UMSATZSTEUER_ACCOUNT,
  VORSTEUER_ACCOUNT,
} from '../../data/chart-of-accounts'
import { buildBalanceSheet } from '../../reports/balanceSheet'
import { buildIncomeStatement } from '../../reports/incomeStatement'
import type { AbschlussEvaluationResult } from '../types'
import { evaluateBalance, evaluateClosing, evaluateGuv } from './evaluate'
import {
  closeNominalAccounts,
  closeProfitToEquity,
  closeRealAccountsToSbk,
  EBK_ACCOUNT,
  solutionBalanceDraft,
  solutionClosingDraft,
  solutionGuvDraft,
  type SolvedCase,
} from './solve'
import { TRAINING_STORAGE_KEY, type TrainingStorage } from './progress'
import {
  type BalanceWorkDraft,
  type ClosingDraft,
  type GuvWorkDraft,
  type PhaseState,
} from './types'
/** Neuer Schlüssel, damit der alte erfundene Fall nicht in dieser Liste liegt. */
export const JOURNAL_PRACTICE_ID = 'journal-ueben'

export type JournalStepKind = 'eroeffnung' | 'vorfall' | 'abschluss' | 'guv' | 'bilanz'

export interface JournalStep {
  id: string
  kind: JournalStepKind
  title: string
  entryIds: string[]
}

export interface StepAccountDraft {
  accountNumber: string
  sumDebitCents: number
  sumCreditCents: number
  balanceCents: number
  side: 'soll' | 'haben'
}

export interface JournalPracticeProgress {
  caseId: typeof JOURNAL_PRACTICE_ID
  steps: Record<string, PhaseState>
  accounts: Record<string, StepAccountDraft[]>
  closing: ClosingDraft
  guv: GuvWorkDraft
  balance: BalanceWorkDraft
  fingerprints: Record<string, string>
  vatEnabled: boolean
}

const FOLLOW_UPS = ['abschluss', 'guv', 'bilanz'] as const

export function isOpeningEntry(entry: JournalEntry): boolean {
  return entry.lines.some((line) => line.accountNumber === EBK_ACCOUNT)
}

/** Journalreihenfolge, keine Sortierung nach Datum. */
export function buildJournalSteps(entries: JournalEntry[]): JournalStep[] {
  if (entries.length === 0) return []
  const opening = entries.filter(isOpeningEntry)
  const business = entries.filter((entry) => !isOpeningEntry(entry))
  const steps: JournalStep[] = []
  if (opening.length > 0) {
    steps.push({
      id: 'eroeffnung',
      kind: 'eroeffnung',
      title: 'Eröffnung',
      entryIds: opening.map((entry) => entry.id),
    })
  }
  for (const entry of business) {
    steps.push({
      id: `entry:${entry.id}`,
      kind: 'vorfall',
      title: `${entry.documentNumber} · ${entry.description}`,
      entryIds: [entry.id],
    })
  }
  steps.push(
    { id: 'abschluss', kind: 'abschluss', title: 'Abschluss', entryIds: [] },
    { id: 'guv', kind: 'guv', title: 'GuV', entryIds: [] },
    { id: 'bilanz', kind: 'bilanz', title: 'Schlussbilanz', entryIds: [] },
  )
  return steps
}

/**
 * Schalter aus: Steuerzeilen 260/480 verschwinden, der Betrag liegt brutto
 * auf dem Aufwands- oder Ertragskonto. Schalter an: Zeilen der Buchung bleiben.
 */
export function linesForPractice(
  entry: JournalEntry,
  vatEnabled: boolean,
  accounts: Account[] = chartOfAccounts,
): JournalLine[] {
  if (vatEnabled) return entry.lines.map((line) => ({ ...line }))
  const map = getAccountMap(accounts)
  let taxDebit = 0
  let taxCredit = 0
  const kept: JournalLine[] = []
  for (const line of entry.lines) {
    if (line.accountNumber === VORSTEUER_ACCOUNT || line.accountNumber === UMSATZSTEUER_ACCOUNT) {
      taxDebit += line.debitCents
      taxCredit += line.creditCents
      continue
    }
    kept.push({ ...line })
  }
  if (taxDebit > 0) {
    const expense =
      kept.find((line) => map.get(line.accountNumber)?.type === 'aufwand' && line.debitCents > 0) ??
      kept.find((line) => map.get(line.accountNumber)?.type === 'aufwand') ??
      kept.find((line) => line.debitCents > 0)
    if (expense) expense.debitCents += taxDebit
  }
  if (taxCredit > 0) {
    const revenue =
      kept.find((line) => map.get(line.accountNumber)?.type === 'ertrag' && line.creditCents > 0) ??
      kept.find((line) => map.get(line.accountNumber)?.type === 'ertrag') ??
      kept.find((line) => line.creditCents > 0)
    if (revenue) revenue.creditCents += taxCredit
  }
  return kept.filter((line) => line.debitCents > 0 || line.creditCents > 0)
}

export function entriesForPractice(
  entries: JournalEntry[],
  vatEnabled: boolean,
  accounts: Account[] = chartOfAccounts,
): JournalEntry[] {
  return entries.map((entry) => ({
    ...entry,
    lines: linesForPractice(entry, vatEnabled, accounts),
  }))
}

export function expectedStepAccounts(
  entries: JournalEntry[],
  step: JournalStep,
  vatEnabled: boolean,
  accounts: Account[] = chartOfAccounts,
): StepAccountDraft[] {
  const selected = entries.filter((entry) => step.entryIds.includes(entry.id))
  const grouped = new Map<string, { debit: number; credit: number }>()
  for (const entry of selected) {
    for (const line of linesForPractice(entry, vatEnabled, accounts)) {
      const current = grouped.get(line.accountNumber) ?? { debit: 0, credit: 0 }
      current.debit += line.debitCents
      current.credit += line.creditCents
      grouped.set(line.accountNumber, current)
    }
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([accountNumber, sums]) => {
      const signed = sums.debit - sums.credit
      return {
        accountNumber,
        sumDebitCents: sums.debit,
        sumCreditCents: sums.credit,
        balanceCents: Math.abs(signed),
        side: signed < 0 ? 'haben' as const : 'soll' as const,
      }
    })
}

export interface JournalSolution {
  entries: JournalEntry[]
  steps: JournalStep[]
  closingEntries: JournalEntry[]
  solved: SolvedCase
}

export function solveJournal(
  entries: JournalEntry[],
  vatEnabled: boolean,
  accounts: Account[] = chartOfAccounts,
): JournalSolution {
  const adjusted = entriesForPractice(entries, vatEnabled, accounts)
  const steps = buildJournalSteps(entries)
  const dates = adjusted.map((entry) => entry.date).sort()
  const asOf = dates[dates.length - 1] ?? '9999-12-31'
  const range = { from: dates[0] ?? '0000-01-01', to: asOf }
  const nominalClosing = closeNominalAccounts(adjusted, accounts)
  const resultClosing = closeProfitToEquity([...adjusted, ...nominalClosing])
  const afterResult = [...adjusted, ...nominalClosing, ...resultClosing]
  const sbkClosing = closeRealAccountsToSbk(afterResult, accounts)
  const income = buildIncomeStatement(adjusted, range, accounts)
  const balanceSheet = buildBalanceSheet(afterResult, asOf, accounts)
  const solved = {
    trainingCase: {
      id: JOURNAL_PRACTICE_ID,
      title: 'Journal',
      company: '',
      vatEnabled,
      asOf,
      range,
      assumptions: [],
      events: [],
      hints: {
        B: { general: '', accountClass: '', principle: '' },
        C: { general: '', accountClass: '', principle: '' },
        D: { general: '', accountClass: '', principle: '' },
        E: { general: '', accountClass: '', principle: '' },
        F: { general: '', accountClass: '', principle: '' },
        G: { general: '', accountClass: '', principle: '' },
      },
    },
    operational: adjusted,
    byEventId: new Map(adjusted.map((entry) => [entry.id, entry])),
    nominalClosing,
    resultClosing,
    sbkClosing,
    worksheets: [],
    income,
    balanceSheet,
    profitCents: income.resultCents,
  } satisfies SolvedCase
  return {
    entries: adjusted,
    steps,
    closingEntries: [...nominalClosing, ...resultClosing, ...sbkClosing],
    solved,
  }
}

export function evaluateStepAccounts(
  expected: StepAccountDraft[],
  draft: StepAccountDraft[],
): AbschlussEvaluationResult {
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const byNumber = new Map(draft.map((row) => [row.accountNumber.trim(), row]))
  for (const row of expected) {
    const given = byNumber.get(row.accountNumber)
    if (!given) {
      criteria.push(criterion(`step:${row.accountNumber}`, row.accountNumber, false, 'Konto fehlt.'))
      continue
    }
    const ok =
      given.sumDebitCents === row.sumDebitCents &&
      given.sumCreditCents === row.sumCreditCents &&
      given.balanceCents === row.balanceCents &&
      (row.balanceCents === 0 || given.side === row.side)
    criteria.push(
      criterion(
        `step:${row.accountNumber}`,
        row.accountNumber,
        ok,
        ok ? 'Soll, Haben und Saldo stimmen mit diesem Vorgang überein.' : 'Soll, Haben oder Saldo weicht von diesem Vorgang ab.',
      ),
    )
  }
  const known = new Set(expected.map((row) => row.accountNumber))
  for (const row of draft) {
    if (!row.accountNumber.trim() || known.has(row.accountNumber.trim())) continue
    criteria.push(
      criterion(`step:extra:${row.accountNumber}`, row.accountNumber, false, 'Dieses Konto gehört nicht zu diesem Vorgang.'),
    )
  }
  if (criteria.length === 0) {
    criteria.push(criterion('step:empty', 'Vorgang', false, 'Keine Konten.'))
  }
  return pack(criteria, 'Dieser Vorgang stimmt.', 'Dieser Vorgang stimmt noch nicht.')
}

function criterion(
  id: string,
  label: string,
  ok: boolean,
  feedback: string,
): AbschlussEvaluationResult['criteria'][number] {
  return { id, label, ok, points: ok ? 1 : 0, maxPoints: 1, feedback }
}

function pack(
  criteria: AbschlussEvaluationResult['criteria'],
  okText: string,
  badText: string,
): AbschlussEvaluationResult {
  const score = criteria.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = criteria.reduce((sum, item) => sum + item.maxPoints, 0)
  const fullyCorrect = criteria.length > 0 && criteria.every((item) => item.ok)
  return {
    score,
    maxPoints,
    fullyCorrect,
    criteria,
    summary: fullyCorrect ? okText : badText,
  }
}

function freshPhase(): PhaseState {
  return { status: 'offen', viewed: false, started: false, hintStage: 0, evaluation: null }
}

export function emptyJournalProgress(vatEnabled: boolean): JournalPracticeProgress {
  return {
    caseId: JOURNAL_PRACTICE_ID,
    steps: {},
    accounts: {},
    closing: { entries: [{ lines: [{ accountNumber: '', debitCents: 0, creditCents: 0 }, { accountNumber: '', debitCents: 0, creditCents: 0 }] }] },
    guv: { rows: [], totalExpenseCents: 0, totalRevenueCents: 0, resultCents: 0, resultKind: '' },
    balance: { rows: [], sbkAccount: '', sbkSollCents: 0, sbkHabenCents: 0, totalAssetsCents: 0, totalPassivaCents: 0 },
    fingerprints: {},
    vatEnabled,
  }
}

function fingerprint(entry: JournalEntry, vatEnabled: boolean): string {
  return JSON.stringify(linesForPractice(entry, vatEnabled).map((line) => [line.accountNumber, line.debitCents, line.creditCents]))
}

export function syncJournalProgress(
  saved: JournalPracticeProgress | null,
  entries: JournalEntry[],
  vatEnabled: boolean,
): JournalPracticeProgress {
  const next = structuredClone(saved && saved.caseId === JOURNAL_PRACTICE_ID ? saved : emptyJournalProgress(vatEnabled))
  const steps = buildJournalSteps(entries)
  const ids = new Set(steps.map((step) => step.id))
  for (const id of Object.keys(next.steps)) {
    if (!ids.has(id)) {
      delete next.steps[id]
      delete next.accounts[id]
      delete next.fingerprints[id]
    }
  }
  let followUpsDirty = Boolean(saved) && saved!.vatEnabled !== vatEnabled
  for (const step of steps) {
    if (!next.steps[step.id]) next.steps[step.id] = freshPhase()
    if (step.kind !== 'eroeffnung' && step.kind !== 'vorfall') continue
    const fp = step.entryIds
      .map((id) => fingerprint(entries.find((entry) => entry.id === id)!, vatEnabled))
      .join('|')
    if (next.fingerprints[step.id] && next.fingerprints[step.id] !== fp) {
      const phase = next.steps[step.id]
      if (phase.status === 'korrekt' || phase.status === 'fehlerhaft') {
        phase.status = 'in_bearbeitung'
        phase.evaluation = null
        if (phase.hintStage === 4) phase.hintStage = 3
      }
      followUpsDirty = true
    }
    next.fingerprints[step.id] = fp
  }
  if (followUpsDirty) clearFollowUps(next)
  next.vatEnabled = vatEnabled
  return next
}

function clearFollowUps(progress: JournalPracticeProgress): void {
  for (const id of FOLLOW_UPS) {
    const phase = progress.steps[id]
    if (!phase) continue
    if (phase.status === 'offen' && !phase.viewed && !phase.started) continue
    phase.evaluation = null
    if (phase.hintStage === 4) phase.hintStage = 3
    if (phase.status === 'korrekt' || phase.status === 'fehlerhaft' || phase.status === 'uebersprungen') {
      phase.status = 'in_bearbeitung'
    }
  }
}

export function journalLockReason(
  progress: JournalPracticeProgress,
  steps: JournalStep[],
  stepId: string,
): string | null {
  const step = steps.find((item) => item.id === stepId)
  if (!step || step.kind === 'eroeffnung' || step.kind === 'vorfall') return null
  const events = steps.filter((item) => item.kind === 'eroeffnung' || item.kind === 'vorfall')
  if (step.kind === 'abschluss' && events.some((item) => progress.steps[item.id]?.status !== 'korrekt')) {
    return 'Gesperrt: erst wenn jeder Vorgang Korrekt ist.'
  }
  if (step.kind === 'guv' && progress.steps.abschluss?.status !== 'korrekt') {
    return 'Gesperrt: Abschluss ist nicht Korrekt.'
  }
  if (step.kind === 'bilanz' && progress.steps.guv?.status !== 'korrekt') {
    return 'Gesperrt: GuV ist nicht Korrekt.'
  }
  return null
}

export function openJournalStep(progress: JournalPracticeProgress, stepId: string): JournalPracticeProgress {
  const next = structuredClone(progress)
  const phase = next.steps[stepId] ?? freshPhase()
  phase.viewed = true
  if (phase.status === 'offen') phase.status = 'in_bearbeitung'
  next.steps[stepId] = phase
  return next
}

export function setStepAccounts(
  progress: JournalPracticeProgress,
  stepId: string,
  rows: StepAccountDraft[],
): JournalPracticeProgress {
  const next = structuredClone(progress)
  next.accounts[stepId] = rows.map((row) => ({ ...row }))
  const phase = next.steps[stepId] ?? freshPhase()
  phase.viewed = true
  phase.started = true
  phase.evaluation = null
  phase.status = 'in_bearbeitung'
  next.steps[stepId] = phase
  clearFollowUps(next)
  return next
}

export function setJournalClosing(progress: JournalPracticeProgress, draft: ClosingDraft): JournalPracticeProgress {
  const next = structuredClone(progress)
  next.closing = structuredClone(draft)
  touchFollowUp(next, 'abschluss')
  clearLater('guv', next)
  clearLater('bilanz', next)
  return next
}

export function setJournalGuv(progress: JournalPracticeProgress, draft: GuvWorkDraft): JournalPracticeProgress {
  const next = structuredClone(progress)
  next.guv = structuredClone(draft)
  touchFollowUp(next, 'guv')
  clearLater('bilanz', next)
  return next
}

export function setJournalBalance(progress: JournalPracticeProgress, draft: BalanceWorkDraft): JournalPracticeProgress {
  const next = structuredClone(progress)
  next.balance = structuredClone(draft)
  touchFollowUp(next, 'bilanz')
  return next
}

function touchFollowUp(progress: JournalPracticeProgress, id: string): void {
  const phase = progress.steps[id] ?? freshPhase()
  phase.viewed = true
  phase.started = true
  phase.evaluation = null
  phase.status = 'in_bearbeitung'
  progress.steps[id] = phase
}

function clearLater(id: string, progress: JournalPracticeProgress): void {
  const phase = progress.steps[id]
  if (!phase || (phase.status === 'offen' && !phase.viewed)) return
  phase.evaluation = null
  if (phase.hintStage === 4) phase.hintStage = 3
  if (phase.status === 'korrekt' || phase.status === 'fehlerhaft') phase.status = 'in_bearbeitung'
}

export function checkJournalStep(
  progress: JournalPracticeProgress,
  stepId: string,
  entries: JournalEntry[],
  vatEnabled: boolean,
): JournalPracticeProgress {
  const solution = solveJournal(entries, vatEnabled)
  const step = solution.steps.find((item) => item.id === stepId)
  if (!step) return progress
  const next = structuredClone(progress)
  let evaluation: AbschlussEvaluationResult
  if (step.kind === 'eroeffnung' || step.kind === 'vorfall') {
    evaluation = evaluateStepAccounts(
      expectedStepAccounts(entries, step, vatEnabled),
      next.accounts[stepId] ?? [],
    )
  } else if (step.kind === 'abschluss') {
    evaluation = evaluateClosing(solution.solved, next.closing)
  } else if (step.kind === 'guv') {
    evaluation = evaluateGuv(solution.solved, next.guv)
  } else {
    evaluation = evaluateBalance(solution.solved, next.balance)
  }
  const phase = next.steps[stepId] ?? freshPhase()
  phase.viewed = true
  phase.evaluation = evaluation
  if (evaluation.fullyCorrect) {
    phase.status = 'korrekt'
    phase.hintStage = 4
  } else {
    phase.status = 'fehlerhaft'
  }
  next.steps[stepId] = phase
  return next
}

export function solutionAccounts(entries: JournalEntry[], step: JournalStep, vatEnabled: boolean): StepAccountDraft[] {
  return expectedStepAccounts(entries, step, vatEnabled)
}

export function solutionClosing(entries: JournalEntry[], vatEnabled: boolean): ClosingDraft {
  return solutionClosingDraft(solveJournal(entries, vatEnabled).solved)
}

export function solutionGuv(entries: JournalEntry[], vatEnabled: boolean): GuvWorkDraft {
  return solutionGuvDraft(solveJournal(entries, vatEnabled).solved)
}

export function solutionBalance(entries: JournalEntry[], vatEnabled: boolean): BalanceWorkDraft {
  return solutionBalanceDraft(solveJournal(entries, vatEnabled).solved)
}

interface StoreFile {
  version: 1
  cases: Record<string, unknown>
}

function readStore(storage: TrainingStorage): StoreFile {
  const raw = storage.getItem(TRAINING_STORAGE_KEY)
  if (!raw) return { version: 1, cases: {} }
  try {
    const parsed = JSON.parse(raw) as StoreFile
    if (parsed?.version !== 1 || !parsed.cases) return { version: 1, cases: {} }
    return parsed
  } catch {
    return { version: 1, cases: {} }
  }
}

export function loadJournalProgress(
  storage: TrainingStorage,
  entries: JournalEntry[],
  vatEnabled: boolean,
): JournalPracticeProgress {
  const saved = readStore(storage).cases[JOURNAL_PRACTICE_ID] as JournalPracticeProgress | undefined
  return syncJournalProgress(saved ?? null, entries, vatEnabled)
}

export function saveJournalProgress(storage: TrainingStorage, progress: JournalPracticeProgress): void {
  const store = readStore(storage)
  store.cases[JOURNAL_PRACTICE_ID] = progress
  storage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(store))
}

export function resetJournalProgress(
  storage: TrainingStorage,
  entries: JournalEntry[],
  vatEnabled: boolean,
): JournalPracticeProgress {
  const fresh = syncJournalProgress(null, entries, vatEnabled)
  saveJournalProgress(storage, fresh)
  return fresh
}

export const JOURNAL_STEP_HINTS: Record<JournalStepKind, { general: string; accountClass: string; principle: string }> = {
  eroeffnung: {
    general: 'Nur die Zeilen der Eröffnungsbuchung. Summiere jede Kontoseite selbst.',
    accountClass: 'Das Eröffnungsbilanzkonto steht in Klasse 8.',
    principle: 'Saldo ist die Differenz und steht auf der größeren Seite.',
  },
  vorfall: {
    general: 'Nur die Konten dieses einen Belegs. Andere Buchungen zählen hier nicht mit.',
    accountClass: 'Aufwand und Ertrag liegen in Klasse 5 und 6, Steuer in 260 und 480, wenn der Schalter an ist.',
    principle: 'Ist Umsatzsteuer aus, gibt es keine Steuerzeile: Netto und Brutto stehen auf dem Aufwands- oder Ertragskonto.',
  },
  abschluss: {
    general: 'Eine eigene Prüfung. Jede Abschlussbuchung muss für sich ausgleichen.',
    accountClass: 'Erfolgskonten über 802, Ergebnis auf 335, Bestandskonten über 801.',
    principle: 'Fehlt die Abschlussbuchung, ist dieser Schritt nicht korrekt — auch wenn die Vorgänge stimmen.',
  },
  guv: {
    general: 'Dieselben Erfolgssalden, keine zweite Tabelle.',
    accountClass: 'Aufwand im Soll, Ertrag im Haben.',
    principle: 'Gewinn ist Ertrag minus Aufwand.',
  },
  bilanz: {
    general: 'Dieselben Bestandssalden inklusive des Ergebnisses im Eigenkapital.',
    accountClass: 'Aktiva, Passiva, Eigenkapital. Schlussbilanzkonto 801.',
    principle: 'Gleiche Summen mit falscher Zuordnung gelten nicht.',
  },
}
