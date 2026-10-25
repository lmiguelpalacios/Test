import type { Account, JournalEntry, JournalLine } from '../../types/accounting'
import { chartOfAccounts, getAccountMap } from '../../data/chart-of-accounts'
import { buildBalanceSheet, type BalanceSheetReport } from '../../reports/balanceSheet'
import { buildIncomeStatement, type IncomeStatementReport } from '../../reports/incomeStatement'
import { expectedTAccounts } from '../expectedBalances'
import type { TAccountSide } from '../types'
import { postCompoundBooking, postSimpleBooking } from './postEntry'
import type {
  BalanceWorkDraft,
  ClosingDraft,
  GuvWorkDraft,
  TAccountWorkDraft,
  TrainingCase,
  TrainingEvent,
} from './types'

/** Technische Abschlusskonten des Schulkontenrahmens. */
export const EBK_ACCOUNT = '800'
export const SBK_ACCOUNT = '801'
export const GUV_ACCOUNT = '802'
export const RESULT_ACCOUNT = '335'

export interface TWorksheetLine {
  entryId: string
  date: string
  documentNumber: string
  debitCents: number
  creditCents: number
}

export interface TWorksheet {
  accountNumber: string
  name: string
  lines: TWorksheetLine[]
  sumDebitCents: number
  sumCreditCents: number
  balanceCents: number
  side: TAccountSide
  closingAccount: string
}

export interface SolvedCase {
  trainingCase: TrainingCase
  operational: JournalEntry[]
  byEventId: Map<string, JournalEntry>
  nominalClosing: JournalEntry[]
  resultClosing: JournalEntry[]
  sbkClosing: JournalEntry[]
  worksheets: TWorksheet[]
  income: IncomeStatementReport
  balanceSheet: BalanceSheetReport
  profitCents: number
}

export function solveTrainingCase(
  trainingCase: TrainingCase,
  accounts: Account[] = chartOfAccounts,
): SolvedCase {
  const operational = trainingCase.events.map((event) =>
    eventToEntry(event, accounts, trainingCase.vatEnabled),
  )
  const nominalClosing = closeNominalAccounts(operational, accounts)
  const afterNominal = [...operational, ...nominalClosing]
  const resultClosing = closeProfitToEquity(afterNominal)
  const afterResult = [...afterNominal, ...resultClosing]
  const sbkClosing = closeRealAccountsToSbk(afterResult, accounts)
  const income = buildIncomeStatement(operational, trainingCase.range, accounts)
  const balanceSheet = buildBalanceSheet(afterResult, trainingCase.asOf, accounts)
  return {
    trainingCase,
    operational,
    byEventId: new Map(operational.map((entry) => [entry.id, entry])),
    nominalClosing,
    resultClosing,
    sbkClosing,
    worksheets: buildWorksheets(operational, accounts),
    income,
    balanceSheet,
    profitCents: income.resultCents,
  }
}

export function eventToEntry(
  event: TrainingEvent,
  accounts: Account[],
  vatEnabled: boolean,
): JournalEntry {
  if (event.booking.kind === 'simple') {
    return postSimpleBooking(event.id, event.booking, accounts, vatEnabled)
  }
  return postCompoundBooking(
    event.id,
    event.date,
    event.documentNumber,
    event.booking,
    accounts,
  )
}

export function signedBalances(entries: JournalEntry[]): Map<string, number> {
  const signed = new Map<string, number>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      signed.set(
        line.accountNumber,
        (signed.get(line.accountNumber) ?? 0) + line.debitCents - line.creditCents,
      )
    }
  }
  return signed
}

function buildWorksheets(entries: JournalEntry[], accounts: Account[]): TWorksheet[] {
  const map = getAccountMap(accounts)
  const grouped = new Map<string, TWorksheetLine[]>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const list = grouped.get(line.accountNumber) ?? []
      list.push({
        entryId: entry.id,
        date: entry.date,
        documentNumber: entry.documentNumber,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
      })
      grouped.set(line.accountNumber, list)
    }
  }
  const sheets: TWorksheet[] = []
  for (const [accountNumber, lines] of grouped) {
    const sumDebitCents = lines.reduce((sum, line) => sum + line.debitCents, 0)
    const sumCreditCents = lines.reduce((sum, line) => sum + line.creditCents, 0)
    const signed = sumDebitCents - sumCreditCents
    const account = map.get(accountNumber)
    sheets.push({
      accountNumber,
      name: account?.name ?? accountNumber,
      lines,
      sumDebitCents,
      sumCreditCents,
      balanceCents: Math.abs(signed),
      side: signed < 0 ? 'haben' : 'soll',
      closingAccount: closingTarget(account?.type, signed),
    })
  }
  return sheets.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
}

