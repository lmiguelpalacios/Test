import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents, parseEuroInput } from '../../accounting/money'
import { isVatRate } from '../../accounting/vat'
import { expectedTAccountsAsDraft } from '../../abschluss/expectedBalances'
import { balanceSheetSolutionDraft } from '../../abschluss/evaluateBalanceSheet'
import { incomeStatementSolutionDraft } from '../../abschluss/evaluateIncomeStatement'
import type {
  BalanceSheetDraft,
  IncomeStatementDraft,
  TAccountDraft,
} from '../../abschluss/types'
import { chartOfAccounts } from '../../data/chart-of-accounts'
import {
  getLearningTaskById,
  isVatSettingTask,
  learningTaskMaxPoints,
} from '../../data/learning-tasks'
import type { EvaluationResult } from '../../types/learning'
import type { VatRate } from '../../types/accounting'
import {
  LEARNING_DIFFICULTY_LABELS,
  LEARNING_KIND_LABELS,
  LEARNING_TOPIC_LABELS,
} from '../../types/learning'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { AbschlussFeedback } from '../abschluss/AbschlussFeedback'
import {
  BalanceSheetBuilder,
  createEmptyBalanceSheetDraft,
} from '../abschluss/BalanceSheetBuilder'
import {
  createEmptyIncomeStatementDraft,
  IncomeStatementBuilder,
} from '../abschluss/IncomeStatementBuilder'
import { TAccountBoard } from '../abschluss/TAccountBoard'

