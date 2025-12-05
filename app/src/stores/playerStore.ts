/**
 * Player Store - Zustand store for player management
 */

import { create } from 'zustand'
import type { DBPlayer, NewPlayer } from '@/database/types'
import * as playerService from '@/database/services/playerService'

interface PlayerState {
  players: DBPlayer[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadPlayers: () => Promise<void>
  loadAllPlayersIncludingArchived: () => Promise<void>
  createPlayer: (data: NewPlayer) => Promise<DBPlayer>
  updatePlayer: (id: string, updates: Partial<Omit<DBPlayer, 'id' | 'created_at'>>) => Promise<void>
  archivePlayer: (id: string) => Promise<void>
  unarchivePlayer: (id: string) => Promise<void>
  deletePlayer: (id: string) => Promise<void>
  searchPlayers: (searchTerm: string) => Promise<void>
  getPlayerById: (id: string) => DBPlayer | undefined
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  isLoading: false,
  error: null,
  
  loadPlayers: async () => {
    set({ isLoading: true, error: null })
    try {
      const players = await playerService.getAllPlayers()
      set({ players, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load players',
        isLoading: false 
      })
    }
  },
  
  loadAllPlayersIncludingArchived: async () => {
    set({ isLoading: true, error: null })
    try {
      const players = await playerService.getAllPlayersIncludingArchived()
      set({ players, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load players',
        isLoading: false 
      })
    }
  },
  
  createPlayer: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const player = await playerService.createPlayer(data)
      set(state => ({
        players: [...state.players, player].sort((a, b) => 
          a.last_name.localeCompare(b.last_name)
        ),
        isLoading: false,
      }))
      return player
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create player',
        isLoading: false 
      })
      throw error
    }
  },
  
  updatePlayer: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await playerService.updatePlayer(id, updates)
      if (updated) {
        set(state => ({
          players: state.players.map(p => p.id === id ? updated : p),
          isLoading: false,
        }))
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update player',
        isLoading: false 
      })
      throw error
    }
  },
  
  archivePlayer: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await playerService.archivePlayer(id)
      set(state => ({
        players: state.players.filter(p => p.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to archive player',
        isLoading: false 
      })
      throw error
    }
  },
  
  unarchivePlayer: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await playerService.unarchivePlayer(id)
      // Reload players to include unarchived player
      await get().loadPlayers()
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to unarchive player',
        isLoading: false 
      })
      throw error
    }
  },
  
  deletePlayer: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await playerService.deletePlayer(id)
      set(state => ({
        players: state.players.filter(p => p.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete player',
        isLoading: false 
      })
      throw error
    }
  },
  
  searchPlayers: async (searchTerm) => {
    set({ isLoading: true, error: null })
    try {
      const players = await playerService.searchPlayersByName(searchTerm)
      set({ players, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search players',
        isLoading: false 
      })
    }
  },
  
  getPlayerById: (id) => {
    return get().players.find(p => p.id === id)
  },
}))

