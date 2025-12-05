/**
 * Match Store
 * In-memory cache + orchestration layer
 */

import { create } from 'zustand'
import type { DBMatch, NewMatch } from './match.types'
import * as matchDb from './match.db'

interface MatchStore {
  // State
  matches: DBMatch[]
  isLoading: boolean
  error: string | null
  
  // Actions
  load: () => Promise<void>
  loadIncomplete: () => Promise<void>
  create: (data: NewMatch) => Promise<DBMatch>
  update: (id: string, updates: Partial<Omit<DBMatch, 'id' | 'created_at'>>) => Promise<void>
  delete: (id: string) => Promise<void>
  
  // Query helpers
  getById: (id: string) => DBMatch | undefined
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  // State
  matches: [],
  isLoading: false,
  error: null,
  
  // Load from local DB
  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const matches = await matchDb.getAll()
      set({ matches, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load matches'
      set({ error: message, isLoading: false })
      console.error('Failed to load matches:', error)
    }
  },
  
  loadIncomplete: async () => {
    set({ isLoading: true, error: null })
    try {
      const matches = await matchDb.getIncomplete()
      set({ matches, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load incomplete matches'
      set({ error: message, isLoading: false })
      console.error('Failed to load incomplete matches:', error)
    }
  },
  
  // Create: Write to Dexie → Update cache
  create: async (data) => {
    set({ error: null })
    try {
      const match = await matchDb.create(data)
      set(state => ({
        matches: [match, ...state.matches]
      }))
      return match
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create match'
      set({ error: message })
      throw error
    }
  },
  
  // Update: Write to Dexie → Update cache
  update: async (id, updates) => {
    set({ error: null })
    try {
      const updated = await matchDb.update(id, updates)
      set(state => ({
        matches: state.matches.map(m => m.id === id ? updated : m)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update match'
      set({ error: message })
      throw error
    }
  },
  
  // Delete: Write to Dexie → Update cache
  delete: async (id) => {
    set({ error: null })
    try {
      await matchDb.remove(id)
      set(state => ({
        matches: state.matches.filter(m => m.id !== id)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete match'
      set({ error: message })
      throw error
    }
  },
  
  // Query helpers
  getById: (id) => get().matches.find(m => m.id === id)
}))

