/** Nutzer-Entwürfe und Bewertungsresultate für Abschluss-Übungen. */

export type TAccountSide = 'soll' | 'haben'

/** Saldo-Modus: Endsaldo eines Kontos auf der richtigen T-Seite. */
export interface TAccountDraft {
  accountNumber: string
  /** Absoluter Saldo in Cent (immer ≥ 0). */
  balanceCents: number
  side: TAccountSide
}

export interface BalanceSheetDraftRow {
  accountNumber: string
  amountCents: number
}

export interface BalanceSheetDraft {
  assets: BalanceSheetDraftRow[]
  liabilities: BalanceSheetDraftRow[]
  equityAccounts: BalanceSheetDraftRow[]
  periodResultCents: number
  totalAssetsCents: number
  totalLiabilitiesAndEquityCents: number
}

export interface IncomeStatementDraftRow {
  accountNumber: string
  amountCents: number
}

export interface IncomeStatementDraft {
  revenueRows: IncomeStatementDraftRow[]
  expenseRows: IncomeStatementDraftRow[]
  totalRevenueCents: number
  totalExpenseCents: number
  resultCents: number
}

export interface AbschlussCriterionResult {
  id: string
  label: string
  ok: boolean
  feedback: string
  points: number
  maxPoints: number
}

export interface AbschlussEvaluationResult {
  score: number
  maxPoints: number
  fullyCorrect: boolean
  criteria: AbschlussCriterionResult[]
  summary: string
}

export type AbschlussStep = 't_accounts' | 'bilanz' | 'guv'
