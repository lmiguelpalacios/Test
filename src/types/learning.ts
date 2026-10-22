import type {
  BalanceSheetDraft,
  IncomeStatementDraft,
  TAccountDraft,
} from '../abschluss/types'
import type { JournalEntry, VatRate } from './accounting'
import type { DateRange } from '../reports/period'

export type LearningTopic =
  | 'aktiv_passiv'
  | 'soll_haben'
  | 'geschaeftsvorfall'
  | 'wareneinkauf'
  | 'zahlung_lieferant'
  | 'warenverkauf'
  | 'zahlung_kunde'
  | 'ust_vst'
  | 'bilanz_guv'

export type LearningDifficulty = 'leicht' | 'mittel' | 'schwer'

export type LearningTaskKind = 'booking' | 't_accounts' | 'bilanz' | 'guv'

export interface LearningSolution {
  debitAccount: string
  creditAccount: string
  netAmountCents: number
  vatRate: VatRate
}

export interface LearningEffects {
  assets?: string
  liabilities?: string
  equity?: string
  result?: string
}

interface LearningTaskBase {
  id: string
  number: number
  title: string
  topic: LearningTopic
  difficulty: LearningDifficulty
  /** Realistischer Geschäftsvorfall (Nordlicht). */
  scenario: string
  explanation: string
  effects: LearningEffects
  /** Max. Punkte. */
  maxPoints: number
  kind: LearningTaskKind
}

export interface BookingLearningTask extends LearningTaskBase {
  kind: 'booking'
  /** Musterlösung — Demo-/Lerninhalt. */
  solution: LearningSolution
  /** Optionaler Übungsbuchungsschritt ins echte Journal. */
  allowPracticeJournalPost: boolean
}

export interface TAccountsLearningTask extends LearningTaskBase {
  kind: 't_accounts'
  /** Eingebettetes Mini-Journal (nicht Live-Org). */
  fixtureEntries: JournalEntry[]
  asOf: string
  allowPracticeJournalPost: false
}

export interface BilanzLearningTask extends LearningTaskBase {
  kind: 'bilanz'
  fixtureEntries: JournalEntry[]
  asOf: string
  allowPracticeJournalPost: false
}

export interface GuvLearningTask extends LearningTaskBase {
  kind: 'guv'
  fixtureEntries: JournalEntry[]
  range: DateRange
  allowPracticeJournalPost: false
}

export type LearningTask =
  | BookingLearningTask
  | TAccountsLearningTask
  | BilanzLearningTask
  | GuvLearningTask

export interface LearningAnswer {
  debitAccount: string
  creditAccount: string
  netAmountCents: number
  vatRate: VatRate
}

/** Antwort-Payload für submitLearningAnswer (diskriminiert nach Task-Kind). */
export type LearningSubmission =
  | { kind: 'booking'; answer: LearningAnswer }
  | { kind: 't_accounts'; draft: TAccountDraft[] }
  | { kind: 'bilanz'; draft: BalanceSheetDraft }
  | { kind: 'guv'; draft: IncomeStatementDraft }

export interface CriterionResult {
  id: string
  label: string
  ok: boolean
  feedback: string
  points: number
  maxPoints: number
}

export interface EvaluationResult {
  score: number
  maxPoints: number
  fullyCorrect: boolean
  criteria: CriterionResult[]
  summary: string
}

export interface TaskProgress {
  taskId: string
  attempts: number
  bestScore: number
  completed: boolean
  lastAttemptAt?: string
  practicePostedAt?: string
}

export interface LearningState {
  progress: TaskProgress[]
  lastTaskId?: string
  /** Summe der besten Punktzahlen abgeschlossener Aufgaben. */
  totalPoints: number
}

export const LEARNING_TOPIC_LABELS: Record<LearningTopic, string> = {
  aktiv_passiv: 'Aktiv / Passiv',
  soll_haben: 'Soll / Haben',
  geschaeftsvorfall: 'Geschäftsvorfälle',
  wareneinkauf: 'Wareneinkauf',
  zahlung_lieferant: 'Zahlung Lieferant',
  warenverkauf: 'Warenverkauf',
  zahlung_kunde: 'Zahlungseingang',
  ust_vst: 'USt / VSt',
  bilanz_guv: 'Bilanz / GuV',
}

export const LEARNING_DIFFICULTY_LABELS: Record<LearningDifficulty, string> = {
  leicht: 'Leicht',
  mittel: 'Mittel',
  schwer: 'Schwer',
}

export const LEARNING_KIND_LABELS: Record<LearningTaskKind, string> = {
  booking: 'Buchung',
  t_accounts: 'T-Konten',
  bilanz: 'Bilanz',
  guv: 'GuV',
}
