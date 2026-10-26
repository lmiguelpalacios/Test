import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { useOrg } from '../auth/OrgContext'
import { getSupabaseClient } from '../supabase/client'
import type { DataBackendMode } from '../supabase/env'
import { LOCAL_CAPABILITIES, SUPABASE_CAPABILITIES } from './localCapabilities'
import { LocalWorkspaceRepository } from './localWorkspaceRepository'
import { SupabaseWorkspaceRepository } from './supabaseWorkspaceRepository'
import type { ModuleCapabilities, WorkspaceRepository } from './types'

interface DataBackendContextValue {
  mode: DataBackendMode
  /** True when supabase mode is selected but session/org not ready — no local hybrid. */
  awaitingRemoteSession: boolean
  capabilities: ModuleCapabilities
  repository: WorkspaceRepository | null
  organizationId: string | null
}

const DataBackendContext = createContext<DataBackendContextValue | null>(null)

function browserStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    }
  }
  try {
    return window.localStorage
  } catch {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    }
  }
}

export function DataBackendProvider({ children }: { children: ReactNode }) {
  const { mode, user, loading: authLoading } = useAuth()
  const { activeOrganizationId, loading: orgLoading } = useOrg()

  const value = useMemo<DataBackendContextValue>(() => {
    if (mode === 'local') {
      return {
        mode: 'local',
        awaitingRemoteSession: false,
        capabilities: LOCAL_CAPABILITIES,
        repository: new LocalWorkspaceRepository(browserStorage()),
        organizationId: null,
      }
    }

    const client = getSupabaseClient()
    const ready = Boolean(client && user && activeOrganizationId)
    if (!ready) {
      return {
        mode: 'supabase',
        awaitingRemoteSession: authLoading || orgLoading || !user || !activeOrganizationId,
        capabilities: SUPABASE_CAPABILITIES,
        repository: null,
        organizationId: null,
      }
    }

    return {
      mode: 'supabase',
      awaitingRemoteSession: false,
      capabilities: SUPABASE_CAPABILITIES,
      repository: new SupabaseWorkspaceRepository(client!, activeOrganizationId!),
      organizationId: activeOrganizationId,
    }
  }, [mode, user, activeOrganizationId, authLoading, orgLoading])

  return (
    <DataBackendContext.Provider value={value}>{children}</DataBackendContext.Provider>
  )
}

export function useDataBackend(): DataBackendContextValue {
  const ctx = useContext(DataBackendContext)
  if (!ctx) {
    throw new Error('useDataBackend muss innerhalb von DataBackendProvider verwendet werden.')
  }
  return ctx
}
