import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../supabase/client'
import { resolveDataBackendMode, type DataBackendMode } from '../supabase/env'

interface AuthContextValue {
  mode: DataBackendMode
  loading: boolean
  session: Session | null
  user: User | null
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = resolveDataBackendMode()
  const client = mode === 'supabase' ? getSupabaseClient() : null
  const [loading, setLoading] = useState(mode === 'supabase')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!client) {
      setLoading(false)
      setSession(null)
      return
    }
    let cancelled = false
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [client])

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!client) return { ok: false as const, message: 'Supabase ist nicht konfiguriert.' }
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) return { ok: false as const, message: error.message }
      return { ok: true as const }
    },
    [client],
  )

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!client) return { ok: false as const, message: 'Supabase ist nicht konfiguriert.' }
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (error) return { ok: false as const, message: error.message }
      return { ok: true as const }
    },
    [client],
  )

  const signOut = useCallback(async () => {
    if (!client) return
    await client.auth.signOut()
  }, [client])

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      loading,
      session,
      user: session?.user ?? null,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [mode, loading, session, signInWithPassword, signUpWithPassword, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.')
  return ctx
}
