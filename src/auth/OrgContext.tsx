import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSupabaseClient } from '../supabase/client'
import type { OrgMembership } from '../persistence/types'
import { useAuth } from './AuthContext'

const ACTIVE_ORG_KEY = 'nordlicht.activeOrganizationId'

interface OrgContextValue {
  loading: boolean
  memberships: OrgMembership[]
  activeOrganizationId: string | null
  activeMembership: OrgMembership | null
  setActiveOrganizationId: (organizationId: string) => void
  createOrganization: (
    name: string,
    slug: string,
  ) => Promise<{ ok: true; organizationId: string } | { ok: false; message: string }>
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue | null>(null)

function readStoredOrgId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_ORG_KEY)
  } catch {
    return null
  }
}

function writeStoredOrgId(organizationId: string | null): void {
  try {
    if (!organizationId) window.localStorage.removeItem(ACTIVE_ORG_KEY)
    else window.localStorage.setItem(ACTIVE_ORG_KEY, organizationId)
  } catch {
    /* ignore */
  }
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { mode, user } = useAuth()
  const client = mode === 'supabase' ? getSupabaseClient() : null
  const [loading, setLoading] = useState(false)
  const [memberships, setMemberships] = useState<OrgMembership[]>([])
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(
    null,
  )

  const refresh = useCallback(async () => {
    if (!client || !user) {
      setMemberships([])
      setActiveOrganizationIdState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await client
      .from('organization_members')
      .select(
        'organization_id, role, organizations ( id, name, slug )',
      )
      .eq('user_id', user.id)

    if (error) {
      setMemberships([])
      setLoading(false)
      return
    }

    const mapped: OrgMembership[] = (data ?? []).flatMap((row) => {
      const org = row.organizations as
        | { id: string; name: string; slug: string }
        | { id: string; name: string; slug: string }[]
        | null
      const orgRow = Array.isArray(org) ? org[0] : org
      if (!orgRow) return []
      const role = row.role as OrgMembership['role']
      return [
        {
          organizationId: String(row.organization_id),
          organizationName: orgRow.name,
          organizationSlug: orgRow.slug,
          role,
        },
      ]
    })

    setMemberships(mapped)
    const stored = readStoredOrgId()
    const next =
      (stored && mapped.some((item) => item.organizationId === stored)
        ? stored
        : null) ??
      mapped[0]?.organizationId ??
      null
    setActiveOrganizationIdState(next)
    writeStoredOrgId(next)
    setLoading(false)
  }, [client, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setActiveOrganizationId = useCallback(
    (organizationId: string) => {
      if (!memberships.some((item) => item.organizationId === organizationId)) return
      setActiveOrganizationIdState(organizationId)
      writeStoredOrgId(organizationId)
    },
    [memberships],
  )

  const createOrganization = useCallback(
    async (name: string, slug: string) => {
      if (!client) return { ok: false as const, message: 'Supabase ist nicht konfiguriert.' }
      const { data, error } = await client.rpc('create_organization', {
        p_name: name.trim(),
        p_slug: slug.trim(),
      })
      if (error) return { ok: false as const, message: error.message }
      const organizationId = String(data)
      await refresh()
      setActiveOrganizationIdState(organizationId)
      writeStoredOrgId(organizationId)
      return { ok: true as const, organizationId }
    },
    [client, refresh],
  )

  const activeMembership =
    memberships.find((item) => item.organizationId === activeOrganizationId) ?? null

  const value = useMemo<OrgContextValue>(
    () => ({
      loading,
      memberships,
      activeOrganizationId,
      activeMembership,
      setActiveOrganizationId,
      createOrganization,
      refresh,
    }),
    [
      loading,
      memberships,
      activeOrganizationId,
      activeMembership,
      setActiveOrganizationId,
      createOrganization,
      refresh,
    ],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg muss innerhalb von OrgProvider verwendet werden.')
  return ctx
}
