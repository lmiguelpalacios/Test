import { chartOfAccounts, getAccountMap } from '../../data/chart-of-accounts'
import type {
  BalanceSheetDraft,
  BalanceSheetDraftRow,
} from '../../abschluss/types'
import { formatCents } from '../../accounting/money'
import { CentsInput } from './CentsInput'

interface BalanceSheetBuilderProps {
  value: BalanceSheetDraft
  onChange: (next: BalanceSheetDraft) => void
  readOnly?: boolean
}

const emptyDraft = (): BalanceSheetDraft => ({
  assets: [],
  liabilities: [],
  equityAccounts: [],
  periodResultCents: 0,
  totalAssetsCents: 0,
  totalLiabilitiesAndEquityCents: 0,
})

export function createEmptyBalanceSheetDraft(): BalanceSheetDraft {
  return emptyDraft()
}

export function BalanceSheetBuilder({
  value,
  onChange,
  readOnly = false,
}: BalanceSheetBuilderProps) {
  const map = getAccountMap()

  const setSection = (
    key: 'assets' | 'liabilities' | 'equityAccounts',
    rows: BalanceSheetDraftRow[],
  ) => {
    onChange({ ...value, [key]: rows })
  }

  return (
    <div className="abschluss-builder">
      <div className="split-grid">
        <SectionEditor
          title="Aktiva"
          rows={value.assets}
          accountFilter={(type) => type === 'aktiv'}
          map={map}
          readOnly={readOnly}
          onChange={(rows) => setSection('assets', rows)}
        />
        <div>
          <SectionEditor
            title="Passiva (ohne Eigenkapital)"
            rows={value.liabilities}
            accountFilter={(type, group) =>
              type === 'passiv' && group !== 'Eigenkapital'
            }
            map={map}
            readOnly={readOnly}
            onChange={(rows) => setSection('liabilities', rows)}
          />
          <SectionEditor
            title="Eigenkapitalkonten"
            rows={value.equityAccounts}
            accountFilter={(type, group) =>
              type === 'passiv' && group === 'Eigenkapital'
            }
            map={map}
            readOnly={readOnly}
            onChange={(rows) => setSection('equityAccounts', rows)}
          />
          <div className="abschluss-total-row">
            <label className="form-field">
              <span>Periodenergebnis (GuV bis Stichtag)</span>
              {readOnly ? (
                <strong>{formatCents(value.periodResultCents)}</strong>
              ) : (
                <CentsInput
                  valueCents={value.periodResultCents}
                  onChange={(periodResultCents) =>
                    onChange({ ...value, periodResultCents })
                  }
                />
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="abschluss-totals split-grid">
        <label className="form-field">
          <span>Summe Aktiva</span>
          {readOnly ? (
            <strong>{formatCents(value.totalAssetsCents)}</strong>
          ) : (
            <CentsInput
              valueCents={value.totalAssetsCents}
              onChange={(totalAssetsCents) =>
                onChange({ ...value, totalAssetsCents })
              }
              allowNegative={false}
            />
          )}
        </label>
        <label className="form-field">
          <span>Summe Passiva + EK + Periodenergebnis</span>
          {readOnly ? (
            <strong>{formatCents(value.totalLiabilitiesAndEquityCents)}</strong>
          ) : (
            <CentsInput
              valueCents={value.totalLiabilitiesAndEquityCents}
              onChange={(totalLiabilitiesAndEquityCents) =>
                onChange({ ...value, totalLiabilitiesAndEquityCents })
              }
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
  accountFilter,
  map,
  readOnly,
  onChange,
}: {
  title: string
  rows: BalanceSheetDraftRow[]
  accountFilter: (
    type: string,
    group: string,
  ) => boolean
  map: ReturnType<typeof getAccountMap>
  readOnly: boolean
  onChange: (rows: BalanceSheetDraftRow[]) => void
}) {
  const used = new Set(rows.map((row) => row.accountNumber))
  const available = chartOfAccounts.filter(
    (account) =>
      accountFilter(account.type, account.group) && !used.has(account.number),
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
