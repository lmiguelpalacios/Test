import { chartOfAccounts, getAccountMap } from '../../data/chart-of-accounts'
import type {
  IncomeStatementDraft,
  IncomeStatementDraftRow,
} from '../../abschluss/types'
import { formatCents } from '../../accounting/money'
import { CentsInput } from './CentsInput'

interface IncomeStatementBuilderProps {
  value: IncomeStatementDraft
  onChange: (next: IncomeStatementDraft) => void
  readOnly?: boolean
}

export function createEmptyIncomeStatementDraft(): IncomeStatementDraft {
  return {
    revenueRows: [],
    expenseRows: [],
    totalRevenueCents: 0,
    totalExpenseCents: 0,
    resultCents: 0,
  }
}

export function IncomeStatementBuilder({
  value,
  onChange,
  readOnly = false,
}: IncomeStatementBuilderProps) {
  const map = getAccountMap()

  return (
    <div className="abschluss-builder">
      <div className="split-grid">
        <SectionEditor
          title="Erträge"
          rows={value.revenueRows}
          accountType="ertrag"
          map={map}
          readOnly={readOnly}
          onChange={(revenueRows) => onChange({ ...value, revenueRows })}
        />
        <SectionEditor
          title="Aufwendungen"
          rows={value.expenseRows}
          accountType="aufwand"
          map={map}
          readOnly={readOnly}
          onChange={(expenseRows) => onChange({ ...value, expenseRows })}
        />
      </div>

      <div className="abschluss-totals">
        <label className="form-field">
          <span>Summe Erträge</span>
          {readOnly ? (
            <strong>{formatCents(value.totalRevenueCents)}</strong>
          ) : (
            <CentsInput
              valueCents={value.totalRevenueCents}
              onChange={(totalRevenueCents) =>
                onChange({ ...value, totalRevenueCents })
              }
              allowNegative={false}
            />
          )}
        </label>
        <label className="form-field">
          <span>Summe Aufwendungen</span>
          {readOnly ? (
            <strong>{formatCents(value.totalExpenseCents)}</strong>
          ) : (
            <CentsInput
              valueCents={value.totalExpenseCents}
              onChange={(totalExpenseCents) =>
                onChange({ ...value, totalExpenseCents })
              }
              allowNegative={false}
            />
          )}
        </label>
        <label className="form-field">
          <span>Periodenergebnis (Erträge − Aufwendungen)</span>
          {readOnly ? (
            <strong>{formatCents(value.resultCents)}</strong>
          ) : (
            <CentsInput
              valueCents={value.resultCents}
              onChange={(resultCents) => onChange({ ...value, resultCents })}
            />
          )}
        </label>
      </div>
    </div>
  )
}

function SectionEditor({
  title,
  rows,
  accountType,
  map,
  readOnly,
  onChange,
}: {
  title: string
  rows: IncomeStatementDraftRow[]
  accountType: 'ertrag' | 'aufwand'
  map: ReturnType<typeof getAccountMap>
  readOnly: boolean
  onChange: (rows: IncomeStatementDraftRow[]) => void
}) {
  const used = new Set(rows.map((row) => row.accountNumber))
  const available = chartOfAccounts.filter(
    (account) => account.type === accountType && !used.has(account.number),
  )

  return (
    <div className="abschluss-section">
      <h3 className="panel-title">{title}</h3>
      {!readOnly ? (
        <label className="form-field">
          <span>Konto hinzufügen</span>
          <select
            defaultValue=""
            onChange={(event) => {
              const accountNumber = event.target.value
              if (!accountNumber) return
              onChange([...rows, { accountNumber, amountCents: 0 }])
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
      ) : null}
      <div className="table-scroll">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Konto</th>
              <th>Name</th>
              <th className="num">Betrag</th>
              {!readOnly ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 3 : 4} className="panel-note">
                  Keine Zeilen
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.accountNumber}>
                  <td>
                    <code>{row.accountNumber}</code>
                  </td>
                  <td>{map.get(row.accountNumber)?.name ?? row.accountNumber}</td>
                  <td className="num">
                    {readOnly ? (
                      formatCents(row.amountCents)
                    ) : (
                      <CentsInput
                        valueCents={row.amountCents}
                        onChange={(amountCents) =>
                          onChange(
                            rows.map((item, i) =>
                              i === index ? { ...item, amountCents } : item,
                            ),
                          )
                        }
                      />
                    )}
                  </td>
                  {!readOnly ? (
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          onChange(rows.filter((_, i) => i !== index))
                        }
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
