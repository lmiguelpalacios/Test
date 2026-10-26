import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../../accounting/AccountingContext'
import { formatCents } from '../../../accounting/money'
import { getAccountMap } from '../../../data/chart-of-accounts'
import {
  buildJournalSteps,
  checkJournalStep,
  JOURNAL_PRACTICE_ID,
  JOURNAL_STEP_HINTS,
  journalLockReason,
  linesForPractice,
  openJournalStep,
  resetJournalProgress,
  saveJournalProgress,
  setJournalBalance,
  setJournalClosing,
  setJournalGuv,
  setStepAccounts,
  solutionAccounts,
  solutionBalance,
  solutionClosing,
  solutionGuv,
  syncJournalProgress,
  type JournalPracticeProgress,
  type JournalStep,
  type StepAccountDraft,
} from '../../../abschluss/training/journalPractice'
import { TRAINING_PERSISTENCE, TRAINING_STORAGE_KEY } from '../../../abschluss/training/progress'
import { PHASE_STATUS_LABELS } from '../../../abschluss/training/types'
import type { JournalEntry } from '../../../types/accounting'
import { DemoBanner } from '../../DemoBanner'
import { PageHeader } from '../../PageHeader'
import { AbschlussFeedback } from '../AbschlussFeedback'
import { CentsInput } from '../CentsInput'
import { AccountField, AccountList, HintBox, LineEditor } from './editors'

const accountNames = getAccountMap()

function readSaved(): JournalPracticeProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TRAINING_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { cases?: Record<string, JournalPracticeProgress> }
    const saved = parsed.cases?.[JOURNAL_PRACTICE_ID]
    return saved?.caseId === JOURNAL_PRACTICE_ID ? saved : null
  } catch {
    return null
  }
}

export function JournalPractice({ onOpenStudio }: { onOpenStudio: () => void }) {
  const { entries, vatEnabled } = useAccounting()
  const steps = useMemo(() => buildJournalSteps(entries), [entries])
  const [draft, setDraft] = useState<JournalPracticeProgress | null>(readSaved)
  const progress = useMemo(
    () => syncJournalProgress(draft, entries, vatEnabled),
    [draft, entries, vatEnabled],
  )
  const [active, setActive] = useState<string | null>(null)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [lockMessage, setLockMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      saveJournalProgress(window.localStorage, progress)
    } catch {
      // localStorage kann blockiert sein; der Stand bleibt in der Sitzung.
    }
  }, [progress])

  const step = steps.find((item) => item.id === active) ?? null

  const select = (id: string) => {
    const reason = journalLockReason(progress, steps, id)
    if (reason) {
      setLockMessage(reason)
      return
    }
    setLockMessage(null)
    setActive(id)
    setChecklistOpen(false)
    setDraft(seedStep(openJournalStep(progress, id), id, entries, vatEnabled))
  }

  const onReset = () => {
    if (!window.confirm('Nur diesen Übungsstand löschen? Die Buchungen in der Buchhaltung bleiben.')) return
    let fresh = syncJournalProgress(null, entries, vatEnabled)
    try {
      fresh = resetJournalProgress(window.localStorage, entries, vatEnabled)
    } catch {
      // Sitzungsstand reicht, wenn der Browser nicht speichert.
    }
    setDraft(fresh)
    setActive(null)
  }

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          TRAINING_PERSISTENCE === 'local'
            ? `Übungsstand nur in diesem Browser (${JOURNAL_PRACTICE_ID}). Umsatzsteuer ist ${vatEnabled ? 'an' : 'aus'}, wie in den Einstellungen.`
            : 'Abschluss üben'
        }
      />
      <PageHeader
        title="Abschluss üben"
        subtitle={`${entries.length} Journalbuchungen · dieselbe Quelle wie die Buchhaltung`}
        actions={
          <>
            <Link to="/einstellungen" className="btn btn-secondary">
              Umsatzsteuer: {vatEnabled ? 'an' : 'aus'}
            </Link>
            <button type="button" className="btn btn-secondary" onClick={onOpenStudio}>
              Freies Studio
            </button>
            <Link to="/buchhaltung" className="btn btn-secondary">
              Zur Buchhaltung
            </Link>
          </>
        }
      />

      {entries.length === 0 ? (
        <section className="panel">
          <h2 className="panel-title">Noch keine Buchungen</h2>
          <p>Buche zuerst in der Buchhaltung. Diese Übung erfindet keinen Ersatzfall.</p>
          <Link to="/buchhaltung" className="btn btn-primary">
            Zur Buchhaltung
          </Link>
        </section>
      ) : (
        <div className={`training-layout ${checklistOpen ? 'is-open' : ''}`}>
          <aside className="panel training-checklist" aria-label="Checkliste">
            <div className="panel-header">
              <h2 className="panel-title">Checkliste</h2>
              <button
                type="button"
                className="btn btn-secondary training-checklist-toggle"
                aria-expanded={checklistOpen}
                onClick={() => setChecklistOpen((open) => !open)}
              >
                {checklistOpen ? 'Schließen' : 'Schritte'}
              </button>
            </div>
            <ol className="training-checklist-body">
              {steps.map((item) => {
                const state = progress.steps[item.id]
                const reason = journalLockReason(progress, steps, item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`training-step ${active === item.id ? 'is-active' : ''}`}
                      onClick={() => select(item.id)}
                    >
                      <span>{item.title}</span>
                      <span className={`training-status status-${state?.status ?? 'offen'}`}>
                        {PHASE_STATUS_LABELS[state?.status ?? 'offen']}
                      </span>
                      {reason ? <span className="training-lock">{reason}</span> : null}
                    </button>
                  </li>
                )
              })}
            </ol>
            <button type="button" className="btn btn-secondary" onClick={onReset}>
              Übung zurücksetzen
            </button>
          </aside>
          <div className="training-work">
            {lockMessage ? (
              <div className="form-alert error" role="status">
                {lockMessage}
              </div>
            ) : null}
            {!step ? (
              <section className="panel">
                <p>Wähle links einen Schritt. Öffnen setzt ihn nicht auf Korrekt.</p>
              </section>
            ) : (
              <StepWork
                step={step}
                entries={entries}
                vatEnabled={vatEnabled}
                progress={progress}
                onChange={setDraft}
              />
            )}
          </div>
        </div>
      )}
      <AccountList />
    </div>
  )
}

