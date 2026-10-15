export type DataBackendMode = 'local' | 'supabase'

export interface SupabasePublicConfig {
  url: string
  anonKey: string
}

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Public anon config only — never service_role. */
export function readSupabasePublicConfig(
  env: ImportMetaEnv | Record<string, string | undefined> = import.meta.env,
): SupabasePublicConfig | null {
  const url = trim(env.VITE_SUPABASE_URL)
  const anonKey = trim(env.VITE_SUPABASE_ANON_KEY)
  if (!url || !anonKey) return null
  if (!isHttpUrl(url)) return null
  if (anonKey.length < 20) return null
  return { url, anonKey }
}

export function resolveDataBackendMode(
  env: ImportMetaEnv | Record<string, string | undefined> = import.meta.env,
): DataBackendMode {
  const override = trim(env.VITE_DATA_BACKEND).toLowerCase()
  if (override === 'local') return 'local'
  if (override === 'supabase') {
    return readSupabasePublicConfig(env) ? 'supabase' : 'local'
  }
  return readSupabasePublicConfig(env) ? 'supabase' : 'local'
}

export function isSupabaseConfigured(
  env: ImportMetaEnv | Record<string, string | undefined> = import.meta.env,
): boolean {
  return readSupabasePublicConfig(env) !== null
}
