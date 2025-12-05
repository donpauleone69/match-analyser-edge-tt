/**
 * Tournament Store
 * In-memory cache + orchestration layer
 */

import { create } from 'zustand'
import type { DBTournament, NewTournament, TournamentType } from './tournament.types'
import * as tournamentDb from './tournament.db'

interface TournamentStore {
  // State
  tournaments: DBTournament[]
  isLoading: boolean
  error: string | null
  
  // Actions
  load: () => Promise<void>
  create: (data: NewTournament) => Promise<DBTournament>
  update: (id: string, updates: Partial<Omit<DBTournament, 'id' | 'created_at'>>) => Promise<void>
  delete: (id: string) => Promise<void>
  
  // Query helpers
  getById: (id: string) => DBTournament | undefined
  getByType: (type: TournamentType) => DBTournament[]
  search: (term: string) => DBTournament[]
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  // State
  tournaments: [],
  isLoading: false,
  error: null,
  
  // Load from local DB
  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const tournaments = await tournamentDb.getAll()
      set({ tournaments, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tournaments'
      set({ error: message, isLoading: false })
      console.error('Failed to load tournaments:', error)
    }
  },
  
  // Create: Write to Dexie → Update cache
  create: async (data) => {
    set({ error: null })
    try {
      const tournament = await tournamentDb.create(data)
      set(state => ({
        tournaments: [tournament, ...state.tournaments]
      }))
      return tournament
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create tournament'
      set({ error: message })
      throw error
    }
  },
  
  // Update: Write to Dexie → Update cache
  update: async (id, updates) => {
    set({ error: null })
    try {
      const updated = await tournamentDb.update(id, updates)
      set(state => ({
        tournaments: state.tournaments.map(t => t.id === id ? updated : t)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tournament'
      set({ error: message })
      throw error
    }
  },
  
  // Delete: Write to Dexie → Update cache
  delete: async (id) => {
    set({ error: null })
    try {
      await tournamentDb.remove(id)
      set(state => ({
        tournaments: state.tournaments.filter(t => t.id !== id)
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete tournament'
      set({ error: message })
      throw error
    }
  },
  
  // Query helpers
  getById: (id) => get().tournaments.find(t => t.id === id),
  
  getByType: (type) => get().tournaments.filter(t => t.tournament_type === type),
  
  search: (term) => {
    const lower = term.toLowerCase()
    return get().tournaments.filter(t => 
      t.name.toLowerCase().includes(lower) ||
      (t.location?.toLowerCase() || '').includes(lower)
    )
  }
}))

