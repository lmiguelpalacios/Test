/** Kontotypen im Schulkontenrahmen Industrie. */
export type AccountType = 'aktiv' | 'passiv' | 'aufwand' | 'ertrag'

export type AccountGroup =
  | 'Anlagevermögen'
  | 'Umlaufvermögen'
  | 'Finanzkonten'
  | 'Forderungen'
  | 'Verbindlichkeiten'
  | 'Eigenkapital'
  | 'Erträge'
  | 'Aufwendungen'
  | 'Steuerkonten'

export interface Account {
  number: string
  name: string
  type: AccountType
  group: AccountGroup
}

/** Erlaubte Umsatzsteuersätze im Lernsystem. */
export type VatRate = 0 | 7 | 19

export interface JournalLine {
  accountNumber: string
  /** Betrag in Cent — entweder Soll oder Haben > 0. */
  debitCents: number
  creditCents: number
}

export interface JournalEntryDraft {
  date: string
  documentNumber: string
  description: string
  /** Primäres Sollkonto (z. B. Aufwand oder Forderung). */
  debitAccount: string
  /** Primäres Habenkonto (z. B. Ertrag oder Verbindlichkeit). */
  creditAccount: string
  netAmountCents: number
  vatRate: VatRate
}

export interface JournalEntry extends JournalEntryDraft {
  id: string
  taxAmountCents: number
  grossAmountCents: number
  lines: JournalLine[]
  /** Lernfreundliche Begründung der Kontierung. */
  explanation: string
  createdAt: string
}

export interface AccountingTotals {
  entryCount: number
  totalDebitCents: number
  totalCreditCents: number
  periodLabel: string
}

export interface ValidationIssue {
  field?: keyof JournalEntryDraft | 'balance' | 'general'
  message: string
}

export type ValidationResult =
  | { ok: true; entry: Omit<JournalEntry, 'id' | 'createdAt'> }
  | { ok: false; issues: ValidationIssue[] }
