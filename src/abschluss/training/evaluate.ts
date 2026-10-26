import { formatCents } from '../../accounting/money'
import { getAccountMap } from '../../data/chart-of-accounts'
import type { AbschlussEvaluationResult } from '../types'
import { filledLines, lineKey, studentLineIssues, totalsOf } from './postEntry'
import {
  RESULT_ACCOUNT,
  SBK_ACCOUNT,
  type SolvedCase,
} from './solve'
import type {
  BalanceWorkDraft,
  CaseProgress,
  ClosingDraft,
  GuvWorkDraft,
  PhaseId,
  TAccountWorkDraft,
  TrainingLine,
} from './types'

function result(
  criteria: AbschlussEvaluationResult['criteria'],
  summaries: { ok: string; empty: string; partial: string },
): AbschlussEvaluationResult {
  const score = criteria.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = criteria.reduce((sum, item) => sum + item.maxPoints, 0)
  const fullyCorrect = criteria.length > 0 && criteria.every((item) => item.ok)
  let summary = summaries.partial
  if (fullyCorrect) summary = summaries.ok
  else if (score === 0) summary = summaries.empty
  else summary = `${summaries.partial} (${score}/${maxPoints})`
  return { score, maxPoints, fullyCorrect, criteria, summary }
}

function criterion(
  id: string,
  label: string,
  ok: boolean,
  feedback: string,
): AbschlussEvaluationResult['criteria'][number] {
  return { id, label, ok, points: ok ? 1 : 0, maxPoints: 1, feedback }
}

export function evaluatePostings(
  solved: SolvedCase,
  postings: CaseProgress['postings'],
): AbschlussEvaluationResult {
  const criteria: AbschlussEvaluationResult['criteria'] = []
  for (const event of solved.trainingCase.events) {
    const expected = solved.byEventId.get(event.id)
    const given = filledLines(postings[event.id]?.lines ?? [])
    if (!expected) continue
    criteria.push(...compareLines(event.id, event.title, expected.lines, given))
  }
  return result(criteria, {
    ok: 'Alle Geschäftsvorfälle sind wie die Fallregeln gebucht.',
    empty: 'Noch keine Buchung stimmt mit den Vorfällen überein.',
    partial: 'Ein Teil der Buchungen stimmt.',
  })
}

function compareLines(
  eventId: string,
  title: string,
  expected: { accountNumber: string; debitCents: number; creditCents: number }[],
  given: { accountNumber: string; debitCents: number; creditCents: number }[],
): AbschlussEvaluationResult['criteria'] {
  const issues = studentLineIssues(given)
  const criteria: AbschlussEvaluationResult['criteria'] = []
  if (issues.length > 0) {
    criteria.push(
      criterion(
        `event:${eventId}:unbalanced`,
        `${title}: Ausgleich`,
        false,
        issues.map((issue) => issue.message).join(' '),
      ),
    )
  }
  const expectedCounts = countLines(expected)
  const givenCounts = countLines(given)
  const keys = new Set([...expectedCounts.keys(), ...givenCounts.keys()])
  let eventOk = issues.length === 0
  const notes: string[] = []
  for (const key of keys) {
    const want = expectedCounts.get(key) ?? 0
    const have = givenCounts.get(key) ?? 0
    if (want === have) continue
    eventOk = false
    const [accountNumber, debit, credit] = key.split('|')
    if (have < want) {
      notes.push(`Zeile fehlt.`)
    } else {
      notes.push(`Zusätzliche Zeile auf Konto ${accountNumber}.`)
    }
    const swapped = lineKey({
      accountNumber,
      debitCents: Number(credit),
      creditCents: Number(debit),
    })
    if ((expectedCounts.get(swapped) ?? 0) > 0 && Number(debit) !== Number(credit)) {
      notes.push(`Soll/Haben prüfen.`)
    }
  }
  if (eventOk) {
    criteria.push(criterion(`event:${eventId}`, title, true, 'Buchung stimmt mit dem Vorfall überein.'))
    return criteria
  }
  const expectedAccounts = new Set(expected.map((line) => line.accountNumber))
  const amountMismatch = given.some((line) => {
    if (!expectedAccounts.has(line.accountNumber)) return false
    return !expected.some(
      (item) =>
        item.accountNumber === line.accountNumber &&
        item.debitCents === line.debitCents &&
        item.creditCents === line.creditCents,
    )
  })
  if (amountMismatch) {
    criteria.push(
      criterion(
        `event:${eventId}:amount`,
        `${title}: Betrag`,
        false,
        'Mindestens ein Betrag oder eine Seite weicht ab.',
      ),
    )
  }
  const missing = expected.filter((line) => (givenCounts.get(lineKey(line)) ?? 0) < (expectedCounts.get(lineKey(line)) ?? 0))
  if (missing.length > 0) {
    criteria.push(
      criterion(
        `event:${eventId}:missing_line`,
        `${title}: fehlende Zeile`,
        false,
        'Eine Soll- oder Habenzeile fehlt.',
      ),
    )
  }
  const debitCredit = notes.some((note) => note.includes('Soll/Haben'))
  if (debitCredit) {
    criteria.push(
      criterion(
        `event:${eventId}:debit_credit`,
        `${title}: Soll/Haben`,
        false,
        'Soll und Haben sind vertauscht oder die Seite stimmt nicht.',
      ),
    )
  }
  if (!amountMismatch && missing.length === 0 && !debitCredit) {
    criteria.push(criterion(`event:${eventId}`, title, false, notes.join(' ') || 'Buchung weicht ab.'))
  }
  return criteria
}