function seedStep(
  progress: JournalPracticeProgress,
  stepId: string,
  entries: JournalEntry[],
  vatEnabled: boolean,
): JournalPracticeProgress {
  const step = buildJournalSteps(entries).find((item) => item.id === stepId)
  if (!step) return progress
  if (step.kind === 'eroeffnung' || step.kind === 'vorfall') {
    const expected = solutionAccounts(entries, step, vatEnabled)
    const existing = progress.accounts[stepId] ?? []
    const rows = expected.map((row) => existing.find((item) => item.accountNumber === row.accountNumber) ?? {
      accountNumber: row.accountNumber,
      sumDebitCents: 0,
      sumCreditCents: 0,
      balanceCents: 0,
      side: 'soll' as const,
    })
    return { ...progress, accounts: { ...progress.accounts, [stepId]: rows } }
  }
  if (step.kind === 'guv' && progress.guv.rows.length === 0) {
    const solved = solutionGuv(entries, vatEnabled)
    return {
      ...progress,
      guv: {
        ...progress.guv,
        rows: solved.rows.map((row) => ({ accountNumber: row.accountNumber, side: '' as const, amountCents: 0 })),
      },
    }
  }
  if (step.kind === 'bilanz' && progress.balance.rows.length === 0) {
    const solved = solutionBalance(entries, vatEnabled)
    return {
      ...progress,
      balance: {
        ...progress.balance,
        rows: solved.rows.map((row) => ({ accountNumber: row.accountNumber, section: '' as const, amountCents: 0 })),
      },
    }
  }
  return progress
}