function closingTarget(
  type: Account['type'] | undefined,
  signed: number,
): string {
  if (signed === 0 || !type) return ''
  if (type === 'aufwand' || type === 'ertrag') return GUV_ACCOUNT
  return SBK_ACCOUNT
}

function entryFromLines(
  id: string,
  date: string,
  documentNumber: string,
  description: string,
  lines: JournalLine[],
): JournalEntry {
  return postCompoundBooking(id, date, documentNumber, { kind: 'compound', description, lines })
}

export function closeNominalAccounts(
  entries: JournalEntry[],
  accounts: Account[] = chartOfAccounts,
): JournalEntry[] {
  const map = getAccountMap(accounts)
  const date = entries.reduce((max, entry) => (entry.date > max ? entry.date : max), '0000-01-01')
  const closing: JournalEntry[] = []
  for (const [accountNumber, signed] of [...signedBalances(entries).entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (signed === 0) continue
    const account = map.get(accountNumber)
    if (!account || (account.type !== 'aufwand' && account.type !== 'ertrag')) continue
    const amount = Math.abs(signed)
    const lines: JournalLine[] =
      signed > 0
        ? [
            { accountNumber: GUV_ACCOUNT, debitCents: amount, creditCents: 0 },
            { accountNumber: accountNumber, debitCents: 0, creditCents: amount },
          ]
        : [
            { accountNumber: accountNumber, debitCents: amount, creditCents: 0 },
            { accountNumber: GUV_ACCOUNT, debitCents: 0, creditCents: amount },
          ]
    closing.push(
      entryFromLines(
        `close-nominal-${accountNumber}`,
        date,
        `AB-${accountNumber}`,
        `Abschluss ${accountNumber} über ${GUV_ACCOUNT}`,
        lines,
      ),
    )
  }
  return closing
}

export function closeProfitToEquity(entries: JournalEntry[]): JournalEntry[] {
  const signed = signedBalances(entries).get(GUV_ACCOUNT) ?? 0
  if (signed === 0) return []
  const date = entries.reduce((max, entry) => (entry.date > max ? entry.date : max), '0000-01-01')
  const amount = Math.abs(signed)
  const lines: JournalLine[] =
    signed < 0
      ? [
          { accountNumber: GUV_ACCOUNT, debitCents: amount, creditCents: 0 },
          { accountNumber: RESULT_ACCOUNT, debitCents: 0, creditCents: amount },
        ]
      : [
          { accountNumber: RESULT_ACCOUNT, debitCents: amount, creditCents: 0 },
          { accountNumber: GUV_ACCOUNT, debitCents: 0, creditCents: amount },
        ]
  const label = signed < 0 ? 'Gewinn' : 'Verlust'
  return [
    entryFromLines(
      'close-result',
      date,
      'AB-GUV',
      `${label} ${GUV_ACCOUNT} an ${RESULT_ACCOUNT}`,
      lines,
    ),
  ]
}

export function closeRealAccountsToSbk(
  entries: JournalEntry[],
  accounts: Account[] = chartOfAccounts,
): JournalEntry[] {
  const map = getAccountMap(accounts)
  const date = entries.reduce((max, entry) => (entry.date > max ? entry.date : max), '0000-01-01')
  const closing: JournalEntry[] = []
  for (const [accountNumber, signed] of [...signedBalances(entries).entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (signed === 0) continue
    if (accountNumber === SBK_ACCOUNT || accountNumber === GUV_ACCOUNT || accountNumber === EBK_ACCOUNT) {
      continue
    }
    const account = map.get(accountNumber)
    if (!account || (account.type !== 'aktiv' && account.type !== 'passiv')) continue
    const amount = Math.abs(signed)
    const lines: JournalLine[] =
      signed > 0
        ? [
            { accountNumber: SBK_ACCOUNT, debitCents: amount, creditCents: 0 },
            { accountNumber: accountNumber, debitCents: 0, creditCents: amount },
          ]
        : [
            { accountNumber: accountNumber, debitCents: amount, creditCents: 0 },
            { accountNumber: SBK_ACCOUNT, debitCents: 0, creditCents: amount },
          ]
    closing.push(
      entryFromLines(
        `close-sbk-${accountNumber}`,
        date,
        `SB-${accountNumber}`,
        `Abschluss ${accountNumber} über ${SBK_ACCOUNT}`,
        lines,
      ),
    )
  }
  return closing
}

export function solutionTDrafts(solved: SolvedCase): TAccountWorkDraft[] {
  return solved.worksheets.map((sheet) => ({
    accountNumber: sheet.accountNumber,
    sumDebitCents: sheet.sumDebitCents,
    sumCreditCents: sheet.sumCreditCents,
    balanceCents: sheet.balanceCents,
    side: sheet.side,
    closingAccount: sheet.closingAccount,
  }))
}

export function solutionClosingDraft(solved: SolvedCase): ClosingDraft {
  const entries = [...solved.nominalClosing, ...solved.resultClosing, ...solved.sbkClosing]
  return {
    entries: entries.map((entry) => ({
      lines: entry.lines.map((line) => ({ ...line })),
    })),
  }
}

export function solutionGuvDraft(solved: SolvedCase): GuvWorkDraft {
  const rows = [
    ...solved.income.expenseRows.map((row) => ({
      accountNumber: row.accountNumber,
      side: 'aufwand' as const,
      amountCents: row.amountCents,
    })),
    ...solved.income.revenueRows.map((row) => ({
      accountNumber: row.accountNumber,
      side: 'ertrag' as const,
      amountCents: row.amountCents,
    })),
  ]
  return {
    rows,
    totalExpenseCents: solved.income.totalExpenseCents,
    totalRevenueCents: solved.income.totalRevenueCents,
    resultCents: Math.abs(solved.income.resultCents),
    resultKind: solved.income.resultCents >= 0 ? 'gewinn' : 'verlust',
  }
}

export function solutionBalanceDraft(solved: SolvedCase): BalanceWorkDraft {
  const sheet = solved.balanceSheet
  return {
    rows: [
      ...sheet.assets.map((row) => ({
        accountNumber: row.accountNumber,
        section: 'aktiva' as const,
        amountCents: row.amountCents,
      })),
      ...sheet.liabilities.map((row) => ({
        accountNumber: row.accountNumber,
        section: 'passiva' as const,
        amountCents: row.amountCents,
      })),
      ...sheet.equityAccounts.map((row) => ({
        accountNumber: row.accountNumber,
        section: 'eigenkapital' as const,
        amountCents: row.amountCents,
      })),
    ],
    sbkAccount: SBK_ACCOUNT,
    sbkSollCents: sheet.totalAssetsCents,
    sbkHabenCents: sheet.totalLiabilitiesAndEquityCents,
    totalAssetsCents: sheet.totalAssetsCents,
    totalPassivaCents: sheet.totalLiabilitiesAndEquityCents,
  }
}

/** Konten mit Saldo ≠ 0 aus expectedTAccounts müssen auf den Arbeitsblättern liegen. */
export function worksheetsMatchJournal(
  entries: JournalEntry[],
  worksheets: TWorksheet[],
  accounts: Account[] = chartOfAccounts,
): boolean {
  const expected = expectedTAccounts(entries, '9999-12-31', accounts)
  for (const row of expected) {
    const sheet = worksheets.find((item) => item.accountNumber === row.accountNumber)
    if (!sheet) return false
    if (sheet.balanceCents !== row.balanceCents || sheet.side !== row.side) return false
  }
  return worksheets
    .filter((sheet) => sheet.balanceCents !== 0)
    .every((sheet) =>
      expected.some(
        (row) =>
          row.accountNumber === sheet.accountNumber &&
          row.balanceCents === sheet.balanceCents &&
          row.side === sheet.side,
      ),
    )
}
