import { Link } from 'react-router-dom'
import { BookMarked, Plus, RotateCcw } from 'lucide-react'
import { useAccounting } from '../../accounting/AccountingContext'
import { formatCents } from '../../accounting/money'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'
import { JournalEntryCard } from './JournalEntryCard'
import { LEARNING_CHART_NOTICE, chartOfAccounts } from '../../data/chart-of-accounts'

export function AccountingOverview() {
  const {
    entries,
    totals,
    periodLabel,
    persistSource,
    persistWarning,
    resetToDemo,
    isLocalDemoMode,
    capabilities,
  } = useAccounting()
  const recent = entries.slice(0, 5)

  const persistLabel =
    persistSource === 'storage'
      ? 'aus Browser-Speicher'
      : persistSource === 'supabase'
        ? 'aus Supabase-Organisation'
        : persistSource === 'recovered-demo'
          ? 'Demo nach Wiederherstellung'
          : persistSource === 'empty'
            ? 'noch keine Org-Daten'
            : 'Demo-Daten'

  function handleReset() {
    if (!capabilities.resetDemo) {
      window.alert('Demo-Reset ist im Supabase-Modus deaktiviert.')
      return
    }
    const confirmed = window.confirm(
      'Übungsstand zurücksetzen?\n\nAlle im Browser gespeicherten Journal-, Verkaufs-, Einkaufs- und Lernfortschrittsdaten werden durch die ursprünglichen Demo-Daten ersetzt.',
    )
    if (confirmed) {
      resetToDemo()
    }
  }

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          (isLocalDemoMode
            ? `Journal ${persistLabel} · Änderungen werden lokal im Browser gespeichert.`
            : `Journal ${persistLabel} · Buchungen/Zahlungen nur über freigeschaltete RPCs (kein manueller Journal-Editor).`)
        }
      />
      <PageHeader
        title="Buchhaltung"
        subtitle={`${periodLabel} · gemeinsame Journal-Datenquelle`}
        actions={
          <div className="page-actions-row">
            {capabilities.manualJournal ? (
              <Link to="/buchhaltung/neu" className="btn btn-primary">
                <Plus size={16} aria-hidden />
                Neue Buchung
              </Link>
            ) : null}
            <Link to="/buchhaltung/kontenplan" className="btn btn-secondary">
              <BookMarked size={16} aria-hidden />
              Kontenplan
            </Link>
            {capabilities.resetDemo ? (
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                <RotateCcw size={16} aria-hidden />
                Demo zurücksetzen
              </button>
            ) : null}
          </div>
        }
      />

      <section className="kpi-grid accounting-kpi-grid" aria-label="Buchhaltungskennzahlen">
        <article className="kpi-card">
          <p className="kpi-label">Anzahl Buchungen</p>
          <p className="kpi-value">{totals.entryCount}</p>
          <p className="kpi-hint">Aus gespeichertem Lernjournal</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Summe Soll</p>
          <p className="kpi-value">{formatCents(totals.totalDebitCents)}</p>
          <p className="kpi-hint">Aus Buchungszeilen berechnet</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Summe Haben</p>
          <p className="kpi-value">{formatCents(totals.totalCreditCents)}</p>
          <p className="kpi-hint">Muss der Summe Soll entsprechen</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Persistenz</p>
          <p className="kpi-value kpi-value-text">
            {isLocalDemoMode ? 'localStorage' : 'Supabase'}
          </p>
          <p className="kpi-hint">{persistLabel}</p>
        </article>
      </section>

      <section className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Letzte Buchungssätze</h2>
            <span className="panel-badge">neueste zuerst</span>
          </div>
          {recent.length === 0 ? (
            <p className="empty-state">Noch keine Buchungen vorhanden.</p>
          ) : (
            <div className="journal-stack">
              {recent.map((entry) => (
                <JournalEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Kontenübersicht</h2>
            <Link to="/buchhaltung/kontenplan" className="text-link">
              Vollständiger Plan
            </Link>
          </div>
          <p className="panel-note">{LEARNING_CHART_NOTICE}</p>
          <div className="table-scroll">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Name</th>
                  <th>Typ</th>
                </tr>
              </thead>
              <tbody>
                {chartOfAccounts.slice(0, 10).map((account) => (
                  <tr key={account.number}>
                    <td>
                      <code>{account.number}</code>
                    </td>
                    <td>{account.name}</td>
                    <td className="muted">{account.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="panel-footnote">
            Zeigt die ersten 10 Konten · insgesamt {chartOfAccounts.length} Konten im
            Schulkontenrahmen
          </p>
        </article>
      </section>

      {entries.length > 5 ? (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Alle Buchungen</h2>
            <span className="panel-badge">{entries.length}</span>
          </div>
          <div className="journal-stack">
            {entries.map((entry) => (
              <JournalEntryCard key={`all-${entry.id}`} entry={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
