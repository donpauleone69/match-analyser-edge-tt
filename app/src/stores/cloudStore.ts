/**
 * Cloud Store — signed-in user and last sync result.
 * The session itself is persisted by supabase-js; nothing persisted here.
 * Actions never throw — they record `error` instead.
 */

import { create } from 'zustand'
import { cloudConfigured, supabase } from '@/data/cloud/supabaseClient'
import { syncAll, type SyncAllResult } from '@/data/cloud/cloudSync'
import type { AccountProfile, AccountRole } from '@/rules/derive/account/deriveAccountScope'

export interface CloudUser {
  id: string
  email: string | null
}

const PROFILE_KEY_PREFIX = 'edge-tt-account-profile:'

function readProfile(userId: string): AccountProfile | null {
  try {
    const value = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`)
    return value ? (JSON.parse(value) as AccountProfile) : null
  } catch {
    return null
  }
}

function writeProfile(userId: string, profile: AccountProfile): void {
  try {
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${userId}`, JSON.stringify(profile))
  } catch {
    // A blocked localStorage must not break authentication.
  }
}

interface CloudState {
  configured: boolean
  ready: boolean
  user: CloudUser | null
  profile: AccountProfile | null
  busy: boolean
  error: string | null
  lastSync: (SyncAllResult & { at: string }) | null
  init: () => void
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  setAccountRole: (role: AccountRole) => void
  setLinkedPlayer: (playerId: string) => void
  setFocalPlayer: (playerId: string) => void
  syncNow: () => Promise<SyncAllResult | null>
  clearError: () => void
}

let initialised = false

export const useCloudStore = create<CloudState>()((set, get) => ({
  configured: cloudConfigured,
  ready: !cloudConfigured,
  user: null,
  profile: null,
  busy: false,
  error: null,
  lastSync: null,

  init: () => {
    if (initialised || !supabase) return
    initialised = true
    const timeout = window.setTimeout(() => {
      set((state) =>
        state.ready
          ? state
          : { ready: true, user: null, profile: null, error: 'Account service did not respond. Try signing in again.' }
      )
    }, 2500)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        window.clearTimeout(timeout)
        const u = data.session?.user
        set({
          ready: true,
          user: u ? { id: u.id, email: u.email ?? null } : null,
          profile: u ? readProfile(u.id) : null,
          error: null,
        })
      })
      .catch(() => {
        window.clearTimeout(timeout)
        set({ ready: true, user: null, profile: null, error: 'Unable to check the account session.' })
      })
    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      set({
        ready: true,
        user: u ? { id: u.id, email: u.email ?? null } : null,
        profile: u ? readProfile(u.id) : null,
        error: null,
      })
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
    set({ user: null, profile: null, lastSync: null })
  },

  setAccountRole: (role) => {
    const { user, profile } = get()
    if (!user) return
    const next: AccountProfile = {
      role,
      linkedPlayerId: role === 'player' ? profile?.linkedPlayerId ?? null : null,
      selectedFocalPlayerId: role === 'coach' ? profile?.selectedFocalPlayerId ?? null : null,
    }
    writeProfile(user.id, next)
    set({ profile: next })
  },

  setLinkedPlayer: (playerId) => {
    const { user } = get()
    if (!user) return
    const next: AccountProfile = { role: 'player', linkedPlayerId: playerId, selectedFocalPlayerId: null }
    writeProfile(user.id, next)
    set({ profile: next })
  },

  setFocalPlayer: (playerId) => {
    const { user } = get()
    if (!user) return
    const next: AccountProfile = { role: 'coach', linkedPlayerId: null, selectedFocalPlayerId: playerId }
    writeProfile(user.id, next)
    set({ profile: next })
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
