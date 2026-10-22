import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabasePublicConfig } from './env'

let cached: SupabaseClient | null | undefined

/** Singleton browser client, or null when demo/local mode (no config). */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const config = readSupabasePublicConfig()
  if (!config) {
    cached = null
    return cached
  }
  cached = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return cached
}

/** Test helper — clears memoized client. */
export function resetSupabaseClientForTests(): void {
  cached = undefined
}
