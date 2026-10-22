import { useAuth } from '../auth/AuthContext'
import { useOrg } from '../auth/OrgContext'
import { useDataBackend } from '../persistence/DataBackendContext'

export function ModeBadge({ compact = false }: { compact?: boolean }) {
  const { mode, user } = useAuth()
  const { activeMembership } = useOrg()
  const { awaitingRemoteSession } = useDataBackend()

  if (mode === 'local') {
    return (
      <span className="demo-chip" title="Workspace v5 im Browser (localStorage)">
        {compact ? 'Lokal' : 'Lokaler Demo-Modus'}
      </span>
    )
  }

  if (awaitingRemoteSession || !user) {
    return (
      <span
        className="mode-chip mode-chip-warn"
        title="Preview/Test — Review-Backend; Anmeldung nötig (nicht Production)"
      >
        {compact ? 'Preview…' : 'Preview/Test — Anmeldung erforderlich'}
      </span>
    )
  }

  return (
    <span
      className="mode-chip mode-chip-online"
      title={
        activeMembership
          ? `Preview/Test · ${activeMembership.organizationName} (${activeMembership.role}) — Review-Backend, nicht handels`
          : 'Preview/Test — Review-Backend (nicht Production)'
      }
    >
      {compact
        ? 'Preview'
        : `Preview/Test · ${activeMembership?.organizationName ?? 'Organisation'}`}
    </span>
  )
}
