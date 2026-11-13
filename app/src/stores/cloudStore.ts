/**
 * Cloud Store — signed-in user and last sync result.
 * Cloud sessions are persisted by supabase-js.
 * A local device session (dev / LAN testing) is persisted in localStorage
 * and reuses the same AccountProfile + deriveAccountScope model.
 * Actions never throw — they record `error` instead.
 */

import { create } from 'zustand'
import { cloudConfigured, supabase } from '@/data/cloud/supabaseClient'
import { syncAll, type SyncAllResult } from '@/data/cloud/cloudSync'
import type { AccountProfile, AccountRole } from '@/rules/derive/account/deriveAccountScope'
import * as playerDb from '@/data/entities/players/player.db'

export interface CloudUser {
  id: string
  email: string | null
}

export type SessionKind = 'cloud' | 'local'

const PROFILE_KEY_PREFIX = 'edge-tt-account-profile:'
const LOCAL_SESSION_KEY = 'edge-tt-local-device-session'
export const LOCAL_DEVICE_USER_ID = 'local-device'
const LOCAL_DEVICE_EMAIL = 'local@device'
const AUTH_TIMEOUT_MS = 4000

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

function readLocalSessionFlag(): boolean {
  try {
    return localStorage.getItem(LOCAL_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeLocalSessionFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(LOCAL_SESSION_KEY, '1')
    else localStorage.removeItem(LOCAL_SESSION_KEY)
  } catch {
    // ignore
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out. Use Continue on this device.`)), ms)
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function ensureSeedPlayer(): Promise<string> {
  const existing = await playerDb.getAll()
  if (existing.length > 0) return existing[0].id
  const created = await playerDb.create({
    first_name: 'Hero',
    last_name: 'Player',
    handedness: 'right',
    playstyle: null,
    club_id: null,
    is_archived: false,
  })
  return created.id
}

/** Preserve the seeded player's durable id while retiring its old display name. */
async function migrateLegacyHeroDisplayName(): Promise<void> {
  try {
    const players = await playerDb.getAll()
    const legacySeeds = players.filter(
      (player) => player.first_name === 'Local' && player.last_name === 'Player'
    )
    await Promise.all(
      legacySeeds.map((player) => playerDb.update(player.id, { first_name: 'Hero' }))
    )
  } catch (error) {
    console.warn('Could not update the legacy Hero display name:', error)
  }
}

async function ensureLocalProfileReady(userId: string): Promise<AccountProfile> {
  await migrateLegacyHeroDisplayName()
  const current = readProfile(userId)
  if (current?.role === 'player' && current.linkedPlayerId) return current
  if (current?.role === 'coach' && current.selectedFocalPlayerId) return current
  const playerId = await ensureSeedPlayer()
  const next: AccountProfile = {
    role: 'player',
    linkedPlayerId: playerId,
    selectedFocalPlayerId: null,
  }
  writeProfile(userId, next)
  return next
}

interface CloudState {
  configured: boolean
  ready: boolean
  user: CloudUser | null
  sessionKind: SessionKind | null
  profile: AccountProfile | null
  busy: boolean
  error: string | null
  lastSync: (SyncAllResult & { at: string }) | null
  init: () => void
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  continueOnThisDevice: () => Promise<boolean>
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
  ready: !cloudConfigured && !readLocalSessionFlag(),
  user: null,
  sessionKind: null,
  profile: null,
  busy: false,
  error: null,
  lastSync: null,

  init: () => {
    if (initialised) return
    initialised = true

    const restoreLocal = async () => {
      if (!readLocalSessionFlag()) return false
      const profile = await ensureLocalProfileReady(LOCAL_DEVICE_USER_ID)
      set({
        ready: true,
        user: { id: LOCAL_DEVICE_USER_ID, email: LOCAL_DEVICE_EMAIL },
        sessionKind: 'local',
        profile,
        error: null,
      })
      return true
    }

    void restoreLocal().then((hadLocal) => {
      if (!supabase) {
        if (!hadLocal) set({ ready: true })
        return
      }

      const timeout = window.setTimeout(() => {
        set((state) =>
          state.ready
            ? state
            : {
                ready: true,
                user: null,
                sessionKind: null,
                profile: null,
                error: 'Account service did not respond. Continue on this device, or retry sign-in.',
              }
        )
      }, 2500)

      supabase.auth
        .getSession()
        .then(async ({ data }) => {
          window.clearTimeout(timeout)
          if (get().sessionKind === 'local') return
          const u = data.session?.user
          if (u) {
            writeLocalSessionFlag(false)
            set({
              ready: true,
              user: { id: u.id, email: u.email ?? null },
              sessionKind: 'cloud',
              profile: readProfile(u.id),
              error: null,
            })
            return
          }
          if (!(await restoreLocal())) {
            set({ ready: true, user: null, sessionKind: null, profile: null, error: null })
          }
        })
        .catch(async () => {
          window.clearTimeout(timeout)
          if (get().sessionKind === 'local') return
          if (!(await restoreLocal())) {
            set({
              ready: true,
              user: null,
              sessionKind: null,
              profile: null,
              error: 'Unable to check the account session. Continue on this device to test locally.',
            })
          }
        })

      supabase.auth.onAuthStateChange((_event, session) => {
        if (get().sessionKind === 'local' && !session?.user) return
        const u = session?.user
        if (u) {
          writeLocalSessionFlag(false)
          set({
            ready: true,
            user: { id: u.id, email: u.email ?? null },
            sessionKind: 'cloud',
            profile: readProfile(u.id),
            error: null,
          })
        } else if (get().sessionKind !== 'local') {
          set({ user: null, sessionKind: null, profile: null })
        }
      })
    })
  },

  signIn: async (email, password) => {
    if (!supabase) {
      set({ error: 'Cloud sign-in is not configured. Continue on this device instead.' })
      return false
    }
    set({ busy: true, error: null })
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_TIMEOUT_MS,
        'Sign-in'
      )
      set({ busy: false, error: error?.message ?? null })
      return !error
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'Sign-in failed',
      })
      return false
    }
  },

  signUp: async (email, password) => {
    if (!supabase) {
      set({ error: 'Cloud sign-up is not configured. Continue on this device instead.' })
      return false
    }
    set({ busy: true, error: null })
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        AUTH_TIMEOUT_MS,
        'Create account'
      )
      if (!error && !data.session) {
        set({ busy: false, error: 'Check your email to confirm the account, then sign in.' })
        return false
      }
      set({ busy: false, error: error?.message ?? null })
      return !error
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'Create account failed',
      })
      return false
    }
  },

  continueOnThisDevice: async () => {
    set({ busy: true, error: null })
    try {
      writeLocalSessionFlag(true)
      const profile = await ensureLocalProfileReady(LOCAL_DEVICE_USER_ID)
      set({
        busy: false,
        ready: true,
        user: { id: LOCAL_DEVICE_USER_ID, email: LOCAL_DEVICE_EMAIL },
        sessionKind: 'local',
        profile,
        error: null,
        lastSync: null,
      })
      return true
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'Could not start a local device session.',
      })
      return false
    }
  },

  signOut: async () => {
    writeLocalSessionFlag(false)
    if (get().sessionKind === 'local') {
      set({ user: null, sessionKind: null, profile: null, lastSync: null })
      return
    }
    if (!supabase) {
      set({ user: null, sessionKind: null, profile: null, lastSync: null })
      return
    }
    await supabase.auth.signOut()
    set({ user: null, sessionKind: null, profile: null, lastSync: null })
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
    if (!get().user || get().sessionKind === 'local') {
      set({ error: 'Cloud sync needs a cloud account. Local device sessions stay on this browser only.' })
      return null
    }
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
