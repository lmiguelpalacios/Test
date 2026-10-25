import { formatCents } from '../../../accounting/money'
import { chartOfAccounts, getAccountMap } from '../../../data/chart-of-accounts'
import type { JournalLine } from '../../../types/accounting'
import { CentsInput } from '../CentsInput'
import type { PhaseHints, TrainingLine } from '../../../abschluss/training/types'

const accounts = getAccountMap()

export function AccountField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const name = accounts.get(value.trim())?.name
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        list="training-accounts"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
      {name ? <span className="training-account-name">{name}</span> : null}
    </label>
  )
}

export function AccountList() {
  return (
    <datalist id="training-accounts">
      {chartOfAccounts.map((account) => (
        <option key={account.number} value={account.number}>
          {account.name}
        </option>
      ))}
    </datalist>
  )
}

export function LineEditor({
  lines,
  onChange,
}: {
  lines: TrainingLine[]
  onChange: (lines: TrainingLine[]) => void
}) {
  const update = (index: number, patch: Partial<TrainingLine>) => {
    onChange(lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)))
  }
  return (
    <div className="training-lines">
      {lines.map((line, index) => (
        <div key={index} className="training-line">
          <AccountField
            label={`Konto Zeile ${index + 1}`}
            value={line.accountNumber}
            onChange={(accountNumber) => update(index, { accountNumber })}
          />
          <label className="form-field">
            <span>Soll</span>
            <CentsInput
              aria-label={`Soll Zeile ${index + 1}`}
              valueCents={line.debitCents}
              onChange={(debitCents) => update(index, { debitCents, creditCents: debitCents > 0 ? 0 : line.creditCents })}
            />
          </label>
          <label className="form-field">
            <span>Haben</span>
            <CentsInput
              aria-label={`Haben Zeile ${index + 1}`}
              valueCents={line.creditCents}
              onChange={(creditCents) => update(index, { creditCents, debitCents: creditCents > 0 ? 0 : line.debitCents })}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onChange(lines.filter((_, lineIndex) => lineIndex !== index))}
          >
            Zeile entfernen
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onChange([...lines, { accountNumber: '', debitCents: 0, creditCents: 0 }])}
      >
        Zeile hinzufügen
      </button>
    </div>
  )
}

export function JournalLines({ lines }: { lines: JournalLine[] }) {
  return (
    <table className="training-table">
      <thead>
        <tr>
          <th>Konto</th>
          <th>Soll</th>
          <th>Haben</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={`${line.accountNumber}-${index}`}>
            <td>
              {line.accountNumber} {accounts.get(line.accountNumber)?.name ?? ''}
            </td>
            <td>{line.debitCents ? formatCents(line.debitCents) : ''}</td>
            <td>{line.creditCents ? formatCents(line.creditCents) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HintBox({
  hints,
  stage,
  solution,
  onAdvance,
  onSolution,
  solutionAllowed,
}: {
  hints: PhaseHints
  stage: 0 | 1 | 2 | 3 | 4
  solution: string | null
  onAdvance: () => void
  onSolution: () => void
  solutionAllowed: boolean
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Hinweise</h2>
        <span className="panel-badge">Stufe {stage}/4</span>
      </div>
      {stage >= 1 ? <p>{hints.general}</p> : <p className="panel-note">Noch kein Hinweis. Die Musterlösung bleibt zu.</p>}
      {stage >= 2 ? <p>{hints.accountClass}</p> : null}
      {stage >= 3 ? <p>{hints.principle}</p> : null}
      {stage >= 4 && solution ? <p className="training-solution">{solution}</p> : null}
      <div className="page-actions-row">
        <button type="button" className="btn btn-secondary" onClick={onAdvance} disabled={stage >= 3}>
          Hinweis
        </button>
        <button type="button" className="btn btn-secondary" onClick={onSolution} disabled={!solutionAllowed && stage < 4}>
          Musterlösung
        </button>
      </div>
      {!solutionAllowed && stage < 4 ? (
        <p className="panel-note">
          Die Musterlösung öffnet nach einem Fehlversuch und dem Prinzip-Hinweis, oder wenn die Phase korrekt ist.
        </p>
      ) : null}
    </section>
  )
}
