import type { JournalEntryDraft, JournalLine } from '../../types/accounting'
import type { AbschlussEvaluationResult } from '../types'

/** Geführte Phasen. Reihenfolge ist die Freigabe-Reihenfolge. */
export const PHASE_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

export type PhaseId = (typeof PHASE_IDS)[number]

export const PHASE_LABELS: Record<PhaseId, string> = {
  A: 'Vorfälle',
  B: 'Journal',
  C: 'T-Konten',
  D: 'Abschlussbuchungen',
  E: 'GuV',
  F: 'Schlussbilanz',
  G: 'Kontrolle',
}

export type PhaseStatus =
  | 'offen'
  | 'in_bearbeitung'
  | 'fehlerhaft'
  | 'korrekt'
  | 'uebersprungen'

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  fehlerhaft: 'Fehlerhaft',
  korrekt: 'Korrekt',
  uebersprungen: 'Übersprungen',
}

export interface TrainingLine {
  accountNumber: string
  debitCents: number
  creditCents: number
}

export interface SimpleBooking {
  kind: 'simple'
  draft: JournalEntryDraft
}

export interface CompoundBooking {
  kind: 'compound'
  description: string
  lines: JournalLine[]
}

export interface TrainingEvent {
  id: string
  date: string
  documentNumber: string
  party: string
  title: string
  /** Sachverhalt ohne Kontonummern der Buchung. */
  story: string
  booking: SimpleBooking | CompoundBooking
}

export interface PhaseHints {
  general: string
  accountClass: string
  principle: string
}

export interface TrainingCase {
  id: string
  title: string
  company: string
  /** Fallregeln, nicht der Org-Schalter. */
  vatEnabled: boolean
  asOf: string
  range: { from: string; to: string }
  assumptions: { title: string; body: string }[]
  events: TrainingEvent[]
  hints: Record<PhaseId, PhaseHints>
}

export interface PhaseState {
  status: PhaseStatus
  viewed: boolean
  started: boolean
  /** 0 nichts, 1 allgemein, 2 Kontenklasse, 3 Prinzip, 4 Musterlösung. */
  hintStage: 0 | 1 | 2 | 3 | 4
  evaluation: AbschlussEvaluationResult | null
}

export interface EventPostingDraft {
  lines: TrainingLine[]
}

export interface TAccountWorkDraft {
  accountNumber: string
  sumDebitCents: number
  sumCreditCents: number
  balanceCents: number
  side: 'soll' | 'haben'
  /** Leer, wenn das Konto ausgeglichen bleibt. */
  closingAccount: string
}

export interface ClosingDraft {
  entries: { lines: TrainingLine[] }[]
}

export interface GuvRowDraft {
  accountNumber: string
  side: '' | 'aufwand' | 'ertrag'
  amountCents: number
}

export interface GuvWorkDraft {
  rows: GuvRowDraft[]
  totalExpenseCents: number
  totalRevenueCents: number
  resultCents: number
  resultKind: '' | 'gewinn' | 'verlust'
}

export interface BalanceRowDraft {
  accountNumber: string
  section: '' | 'aktiva' | 'passiva' | 'eigenkapital'
  amountCents: number
}

export interface BalanceWorkDraft {
  rows: BalanceRowDraft[]
  sbkAccount: string
  sbkSollCents: number
  sbkHabenCents: number
  totalAssetsCents: number
  totalPassivaCents: number
}

export interface CaseProgress {
  caseId: string
  phases: Record<PhaseId, PhaseState>
  eventOrder: string[]
  postings: Record<string, EventPostingDraft>
  tAccounts: TAccountWorkDraft[]
  closing: ClosingDraft
  guv: GuvWorkDraft
  balance: BalanceWorkDraft
  journalFingerprint: string
}
