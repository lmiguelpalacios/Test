import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccountMap } from '../../../data/chart-of-accounts'
import { formatCents } from '../../../accounting/money'
import { mergeTAccountSeeds } from '../../../abschluss/training/progress'
import { nordlichtCase } from '../../../abschluss/training/nordlichtCase'
import {
  advanceHint,
  checkPhase,
  createInitialProgress,
  isCaseComplete,
  loadCaseProgress,
  lockReason,
  openPhase,
  resetCaseProgress,
  revealSolution,
  saveCaseProgress,
  setBalance,
  setClosing,
  setGuv,
  setPosting,
  setTAccounts,
  skipPhase,
  TRAINING_PERSISTENCE,
} from '../../../abschluss/training/progress'
import {
  GUV_ACCOUNT,
  SBK_ACCOUNT,
  solveTrainingCase,
  type SolvedCase,
} from '../../../abschluss/training/solve'
import {
  PHASE_IDS,
  PHASE_LABELS,
  PHASE_STATUS_LABELS,
  type BalanceWorkDraft,
  type CaseProgress,
  type GuvWorkDraft,
  type PhaseId,
  type TrainingLine,
} from '../../../abschluss/training/types'
import { DemoBanner } from '../../DemoBanner'
import { PageHeader } from '../../PageHeader'
import { AbschlussFeedback } from '../AbschlussFeedback'
import { CentsInput } from '../CentsInput'
import { AccountField, AccountList, HintBox, JournalLines, LineEditor } from './editors'

