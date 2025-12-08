/**
 * Club Store
 * In-memory cache + orchestration layer
 */

import { create } from 'zustand'
import type { DBClub, NewClub } from './club.types'
import * as clubDb from './club.db'

interface ClubStore {
  // State
  clubs: DBClub[]
  isLoading: boolean
  error: string | null
  
  // Actions
  load: () => Promise<void>
  create: (data: NewClub) => Promise<DBClub>
  update: (id: string, updates: Partial<NewClub>) => Promise<void>
  delete: (id: string) => Promise<void>
  
  // Query helpers
  getById: (id: string) => DBClub | undefined
  search: (term: string) => DBClub[]
}

export const useClubStore = create<ClubStore>((set, get) => ({
  // State
  clubs: [],
  isLoading: false,
  error: null,
  
  // Load from local DB
  load: async () => {
    set({ isLoading: true, error: null })
    try {
      const clubs = await clubDb.getAll()
      set({ clubs, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load clubs'
      set({ error: message, isLoading: false })
      console.error('Failed to load clubs:', error)
    }
  },
  
  // Create: Write to Dexie → Update cache
  create: async (data) => {
    set({ error: null })
    try {
      // 1. Write to local DB
      const club = await clubDb.create(data)
      
      // 2. Update cache immediately
      set(state => ({
        clubs: [...state.clubs, club].sort((a, b) => 
          a.name.localeCompare(b.name)
        )
      }))
      
      // 3. Future: Background sync to Supabase
      // syncClubToCloud(club).catch(console.warn)
      
      return club
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create club'
      set({ error: message })
      throw error
    }
  },
  
  // Update: Write to Dexie → Update cache
  update: async (id, updates) => {
    set({ error: null })
    try {
      const updated = await clubDb.update(id, updates)
      set(state => ({
        clubs: state.clubs.map(c => c.id === id ? updated : c)
      }))
      
      // Future: Background sync
      // syncClubToCloud(updated).catch(console.warn)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update club'
      set({ error: message })
      throw error
    }
  },
  
  // Delete: Write to Dexie → Update cache
  delete: async (id) => {
    set({ error: null })
    try {
      await clubDb.remove(id)
      set(state => ({
        clubs: state.clubs.filter(c => c.id !== id)
      }))
      
      // Future: Background sync
      // syncClubDeleted(id).catch(console.warn)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete club'
      set({ error: message })
      throw error
    }
  },
  
  // Query helpers (no DB calls, just local cache)
  getById: (id) => get().clubs.find(c => c.id === id),
  
  search: (term) => {
    const lower = term.toLowerCase()
    return get().clubs.filter(c => 
      c.name.toLowerCase().includes(lower) ||
      (c.city?.toLowerCase() || '').includes(lower)
    )
  }
}))