export function LearningTaskDetail() {
  const { taskId } = useParams()
  const {
    learning,
    submitLearningAnswer,
    completeLearningTask,
    postLearningPracticeEntry,
    capabilities,
    vatEnabled,
  } = useAccounting()
  const task = taskId ? getLearningTaskById(taskId) : undefined
  const progress = learning.progress.find((item) => item.taskId === taskId)

  const [debitAccount, setDebitAccount] = useState('3400')
  const [creditAccount, setCreditAccount] = useState('1600')
  const [netInput, setNetInput] = useState('')
  const [vatRate, setVatRate] = useState<VatRate>(19)
  const [tDraft, setTDraft] = useState<TAccountDraft[]>([])
  const [bilanzDraft, setBilanzDraft] = useState<BalanceSheetDraft>(
    createEmptyBalanceSheetDraft,
  )
  const [guvDraft, setGuvDraft] = useState<IncomeStatementDraft>(
    createEmptyIncomeStatementDraft,
  )
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

  if (!vatEnabled && isVatSettingTask(task)) {
    return (
      <div className="page-stack">
        <PageHeader
          title={task.title}
          subtitle="Ausgeblendet, weil Umsatzsteuer ausgeschaltet ist"
        />
        <p className="panel-note">
          Aufgaben zu Umsatzsteuer und Vorsteuer (lt-08, lt-09) sind nur sichtbar, wenn
          Umsatzsteuer in den Einstellungen an ist.
        </p>
        <Link to="/lernmodus" className="text-link">
          Zur Übersicht
        </Link>
      </div>
    )
  }

  const handleCheckBooking = (event: FormEvent) => {
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
      kind: 'booking',
      answer: {
        debitAccount,
        creditAccount,
        netAmountCents,
        vatRate: vatEnabled ? vatRate : 0,
      },
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

  const handleCheckAbschluss = () => {
    setError(null)
    setMessage(null)
    const submission =
      task.kind === 't_accounts'
        ? ({ kind: 't_accounts' as const, draft: tDraft })
        : task.kind === 'bilanz'
          ? ({ kind: 'bilanz' as const, draft: bilanzDraft })
          : task.kind === 'guv'
            ? ({ kind: 'guv' as const, draft: guvDraft })
            : null
    if (!submission) {
      setError('Unbekannter Aufgabentyp.')
      return
    }
    void submitLearningAnswer(task.id, submission).then((result) => {
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

  const handleShowMuster = () => {
    setShowSolution(true)
    if (task.kind === 't_accounts') {
      setTDraft(expectedTAccountsAsDraft(task.fixtureEntries, task.asOf))
    } else if (task.kind === 'bilanz') {
      setBilanzDraft(balanceSheetSolutionDraft(task.fixtureEntries, task.asOf))
    } else if (task.kind === 'guv') {
      setGuvDraft(incomeStatementSolutionDraft(task.fixtureEntries, task.range))
    }
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
        subtitle={`${LEARNING_TOPIC_LABELS[task.topic]} · ${LEARNING_DIFFICULTY_LABELS[task.difficulty]} · ${LEARNING_KIND_LABELS[task.kind]}`}
        actions={
          <Link to="/lernmodus" className="btn btn-secondary">
            Zur Übersicht
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {task.kind === 'booking' ? 'Geschäftsvorfall' : 'Aufgabenstellung'}
          </h2>
          <span className="panel-badge">Demo-Lernaufgabe</span>
        </div>
        <p>{task.scenario}</p>
        {task.kind !== 'booking' ? (
          <p className="panel-note">
            Bewertung gegen eingebettetes Mini-Journal (
            {task.fixtureEntries.length} Buchungen
            {task.kind === 'guv'
              ? ` · ${task.range.from}–${task.range.to}`
              : ` · Stichtag ${task.asOf}`}
            ) — nicht gegen das Live-Org-Journal.
          </p>
        ) : null}
        {progress ? (
          <p className="panel-note">
            Versuche: {progress.attempts} · beste Punkte: {progress.bestScore}/
            {learningTaskMaxPoints(task, vatEnabled)}
            {progress.completed ? ' · abgeschlossen' : ''}
            {progress.practicePostedAt ? ' · Übungsbuchung im Journal' : ''}
          </p>
        ) : null}
      </section>

      {task.kind === 'booking' ? (
        <form className="panel booking-form" onSubmit={handleCheckBooking}>
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
            {vatEnabled ? (
              <label className="form-field">
                <span>USt-Satz</span>
                <select
                  value={vatRate}
                  onChange={(event) =>
                    setVatRate(Number(event.target.value) as VatRate)
                  }
                >
                  <option value={0}>0 %</option>
                  <option value={7}>7 %</option>
                  <option value={19}>19 %</option>
                </select>
              </label>
            ) : (
              <p className="panel-note">
                Umsatzsteuer ist aus. Bewertet werden Soll, Haben und Netto — die
                Musterlösung wird als Nettobuchung ohne Steuerzeilen verglichen.
              </p>
            )}
          </div>
          {preview !== null ? (
            <p className="panel-note">Netto-Vorschau: {formatCents(preview)}</p>
          ) : null}

          <div className="page-actions-row">
            <button type="submit" className="btn btn-primary">
              Antwort prüfen
            </button>
            {evaluation &&
            !evaluation.fullyCorrect &&
            progress &&
            progress.bestScore > 0 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleComplete}
              >
                Trotzdem abschließen
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              {task.kind === 't_accounts'
                ? 'T-Konten aufstellen'
                : task.kind === 'bilanz'
                  ? 'Bilanz aufstellen'
                  : 'GuV aufstellen'}
            </h2>
            <span className="panel-badge">Mini-Journal · Prüfen ohne Spoilern</span>
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

          {task.kind === 't_accounts' ? (
            <TAccountBoard value={tDraft} onChange={setTDraft} />
          ) : null}
          {task.kind === 'bilanz' ? (
            <BalanceSheetBuilder value={bilanzDraft} onChange={setBilanzDraft} />
          ) : null}
          {task.kind === 'guv' ? (
            <IncomeStatementBuilder value={guvDraft} onChange={setGuvDraft} />
          ) : null}

          <div className="page-actions-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCheckAbschluss}
            >
              Prüfen
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleShowMuster}
            >
              Musterlösung zeigen
            </button>
            {evaluation &&
            !evaluation.fullyCorrect &&
            progress &&
            progress.bestScore > 0 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleComplete}
              >
                Trotzdem abschließen
              </button>
            ) : null}
          </div>
        </section>
      )}

      {evaluation ? <AbschlussFeedback evaluation={evaluation} /> : null}

      {(showSolution || progress?.completed || evaluation?.fullyCorrect) && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Musterlösung & Wirkung</h2>
            <span className="panel-badge">Demo · Lerninhalt</span>
          </div>
          {task.kind === 'booking' ? (
            <p className="panel-note">
              Soll <code>{task.solution.debitAccount}</code> / Haben{' '}
              <code>{task.solution.creditAccount}</code> · Netto{' '}
              {formatCents(task.solution.netAmountCents)}
              {vatEnabled
                ? ` · USt ${task.solution.vatRate} %`
                : ' · Nettobuchung ohne USt'}
            </p>
          ) : null}
          {task.kind === 't_accounts' ? (
            <TAccountBoard
              value={expectedTAccountsAsDraft(task.fixtureEntries, task.asOf)}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
          {task.kind === 'bilanz' ? (
            <BalanceSheetBuilder
              value={balanceSheetSolutionDraft(task.fixtureEntries, task.asOf)}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
          {task.kind === 'guv' ? (
            <IncomeStatementBuilder
              value={incomeStatementSolutionDraft(
                task.fixtureEntries,
                task.range,
              )}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
          <p>{task.explanation}</p>
          <ul className="placeholder-list">
            {task.effects.assets ? <li>Aktiva: {task.effects.assets}</li> : null}
            {task.effects.liabilities ? (
              <li>Passiva: {task.effects.liabilities}</li>
            ) : null}
            {task.effects.equity ? (
              <li>Eigenkapital: {task.effects.equity}</li>
            ) : null}
            {task.effects.result ? <li>Ergebnis: {task.effects.result}</li> : null}
          </ul>

          {task.kind === 'booking' &&
          task.allowPracticeJournalPost &&
          capabilities.learningPracticeJournal ? (
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
          {task.kind === 'booking' &&
          task.allowPracticeJournalPost &&
          !capabilities.learningPracticeJournal ? (
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
