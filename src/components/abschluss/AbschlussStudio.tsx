import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAccounting } from '../../accounting/AccountingContext'
import { evaluateTAccounts } from '../../abschluss/evaluateTAccounts'
import {
  balanceSheetSolutionDraft,
  evaluateBalanceSheet,
} from '../../abschluss/evaluateBalanceSheet'
import {
  evaluateIncomeStatement,
  incomeStatementSolutionDraft,
} from '../../abschluss/evaluateIncomeStatement'
import { expectedTAccountsAsDraft } from '../../abschluss/expectedBalances'
import type {
  AbschlussEvaluationResult,
  AbschlussStep,
  BalanceSheetDraft,
  IncomeStatementDraft,
  TAccountDraft,
} from '../../abschluss/types'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { AsOfControl, PeriodControls } from '../berichte/PeriodControls'
import { AbschlussFeedback } from './AbschlussFeedback'
import {
  BalanceSheetBuilder,
  createEmptyBalanceSheetDraft,
} from './BalanceSheetBuilder'
import {
  createEmptyIncomeStatementDraft,
  IncomeStatementBuilder,
} from './IncomeStatementBuilder'
import { TAccountBoard } from './TAccountBoard'

const STEP_LABELS: Record<AbschlussStep, string> = {
  t_accounts: '1 · T-Konten',
  bilanz: '2 · Bilanz',
  guv: '3 · GuV',
}

const PEDAGOGY: Record<AbschlussStep, { title: string; body: string }> = {
  t_accounts: {
    title: 'T-Konten aufstellen',
    body: 'Jedes Konto mit Saldo ≠ 0 bekommt ein T: linke Seite Soll, rechte Haben. Der Endsaldo steht auf der Seite mit dem höheren Umsatz (bzw. der naturgemäßen Seite). Betrag = |Soll − Haben| in Cent — exakt wie in SuSa/Kontenblatt.',
  },
  bilanz: {
    title: 'Bilanz zum Stichtag',
    body: 'Aktiva (Sollsalden der Aktivkonten) stehen Passiva + Eigenkapital gegenüber. Das Periodenergebnis (Erträge − Aufwendungen bis Stichtag) schließt die Bilanz rechnerisch — ohne GuV-Abschlussbuchung. Bilanzgleichung: Aktiva = Passiva + EK + Periodenergebnis.',
  },
  guv: {
    title: 'Gewinn- und Verlustrechnung',
    body: 'Nur Ertrags- und Aufwandskonten der gewählten Periode. Erträge (Haben−Soll) minus Aufwendungen (Soll−Haben) ergeben das Periodenergebnis — dasselbe, das in der Bilanz erscheint.',
  },
}