function StepWork({
  step,
  entries,
  vatEnabled,
  progress,
  onChange,
}: {
  step: JournalStep
  entries: JournalEntry[]
  vatEnabled: boolean
  progress: JournalPracticeProgress
  onChange: (next: JournalPracticeProgress) => void
}) {
  const phase = progress.steps[step.id]
  const hints = JOURNAL_STEP_HINTS[step.kind]
  const onCheck = () => onChange(checkJournalStep(progress, step.id, entries, vatEnabled))
  const reveal = () => {
    if (phase?.status === 'korrekt' || (phase?.status === 'fehlerhaft' && (phase.hintStage ?? 0) >= 3)) {
      onChange({
        ...progress,
        steps: { ...progress.steps, [step.id]: { ...phase, hintStage: 4 } },
      })
    }
  }
  const advance = () => {
    const stage = phase?.hintStage ?? 0
    if (stage >= 3) return
    onChange({
      ...progress,
      steps: {
        ...progress.steps,
        [step.id]: { ...phase, hintStage: (stage + 1) as 0 | 1 | 2 | 3 | 4 },
      },
    })
  }
  return (
    <>
      {step.kind === 'eroeffnung' || step.kind === 'vorfall' ? (
        <EventStep
          step={step}
          entries={entries}
          vatEnabled={vatEnabled}
          rows={progress.accounts[step.id] ?? []}
          onChange={(rows) => onChange(setStepAccounts(progress, step.id, rows))}
        />
      ) : null}
      {step.kind === 'abschluss' ? (
        <section className="panel">
          <h2 className="panel-title">Abschluss</h2>
          <p className="panel-note">Abschlussbuchungen aus den Salden dieser Buchungen. 802, dann 335, dann 801.</p>
          {progress.closing.entries.map((entry, index) => (
            <LineEditor
              key={index}
              lines={entry.lines}
              onChange={(lines) =>
                onChange(
                  setJournalClosing(progress, {
                    entries: progress.closing.entries.map((item, itemIndex) =>
                      itemIndex === index ? { lines } : item,
                    ),
                  }),
                )
              }
            />
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              onChange(
                setJournalClosing(progress, {
                  entries: [
                    ...progress.closing.entries,
                    {
                      lines: [
                        { accountNumber: '', debitCents: 0, creditCents: 0 },
                        { accountNumber: '', debitCents: 0, creditCents: 0 },
                      ],
                    },
                  ],
                }),
              )
            }
          >
            Weitere Abschlussbuchung
          </button>
        </section>
      ) : null}
      {step.kind === 'guv' ? (
        <GuvStep progress={progress} onChange={onChange} />
      ) : null}
      {step.kind === 'bilanz' ? (
        <BalanceStep progress={progress} onChange={onChange} />
      ) : null}
      <HintBox
        hints={hints}
        stage={phase?.hintStage ?? 0}
        solution={phase?.hintStage === 4 ? solutionText(step, entries, vatEnabled) : null}
        onAdvance={advance}
        onSolution={reveal}
        solutionAllowed={phase?.status === 'korrekt' || (phase?.status === 'fehlerhaft' && (phase.hintStage ?? 0) >= 3)}
      />
      <button type="button" className="btn btn-primary" onClick={onCheck}>
        Prüfen
      </button>
      {phase?.evaluation ? <AbschlussFeedback evaluation={phase.evaluation} /> : null}
    </>
  )
}

function EventStep({
  step,
  entries,
  vatEnabled,
  rows,
  onChange,
}: {
  step: JournalStep
  entries: JournalEntry[]
  vatEnabled: boolean
  rows: StepAccountDraft[]
  onChange: (rows: StepAccountDraft[]) => void
}) {
  const selected = entries.filter((entry) => step.entryIds.includes(entry.id))
  const replace = (accountNumber: string, patch: Partial<StepAccountDraft>) => {
    onChange(rows.map((row) => (row.accountNumber === accountNumber ? { ...row, ...patch } : row)))
  }
  return (
    <section className="panel">
      <h2 className="panel-title">{step.title}</h2>
      {!vatEnabled ? (
        <p className="panel-note">Umsatzsteuer ist aus: keine Vorsteuer 260 und keine Umsatzsteuer 480. Der Aufwand oder Ertrag steht brutto.</p>
      ) : null}
      {selected.map((entry) => (
        <article key={entry.id} className="training-event">
          <p>
            {entry.date} · {entry.documentNumber} · {entry.description}
          </p>
          <ul className="training-postings">
            {linesForPractice(entry, vatEnabled).map((line, index) => (
              <li key={index}>
                {line.accountNumber} {accountNames.get(line.accountNumber)?.name ?? ''}: Soll {formatCents(line.debitCents)} · Haben {formatCents(line.creditCents)}
              </li>
            ))}
          </ul>
        </article>
      ))}
      {rows.map((row) => (
        <div key={row.accountNumber} className="training-line">
          <strong>
            {row.accountNumber} {accountNames.get(row.accountNumber)?.name ?? ''}
          </strong>
          <label className="form-field">
            Summe Soll
            <CentsInput aria-label={`Soll ${row.accountNumber}`} valueCents={row.sumDebitCents} onChange={(sumDebitCents) => replace(row.accountNumber, { sumDebitCents })} />
          </label>
          <label className="form-field">
            Summe Haben
            <CentsInput aria-label={`Haben ${row.accountNumber}`} valueCents={row.sumCreditCents} onChange={(sumCreditCents) => replace(row.accountNumber, { sumCreditCents })} />
          </label>
          <label className="form-field">
            Saldo
            <CentsInput aria-label={`Saldo ${row.accountNumber}`} valueCents={row.balanceCents} onChange={(balanceCents) => replace(row.accountNumber, { balanceCents })} />
          </label>
          <label className="form-field">
            Seite
            <select aria-label={`Seite ${row.accountNumber}`} value={row.side} onChange={(event) => replace(row.accountNumber, { side: event.target.value as 'soll' | 'haben' })}>
              <option value="soll">Soll</option>
              <option value="haben">Haben</option>
            </select>
          </label>
        </div>
      ))}
    </section>
  )
}

function GuvStep({
  progress,
  onChange,
}: {
  progress: JournalPracticeProgress
  onChange: (next: JournalPracticeProgress) => void
}) {
  const guv = progress.guv
  const update = (next: JournalPracticeProgress['guv']) => onChange(setJournalGuv(progress, next))
  return (
    <section className="panel">
      <h2 className="panel-title">GuV</h2>
      {guv.rows.map((row, index) => (
        <div key={row.accountNumber} className="training-line">
          <strong>{row.accountNumber} {accountNames.get(row.accountNumber)?.name ?? ''}</strong>
          <label className="form-field">
            Seite
            <select
              value={row.side}
              aria-label={`GuV ${row.accountNumber}`}
              onChange={(event) =>
                update({
                  ...guv,
                  rows: guv.rows.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, side: event.target.value as '' | 'aufwand' | 'ertrag' } : item,
                  ),
                })
              }
            >
              <option value="">nicht zugeordnet</option>
              <option value="aufwand">Aufwand</option>
              <option value="ertrag">Ertrag</option>
            </select>
          </label>
          <label className="form-field">
            Betrag
            <CentsInput
              aria-label={`Betrag ${row.accountNumber}`}
              valueCents={row.amountCents}
              onChange={(amountCents) =>
                update({
                  ...guv,
                  rows: guv.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, amountCents } : item)),
                })
              }
            />
          </label>
        </div>
      ))}
      <label className="form-field">
        Summe Aufwand
        <CentsInput aria-label="Summe Aufwand" valueCents={guv.totalExpenseCents} onChange={(totalExpenseCents) => update({ ...guv, totalExpenseCents })} />
      </label>
      <label className="form-field">
        Summe Ertrag
        <CentsInput aria-label="Summe Ertrag" valueCents={guv.totalRevenueCents} onChange={(totalRevenueCents) => update({ ...guv, totalRevenueCents })} />
      </label>
      <label className="form-field">
        Ergebnis
        <CentsInput aria-label="Ergebnis" valueCents={guv.resultCents} onChange={(resultCents) => update({ ...guv, resultCents })} />
      </label>
      <label className="form-field">
        Art
        <select aria-label="Gewinn oder Verlust" value={guv.resultKind} onChange={(event) => update({ ...guv, resultKind: event.target.value as JournalPracticeProgress['guv']['resultKind'] })}>
          <option value="">wählen</option>
          <option value="gewinn">Gewinn</option>
          <option value="verlust">Verlust</option>
        </select>
      </label>
    </section>
  )
}

