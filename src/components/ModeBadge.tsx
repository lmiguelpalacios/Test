import { useAuth } from '../auth/AuthContext'
import { useOrg } from '../auth/OrgContext'
import { useDataBackend } from '../persistence/DataBackendContext'

export function ModeBadge({ compact = false }: { compact?: boolean }) {
  const { mode, user } = useAuth()
  const { activeMembership } = useOrg()
  const { awaitingRemoteSession } = useDataBackend()

  if (mode === 'local') {
    return (
      <span className="demo-chip" title="Workspace v4 im Browser (localStorage)">
        {compact ? 'Lokal' : 'Lokaler Demo-Modus'}
      </span>
    )
  }

  if (awaitingRemoteSession || !user) {
    return (
      <span className="mode-chip mode-chip-warn" title="Supabase konfiguriert — Anmeldung nötig">
        {compact ? 'Online…' : 'Supabase — Anmeldung erforderlich'}
      </span>
    )
  }

  return (
    <span
      className="mode-chip mode-chip-online"
      title={
        activeMembership
          ? `${activeMembership.organizationName} (${activeMembership.role})`
          : 'Supabase-Modus'
      }
    >
      {compact
        ? 'Online'
        : `Supabase · ${activeMembership?.organizationName ?? 'Organisation'}`}
    </span>
  )
}