const accountNames = getAccountMap()

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function TrainingStudio({
  onOpenStudio,
  embedded = false,
  onSolved,
}: {
  onOpenStudio?: () => void
  embedded?: boolean
  onSolved?: (progress: CaseProgress) => void
}) {
  const solved = useMemo(() => solveTrainingCase(nordlichtCase), [])
  const [progress, setProgress] = useState<CaseProgress>(() => {
    const storage = browserStorage()
    const loaded = storage ? loadCaseProgress(storage, nordlichtCase) : createInitialProgress(nordlichtCase)
    return openPhase(loaded, 'B')
  })
  const [active, setActive] = useState<PhaseId>('B')
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [lockMessage, setLockMessage] = useState<string | null>(null)
  const [solutionNote, setSolutionNote] = useState<string | null>(null)

  useEffect(() => {
    const storage = browserStorage()
    if (!storage) return
    saveCaseProgress(storage, progress)
  }, [progress])

  const solvedNotified = useRef(false)
  useEffect(() => {
    if (!onSolved || solvedNotified.current) return
    const done = (['B', 'C', 'D', 'E', 'F'] as const).every(
      (id) => progress.phases[id].status === 'korrekt',
    )
    if (!done) return
    solvedNotified.current = true
    onSolved(progress)
  }, [onSolved, progress])

  const phase = progress.phases[active]
  const locked = lockReason(progress, active)

  const selectPhase = (id: PhaseId) => {
    const reason = lockReason(progress, id)
    if (reason) {
      setLockMessage(reason)
      return
    }
    setLockMessage(null)
    setSolutionNote(null)
    setActive(id)
    setProgress((current) => seed(openPhase(current, id), id, solved))
    setChecklistOpen(false)
  }

  const patch = (next: CaseProgress) => {
    setSolutionNote(null)
    setProgress(next)
  }

  const onCheck = () => {
    patch(checkPhase(progress, active, nordlichtCase))
  }

  const onHint = () => patch(advanceHint(progress, active))

  const onSolution = () => {
    const result = revealSolution(progress, active)
    if (!result.allowed) {
      setSolutionNote('Zuerst prüfen. Die Musterlösung folgt auf den Prinzip-Hinweis nach einem Fehler, oder auf eine korrekte Phase.')
      return
    }
    setSolutionNote(null)
    setProgress(result.progress)
  }

  const onReset = () => {
    if (!window.confirm('Nur den Fortschritt dieses Falls löschen? Andere Buchhaltungsdaten bleiben.')) return
    const storage = browserStorage()
    const fresh = storage ? resetCaseProgress(storage, nordlichtCase) : createInitialProgress(nordlichtCase)
    setProgress(fresh)
    setActive('B')
  }

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          TRAINING_PERSISTENCE === 'local'
            ? 'Geführter Fall, nur in diesem Browser gespeichert. Es wird nichts an Supabase geschrieben.'
            : 'Geführter Fall.'
        }
      />
      <PageHeader
        title={embedded ? 'Alles auf einmal' : 'Abschluss üben'}
        subtitle={
          embedded
            ? `${nordlichtCase.title} · eigene 19-%-Story, ohne Sortierliste`
            : `${nordlichtCase.title} · Centgenau aus dem Journal`
        }
        actions={
          embedded ? (
            <Link to="/lernmodus" className="btn btn-secondary">
              Zur Übersicht
            </Link>
          ) : (
            <>
              {onOpenStudio ? (
                <button type="button" className="btn btn-secondary" onClick={onOpenStudio}>
                  Freies Studio
                </button>
              ) : null}
              <Link to="/berichte" className="btn btn-secondary">
                Zur Übersicht
              </Link>
            </>
          )
        }
      />

      {embedded ? (
        <section className="panel">
          <h2 className="panel-title">Vorfälle in Journalfolge</h2>
          <ol className="training-events">
            {nordlichtCase.events.map((event) => (
              <li key={event.id}>
                <strong>
                  {event.date} · {event.documentNumber} · {event.title}
                </strong>
                <p>
                  {event.party}. {event.story}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

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
            {PHASE_IDS.map((id) => {
              const item = progress.phases[id]
              const reason = lockReason(progress, id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`training-step ${active === id ? 'is-active' : ''}`}
                    aria-current={active === id ? 'step' : undefined}
                    onClick={() => selectPhase(id)}
                  >
                    <span>
                      {id} · {PHASE_LABELS[id]}
                    </span>
                    <span className={`training-status status-${item.status}`}>
                      {PHASE_STATUS_LABELS[item.status]}
                    </span>
                    <span className="training-progress-mark">{progressMark(item)}</span>
                    {reason ? <span className="training-lock">{reason}</span> : null}
                  </button>
                </li>
              )
            })}
          </ol>
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Fall zurücksetzen
          </button>
        </aside>

        <div className="training-work">
          {lockMessage ? (
            <div className="form-alert error" role="status">
              {lockMessage}
            </div>
          ) : null}
          {locked ? (
            <section className="panel">
              <p>{locked}</p>
            </section>
          ) : (
            <>
              {active === 'B' ? <PhaseJournal progress={progress} solved={solved} onChange={patch} /> : null}
              {active === 'C' ? <PhaseT progress={progress} onChange={patch} /> : null}
              {active === 'D' ? <PhaseClose progress={progress} onChange={patch} /> : null}
              {active === 'E' ? <PhaseGuv progress={progress} onChange={patch} /> : null}
              {active === 'F' ? <PhaseSheet progress={progress} onChange={patch} /> : null}
              {active === 'G' ? <PhaseControl progress={progress} /> : null}
              <HintBox
                hints={nordlichtCase.hints[active]}
                stage={phase.hintStage}
                solution={phase.hintStage >= 4 ? solutionText(active, solved, progress) : null}
                onAdvance={onHint}
                onSolution={onSolution}
                solutionAllowed={
                  phase.status === 'korrekt' || (phase.status === 'fehlerhaft' && phase.hintStage >= 3)
                }
              />
              {solutionNote ? <p className="panel-note">{solutionNote}</p> : null}
              <div className="page-actions-row">
                <button type="button" className="btn btn-primary" onClick={onCheck}>
                  Prüfen
                </button>
                {active !== 'G' ? (
                  <button type="button" className="btn btn-secondary" onClick={() => patch(skipPhase(progress, active))}>
                    Überspringen
                  </button>
                ) : null}
              </div>
              {phase.evaluation ? <AbschlussFeedback evaluation={phase.evaluation} /> : null}
            </>
          )}
        </div>
      </div>
      <AccountList />
    </div>
  )
}

function progressMark(phase: CaseProgress['phases'][PhaseId]): string {
  if (phase.status === 'korrekt') return 'richtig'
  if (phase.status === 'fehlerhaft') return 'falsch'
  if (phase.status === 'uebersprungen') return 'übersprungen'
  if (!phase.viewed) return 'ungesehen'
  if (!phase.started) return 'gesehen'
  return 'begonnen'
}

function seed(progress: CaseProgress, id: PhaseId, solved: SolvedCase): CaseProgress {
  if (id === 'C') {
    const numbers = new Set<string>()
    for (const posting of Object.values(progress.postings)) {
      for (const line of posting.lines) {
        if (line.accountNumber.trim()) numbers.add(line.accountNumber.trim())
      }
    }
    return { ...progress, tAccounts: mergeTAccountSeeds(progress.tAccounts, [...numbers]) }
  }
  if (id === 'E') {
    const rows = solved.worksheets
      .filter((sheet) => sheet.closingAccount === GUV_ACCOUNT)
      .map((sheet) => {
        const existing = progress.guv.rows.find((row) => row.accountNumber === sheet.accountNumber)
        return existing ?? { accountNumber: sheet.accountNumber, side: '' as const, amountCents: 0 }
      })
    return { ...progress, guv: { ...progress.guv, rows } }
  }
  if (id === 'F') {
    const seeded = solved.worksheets
      .filter((sheet) => sheet.closingAccount === SBK_ACCOUNT)
      .map((sheet) => {
        const existing = progress.balance.rows.find((row) => row.accountNumber === sheet.accountNumber)
        return existing ?? { accountNumber: sheet.accountNumber, section: '' as const, amountCents: 0 }
      })
    const extras = progress.balance.rows.filter(
      (row) => !seeded.some((item) => item.accountNumber === row.accountNumber),
    )
    return { ...progress, balance: { ...progress.balance, rows: [...seeded, ...extras] } }
  }
  return progress
}

function solutionText(id: PhaseId, solved: SolvedCase, progress: CaseProgress): string {
  if (id === 'B') {
    return nordlichtCase.events
      .map((event) => {
        const entry = solved.byEventId.get(event.id)!
        const lines = entry.lines
          .map((line) => `${line.accountNumber} Soll ${formatCents(line.debitCents)} Haben ${formatCents(line.creditCents)}`)
          .join('; ')
        return `${event.documentNumber}: ${lines}`
      })
      .join('\n')
  }
  if (id === 'C') {
    return solved.worksheets
      .map(
        (sheet) =>
          `${sheet.accountNumber} Summe Soll ${formatCents(sheet.sumDebitCents)} Haben ${formatCents(sheet.sumCreditCents)}, Saldo ${formatCents(sheet.balanceCents)} ${sheet.side}, Abschluss ${sheet.closingAccount || '—'}`,
      )
      .join('\n')
  }
  if (id === 'D') {
    return [...solved.nominalClosing, ...solved.resultClosing, ...solved.sbkClosing]
      .map(
        (entry) =>
          `${entry.documentNumber}: ${entry.lines
            .map((line) => `${line.accountNumber} Soll ${formatCents(line.debitCents)} Haben ${formatCents(line.creditCents)}`)
            .join('; ')}`,
      )
      .join('\n')
  }
  if (id === 'E') {
    return solved.income.expenseRows
      .map((row) => `Aufwand ${row.accountNumber} ${formatCents(row.amountCents)}`)
      .concat(solved.income.revenueRows.map((row) => `Ertrag ${row.accountNumber} ${formatCents(row.amountCents)}`))
      .concat([
        `Summen Aufwand ${formatCents(solved.income.totalExpenseCents)} Ertrag ${formatCents(solved.income.totalRevenueCents)}`,
        `${solved.profitCents >= 0 ? 'Gewinn' : 'Verlust'} ${formatCents(Math.abs(solved.profitCents))}`,
      ])
      .join('\n')
  }
  if (id === 'F') {
    const sheet = solved.balanceSheet
    return [
      ...sheet.assets.map((row) => `Aktiva ${row.accountNumber} ${formatCents(row.amountCents)}`),
      ...sheet.liabilities.map((row) => `Passiva ${row.accountNumber} ${formatCents(row.amountCents)}`),
      ...sheet.equityAccounts.map((row) => `Eigenkapital ${row.accountNumber} ${formatCents(row.amountCents)}`),
      `SBK ${SBK_ACCOUNT} Soll ${formatCents(sheet.totalAssetsCents)} Haben ${formatCents(sheet.totalLiabilitiesAndEquityCents)}`,
    ].join('\n')
  }
  return isCaseComplete(progress) ? 'Der Fall ist abgeschlossen.' : 'Noch sind nicht alle Pflichtphasen Korrekt.'
}

function PhaseJournal({
  progress,
  solved,
  onChange,
}: {
  progress: CaseProgress
  solved: SolvedCase
  onChange: (next: CaseProgress) => void
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Journal buchen</h2>
        <span className="panel-badge">einfach und zusammengesetzt</span>
      </div>
      <p className="panel-note">
        Zeilen sind nicht auf zwei begrenzt. Steuerzeilen gehören in dieselbe Buchung, wenn der Vorfall Umsatzsteuer hat.
      </p>
      {nordlichtCase.events.map((event) => {
        const lines = progress.postings[event.id]?.lines ?? []
        const showSolution = progress.phases.B.hintStage >= 4
        return (
          <article key={event.id} className="training-event">
            <h3>
              {event.date} · {event.documentNumber} · {event.title}
            </h3>
            <p>
              {event.party}. {event.story}
            </p>
            <LineEditor
              lines={lines}
              onChange={(next) => onChange(setPosting(progress, event.id, next))}
            />
            {showSolution ? <JournalLines lines={solved.byEventId.get(event.id)?.lines ?? []} /> : null}
          </article>
        )
      })}
    </section>
  )
}

function PhaseT({
  progress,
  onChange,
}: {
  progress: CaseProgress
  onChange: (next: CaseProgress) => void
}) {
  const replace = (accountNumber: string, patch: Partial<(typeof progress.tAccounts)[number]>) => {
    onChange(
      setTAccounts(
        progress,
        progress.tAccounts.map((draft) => (draft.accountNumber === accountNumber ? { ...draft, ...patch } : draft)),
      ),
    )
  }
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">T-Konten</h2>
        <span className="panel-badge">aus deinen Buchungen</span>
      </div>
      <p className="panel-note">Die Zeilen kommen aus deinem Journal. Summen, Saldo und Abschlusskonto rechnest du selbst.</p>
      <div className="t-account-grid">
        {progress.tAccounts.map((draft) => (
          <article key={draft.accountNumber} className="t-account">
            <header className="t-account-header">
              {draft.accountNumber} {accountNames.get(draft.accountNumber)?.name ?? ''}
            </header>
            <ul className="training-postings">
              {postingLines(progress, draft.accountNumber).map((line, index) => (
                <li key={`${line.documentNumber}-${index}`}>
                  {line.date} {line.documentNumber}: Soll {formatCents(line.debitCents)} · Haben {formatCents(line.creditCents)}
                </li>
              ))}
            </ul>
            <div className="training-line">
              <label className="form-field">
                Summe Soll
                <CentsInput
                  aria-label={`Summe Soll ${draft.accountNumber}`}
                  valueCents={draft.sumDebitCents}
                  onChange={(sumDebitCents) => replace(draft.accountNumber, { sumDebitCents })}
                />
              </label>
              <label className="form-field">
                Summe Haben
                <CentsInput
                  aria-label={`Summe Haben ${draft.accountNumber}`}
                  valueCents={draft.sumCreditCents}
                  onChange={(sumCreditCents) => replace(draft.accountNumber, { sumCreditCents })}
                />
              </label>
              <label className="form-field">
                Saldo
                <CentsInput
                  aria-label={`Saldo ${draft.accountNumber}`}
                  valueCents={draft.balanceCents}
                  onChange={(balanceCents) => replace(draft.accountNumber, { balanceCents })}
                />
              </label>
              <label className="form-field">
                Seite
                <select
                  aria-label={`Seite ${draft.accountNumber}`}
                  value={draft.side}
                  onChange={(event) => replace(draft.accountNumber, { side: event.target.value as 'soll' | 'haben' })}
                >
                  <option value="soll">Soll</option>
                  <option value="haben">Haben</option>
                </select>
              </label>
              <AccountField
                label="Abschluss gegen"
                value={draft.closingAccount}
                onChange={(closingAccount) => replace(draft.accountNumber, { closingAccount })}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function postingLines(progress: CaseProgress, accountNumber: string): { date: string; documentNumber: string; debitCents: number; creditCents: number }[] {
  const lines = []
  for (const event of nordlichtCase.events) {
    for (const line of progress.postings[event.id]?.lines ?? []) {
      if (line.accountNumber.trim() !== accountNumber) continue
      if (line.debitCents === 0 && line.creditCents === 0) continue
      lines.push({
        date: event.date,
        documentNumber: event.documentNumber,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
      })
    }
  }
  return lines
}

function PhaseClose({
  progress,
  onChange,
}: {
  progress: CaseProgress
  onChange: (next: CaseProgress) => void
}) {
  const entries = progress.closing.entries
  const update = (nextEntries: { lines: TrainingLine[] }[]) => onChange(setClosing(progress, { entries: nextEntries }))
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Abschlussbuchungen</h2>
      </div>
      <p className="panel-note">
        Schließe Erfolgskonten, das Ergebnis und die Bestandskonten. Eine Buchung darf mehr als zwei Zeilen haben. Unausgeglichene Buchungen werden mit Hinweis zurückgegeben.
      </p>
      {entries.map((entry, index) => (
        <article key={index} className="training-event">
          <h3>Buchung {index + 1}</h3>
          <LineEditor
            lines={entry.lines}
            onChange={(lines) => update(entries.map((item, itemIndex) => (itemIndex === index ? { lines } : item)))}
          />
        </article>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => update([...entries, { lines: [{ accountNumber: '', debitCents: 0, creditCents: 0 }, { accountNumber: '', debitCents: 0, creditCents: 0 }] }])}
      >
        Weitere Abschlussbuchung
      </button>
    </section>
  )
}

function PhaseGuv({
  progress,
  onChange,
}: {
  progress: CaseProgress
  onChange: (next: CaseProgress) => void
}) {
  const guv = progress.guv
  const update = (next: GuvWorkDraft) => onChange(setGuv(progress, next))
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Gewinn- und Verlustrechnung</h2>
      </div>
      <p className="panel-note">Die Konten sind die Erfolgskonten mit Saldo. Seite und Betrag trägst du ein.</p>
      {guv.rows.map((row, index) => (
        <div key={row.accountNumber} className="training-line">
          <strong>
            {row.accountNumber} {accountNames.get(row.accountNumber)?.name ?? ''}
          </strong>
          <label className="form-field">
            Seite
            <select
              aria-label={`GuV-Seite ${row.accountNumber}`}
              value={row.side}
              onChange={(event) => {
                const side = event.target.value as GuvWorkDraft['rows'][number]['side']
                update({
                  ...guv,
                  rows: guv.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, side } : item)),
                })
              }}
            >
              <option value="">nicht zugeordnet</option>
              <option value="aufwand">Aufwand</option>
              <option value="ertrag">Ertrag</option>
            </select>
          </label>
          <label className="form-field">
            Betrag
            <CentsInput
              aria-label={`GuV-Betrag ${row.accountNumber}`}
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
      <div className="abschluss-totals">
        <label className="form-field">
          Summe Aufwand
          <CentsInput
            aria-label="Summe Aufwand"
            valueCents={guv.totalExpenseCents}
            onChange={(totalExpenseCents) => update({ ...guv, totalExpenseCents })}
          />
        </label>
        <label className="form-field">
          Summe Ertrag
          <CentsInput
            aria-label="Summe Ertrag"
            valueCents={guv.totalRevenueCents}
            onChange={(totalRevenueCents) => update({ ...guv, totalRevenueCents })}
          />
        </label>
        <label className="form-field">
          Ergebnis
          <CentsInput
            aria-label="Ergebnisbetrag"
            valueCents={guv.resultCents}
            onChange={(resultCents) => update({ ...guv, resultCents })}
          />
        </label>
        <label className="form-field">
          Art
          <select
            aria-label="Gewinn oder Verlust"
            value={guv.resultKind}
            onChange={(event) => update({ ...guv, resultKind: event.target.value as GuvWorkDraft['resultKind'] })}
          >
            <option value="">wählen</option>
            <option value="gewinn">Gewinn</option>
            <option value="verlust">Verlust</option>
          </select>
        </label>
      </div>
    </section>
  )
}

function PhaseSheet({
  progress,
  onChange,
}: {
  progress: CaseProgress
  onChange: (next: CaseProgress) => void
}) {
  const balance = progress.balance
  const update = (next: BalanceWorkDraft) => onChange(setBalance(progress, next))
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Schlussbilanz</h2>
      </div>
      <p className="panel-note">
        Ordne jedes Bestandskonto zu. Das Ergebnis gehört ins Eigenkapital. Gleiche Summen mit falscher Zuordnung gelten nicht.
      </p>
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
              aria-label={`Bilanzseite ${row.accountNumber || index}`}
              value={row.section}
              onChange={(event) => {
                const section = event.target.value as BalanceWorkDraft['rows'][number]['section']
                update({
                  ...balance,
                  rows: balance.rows.map((item, itemIndex) => (itemIndex === index ? { ...item, section } : item)),
                })
              }}
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
              aria-label={`Bilanzbetrag ${row.accountNumber || index}`}
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
      <div className="abschluss-totals">
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
          <CentsInput
            aria-label="Summe Aktiva"
            valueCents={balance.totalAssetsCents}
            onChange={(totalAssetsCents) => update({ ...balance, totalAssetsCents })}
          />
        </label>
        <label className="form-field">
          Summe Passiva
          <CentsInput
            aria-label="Summe Passiva"
            valueCents={balance.totalPassivaCents}
            onChange={(totalPassivaCents) => update({ ...balance, totalPassivaCents })}
          />
        </label>
      </div>
    </section>
  )
}

function PhaseControl({ progress }: { progress: CaseProgress }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Gesamtkontrolle</h2>
        <span className="panel-badge">{isCaseComplete(progress) ? 'abgeschlossen' : 'offen'}</span>
      </div>
      <p>Der Fall ist erst abgeschlossen, wenn die Prüfung jede Pflichtphase als Korrekt meldet. Öffnen allein reicht nicht.</p>
      <ul className="placeholder-list">
        {PHASE_IDS.filter((id) => id !== 'G').map((id) => (
          <li key={id}>
            {id} {PHASE_LABELS[id]}: {PHASE_STATUS_LABELS[progress.phases[id].status]} ({progressMark(progress.phases[id])})
          </li>
        ))}
      </ul>
    </section>
  )
}