function BalanceStep({
  progress,
  onChange,
}: {
  progress: JournalPracticeProgress
  onChange: (next: JournalPracticeProgress) => void
}) {
  const balance = progress.balance
  const update = (next: JournalPracticeProgress['balance']) => onChange(setJournalBalance(progress, next))
  return (
    <section className="panel">
      <h2 className="panel-title">Schlussbilanz</h2>
      {balance.rows.map((row, index) => (
        <div key={`${row.accountNumber}-${index}`} className="training-line">
          <AccountField
            label="Konto"
            value={row.accountNumber}
            onChange={(accountNumber) =>
              update({
                ...balance,
                rows: balance.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, accountNumber } : item)),
              })
            }
          />
          <label className="form-field">
            Seite
            <select
              aria-label={`Bilanz ${row.accountNumber}`}
              value={row.section}
              onChange={(event) =>
                update({
                  ...balance,
                  rows: balance.rows.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, section: event.target.value as '' | 'aktiva' | 'passiva' | 'eigenkapital' }
                      : item,
                  ),
                })
              }
            >
              <option value="">nicht zugeordnet</option>
              <option value="aktiva">Aktiva</option>
              <option value="passiva">Passiva</option>
              <option value="eigenkapital">Eigenkapital</option>
            </select>
          </label>
          <label className="form-field">
            Betrag
            <CentsInput
              aria-label={`Bilanzbetrag ${row.accountNumber}`}
              valueCents={row.amountCents}
              onChange={(amountCents) =>
                update({
                  ...balance,
                  rows: balance.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, amountCents } : item)),
                })
              }
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => update({ ...balance, rows: [...balance.rows, { accountNumber: '', section: 'eigenkapital', amountCents: 0 }] })}
      >
        Eigenkapitalzeile
      </button>
      <AccountField label="Schlussbilanzkonto" value={balance.sbkAccount} onChange={(sbkAccount) => update({ ...balance, sbkAccount })} />
      <label className="form-field">
        SBK Soll
        <CentsInput aria-label="SBK Soll" valueCents={balance.sbkSollCents} onChange={(sbkSollCents) => update({ ...balance, sbkSollCents })} />
      </label>
      <label className="form-field">
        SBK Haben
        <CentsInput aria-label="SBK Haben" valueCents={balance.sbkHabenCents} onChange={(sbkHabenCents) => update({ ...balance, sbkHabenCents })} />
      </label>
      <label className="form-field">
        Summe Aktiva
        <CentsInput aria-label="Summe Aktiva" valueCents={balance.totalAssetsCents} onChange={(totalAssetsCents) => update({ ...balance, totalAssetsCents })} />
      </label>
      <label className="form-field">
        Summe Passiva
        <CentsInput aria-label="Summe Passiva" valueCents={balance.totalPassivaCents} onChange={(totalPassivaCents) => update({ ...balance, totalPassivaCents })} />
      </label>
    </section>
  )
}

