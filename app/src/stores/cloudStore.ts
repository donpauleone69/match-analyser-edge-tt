/**
 * Cloud Store — signed-in user and last sync result.
 * The session itself is persisted by supabase-js; nothing persisted here.
 * Actions never throw — they record `error` instead.
 */

import { create } from 'zustand'
import { cloudConfigured, supabase } from '@/data/cloud/supabaseClient'
import { syncAll, type SyncAllResult } from '@/data/cloud/cloudSync'

interface CloudUser {
  id: string
  email: string | null
}

interface CloudState {
  configured: boolean
  ready: boolean
  user: CloudUser | null
  busy: boolean
  error: string | null
  lastSync: (SyncAllResult & { at: string }) | null
  init: () => void
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  syncNow: () => Promise<SyncAllResult | null>
  clearError: () => void
}

let initialised = false

export const useCloudStore = create<CloudState>()((set, get) => ({
  configured: cloudConfigured,
  ready: !cloudConfigured,
  user: null,
  busy: false,
  error: null,
  lastSync: null,

  init: () => {
    if (initialised || !supabase) return
    initialised = true
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      set({ ready: true, user: u ? { id: u.id, email: u.email ?? null } : null })
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      set({ user: u ? { id: u.id, email: u.email ?? null } : null })
    })
  },

  signIn: async (email, password) => {
    if (!supabase) return false
    set({ busy: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ busy: false, error: error?.message ?? null })
    return !error
  },

  signUp: async (email, password) => {
    if (!supabase) return false
    set({ busy: true, error: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && !data.session) {
      set({ busy: false, error: 'Check your email to confirm the account, then sign in.' })
      return false
    }
    set({ busy: false, error: error?.message ?? null })
    return !error
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    set({ user: null, lastSync: null })
  },

  syncNow: async () => {
    if (!get().user) return null
    set({ busy: true, error: null })
    try {
      const result = await syncAll()
      set({ busy: false, lastSync: { ...result, at: new Date().toISOString() } })
      return result
    } catch (err) {
      set({ busy: false, error: err instanceof Error ? err.message : 'Sync failed' })
      return null
    }
  },

  clearError: () => set({ error: null }),
}))
