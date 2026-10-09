import type {
  Account,
  JournalEntryDraft,
  JournalLine,
  ValidationIssue,
  ValidationResult,
} from '../types/accounting'
import { explainBooking } from './explain'
import { addCents, isBalanced } from './money'
import { calculateGrossCents, calculateTaxCents, isVatRate } from './vat'

function vorsteuerAccount(vatRate: 7 | 19): string {
  return vatRate === 7 ? '1571' : '1576'
}

function umsatzsteuerAccount(vatRate: 7 | 19): string {
  return vatRate === 7 ? '1771' : '1776'
}

function findAccount(
  accounts: Account[],
  number: string,
): Account | undefined {
  return accounts.find((account) => account.number === number)
}

function buildLines(
  draft: JournalEntryDraft,
  debit: Account,
  credit: Account,
  taxCents: number,
  grossCents: number,
): JournalLine[] {
  const vatRate = draft.vatRate

  const isExpenseWithVat = vatRate > 0 && debit.type === 'aufwand'
  const isRevenueWithVat = vatRate > 0 && credit.type === 'ertrag'

  if (isExpenseWithVat && (vatRate === 7 || vatRate === 19)) {
    return [
      { accountNumber: debit.number, debitCents: draft.netAmountCents, creditCents: 0 },
      {
        accountNumber: vorsteuerAccount(vatRate),
        debitCents: taxCents,
        creditCents: 0,
      },
      { accountNumber: credit.number, debitCents: 0, creditCents: grossCents },
    ]
  }

  if (isRevenueWithVat && (vatRate === 7 || vatRate === 19)) {
    return [
      { accountNumber: debit.number, debitCents: grossCents, creditCents: 0 },
      { accountNumber: credit.number, debitCents: 0, creditCents: draft.netAmountCents },
      {
        accountNumber: umsatzsteuerAccount(vatRate),
        debitCents: 0,
        creditCents: taxCents,
      },
    ]
  }

  // Zahlungen / Umbuchungen / 0 % USt: Betrag = Netto (= Brutto)
  const amount = draft.netAmountCents
  return [
    { accountNumber: debit.number, debitCents: amount, creditCents: 0 },
    { accountNumber: credit.number, debitCents: 0, creditCents: amount },
  ]
}

export function validateJournalEntry(
  draft: JournalEntryDraft,
  accounts: Account[],
): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!draft.date || Number.isNaN(Date.parse(draft.date))) {
    issues.push({ field: 'date', message: 'Bitte ein gültiges Buchungsdatum angeben.' })
  }

  if (!draft.documentNumber.trim()) {
    issues.push({
      field: 'documentNumber',
      message: 'Bitte eine Belegnummer angeben.',
    })
  }

  if (!draft.description.trim() || draft.description.trim().length < 3) {
    issues.push({
      field: 'description',
      message: 'Bitte eine aussagekräftige Beschreibung eingeben (mind. 3 Zeichen).',
    })
  }

  const debit = findAccount(accounts, draft.debitAccount)
  const credit = findAccount(accounts, draft.creditAccount)

  if (!debit) {
    issues.push({ field: 'debitAccount', message: 'Sollkonto ist ungültig oder fehlt.' })
  }
  if (!credit) {
    issues.push({
      field: 'creditAccount',
      message: 'Habenkonto ist ungültig oder fehlt.',
    })
  }
  if (debit && credit && debit.number === credit.number) {
    issues.push({
      field: 'creditAccount',
      message: 'Soll- und Habenkonto müssen unterschiedlich sein.',
    })
  }

  if (!Number.isInteger(draft.netAmountCents) || draft.netAmountCents <= 0) {
    issues.push({
      field: 'netAmountCents',
      message: 'Der Nettobetrag muss größer als 0,00 € sein.',
    })
  }

  if (!isVatRate(draft.vatRate)) {
    issues.push({ field: 'vatRate', message: 'USt-Satz muss 0 %, 7 % oder 19 % sein.' })
  }

  if (issues.length > 0 || !debit || !credit) {
    return { ok: false, issues }
  }

  const taxAmountCents = calculateTaxCents(draft.netAmountCents, draft.vatRate)
  const grossAmountCents = calculateGrossCents(draft.netAmountCents, draft.vatRate)
  const lines = buildLines(draft, debit, credit, taxAmountCents, grossAmountCents)

  const totalDebit = addCents(...lines.map((line) => line.debitCents))
  const totalCredit = addCents(...lines.map((line) => line.creditCents))

  if (!isBalanced(totalDebit, totalCredit)) {
    return {
      ok: false,
      issues: [
        {
          field: 'balance',
          message: `Soll (${totalDebit}) und Haben (${totalCredit}) sind nicht ausgeglichen.`,
        },
      ],
    }
  }

  if (draft.vatRate === 7 || draft.vatRate === 19) {
    if (debit.type === 'aufwand') {
      const taxAccount = vorsteuerAccount(draft.vatRate)
      if (!findAccount(accounts, taxAccount)) {
        return {
          ok: false,
          issues: [
            {
              field: 'general',
              message: `Vorsteuerkonto ${taxAccount} fehlt im Kontenplan.`,
            },
          ],
        }
      }
    }
    if (credit.type === 'ertrag') {
      const taxAccount = umsatzsteuerAccount(draft.vatRate)
      if (!findAccount(accounts, taxAccount)) {
        return {
          ok: false,
          issues: [
            {
              field: 'general',
              message: `Umsatzsteuerkonto ${taxAccount} fehlt im Kontenplan.`,
            },
          ],
        }
      }
    }
  }

  return {
    ok: true,
    entry: {
      ...draft,
      documentNumber: draft.documentNumber.trim(),
      description: draft.description.trim(),
      taxAmountCents,
      grossAmountCents,
      lines,
      explanation: explainBooking(draft, debit, credit, taxAmountCents),
    },
  }
}

export function sumLines(lines: JournalLine[]): {
  debitCents: number
  creditCents: number
} {
  return {
    debitCents: addCents(...lines.map((line) => line.debitCents)),
    creditCents: addCents(...lines.map((line) => line.creditCents)),
  }
}
