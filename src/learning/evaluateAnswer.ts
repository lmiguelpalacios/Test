import { nordlichtCase } from '../abschluss/training/nordlichtCase'
import { checkPhase } from '../abschluss/training/progress'
import type { PhaseId } from '../abschluss/training/types'
import type {
  AbschlussEvaluationResult,
} from '../abschluss/types'
import { evaluateBalanceSheet } from '../abschluss/evaluateBalanceSheet'
import { evaluateIncomeStatement } from '../abschluss/evaluateIncomeStatement'
import { evaluateTAccounts } from '../abschluss/evaluateTAccounts'
import { getAccountMap } from '../data/chart-of-accounts'
import type {
  BookingLearningTask,
  EvaluationResult,
  LearningAnswer,
  LearningSubmission,
  LearningTask,
} from '../types/learning'

export interface EvaluateLearningOptions {
  /** When false, the USt criterion is omitted and solutions are compared at 0 %. */
  vatEnabled?: boolean
}

/**
 * Bewertet eine Lernantwort gegen die Musterlösung bzw. die Abschluss-Evaluatoren.
 * Nutzt denselben Kontenplan wie die echte Buchhaltung — ohne Journalbuchung.
 */
export function evaluateLearningAnswer(
  task: LearningTask,
  submission: LearningSubmission,
  options?: EvaluateLearningOptions,
): EvaluationResult {
  const vatEnabled = options?.vatEnabled !== false
  if (task.kind === 'booking') {
    if (submission.kind !== 'booking') {
      return mismatchResult(task.maxPoints, 'Buchungsantwort erwartet.')
    }
    return evaluateBookingAnswer(task, submission.answer, vatEnabled)
  }

  if (task.kind === 't_accounts') {
    if (submission.kind !== 't_accounts') {
      return mismatchResult(task.maxPoints, 'T-Konten-Entwurf erwartet.')
    }
    return toEvaluationResult(
      evaluateTAccounts(task.fixtureEntries, task.asOf, submission.draft),
      task.maxPoints,
    )
  }

  if (task.kind === 'fall') {
    if (submission.kind !== 'fall') {
      return mismatchResult(task.maxPoints, 'Abschlussfall erwartet.')
    }
    return evaluateFallAnswer(submission.progress, task.maxPoints)
  }

  if (task.kind === 'bilanz') {
    if (submission.kind !== 'bilanz') {
      return mismatchResult(task.maxPoints, 'Bilanz-Entwurf erwartet.')
    }
    return toEvaluationResult(
      evaluateBalanceSheet(task.fixtureEntries, task.asOf, submission.draft),
      task.maxPoints,
    )
  }

  if (submission.kind !== 'guv') {
    return mismatchResult(task.maxPoints, 'GuV-Entwurf erwartet.')
  }
  return toEvaluationResult(
    evaluateIncomeStatement(
      task.fixtureEntries,
      task.range,
      submission.draft,
    ),
    task.maxPoints,
  )
}

function evaluateFallAnswer(
  progress: Parameters<typeof checkPhase>[0],
  maxPoints: number,
): EvaluationResult {
  const phases: PhaseId[] = ['B', 'C', 'D', 'E', 'F']
  let next = progress
  for (const id of phases) next = checkPhase(next, id, nordlichtCase)
  const correct = phases.filter((id) => next.phases[id].status === 'korrekt').length
  const fullyCorrect = correct === phases.length
  return {
    score: fullyCorrect ? maxPoints : correct,
    maxPoints,
    fullyCorrect,
    criteria: phases.map((id) => ({
      id: `fall:${id}`,
      label: id,
      ok: next.phases[id].status === 'korrekt',
      feedback: next.phases[id].evaluation?.summary ?? 'Noch nicht geprüft.',
      points: next.phases[id].status === 'korrekt' ? 1 : 0,
      maxPoints: 1,
    })),
    summary: fullyCorrect
      ? 'Der Nordlicht-Fall ist vollständig richtig.'
      : 'Der Fall ist noch nicht in allen Teilen richtig.',
  }
}

