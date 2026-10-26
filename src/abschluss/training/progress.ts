import {
  evaluateBalance,
  evaluateClosing,
  evaluateControl,
  evaluateGuv,
  evaluatePostings,
  evaluateTAccounts,
} from './evaluate'
import { solveTrainingCase } from './solve'
import {
  PHASE_IDS,
  PHASE_LABELS,
  type BalanceWorkDraft,
  type CaseProgress,
  type ClosingDraft,
  type EventPostingDraft,
  type GuvWorkDraft,
  type PhaseId,
  type PhaseState,
  type TAccountWorkDraft,
  type TrainingCase,
  type TrainingLine,
} from './types'

/** Nur dieses Browser-Feld. Kein Supabase-Schreiben. */
export const TRAINING_STORAGE_KEY = 'nordlicht.abschluss-training.v1'
export const TRAINING_PERSISTENCE = 'local' as const

export interface TrainingStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface StoreFile {
  version: 1
  cases: Record<string, CaseProgress>
}

const DOWNSTREAM: Record<PhaseId, PhaseId[]> = {
  B: ['C', 'D', 'E', 'F', 'G'],
  C: ['D', 'E', 'F', 'G'],
  D: ['E', 'F', 'G'],
  E: ['F', 'G'],
  F: ['G'],
  G: [],
}

export function blankLine(): TrainingLine {
  return { accountNumber: '', debitCents: 0, creditCents: 0 }
}

export function canonicalEventIds(trainingCase: TrainingCase): string[] {
  return trainingCase.events.map((event) => event.id)
}

export function createInitialProgress(trainingCase: TrainingCase): CaseProgress {
  const ids = canonicalEventIds(trainingCase)
  const postings: Record<string, EventPostingDraft> = {}
  for (const id of ids) postings[id] = { lines: [blankLine(), blankLine()] }
  return {
    caseId: trainingCase.id,
    phases: Object.fromEntries(PHASE_IDS.map((id) => [id, freshPhase()])) as CaseProgress['phases'],
    postings,
    tAccounts: [],
    closing: { entries: [{ lines: [blankLine(), blankLine()] }] },
    guv: emptyGuv(),
    balance: emptyBalance(),
    journalFingerprint: fingerprintPostings(postings),
  }
}

function freshPhase(): PhaseState {
  return {
    status: 'offen',
    viewed: false,
    started: false,
    hintStage: 0,
    evaluation: null,
  }
}

function emptyGuv(): GuvWorkDraft {
  return {
    rows: [],
    totalExpenseCents: 0,
    totalRevenueCents: 0,
    resultCents: 0,
    resultKind: '',
  }
}

function emptyBalance(): BalanceWorkDraft {
  return {
    rows: [],
    sbkAccount: '',
    sbkSollCents: 0,
    sbkHabenCents: 0,
    totalAssetsCents: 0,
    totalPassivaCents: 0,
  }
}

export function fingerprintPostings(postings: Record<string, EventPostingDraft>): string {
  const keys = Object.keys(postings).sort()
  return JSON.stringify(
    keys.map((key) => [
      key,
      postings[key].lines.map((line) => [line.accountNumber, line.debitCents, line.creditCents]),
    ]),
  )
}

export function lockReason(progress: CaseProgress, phaseId: PhaseId): string | null {
  const index = PHASE_IDS.indexOf(phaseId)
  if (index <= 0 || phaseId === 'G') return null
  const previous = PHASE_IDS[index - 1]
  if (progress.phases[previous].status === 'korrekt') return null
  const status = progress.phases[previous].status
  return `Gesperrt: ${previous} ${PHASE_LABELS[previous]} ist ${status === 'offen' ? 'noch offen' : status === 'uebersprungen' ? 'übersprungen' : 'nicht Korrekt'}.`
}

export function openPhase(progress: CaseProgress, phaseId: PhaseId): CaseProgress {
  if (lockReason(progress, phaseId)) return progress
  const next = clone(progress)
  const phase = next.phases[phaseId]
  phase.viewed = true
  if (phase.status === 'offen') phase.status = 'in_bearbeitung'
  return next
}

export function skipPhase(progress: CaseProgress, phaseId: PhaseId): CaseProgress {
  if (phaseId === 'G') return progress
  if (lockReason(progress, phaseId)) return progress
  const next = clone(progress)
  next.phases[phaseId].status = 'uebersprungen'
  next.phases[phaseId].viewed = true
  next.phases[phaseId].evaluation = null
  return invalidateDownstream(next, phaseId)
}

export function advanceHint(progress: CaseProgress, phaseId: PhaseId): CaseProgress {
  const next = clone(progress)
  const phase = next.phases[phaseId]
  if (phase.hintStage < 3) {
    phase.hintStage = (phase.hintStage + 1) as PhaseState['hintStage']
  }
  return next
}

export function revealSolution(
  progress: CaseProgress,
  phaseId: PhaseId,
): { progress: CaseProgress; allowed: boolean } {
  const phase = progress.phases[phaseId]
  const allowed =
    phase.status === 'korrekt' || (phase.status === 'fehlerhaft' && phase.hintStage >= 3)
  if (!allowed) return { progress, allowed: false }
  const next = clone(progress)
  next.phases[phaseId].hintStage = 4
  return { progress: next, allowed: true }
}

