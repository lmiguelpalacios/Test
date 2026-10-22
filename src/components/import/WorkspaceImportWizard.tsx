import { useMemo, useState } from 'react'
import { useAccounting } from '../../accounting/AccountingContext'
import { loadWorkspace } from '../../accounting/journalStore'
import { useOrg } from '../../auth/OrgContext'
import { useDataBackend } from '../../persistence/DataBackendContext'
import {
  hashWorkspacePayload,
  previewWorkspaceCounts,
} from '../../persistence/workspaceHash'

type Step = 'idle' | 'preview' | 'done'

export function WorkspaceImportWizard() {
  const { reloadFromBackend, isLocalDemoMode } = useAccounting()
  const { refresh } = useOrg()
  const { mode, repository, capabilities } = useDataBackend()
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | undefined>()
  const [info, setInfo] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [contentHash, setContentHash] = useState<string | undefined>()
  const [counts, setCounts] = useState<ReturnType<typeof previewWorkspaceCounts> | null>(
    null,
  )
  const [confirmed, setConfirmed] = useState(false)

  const available = mode === 'supabase' && capabilities.workspaceImport && repository

  const localPreview = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      return loadWorkspace(window.localStorage)
    } catch {
      return null
    }
  }, [step])

  if (isLocalDemoMode || !available) {
    return (
      <div className="panel">
        <h2 className="panel-title">Workspace-Import</h2>
        <p className="panel-meta">
          Nur im Supabase-Modus mit Owner-Organisation. Lokal bleibt der Demo-Stand im
          Browser — kein Auto-Upload.
        </p>
      </div>
    )
  }

  const onPreview = async () => {
    setError(undefined)
    setInfo(undefined)
    setConfirmed(false)
    if (!localPreview) {
      setError('Kein lokaler Workspace im Browser gefunden.')
      return
    }
    const payload = {
      entries: localPreview.entries,
      sales: localPreview.sales,
      purchase: localPreview.purchase,
      learning: localPreview.learning,
    }
    const hash = await hashWorkspacePayload(payload)
    setContentHash(hash)
    setCounts(previewWorkspaceCounts(payload))
    setStep('preview')
  }

  const onConfirm = async () => {
    if (!repository?.importWorkspace || !contentHash || !localPreview || !confirmed) {
      setError('Bitte Vorschau bestätigen.')
      return
    }
    setBusy(true)
    setError(undefined)
    const result = await repository.importWorkspace({
      contentHash,
      sourceLabel: 'browser-localStorage-v5',
      workspace: {
        entries: localPreview.entries,
        sales: localPreview.sales,
        purchase: localPreview.purchase,
        learning: localPreview.learning,
        vatEnabled: localPreview.vatEnabled,
      },
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      setStep('preview')
      return
    }
    if (result.alreadyImported) {
      setInfo('Dieser Stand wurde bereits importiert (gleicher Inhalt-Hash) — kein Doppelimport.')
    } else {
      setInfo(`Import erfolgreich${result.batchId ? ` (Batch ${result.batchId})` : ''}.`)
    }
    await refresh()
    await reloadFromBackend()
    setStep('done')
  }

  return (
    <div className="panel import-wizard">
      <h2 className="panel-title">Lokalen Übungsstand importieren</h2>
      <p className="panel-meta">
        Expliziter Wizard: Vorschau → Bestätigung → idempotenter Import (Hash). Kein
        stiller Upload bei Login. localStorage wird danach nicht gelöscht.
      </p>

      {step === 'idle' || step === 'done' ? (
        <button type="button" className="btn btn-primary" onClick={() => void onPreview()}>
          Vorschau aus localStorage laden
        </button>
      ) : null}

      {step === 'preview' && counts && contentHash ? (
        <div className="import-preview">
          <p>
            Inhalt-Hash: <code>{contentHash.slice(0, 16)}…</code>
          </p>
          <ul className="import-counts">
            {Object.entries(counts).map(([key, value]) => (
              <li key={key}>
                <strong>{key}</strong>: {value}
              </li>
            ))}
          </ul>
          <label className="import-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Ich bestätige den Import in die aktive Organisation (Owner).
          </label>
          <div className="auth-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!confirmed || busy}
              onClick={() => void onConfirm()}
            >
              {busy ? 'Import läuft…' : 'Import bestätigen'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => setStep('idle')}
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="auth-error">{error}</p> : null}
      {info ? <p className="auth-info">{info}</p> : null}
    </div>
  )
}
