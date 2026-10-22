import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useOrg } from '../auth/OrgContext'
import { DemoBanner } from '../components/DemoBanner'
import { ModeBadge } from '../components/ModeBadge'
import { WorkspaceImportWizard } from '../components/import/WorkspaceImportWizard'
import { PageHeader } from '../components/PageHeader'
import { useAccounting } from '../accounting/AccountingContext'
import { VAT_DISABLED_NOTE } from '../accounting/vat'
import { isSupabaseConfigured } from '../supabase/env'

export function EinstellungenPage() {
  const { mode, user, signOut } = useAuth()
  const {
    memberships,
    activeOrganizationId,
    activeMembership,
    setActiveOrganizationId,
  } = useOrg()
  const { capabilities, persistSource, backendBusy, reloadFromBackend, vatEnabled, setVatEnabled } =
    useAccounting()
  const [reloadMessage, setReloadMessage] = useState<string | undefined>()
  const [vatMessage, setVatMessage] = useState<string | undefined>()
  const [vatBusy, setVatBusy] = useState(false)
  const canEditVat = mode === 'local' || activeMembership?.role === 'owner'

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
            <dd>{mode === 'local' ? 'Lokal (Demo / localStorage v5)' : 'Supabase'}</dd>
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
        <h2 className="panel-title">Umsatzsteuer</h2>
        <label className="vat-toggle">
          <input
            type="checkbox"
            checked={vatEnabled}
            disabled={!canEditVat || vatBusy}
            onChange={(event) => {
              const next = event.target.checked
              setVatMessage(undefined)
              setVatBusy(true)
              void setVatEnabled(next).then((result) => {
                setVatBusy(false)
                setVatMessage(
                  result.ok
                    ? next
                      ? 'Umsatzsteuer ist an. Neue Buchungen verwenden 0 %, 7 % oder 19 %.'
                      : 'Umsatzsteuer ist aus.'
                    : result.message,
                )
              })
            }}
          />
          <span>Umsatzsteuer</span>
        </label>
        <p className="panel-meta">
          {vatEnabled
            ? 'Neue Buchungen in Verkauf, Einkauf, Produktstamm, manuellem Journal und Lernmodus erfassen 0 %, 7 % oder 19 %.'
            : VAT_DISABLED_NOTE}
        </p>
        {!canEditVat ? (
          <p className="panel-meta">Nur Inhaber können die Umsatzsteuer umschalten.</p>
        ) : null}
        {vatMessage ? <p className="auth-info">{vatMessage}</p> : null}
      </section>

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
