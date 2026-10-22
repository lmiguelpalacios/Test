import type { Account, JournalEntry } from '../types/accounting'
import { chartOfAccounts, getAccountMap } from '../data/chart-of-accounts'
import { formatCents } from '../accounting/money'
import { expectedTAccounts } from './expectedBalances'
import type {
  AbschlussEvaluationResult,
  TAccountDraft,
  TAccountSide,
} from './types'

function sideLabel(side: TAccountSide): string {
  return side === 'soll' ? 'Soll' : 'Haben'
}

/**
 * Vergleicht Nutzer-T-Konten (Saldo-Modus) mit Journalsalden bis `asOf`.
 * Nur Konten mit Saldo ≠ 0 sind erforderlich; Extra-Konten = Fehler.
 * Beträge müssen centgenau stimmen.
 */
export function evaluateTAccounts(
  entries: JournalEntry[],
  asOf: string,
  draft: TAccountDraft[],
  accounts: Account[] = chartOfAccounts,
): AbschlussEvaluationResult {
  const expected = expectedTAccounts(entries, asOf, accounts)
  const map = getAccountMap(accounts)
  const byNumber = new Map(
    draft.map((row) => [row.accountNumber, row] as const),
  )
  const criteria: AbschlussEvaluationResult['criteria'] = []

  for (const row of expected) {
    const given = byNumber.get(row.accountNumber)
    const id = `t_account:${row.accountNumber}`
    const label = `${row.accountNumber} ${row.name}`

    if (!given) {
      criteria.push({
        id,
        label,
        ok: false,
        points: 0,
        maxPoints: 1,
        feedback: `Konto ${row.accountNumber} fehlt. Erwartet: Saldo ${formatCents(row.balanceCents)} auf der ${sideLabel(row.side)}-Seite.`,
      })
      continue
    }

    const sideOk = given.side === row.side
    const amountOk = given.balanceCents === row.balanceCents
    const ok = sideOk && amountOk
    let feedback: string
    if (ok) {
      feedback = `Saldo ${formatCents(row.balanceCents)} auf der ${sideLabel(row.side)}-Seite ist korrekt.`
    } else if (!sideOk && !amountOk) {
      feedback = `Seite und Betrag falsch. Erwartet: ${formatCents(row.balanceCents)} ${sideLabel(row.side)} (Soll−Haben = ${formatCents(row.signedCents)}).`
    } else if (!sideOk) {
      feedback = `Betrag stimmt, aber die Seite ist falsch — Saldo gehört auf die ${sideLabel(row.side)}-Seite (Soll−Haben = ${formatCents(row.signedCents)}).`
    } else {
      feedback = `Seite ${sideLabel(row.side)} ist richtig, Betrag weicht ab (eingetragen ${formatCents(given.balanceCents)}, erwartet ${formatCents(row.balanceCents)}).`
    }
    criteria.push({
      id,
      label,
      ok,
      points: ok ? 1 : 0,
      maxPoints: 1,
      feedback,
    })
  }

  const expectedNumbers = new Set(expected.map((row) => row.accountNumber))
  for (const row of draft) {
    if (expectedNumbers.has(row.accountNumber)) continue
    if (row.balanceCents === 0) continue
    const name = map.get(row.accountNumber)?.name ?? row.accountNumber
    criteria.push({
      id: `t_account_extra:${row.accountNumber}`,
      label: `Extra: ${row.accountNumber} ${name}`,
      ok: false,
      points: 0,
      maxPoints: 1,
      feedback: `Konto ${row.accountNumber} hat zum Stichtag keinen Saldo ≠ 0 — bitte nicht aufführen.`,
    })
  }

  if (expected.length === 0) {
    criteria.push({
      id: 't_account_empty_journal',
      label: 'Journal bis Stichtag',
      ok: draft.filter((row) => row.balanceCents !== 0).length === 0,
      points: draft.filter((row) => row.balanceCents !== 0).length === 0 ? 1 : 0,
      maxPoints: 1,
      feedback:
        draft.filter((row) => row.balanceCents !== 0).length === 0
          ? 'Keine Bewegungen bis Stichtag — leere T-Konten sind korrekt.'
          : 'Bis zum Stichtag gibt es keine Salden ≠ 0; entferne alle Einträge.',
    })
  }

  const score = criteria.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = criteria.reduce((sum, item) => sum + item.maxPoints, 0)
  const fullyCorrect =
    maxPoints > 0 && score === maxPoints && criteria.every((item) => item.ok)

  let summary: string
  if (fullyCorrect) {
    summary =
      'Alle T-Konten-Salden stimmen mit dem Journal überein (centgenau, richtige Seite).'
  } else if (score === 0) {
    summary =
      'Noch keine Treffer. Denk an: Aktiv-/Aufwandssalden typischerweise Soll, Passiv-/Ertragssalden Haben — Betrag = |Soll − Haben|.'
  } else {
    summary = `Teilweise richtig (${score}/${maxPoints}). Prüfe fehlende Konten, Seite und Cent-Beträge.`
  }

  return { score, maxPoints, fullyCorrect, criteria, summary }
}