function countLines(lines: { accountNumber: string; debitCents: number; creditCents: number }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const line of lines) {
    const key = lineKey(line)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function evaluateTAccounts(
  solved: SolvedCase,
  drafts: TAccountWorkDraft[],
): AbschlussEvaluationResult {
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const byNumber = new Map(drafts.map((draft) => [draft.accountNumber, draft]))
  for (const sheet of solved.worksheets) {
    const given = byNumber.get(sheet.accountNumber)
    const label = `${sheet.accountNumber} ${sheet.name}`
    if (!given) {
      criteria.push(criterion(`t:${sheet.accountNumber}`, label, false, 'T-Konto fehlt.'))
      continue
    }
    const sumsOk =
      given.sumDebitCents === sheet.sumDebitCents && given.sumCreditCents === sheet.sumCreditCents
    const balanceOk = given.balanceCents === sheet.balanceCents && (sheet.balanceCents === 0 || given.side === sheet.side)
    const closeOk = given.closingAccount.trim() === sheet.closingAccount
    const ok = sumsOk && balanceOk && closeOk
    let feedback = 'Summen, Saldo und Abschlusskonto stimmen mit dem Journal überein.'
    if (!sumsOk) feedback = 'Soll- oder Habensumme weicht von den Journalzeilen ab.'
    else if (!balanceOk) feedback = 'Saldo oder Saldo-Seite weicht von den Journalzeilen ab.'
    else if (!closeOk) feedback = 'Das Abschlusskonto stimmt nicht. Ein ausgeglichenes Konto bleibt leer.'
    criteria.push(criterion(`t:${sheet.accountNumber}`, label, ok, feedback))
  }
  const known = new Set(solved.worksheets.map((sheet) => sheet.accountNumber))
  for (const draft of drafts) {
    if (known.has(draft.accountNumber)) continue
    criteria.push(
      criterion(
        `t:extra:${draft.accountNumber}`,
        `Extra ${draft.accountNumber}`,
        false,
        'Dieses Konto kommt im Journal der Vorfälle nicht vor.',
      ),
    )
  }
  return result(criteria, {
    ok: 'Die T-Konten treffen das Journal.',
    empty: 'Die T-Konten treffen das Journal noch nicht.',
    partial: 'Ein Teil der T-Konten stimmt.',
  })
}

export function evaluateClosing(
  solved: SolvedCase,
  draft: ClosingDraft,
): AbschlussEvaluationResult {
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const expected = [
    ...solved.nominalClosing,
    ...solved.resultClosing,
    ...solved.sbkClosing,
  ].flatMap((entry) => entry.lines)
  const given: TrainingLine[] = []
  draft.entries.forEach((entry, index) => {
    const lines = filledLines(entry.lines)
    given.push(...lines)
    const issues = lines.length === 0 ? [] : studentLineIssues(lines)
    const unbalanced = issues.some((issue) => issue.message.includes('nicht ausgeglichen') || issue.message.includes('mindestens zwei'))
    if (unbalanced || issues.length > 0) {
      criteria.push(
        criterion(
          `closing:entry:${index}`,
          `Abschlussbuchung ${index + 1}`,
          false,
          `Hinweis: ${issues.map((issue) => issue.message).join(' ')}`,
        ),
      )
    }
  })
  const expectedSums = sumByAccount(expected)
  const givenSums = sumByAccount(given)
  const accounts = new Set([...expectedSums.keys(), ...givenSums.keys()])
  for (const accountNumber of [...accounts].sort()) {
    const want = expectedSums.get(accountNumber) ?? { debitCents: 0, creditCents: 0 }
    const have = givenSums.get(accountNumber) ?? { debitCents: 0, creditCents: 0 }
    const ok = want.debitCents === have.debitCents && want.creditCents === have.creditCents
    criteria.push(
      criterion(
        `closing:${accountNumber}`,
        `Abschluss ${accountNumber}`,
        ok,
        ok
          ? 'Soll und Haben der Abschlussbuchungen stimmen.'
          : `Soll oder Haben stimmt nicht. Eingetragen: Soll ${formatCents(have.debitCents)} / Haben ${formatCents(have.creditCents)}.`,
      ),
    )
  }
  return result(criteria, {
    ok: 'Die Abschlussbuchungen schließen Erfolgskonten, Ergebnis und Bestandskonten.',
    empty: 'Die Abschlussbuchungen stimmen noch nicht.',
    partial: 'Ein Teil der Abschlussbuchungen stimmt.',
  })
}

function sumByAccount(lines: { accountNumber: string; debitCents: number; creditCents: number }[]) {
  const sums = new Map<string, { debitCents: number; creditCents: number }>()
  for (const line of lines) {
    const current = sums.get(line.accountNumber) ?? { debitCents: 0, creditCents: 0 }
    current.debitCents += line.debitCents
    current.creditCents += line.creditCents
    sums.set(line.accountNumber, current)
  }
  return sums
}

export function evaluateGuv(solved: SolvedCase, draft: GuvWorkDraft): AbschlussEvaluationResult {
  const truth = solutionRows(solved)
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const given = new Map(draft.rows.map((row) => [row.accountNumber, row]))
  for (const row of truth) {
    const found = given.get(row.accountNumber)
    const sideOk = found?.side === row.side
    const amountOk = found?.amountCents === row.amountCents
    criteria.push(
      criterion(
        `guv:${row.accountNumber}`,
        `${row.side === 'ertrag' ? 'Ertrag' : 'Aufwand'} ${row.accountNumber}`,
        Boolean(found) && sideOk && amountOk,
        !found
          ? 'Konto fehlt in der GuV.'
          : sideOk && amountOk
            ? 'Seite und Betrag stimmen mit dem Saldo überein.'
            : !sideOk
              ? 'Das Konto steht auf der falschen GuV-Seite.'
              : 'Der Betrag weicht vom Saldo ab.',
      ),
    )
  }
  for (const row of draft.rows) {
    if (truth.some((item) => item.accountNumber === row.accountNumber)) continue
    if (row.amountCents === 0 && row.side === '') continue
    criteria.push(
      criterion(
        `guv:extra:${row.accountNumber}`,
        `Extra ${row.accountNumber}`,
        false,
        'Dieses Konto hat keinen Erfolgssaldo in der GuV.',
      ),
    )
  }
  const totalsOk =
    draft.totalExpenseCents === solved.income.totalExpenseCents &&
    draft.totalRevenueCents === solved.income.totalRevenueCents
  criteria.push(
    criterion(
      'guv:totals',
      'Summen',
      totalsOk,
      totalsOk ? 'Aufwands- und Ertragssumme stimmen.' : 'Die Summen weichen von den Salden ab.',
    ),
  )
  const profit = solved.profitCents
  const kind = profit >= 0 ? 'gewinn' : 'verlust'
  const resultOk = draft.resultKind === kind && draft.resultCents === Math.abs(profit)
  criteria.push(
    criterion(
      'guv:result',
      'Gewinn oder Verlust',
      resultOk,
        resultOk
          ? 'Gewinn oder Verlust stimmt mit den Salden überein.'
          : 'Gewinn oder Verlust stimmt nicht mit Ertrag minus Aufwand überein.',
    ),
  )
  return result(criteria, {
    ok: 'Die GuV folgt den Erfolgssalden.',
    empty: 'Die GuV trifft die Salden noch nicht.',
    partial: 'Ein Teil der GuV stimmt.',
  })
}

function solutionRows(solved: SolvedCase): { accountNumber: string; side: 'aufwand' | 'ertrag'; amountCents: number }[] {
  return [
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
}

export function evaluateBalance(solved: SolvedCase, draft: BalanceWorkDraft): AbschlussEvaluationResult {
  const map = getAccountMap()
  const criteria: AbschlussEvaluationResult['criteria'] = []
  const expected = [
    ...solved.balanceSheet.assets.map((row) => ({ ...row, section: 'aktiva' as const })),
    ...solved.balanceSheet.liabilities.map((row) => ({ ...row, section: 'passiva' as const })),
    ...solved.balanceSheet.equityAccounts.map((row) => ({ ...row, section: 'eigenkapital' as const })),
  ]
  const given = new Map(draft.rows.map((row) => [row.accountNumber, row]))
  for (const row of expected) {
    const found = given.get(row.accountNumber)
    const ok = found?.section === row.section && found.amountCents === row.amountCents
    const name = map.get(row.accountNumber)?.name ?? row.accountNumber
    criteria.push(
      criterion(
        `bilanz:${row.section}:${row.accountNumber}`,
        `${row.section} ${row.accountNumber} ${name}`,
        ok,
        !found
          ? 'Konto fehlt in der Schlussbilanz.'
          : ok
            ? 'Seite und Betrag stimmen.'
            : found.section !== row.section
              ? 'Das Konto ist der falschen Bilanzseite zugeordnet.'
              : 'Der Betrag weicht ab.',
      ),
    )
  }
  for (const row of draft.rows) {
    if (expected.some((item) => item.accountNumber === row.accountNumber)) continue
    if (row.section === '' && row.amountCents === 0) continue
    criteria.push(
      criterion(
        `bilanz:extra:${row.accountNumber}`,
        `Extra ${row.accountNumber}`,
        false,
        'Das Konto gehört so nicht in die Schlussbilanz.',
      ),
    )
  }
  const equity = solved.balanceSheet.equityAccounts.find((row) => row.accountNumber === RESULT_ACCOUNT)
  const equityOk = equity !== undefined && equity.amountCents === Math.abs(solved.profitCents)
  criteria.push(
    criterion(
      'bilanz:equity-result',
      'Eigenkapitalwirkung des Ergebnisses',
      equityOk && given.get(RESULT_ACCOUNT)?.section === 'eigenkapital',
      equityOk
        ? 'Das Ergebnis steht im Eigenkapital.'
        : 'Das Ergebnis fehlt im Eigenkapital oder der Betrag stimmt nicht.',
    ),
  )
  const sbkOk =
    draft.sbkAccount.trim() === SBK_ACCOUNT &&
    draft.sbkSollCents === solved.balanceSheet.totalAssetsCents &&
    draft.sbkHabenCents === solved.balanceSheet.totalLiabilitiesAndEquityCents &&
    draft.sbkSollCents === draft.sbkHabenCents
  criteria.push(
    criterion(
      'bilanz:sbk',
      'Schlussbilanzkonto',
      sbkOk,
      sbkOk
        ? 'Das Schlussbilanzkonto ist ausgeglichen.'
        : 'Das Schlussbilanzkonto fehlt oder die beiden Seiten entsprechen nicht der Bilanzsumme.',
    ),
  )
  const totalsEqual = draft.totalAssetsCents === draft.totalPassivaCents
  const totalsOk =
    draft.totalAssetsCents === solved.balanceSheet.totalAssetsCents &&
    draft.totalPassivaCents === solved.balanceSheet.totalLiabilitiesAndEquityCents
  criteria.push(
    criterion(
      'bilanz:totals',
      'Bilanzsummen',
      totalsOk,
      totalsOk
        ? 'Die Summen stimmen.'
        : totalsEqual
          ? 'Die Summen sind gleich, die Zuordnung oder die Höhe stimmt aber nicht mit den Konten überein.'
          : 'Aktiva und Passiva sind nicht gleich der abgeleiteten Schlussbilanz.',
    ),
  )
  return result(criteria, {
    ok: 'Die Schlussbilanz ordnet die Bestandskonten richtig zu und enthält das Ergebnis.',
    empty: 'Die Schlussbilanz trifft die Konten noch nicht.',
    partial: 'Ein Teil der Schlussbilanz stimmt.',
  })
}

export function evaluateControl(progress: CaseProgress): AbschlussEvaluationResult {
  const required: PhaseId[] = ['B', 'C', 'D', 'E', 'F']
  const criteria = required.map((id) => {
    const ok = progress.phases[id].status === 'korrekt'
    return criterion(
      `control:${id}`,
      `Phase ${id}`,
      ok,
      ok ? 'Prüfung bestanden.' : `Status ist ${progress.phases[id].status}, nicht Korrekt.`,
    )
  })
  return result(criteria, {
    ok: 'Der Fall ist abgeschlossen. Alle Pflichtprüfungen sind Korrekt.',
    empty: 'Der Fall ist noch nicht abgeschlossen.',
    partial: 'Noch nicht alle Pflichtprüfungen sind Korrekt.',
  })
}

export function totalsOfDraft(lines: TrainingLine[]): { debitCents: number; creditCents: number } {
  return totalsOf(filledLines(lines))
}
