/**
 * Tagging Session Store — legacy localStorage session for old Phase 1/2 flow.
 * Pass 1 Focus / Rally Focus persist to IndexedDB instead.
 * Kept so clearSession still works if anything calls it.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TaggingPhase = 'setup' | 'pre_setup' | 'phase1' | 'phase2' | 'saving' | 'complete'

interface TaggingSessionState {
  matchId: string | null
  setNumber: number | null
  sessionStartedAt: string | null
  currentPhase: TaggingPhase
  clearSession: () => void
  hasActiveSession: () => boolean
}

const initialState = {
  matchId: null as string | null,
  setNumber: null as number | null,
  sessionStartedAt: null as string | null,
  currentPhase: 'setup' as TaggingPhase,
}

export const useTaggingSessionStore = create<TaggingSessionState>()(
  persist(
    (set, get) => ({
      ...initialState,
      clearSession: () => set({ ...initialState }),
      hasActiveSession: () => get().matchId !== null && get().setNumber !== null,
    }),
    { name: 'tagging-session-storage' }
  )
)
