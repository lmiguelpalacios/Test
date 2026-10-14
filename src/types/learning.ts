import type { VatRate } from './accounting'

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

export interface LearningTask {
  id: string
  number: number
  title: string
  topic: LearningTopic
  difficulty: LearningDifficulty
  /** Realistischer Geschäftsvorfall (Nordlicht). */
  scenario: string
  /** Musterlösung — Demo-/Lerninhalt. */
  solution: LearningSolution
  explanation: string
  effects: LearningEffects
  /** Max. Punkte (Konten, Betrag, USt). */
  maxPoints: number
  /** Optionaler Übungsbuchungsschritt ins echte Journal. */
  allowPracticeJournalPost: boolean
}

export interface LearningAnswer {
  debitAccount: string
  creditAccount: string
  netAmountCents: number
  vatRate: VatRate
}

export interface CriterionResult {
  id: 'debit' | 'credit' | 'amount' | 'vat'
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
