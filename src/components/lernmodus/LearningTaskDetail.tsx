import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents, parseEuroInput } from '../../accounting/money'
import { isVatRate } from '../../accounting/vat'
import { chartOfAccounts } from '../../data/chart-of-accounts'
import { getLearningTaskById } from '../../data/learning-tasks'
import type { EvaluationResult } from '../../types/learning'
import type { VatRate } from '../../types/accounting'
import {
  LEARNING_DIFFICULTY_LABELS,
  LEARNING_TOPIC_LABELS,
} from '../../types/learning'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function LearningTaskDetail() {
  const { taskId } = useParams()
  const {
    learning,
    submitLearningAnswer,
    completeLearningTask,
    postLearningPracticeEntry,
    capabilities,
  } = useAccounting()
  const task = taskId ? getLearningTaskById(taskId) : undefined
  const progress = learning.progress.find((item) => item.taskId === taskId)

  const [debitAccount, setDebitAccount] = useState('3400')
  const [creditAccount, setCreditAccount] = useState('1600')
  const [netInput, setNetInput] = useState('')
  const [vatRate, setVatRate] = useState<VatRate>(19)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showSolution, setShowSolution] = useState(false)

  const preview = useMemo(() => {
    const net = parseEuroInput(netInput)
    if (net === null || net <= 0 || !isVatRate(vatRate)) return null
    return net
  }, [netInput, vatRate])

  if (!task) {
    return (
      <div className="page-stack">
        <PageHeader title="Aufgabe nicht gefunden" />
        <Link to="/lernmodus" className="text-link">
          Zur Übersicht
        </Link>
      </div>
    )
  }

  const handleCheck = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const netAmountCents = parseEuroInput(netInput)
    if (netAmountCents === null || netAmountCents <= 0) {
      setError('Bitte einen gültigen Nettobetrag eingeben.')
      return
    }
    if (!isVatRate(vatRate)) {
      setError('USt-Satz ungültig.')
      return
    }
    void submitLearningAnswer(task.id, {
      debitAccount,
      creditAccount,
      netAmountCents,
      vatRate,
    }).then((result) => {
      if (!result.ok || !result.evaluation) {
        setError(result.ok ? 'Bewertung fehlgeschlagen.' : result.message)
        return
      }
      setEvaluation(result.evaluation)
      if (result.evaluation.fullyCorrect) {
        setShowSolution(true)
        setMessage('Aufgabe vollständig gelöst und als abgeschlossen gespeichert.')
      }
    })
  }

  const handleComplete = () => {
    void completeLearningTask(task.id).then((result) => {
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage('Aufgabe manuell als abgeschlossen markiert.')
    })
  }

  const handlePracticePost = () => {
    const confirmed = window.confirm(
      'Musterlösung wirklich als Übungsbuchung ins echte Journal übernehmen?\n\nNur bestätigen, wenn du die Lernbuchung im Unternehmensjournal sehen willst. Das ist kein automatischer Schritt.',
    )
    if (!confirmed) return
    const result = postLearningPracticeEntry(task.id)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setMessage(
      'Übungsbuchung wurde ins Journal übernommen (Beleg LERN-…). Lernmodus und Journal bleiben getrennte Schritte.',
    )
  }

  return (
    <div className="page-stack">
      <DemoBanner detail="Prüfen speichert nur den Lernfortschritt — keine Journalbuchung ohne späteren Bestätigungsschritt." />
      <PageHeader
        title={`Aufgabe ${task.number}: ${task.title}`}
        subtitle={`${LEARNING_TOPIC_LABELS[task.topic]} · ${LEARNING_DIFFICULTY_LABELS[task.difficulty]}`}
        actions={
          <Link to="/lernmodus" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Geschäftsvorfall</h2>
          <span className="panel-badge">Demo-Lernaufgabe</span>
        </div>
        <p>{task.scenario}</p>
        {progress ? (
          <p className="panel-note">
            Versuche: {progress.attempts} · beste Punkte: {progress.bestScore}/
            {task.maxPoints}
            {progress.completed ? ' · abgeschlossen' : ''}
            {progress.practicePostedAt ? ' · Übungsbuchung im Journal' : ''}
          </p>
        ) : null}
      </section>

      <form className="panel booking-form" onSubmit={handleCheck}>
        <div className="panel-header">
          <h2 className="panel-title">Deine Buchung</h2>
          <span className="panel-badge">ohne Journalwirkung beim Prüfen</span>
        </div>
        {error ? (
          <div className="form-alert error" role="alert">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="form-alert" role="status">
            {message}
          </div>
        ) : null}

        <div className="form-grid">
          <label className="form-field">
            <span>Sollkonto</span>
            <select
              value={debitAccount}
              onChange={(event) => setDebitAccount(event.target.value)}
            >
              {chartOfAccounts.map((account) => (
                <option key={account.number} value={account.number}>
                  {account.number} — {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Habenkonto</span>
            <select
              value={creditAccount}
              onChange={(event) => setCreditAccount(event.target.value)}
            >
              {chartOfAccounts.map((account) => (
                <option key={account.number} value={account.number}>
                  {account.number} — {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Nettobetrag (€)</span>
            <input
              value={netInput}
              onChange={(event) => setNetInput(event.target.value)}
              inputMode="decimal"
              placeholder="z. B. 1000,00"
              required
            />
          </label>
          <label className="form-field">
            <span>USt-Satz</span>
            <select
              value={vatRate}
              onChange={(event) => setVatRate(Number(event.target.value) as VatRate)}
            >
              <option value={0}>0 %</option>
              <option value={7}>7 %</option>
              <option value={19}>19 %</option>
            </select>
          </label>
        </div>
        {preview !== null ? (
          <p className="panel-note">Netto-Vorschau: {formatCents(preview)}</p>
        ) : null}

        <div className="page-actions-row">
          <button type="submit" className="btn btn-primary">
            Antwort prüfen
          </button>
          {evaluation && !evaluation.fullyCorrect && progress && progress.bestScore > 0 ? (
            <button type="button" className="btn btn-secondary" onClick={handleComplete}>
              Trotzdem abschließen
            </button>
          ) : null}
        </div>
      </form>

      {evaluation ? (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Feedback</h2>
            <span className="panel-badge">
              {evaluation.score}/{evaluation.maxPoints} Punkte
            </span>
          </div>
          <p>{evaluation.summary}</p>
          <ul className="placeholder-list">
            {evaluation.criteria.map((criterion) => (
              <li key={criterion.id}>
                <strong>
                  {criterion.ok ? '✓' : '✗'} {criterion.label}:
                </strong>{' '}
                {criterion.feedback}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(showSolution || progress?.completed || evaluation?.fullyCorrect) && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Musterlösung & Wirkung</h2>
            <span className="panel-badge">Demo · Lerninhalt</span>
          </div>
          <p className="panel-note">
            Soll <code>{task.solution.debitAccount}</code> / Haben{' '}
            <code>{task.solution.creditAccount}</code> · Netto{' '}
            {formatCents(task.solution.netAmountCents)} · USt {task.solution.vatRate} %
          </p>
          <p>{task.explanation}</p>
          <ul className="placeholder-list">
            {task.effects.assets ? <li>Aktiva: {task.effects.assets}</li> : null}
            {task.effects.liabilities ? (
              <li>Passiva: {task.effects.liabilities}</li>
            ) : null}
            {task.effects.equity ? <li>Eigenkapital: {task.effects.equity}</li> : null}
            {task.effects.result ? <li>Ergebnis: {task.effects.result}</li> : null}
          </ul>

          {task.allowPracticeJournalPost && capabilities.learningPracticeJournal ? (
            <div className="page-actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!progress?.completed || Boolean(progress.practicePostedAt)}
                onClick={handlePracticePost}
              >
                Als Übungsbuchung ins Journal übernehmen…
              </button>
              <Link to="/buchhaltung" className="btn btn-secondary">
                Zum Journal
              </Link>
            </div>
          ) : null}
          {task.allowPracticeJournalPost && !capabilities.learningPracticeJournal ? (
            <p className="form-hint">
              Übungsbuchung ins Journal ist im Online-/Preview-Modus für v1 deaktiviert
              (RPC <code>post_learning_practice</code> noch Stub). Bewertung und
              Lernfortschritt funktionieren weiterhin.
            </p>
          ) : null}
        </section>
      )}
    </div>
  )
}
