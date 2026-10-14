import { describe, expect, it } from 'vitest'
import {
  isSupabaseConfigured,
  readSupabasePublicConfig,
  resolveDataBackendMode,
} from './env'

describe('Supabase env / dual-mode detection', () => {
  it('defaults to local without config', () => {
    expect(resolveDataBackendMode({})).toBe('local')
    expect(isSupabaseConfigured({})).toBe(false)
    expect(readSupabasePublicConfig({})).toBeNull()
  })

  it('rejects invalid URL or short anon key', () => {
    expect(
      readSupabasePublicConfig({
        VITE_SUPABASE_URL: 'not-a-url',
        VITE_SUPABASE_ANON_KEY: 'short',
      }),
    ).toBeNull()
    expect(
      resolveDataBackendMode({
        VITE_SUPABASE_URL: 'not-a-url',
        VITE_SUPABASE_ANON_KEY: 'short',
        VITE_DATA_BACKEND: 'supabase',
      }),
    ).toBe('local')
  })

  it('enables supabase when URL + anon are valid', () => {
    const env = {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.testkey',
    }
    expect(isSupabaseConfigured(env)).toBe(true)
    expect(resolveDataBackendMode(env)).toBe('supabase')
    expect(readSupabasePublicConfig(env)).toEqual({
      url: env.VITE_SUPABASE_URL,
      anonKey: env.VITE_SUPABASE_ANON_KEY,
    })
  })

  it('honors explicit local override even with config', () => {
    const env = {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.testkey',
      VITE_DATA_BACKEND: 'local',
    }
    expect(resolveDataBackendMode(env)).toBe('local')
  })
})
