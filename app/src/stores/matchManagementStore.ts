/**
 * Match Management Store - Zustand store for match CRUD (separate from tagging)
 */

import { create } from 'zustand'
import type { DBMatch, NewMatch } from '@/database/types'
import * as matchService from '@/database/services/matchService'

interface MatchManagementState {
  matches: DBMatch[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadMatches: () => Promise<void>
  loadIncompleteMatches: () => Promise<void>
  getMatchById: (id: string) => Promise<DBMatch | undefined>
  createMatch: (data: NewMatch) => Promise<DBMatch>
  updateMatch: (id: string, updates: Partial<Omit<DBMatch, 'id' | 'created_at'>>) => Promise<void>
  deleteMatch: (id: string) => Promise<void>
}

export const useMatchManagementStore = create<MatchManagementState>((set) => ({
  matches: [],
  isLoading: false,
  error: null,
  
  loadMatches: async () => {
    set({ isLoading: true, error: null })
    try {
      const matches = await matchService.getAllMatches()
      set({ matches, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load matches',
        isLoading: false 
      })
    }
  },
  
  loadIncompleteMatches: async () => {
    set({ isLoading: true, error: null })
    try {
      const matches = await matchService.getIncompleteMatches()
      set({ matches, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load incomplete matches',
        isLoading: false 
      })
    }
  },
  
  getMatchById: async (id) => {
    try {
      return await matchService.getMatchById(id)
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to get match'
      })
      return undefined
    }
  },
  
  createMatch: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const match = await matchService.createMatch(data)
      set(state => ({
        matches: [match, ...state.matches],
        isLoading: false,
      }))
      return match
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create match',
        isLoading: false 
      })
      throw error
    }
  },
  
  updateMatch: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await matchService.updateMatch(id, updates)
      if (updated) {
        set(state => ({
          matches: state.matches.map(m => m.id === id ? updated : m),
          isLoading: false,
        }))
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update match',
        isLoading: false 
      })
      throw error
    }
  },
  
  deleteMatch: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await matchService.deleteMatch(id)
      set(state => ({
        matches: state.matches.filter(m => m.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete match',
        isLoading: false 
      })
      throw error
    }
  },
}))