function solutionText(step: JournalStep, entries: JournalEntry[], vatEnabled: boolean): string {
  if (step.kind === 'eroeffnung' || step.kind === 'vorfall') {
    return solutionAccounts(entries, step, vatEnabled)
      .map((row) => `${row.accountNumber} Soll ${formatCents(row.sumDebitCents)} Haben ${formatCents(row.sumCreditCents)} Saldo ${formatCents(row.balanceCents)} ${row.side}`)
      .join('\n')
  }
  if (step.kind === 'abschluss') {
    return solutionClosing(entries, vatEnabled).entries
      .map((entry, index) => `${index + 1}: ${entry.lines.map((line) => `${line.accountNumber} S ${line.debitCents} H ${line.creditCents}`).join(', ')}`)
      .join('\n')
  }
  if (step.kind === 'guv') {
    const guv = solutionGuv(entries, vatEnabled)
    return [...guv.rows.map((row) => `${row.side} ${row.accountNumber} ${formatCents(row.amountCents)}`), `${guv.resultKind} ${formatCents(guv.resultCents)}`].join('\n')
  }
  const sheet = solutionBalance(entries, vatEnabled)
  return [...sheet.rows.map((row) => `${row.section} ${row.accountNumber} ${formatCents(row.amountCents)}`), `SBK ${sheet.sbkAccount}`].join('\n')
}