export function AbschlussStudio() {
  const { entries, persistWarning } = useAccounting()
  const [step, setStep] = useState<AbschlussStep>('t_accounts')
  const [asOf, setAsOf] = useState('2026-10-08')
  const [from, setFrom] = useState('2026-10-01')
  const [to, setTo] = useState('2026-10-31')

  const [tDraft, setTDraft] = useState<TAccountDraft[]>([])
  const [bilanzDraft, setBilanzDraft] = useState<BalanceSheetDraft>(
    createEmptyBalanceSheetDraft,
  )
  const [guvDraft, setGuvDraft] = useState<IncomeStatementDraft>(
    createEmptyIncomeStatementDraft,
  )

  const [evaluation, setEvaluation] = useState<AbschlussEvaluationResult | null>(
    null,
  )
  const [showSolution, setShowSolution] = useState(false)
  const [unlocked, setUnlocked] = useState<Record<AbschlussStep, boolean>>({
    t_accounts: true,
    bilanz: false,
    guv: false,
  })

  const range = useMemo(() => ({ from, to }), [from, to])

  const handleCheck = () => {
    setShowSolution(false)
    let result: AbschlussEvaluationResult
    if (step === 't_accounts') {
      result = evaluateTAccounts(entries, asOf, tDraft)
      if (result.fullyCorrect) {
        setUnlocked((prev) => ({ ...prev, bilanz: true }))
      }
    } else if (step === 'bilanz') {
      result = evaluateBalanceSheet(entries, asOf, bilanzDraft)
      if (result.fullyCorrect) {
        setUnlocked((prev) => ({ ...prev, guv: true }))
      }
    } else {
      result = evaluateIncomeStatement(entries, range, guvDraft)
    }
    setEvaluation(result)
  }

  const handleShowSolution = () => {
    setShowSolution(true)
    if (step === 't_accounts') {
      setTDraft(expectedTAccountsAsDraft(entries, asOf))
    } else if (step === 'bilanz') {
      setBilanzDraft(balanceSheetSolutionDraft(entries, asOf))
    } else {
      setGuvDraft(incomeStatementSolutionDraft(entries, range))
    }
  }

  const pedagogy = PEDAGOGY[step]

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          'Abschluss-Studio prüft gegen das aktuelle Org-Journal — gleiche Logik wie SuSa, Bilanz und GuV.'
        }
      />
      <PageHeader
        title="Abschluss üben"
        subtitle={`${entries.length} Journalbuchungen · T-Konten, Bilanz, GuV selbst aufstellen`}
        actions={
          <Link to="/berichte" className="btn btn-secondary">
            Zur Berichte-Übersicht
          </Link>
        }
      />

      <section className="panel">
        <div className="abschluss-stepper" role="tablist" aria-label="Abschluss-Schritte">
          {(Object.keys(STEP_LABELS) as AbschlussStep[]).map((id) => {
            const enabled = unlocked[id] || id === step
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={step === id}
                className={`btn ${step === id ? 'btn-primary' : 'btn-secondary'}`}
                disabled={!enabled && !unlocked[id]}
                onClick={() => {
                  setStep(id)
                  setEvaluation(null)
                  setShowSolution(false)
                }}
              >
                {STEP_LABELS[id]}
                {!unlocked[id] && id !== 't_accounts' ? ' 🔒' : ''}
              </button>
            )
          })}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setUnlocked({ t_accounts: true, bilanz: true, guv: true })
            }
          >
            Alle Schritte freischalten
          </button>
        </div>

        {step === 'guv' ? (
          <PeriodControls
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            label="GuV-Periode"
          />
        ) : (
          <AsOfControl asOf={asOf} onChange={setAsOf} />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{pedagogy.title}</h2>
          <span className="panel-badge">
            <GraduationCap size={14} aria-hidden /> Erklärung
          </span>
        </div>
        <p>{pedagogy.body}</p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Deine Lösung</h2>
          <span className="panel-badge">Live-Journal</span>
        </div>
        {step === 't_accounts' ? (
          <TAccountBoard value={tDraft} onChange={setTDraft} />
        ) : null}
        {step === 'bilanz' ? (
          <BalanceSheetBuilder value={bilanzDraft} onChange={setBilanzDraft} />
        ) : null}
        {step === 'guv' ? (
          <IncomeStatementBuilder value={guvDraft} onChange={setGuvDraft} />
        ) : null}

        <div className="page-actions-row" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleCheck}>
            Prüfen
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleShowSolution}
          >
            Musterlösung zeigen
          </button>
        </div>
      </section>

      {evaluation ? <AbschlussFeedback evaluation={evaluation} /> : null}

      {showSolution ? (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Musterlösung</h2>
            <span className="panel-badge">aus Report-Builder</span>
          </div>
          <p className="panel-note">
            Berechnet aus dem aktuellen Journal (
            {step === 'guv' ? `${from}–${to}` : `Stichtag ${asOf}`}) — dieselben
            Funktionen wie unter Berichte.
          </p>
          {step === 't_accounts' ? (
            <TAccountBoard
              value={expectedTAccountsAsDraft(entries, asOf)}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
          {step === 'bilanz' ? (
            <BalanceSheetBuilder
              value={balanceSheetSolutionDraft(entries, asOf)}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
          {step === 'guv' ? (
            <IncomeStatementBuilder
              value={incomeStatementSolutionDraft(entries, range)}
              onChange={() => undefined}
              readOnly
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