function evaluateBookingAnswer(
  task: BookingLearningTask,
  answer: LearningAnswer,
  vatEnabled: boolean,
): EvaluationResult {
  const map = getAccountMap()
  const solution = task.solution
  const criteria = []

  const debitOk = answer.debitAccount === solution.debitAccount
  const debitAccount = map.get(answer.debitAccount)
  criteria.push({
    id: 'debit',
    label: 'Sollkonto',
    ok: debitOk,
    points: debitOk ? 1 : 0,
    maxPoints: 1,
    feedback: debitOk
      ? `Sollkonto ${solution.debitAccount} ist korrekt.`
      : buildAccountHint(
          'Soll',
          answer.debitAccount,
          solution.debitAccount,
          debitAccount?.type,
          map.get(solution.debitAccount)?.type,
        ),
  })

  const creditOk = answer.creditAccount === solution.creditAccount
  const creditAccount = map.get(answer.creditAccount)
  criteria.push({
    id: 'credit',
    label: 'Habenkonto',
    ok: creditOk,
    points: creditOk ? 1 : 0,
    maxPoints: 1,
    feedback: creditOk
      ? `Habenkonto ${solution.creditAccount} ist korrekt.`
      : buildAccountHint(
          'Haben',
          answer.creditAccount,
          solution.creditAccount,
          creditAccount?.type,
          map.get(solution.creditAccount)?.type,
        ),
  })

  const amountOk = answer.netAmountCents === solution.netAmountCents
  criteria.push({
    id: 'amount',
    label: 'Nettobetrag',
    ok: amountOk,
    points: amountOk ? 1 : 0,
    maxPoints: 1,
    feedback: amountOk
      ? 'Der Nettobetrag stimmt.'
      : amountFeedback(answer.netAmountCents, solution.netAmountCents),
  })

  if (vatEnabled) {
    const vatOk = answer.vatRate === solution.vatRate
    criteria.push({
      id: 'vat',
      label: 'USt-Satz',
      ok: vatOk,
      points: vatOk ? 1 : 0,
      maxPoints: 1,
      feedback: vatOk
        ? `USt-Satz ${solution.vatRate} % ist korrekt.`
        : vatFeedback(answer.vatRate, solution.vatRate),
    })
  }

  const score = criteria.reduce((sum, item) => sum + item.points, 0)
  const maxPoints = criteria.reduce((sum, item) => sum + item.maxPoints, 0)
  const fullyCorrect =
    maxPoints > 0 && score === maxPoints && criteria.every((item) => item.ok)

  let summary: string
  if (fullyCorrect) {
    summary =
      'Vollständig richtig. Die Kontierung entspricht der Musterlösung (Demo-Lerninhalt).'
  } else if (score === 0) {
    summary =
      'Noch keine Teilpunkte. Prüfe Soll/Haben-Richtung und ob Aufwand/Erlös oder Bestandskonten gemeint sind.'
  } else {
    summary = `Teilweise richtig (${score}/${maxPoints} Punkte). Siehe Hinweise zu den einzelnen Kriterien.`
  }

  return { score, maxPoints, fullyCorrect, criteria, summary }
}

function toEvaluationResult(
  result: AbschlussEvaluationResult,
  _taskMaxPoints: number,
): EvaluationResult {
  return {
    score: result.score,
    maxPoints: result.maxPoints,
    fullyCorrect: result.fullyCorrect,
    criteria: result.criteria,
    summary: result.summary,
  }
}

function mismatchResult(maxPoints: number, message: string): EvaluationResult {
  return {
    score: 0,
    maxPoints,
    fullyCorrect: false,
    criteria: [
      {
        id: 'kind',
        label: 'Aufgabentyp',
        ok: false,
        points: 0,
        maxPoints: 1,
        feedback: message,
      },
    ],
    summary: message,
  }
}

function buildAccountHint(
  side: 'Soll' | 'Haben',
  chosen: string,
  expected: string,
  chosenType: string | undefined,
  expectedType: string | undefined,
): string {
  if (!chosen) {
    return `${side}: Bitte ein Konto wählen. Erwartet wird ${expected}.`
  }
  if (chosen === expected) return `${side}: korrekt.`
  if (chosenType && expectedType && chosenType !== expectedType) {
    return `${side}: ${chosen} ist Typ „${chosenType}“, erwartet wird ${expected} (Typ „${expectedType}“). Denk an Aktiv+/Passiv+/Aufwand im Soll bzw. Ertrag/Passiv im Haben.`
  }
  return `${side}: ${chosen} ist nicht die Musterlösung (${expected}). Prüfe den Geschäftsvorfall noch einmal.`
}

function amountFeedback(given: number, expected: number): string {
  if (!Number.isInteger(given) || given <= 0) {
    return 'Bitte einen gültigen Nettobetrag > 0 eingeben.'
  }
  if (given === expected * 1.19 || given === Math.round(expected * 1.19)) {
    return 'Du hast vermutlich den Bruttobetrag als Netto erfasst. Bei Zahlungen ohne neue Steuer ist der Zahlungsbetrag der Bruttobetrag bei USt 0 %; bei Aufwand/Erlös mit Steuer das Netto.'
  }
  if (Math.abs(given - expected) < expected * 0.05) {
    return `Der Betrag liegt nahe an der Lösung (${(expected / 100).toFixed(2)} € netto) — Cent genau prüfen.`
  }
  return `Nettobetrag weicht ab. Erwartet: ${(expected / 100).toFixed(2)} €.`
}

function vatFeedback(given: number, expected: number): string {
  if (expected === 0 && given > 0) {
    return 'Hier ist USt 0 % richtig: Zahlungen oder steuerfreie Vorgänge buchen keine erneute Steuer — der Betrag ist der auszugleichende Brutto-/Zahlungsbetrag.'
  }
  if (expected > 0 && given === 0) {
    return `Es fehlt der Steuersatz ${expected} %. Bei Aufwand/Erlös mit USt wählt man den Satz; Vorsteuer/USt-Zeilen erzeugt das Journal.`
  }
  return `USt-Satz ${given} % ist falsch — richtig ist ${expected} %.`
}

/** Baut den Journal-Entwurf aus der Musterlösung (nur nach Bestätigung nutzbar). */
export function solutionToPracticeDraft(
  task: BookingLearningTask,
  options?: EvaluateLearningOptions,
) {
  const vatEnabled = options?.vatEnabled !== false
  return {
    date: '2026-10-12',
    documentNumber: `LERN-${String(task.number).padStart(3, '0')}`,
    description: `[Lernmodus] ${task.title}`,
    debitAccount: task.solution.debitAccount,
    creditAccount: task.solution.creditAccount,
    netAmountCents: task.solution.netAmountCents,
    vatRate: vatEnabled ? task.solution.vatRate : 0,
  }
}
