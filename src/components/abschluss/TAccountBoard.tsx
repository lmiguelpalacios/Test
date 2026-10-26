import { chartOfAccounts, getAccountMap } from '../../data/chart-of-accounts'
import type { TAccountDraft, TAccountSide } from '../../abschluss/types'
import { formatCents } from '../../accounting/money'
import { CentsInput } from './CentsInput'

interface TAccountBoardProps {
  value: TAccountDraft[]
  onChange: (next: TAccountDraft[]) => void
  readOnly?: boolean
}

export function TAccountBoard({
  value,
  onChange,
  readOnly = false,
}: TAccountBoardProps) {
  const map = getAccountMap()
  const used = new Set(value.map((row) => row.accountNumber))
  const available = chartOfAccounts.filter((account) => !used.has(account.number))

  const updateRow = (index: number, patch: Partial<TAccountDraft>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const addAccount = (accountNumber: string) => {
    if (!accountNumber || used.has(accountNumber)) return
    onChange([
      ...value,
      { accountNumber, balanceCents: 0, side: 'soll' },
    ])
  }

  return (
    <div className="t-account-board">
      {!readOnly ? (
        <div className="t-account-add sales-toolbar">
          <label className="form-field">
            <span>Konto hinzufügen</span>
            <select
              defaultValue=""
              onChange={(event) => {
                addAccount(event.target.value)
                event.target.value = ''
              }}
            >
              <option value="" disabled>
                Konto wählen…
              </option>
              {available.map((account) => (
                <option key={account.number} value={account.number}>
                  {account.number} — {account.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {value.length === 0 ? (
        <p className="panel-note">
          Noch keine T-Konten. Wähle Konten mit Saldo ≠ 0 und trage den Endsaldo auf
          der richtigen Seite ein (Soll oder Haben).
        </p>
      ) : (
        <div className="t-account-grid">
          {value.map((row, index) => {
            const name = map.get(row.accountNumber)?.name ?? row.accountNumber
            return (
              <article key={row.accountNumber} className="t-account">
                <header className="t-account-header">
                  <strong>
                    <code>{row.accountNumber}</code> {name}
                  </strong>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="btn btn-secondary t-account-remove"
                      onClick={() => removeRow(index)}
                    >
                      Entfernen
                    </button>
                  ) : null}
                </header>
                <div className="t-account-body">
                  <div className="t-account-side">
                    <div className="t-account-side-label">Soll</div>
                    <SideCell
                      active={row.side === 'soll'}
                      balanceCents={row.balanceCents}
                      readOnly={readOnly}
                      onActivate={() => updateRow(index, { side: 'soll' })}
                      onAmount={(balanceCents) =>
                        updateRow(index, {
                          balanceCents,
                          side: 'soll' as TAccountSide,
                        })
                      }
                    />
                  </div>
                  <div className="t-account-side">
                    <div className="t-account-side-label">Haben</div>
                    <SideCell
                      active={row.side === 'haben'}
                      balanceCents={row.balanceCents}
                      readOnly={readOnly}
                      onActivate={() => updateRow(index, { side: 'haben' })}
                      onAmount={(balanceCents) =>
                        updateRow(index, {
                          balanceCents,
                          side: 'haben' as TAccountSide,
                        })
                      }
                    />
                  </div>
                </div>
                <footer className="t-account-footer">
                  Saldo {formatCents(row.balanceCents)} ·{' '}
                  {row.side === 'soll' ? 'Soll' : 'Haben'}
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SideCell({
  active,
  balanceCents,
  readOnly,
  onActivate,
  onAmount,
}: {
  active: boolean
  balanceCents: number
  readOnly: boolean
  onActivate: () => void
  onAmount: (cents: number) => void
}) {
  if (readOnly) {
    return (
      <div className={`t-account-cell${active ? ' is-active' : ''}`}>
        {active ? formatCents(balanceCents) : '—'}
      </div>
    )
  }
  return (
    <div className={`t-account-cell${active ? ' is-active' : ''}`}>
      <button
        type="button"
        className="t-account-side-toggle"
        onClick={onActivate}
        aria-pressed={active}
      >
        {active ? 'aktiv' : 'wählen'}
      </button>
      {active ? (
        <CentsInput
          valueCents={balanceCents}
          onChange={onAmount}
          allowNegative={false}
          aria-label="Saldo"
        />
      ) : (
        <span className="t-account-placeholder">—</span>
      )}
    </div>
  )
}
