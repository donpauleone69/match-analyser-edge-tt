/**
 * Player Store
 * In-memory cache + orchestration layer
 */

import { create } from 'zustand'
import type { DBPlayer, NewPlayer } from './player.types'
import * as playerDb from './player.db'

interface PlayerStore {
  // State
  players: DBPlayer[]
  isLoading: boolean
  error: string | null
  
  // Actions
  load: () => Promise<void>
  loadIncludingArchived: () => Promise<void>
  create: (data: NewPlayer) => Promise<DBPlayer>
  update: (id: string, updates: Partial<Omit<DBPlayer, 'id' | 'created_at'>>) => Promise<void>
  archive: (id: string) => Promise<void>
  unarchive: (id: string) => Promise<void>
  delete: (id: string) => Promise<void>
  
  // Query helpers
  getById: (id: string) => DBPlayer | undefined
  search: (term: string) => DBPlayer[]
  getByClub: (clubId: string) => DBPlayer[]
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // State
  players: [],
  isLoading: false,
  error: null,
  
  // Load from local DB
  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const players = await playerDb.getAll()
      set({ players, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load players'
      set({ error: message, isLoading: false })
      console.error('Failed to load players:', error)
    }
  },
  
  loadIncludingArchived: async () => {
    set({ isLoading: true, error: null })
    try {
      const players = await playerDb.getAllIncludingArchived()
      set({ players, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load players'
      set({ error: message, isLoading: false })
      console.error('Failed to load players:', error)
    }
  },
  
  // Create: Write to Dexie → Update cache
  create: async (data) => {
    set({ error: null })
    try {
      const player = await playerDb.create(data)
      set(state => ({
        players: [...state.players, player].sort((a, b) => 
          a.last_name.localeCompare(b.last_name)
        )
      }))
      return player
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create player'
      set({ error: message })
      throw error
    }
  },
  
  // Update: Write to Dexie → Update cache
  update: async (id, updates) => {
    set({ error: null })
    try {
      const updated = await playerDb.update(id, updates)
      set(state => ({
        players: state.players.map(p => p.id === id ? updated : p)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update player'
      set({ error: message })
      throw error
    }
  },
  
  // Archive: Write to Dexie → Update cache
  archive: async (id) => {
    set({ error: null })
    try {
      await playerDb.archive(id)
      set(state => ({
        players: state.players.filter(p => p.id !== id)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive player'
      set({ error: message })
      throw error
    }
  },
  
  // Unarchive: Write to Dexie → Reload list
  unarchive: async (id) => {
    set({ error: null })
    try {
      await playerDb.unarchive(id)
      await get().load()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unarchive player'
      set({ error: message })
      throw error
    }
  },
  
  // Delete: Write to Dexie → Update cache
  delete: async (id) => {
    set({ error: null })
    try {
      await playerDb.remove(id)
      set(state => ({
        players: state.players.filter(p => p.id !== id)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete player'
      set({ error: message })
      throw error
    }
  },
  
  // Query helpers
  getById: (id) => get().players.find(p => p.id === id),
  
  getByClub: (clubId) => get().players.filter(p => p.club_id === clubId),
  
  search: (term) => {
    const lower = term.toLowerCase()
    return get().players.filter(p => 
      p.first_name.toLowerCase().includes(lower) ||
      p.last_name.toLowerCase().includes(lower)
    )
  }
}))