export function setPosting(
  progress: CaseProgress,
  eventId: string,
  lines: TrainingLine[],
): CaseProgress {
  const next = clone(progress)
  next.postings[eventId] = { lines: lines.map((line) => ({ ...line })) }
  next.journalFingerprint = fingerprintPostings(next.postings)
  markStarted(next, 'B')
  return invalidateDownstream(next, 'B')
}

export function setTAccounts(progress: CaseProgress, drafts: TAccountWorkDraft[]): CaseProgress {
  const next = clone(progress)
  next.tAccounts = drafts.map((draft) => ({ ...draft }))
  markStarted(next, 'C')
  return invalidateDownstream(next, 'C')
}

export function setClosing(progress: CaseProgress, draft: ClosingDraft): CaseProgress {
  const next = clone(progress)
  next.closing = clone(draft)
  markStarted(next, 'D')
  return invalidateDownstream(next, 'D')
}

export function setGuv(progress: CaseProgress, draft: GuvWorkDraft): CaseProgress {
  const next = clone(progress)
  next.guv = clone(draft)
  markStarted(next, 'E')
  return invalidateDownstream(next, 'E')
}

export function setBalance(progress: CaseProgress, draft: BalanceWorkDraft): CaseProgress {
  const next = clone(progress)
  next.balance = clone(draft)
  markStarted(next, 'F')
  return invalidateDownstream(next, 'F')
}

function markStarted(progress: CaseProgress, phaseId: PhaseId): void {
  const phase = progress.phases[phaseId]
  phase.viewed = true
  phase.started = true
  phase.evaluation = null
  if (phase.status !== 'in_bearbeitung') phase.status = 'in_bearbeitung'
}

function invalidateDownstream(progress: CaseProgress, phaseId: PhaseId): CaseProgress {
  for (const id of DOWNSTREAM[phaseId]) {
    const phase = progress.phases[id]
    if (phase.status === 'offen' && !phase.started && !phase.viewed) continue
    phase.evaluation = null
    if (phase.hintStage === 4) phase.hintStage = 3
    if (phase.status === 'korrekt' || phase.status === 'fehlerhaft' || phase.status === 'uebersprungen') {
      phase.status = 'in_bearbeitung'
    }
  }
  return progress
}

export function checkPhase(progress: CaseProgress, phaseId: PhaseId, trainingCase: TrainingCase): CaseProgress {
  if (progress.caseId !== trainingCase.id) return progress
  const solved = solveTrainingCase(trainingCase)
  const next = clone(progress)
  let evaluation = null
  if (phaseId === 'B') evaluation = evaluatePostings(solved, next.postings)
  else if (phaseId === 'C') evaluation = evaluateTAccounts(solved, next.tAccounts)
  else if (phaseId === 'D') evaluation = evaluateClosing(solved, next.closing)
  else if (phaseId === 'E') evaluation = evaluateGuv(solved, next.guv)
  else if (phaseId === 'F') evaluation = evaluateBalance(solved, next.balance)
  else evaluation = evaluateControl(next)

  const phase = next.phases[phaseId]
  phase.viewed = true
  phase.evaluation = evaluation
  if (evaluation.fullyCorrect) {
    phase.status = 'korrekt'
    phase.hintStage = 4
  } else if (phase.status !== 'uebersprungen' || phaseId === 'G') {
    phase.status = 'fehlerhaft'
  }
  return next
}

export function isCaseComplete(progress: CaseProgress): boolean {
  return progress.phases.G.status === 'korrekt' && evaluateControl(progress).fullyCorrect
}

export function mergeTAccountSeeds(
  drafts: TAccountWorkDraft[],
  accountNumbers: string[],
): TAccountWorkDraft[] {
  const next = drafts.map((draft) => ({ ...draft }))
  for (const accountNumber of accountNumbers) {
    if (next.some((draft) => draft.accountNumber === accountNumber)) continue
    next.push({
      accountNumber,
      sumDebitCents: 0,
      sumCreditCents: 0,
      balanceCents: 0,
      side: 'soll',
      closingAccount: '',
    })
  }
  return next.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
}

export function loadCaseProgress(storage: TrainingStorage, trainingCase: TrainingCase): CaseProgress {
  const store = readStore(storage)
  const saved = store.cases[trainingCase.id]
  if (!saved || saved.caseId !== trainingCase.id) return createInitialProgress(trainingCase)
  return saved
}

export function saveCaseProgress(storage: TrainingStorage, progress: CaseProgress): void {
  const store = readStore(storage)
  store.cases[progress.caseId] = progress
  storage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(store))
}

export function resetCaseProgress(storage: TrainingStorage, trainingCase: TrainingCase): CaseProgress {
  const fresh = createInitialProgress(trainingCase)
  saveCaseProgress(storage, fresh)
  return fresh
}

function readStore(storage: TrainingStorage): StoreFile {
  const raw = storage.getItem(TRAINING_STORAGE_KEY)
  if (!raw) return { version: 1, cases: {} }
  try {
    const parsed = JSON.parse(raw) as StoreFile
    if (parsed?.version !== 1 || !parsed.cases || typeof parsed.cases !== 'object') {
      return { version: 1, cases: {} }
    }
    return parsed
  } catch {
    return { version: 1, cases: {} }
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}
