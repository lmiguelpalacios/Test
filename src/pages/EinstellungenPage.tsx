import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useOrg } from '../auth/OrgContext'
import { DemoBanner } from '../components/DemoBanner'
import { ModeBadge } from '../components/ModeBadge'
import { WorkspaceImportWizard } from '../components/import/WorkspaceImportWizard'
import { PageHeader } from '../components/PageHeader'
import { useAccounting } from '../accounting/AccountingContext'
import { isSupabaseConfigured } from '../supabase/env'

export function EinstellungenPage() {
  const { mode, user, signOut } = useAuth()
  const {
    memberships,
    activeOrganizationId,
    activeMembership,
    setActiveOrganizationId,
  } = useOrg()
  const { capabilities, persistSource, backendBusy, reloadFromBackend } = useAccounting()
  const [reloadMessage, setReloadMessage] = useState<string | undefined>()

  return (
    <div className="page-stack">
      {mode === 'local' ? (
        <DemoBanner detail="Optionalen Online-Modus aktivieren: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (siehe .env.example)." />
      ) : (
        <div className="demo-banner demo-banner-online" role="status">
          Supabase-Modus — Daten kommen aus der Organisation; kein stiller Hybrid mit
          localStorage-Journal.
        </div>
      )}

      <PageHeader
        title="Einstellungen"
        subtitle="Datenmodus, Organisation und Import"
        actions={<ModeBadge />}
      />

      <section className="panel">
        <h2 className="panel-title">Datenmodus</h2>
        <dl className="settings-dl">
          <div>
            <dt>Aktiv</dt>
            <dd>{mode === 'local' ? 'Lokal (Demo / localStorage v4)' : 'Supabase'}</dd>
          </div>
          <div>
            <dt>Env konfiguriert</dt>
            <dd>{isSupabaseConfigured() ? 'ja (URL + Anon-Key)' : 'nein → Demo'}</dd>
          </div>
          <div>
            <dt>Persistenzquelle</dt>
            <dd>
              {persistSource}
              {backendBusy ? ' · synchronisiert…' : ''}
            </dd>
          </div>
          <div>
            <dt>Benutzer</dt>
            <dd>{user?.email ?? '— (Demo ohne Login)'}</dd>
          </div>
        </dl>
        {mode === 'supabase' && user ? (
          <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
            Abmelden
          </button>
        ) : null}
      </section>

      {mode === 'supabase' ? (
        <section className="panel">
          <h2 className="panel-title">Organisation</h2>
          {memberships.length === 0 ? (
            <p className="panel-meta">Keine Mitgliedschaften — bitte über Auth-Gate anlegen.</p>
          ) : (
            <ul className="org-list">
              {memberships.map((item) => (
                <li key={item.organizationId}>
                  <button
                    type="button"
                    className={
                      item.organizationId === activeOrganizationId
                        ? 'btn btn-primary'
                        : 'btn btn-secondary'
                    }
                    onClick={() => setActiveOrganizationId(item.organizationId)}
                  >
                    {item.organizationName} · {item.role}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {activeMembership ? (
            <p className="panel-meta">
              Aktiv: {activeMembership.organizationName} ({activeMembership.role})
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              void reloadFromBackend().then(() =>
                setReloadMessage('Org-Daten neu geladen.'),
              )
            }}
          >
            Neu laden
          </button>
          {reloadMessage ? <p className="auth-info">{reloadMessage}</p> : null}
        </section>
      ) : null}

      <section className="panel">
        <h2 className="panel-title">Modul-Fähigkeiten</h2>
        <ul className="capability-list">
          {Object.entries(capabilities).map(([key, enabled]) => (
            <li key={key} className={enabled ? 'cap-on' : 'cap-off'}>
              <code>{key}</code>: {enabled ? 'aktiv' : 'lokal/gesperrt'}
            </li>
          ))}
        </ul>
        {!capabilities.learningPracticeJournal ? (
          <p className="panel-meta">
            Lern-Übungsbuchung ins Journal bleibt im Online-Modus gesperrt (RPC noch nicht
            produktiv). Bewertung/Fortschritt sind möglich.
          </p>
        ) : null}
        {!capabilities.manualJournal ? (
          <p className="panel-meta">
            Manuelle Journalbuchungen nur im lokalen Demo-Modus — online nur Booking-/Zahlungs-RPCs.
          </p>
        ) : null}
      </section>

      <WorkspaceImportWizard />
    </div>
  )
}
