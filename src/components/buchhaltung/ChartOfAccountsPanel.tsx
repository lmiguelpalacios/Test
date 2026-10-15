import { LEARNING_CHART_NOTICE, accountsByGroup } from '../../data/chart-of-accounts'

const TYPE_LABELS: Record<string, string> = {
  aktiv: 'Aktivkonto',
  passiv: 'Passivkonto',
  aufwand: 'Aufwandskonto',
  ertrag: 'Ertragskonto',
}

export function ChartOfAccountsPanel() {
  const grouped = accountsByGroup()

  return (
    <>
      <div className="demo-banner" role="note">
        <span>{LEARNING_CHART_NOTICE}</span>
      </div>

      <div className="page-stack">
        {[...grouped.entries()].map(([group, accounts]) => (
          <section key={group} className="panel">
            <div className="panel-header">
              <h2 className="panel-title">{group}</h2>
              <span className="panel-badge">{accounts.length} Konten</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kontonummer</th>
                    <th>Kontoname</th>
                    <th>Typ</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.number}>
                      <td>
                        <code>{account.number}</code>
                      </td>
                      <td>{account.name}</td>
                      <td>{TYPE_LABELS[account.type]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
