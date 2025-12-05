/**
 * Tournament Store - Zustand store for tournament management
 */

import { create } from 'zustand'
import type { DBTournament, NewTournament } from '@/database/types'
import * as tournamentService from '@/database/services/tournamentService'

interface TournamentState {
  tournaments: DBTournament[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadTournaments: () => Promise<void>
  createTournament: (data: NewTournament) => Promise<DBTournament>
  updateTournament: (id: string, updates: Partial<Omit<DBTournament, 'id' | 'created_at'>>) => Promise<void>
  deleteTournament: (id: string) => Promise<void>
  searchTournaments: (searchTerm: string) => Promise<void>
  getTournamentById: (id: string) => DBTournament | undefined
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  isLoading: false,
  error: null,
  
  loadTournaments: async () => {
    set({ isLoading: true, error: null })
    try {
      const tournaments = await tournamentService.getAllTournaments()
      set({ tournaments, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load tournaments',
        isLoading: false 
      })
    }
  },
  
  createTournament: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const tournament = await tournamentService.createTournament(data)
      set(state => ({
        tournaments: [tournament, ...state.tournaments],
        isLoading: false,
      }))
      return tournament
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create tournament',
        isLoading: false 
      })
      throw error
    }
  },
  
  updateTournament: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await tournamentService.updateTournament(id, updates)
      if (updated) {
        set(state => ({
          tournaments: state.tournaments.map(t => t.id === id ? updated : t),
          isLoading: false,
        }))
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update tournament',
        isLoading: false 
      })
      throw error
    }
  },
  
  deleteTournament: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await tournamentService.deleteTournament(id)
      set(state => ({
        tournaments: state.tournaments.filter(t => t.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete tournament',
        isLoading: false 
      })
      throw error
    }
  },
  
  searchTournaments: async (searchTerm) => {
    set({ isLoading: true, error: null })
    try {
      const tournaments = await tournamentService.searchTournamentsByName(searchTerm)
      set({ tournaments, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search tournaments',
        isLoading: false 
      })
    }
  },
  
  getTournamentById: (id) => {
    return get().tournaments.find(t => t.id === id)
  },
}))

