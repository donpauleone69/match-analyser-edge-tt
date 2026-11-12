/**
 * Supabase client — null when the app isn't configured for cloud.
 *
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (app/.env.local).
 * A loopback URL (local Supabase in Docker) is rewritten to the page's host,
 * so a phone opening http://<pc-ip>:5173 reaches the PC's Supabase too.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const VIDEO_BUCKET = 'match-videos'
export const MATCH_BUNDLES_TABLE = 'match_bundles'

function resolveUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
    const pageHost = typeof window !== 'undefined' ? window.location.hostname : ''
    if (loopback && pageHost && pageHost !== 'localhost' && pageHost !== '127.0.0.1') {
      url.hostname = pageHost
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

const url = resolveUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudUrl = url
export const cloudAnonKey = anonKey ?? null
export const cloudConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
    : null
