/**
 * Tagging Session Store - Persist tagging progress across page refreshes
 * Uses Zustand with persist middleware for localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Phase1Rally } from '@/features/shot-tagging-engine/composers/Phase1TimestampComposer'
import type { DetailedShot } from '@/features/shot-tagging-engine/composers/Phase2DetailComposer'
import type { PlayerContext } from '@/features/shot-tagging-engine/composers/Phase1TimestampComposer'

export type TaggingPhase = 'setup' | 'pre_setup' | 'phase1' | 'phase2' | 'saving' | 'complete'

interface TaggingSessionState {
  // Session metadata
  matchId: string | null
  setNumber: number | null
  sessionStartedAt: string | null  // ISO timestamp
  
  // Phase tracking
  currentPhase: TaggingPhase
  
  // Player context
  playerContext: PlayerContext | null
  
  // Phase 1 data
  phase1Rallies: Phase1Rally[]
  phase1Score: { player1: number; player2: number }
  
  // Phase 2 data
  phase2DetailedShots: DetailedShot[]
  phase2CurrentIndex: number
  
  // Video context (metadata only, not blob)
  videoFile: {
    name: string
    size: number
    type: string
    lastModified: number
  } | null
  
  // Actions
  startSession: (matchId: string, setNumber: number, playerContext: PlayerContext) => void
  setPhase: (phase: TaggingPhase) => void
  savePhase1: (rallies: Phase1Rally[], score: { player1: number; player2: number }) => void
  savePhase2Progress: (shots: DetailedShot[], currentIndex: number) => void
  saveVideoFile: (file: File) => void
  clearSession: () => void
  hasActiveSession: () => boolean
}

const initialState = {
  matchId: null,
  setNumber: null,
  sessionStartedAt: null,
  currentPhase: 'setup' as TaggingPhase,
  playerContext: null,
  phase1Rallies: [],
  phase1Score: { player1: 0, player2: 0 },
  phase2DetailedShots: [],
  phase2CurrentIndex: 0,
  videoFile: null,
}

export const useTaggingSessionStore = create<TaggingSessionState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      startSession: (matchId, setNumber, playerContext) => {
        set({
          matchId,
          setNumber,
          playerContext,
          sessionStartedAt: new Date().toISOString(),
          currentPhase: 'phase1',
        })
      },
      
      setPhase: (phase) => set({ currentPhase: phase }),
      
      savePhase1: (rallies, score) => {
        set({
          phase1Rallies: rallies,
          phase1Score: score,
          currentPhase: 'phase2',
        })
      },
      
      savePhase2Progress: (shots, currentIndex) => {
        set({
          phase2DetailedShots: shots,
          phase2CurrentIndex: currentIndex,
        })
      },
      
      saveVideoFile: (file) => {
        set({
          videoFile: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          },
        })
      },
      
      clearSession: () => set(initialState),
      
      hasActiveSession: () => {
        const state = get()
        return state.matchId !== null && state.currentPhase !== 'complete'
      },
    }),
    {
      name: 'tagging-session-storage',
      // Only persist critical data, not video blob
      partialize: (state) => ({
        matchId: state.matchId,
        setNumber: state.setNumber,
        sessionStartedAt: state.sessionStartedAt,
        currentPhase: state.currentPhase,
        playerContext: state.playerContext,
        phase1Rallies: state.phase1Rallies,
        phase1Score: state.phase1Score,
        phase2DetailedShots: state.phase2DetailedShots,
        phase2CurrentIndex: state.phase2CurrentIndex,
        videoFile: state.videoFile,
      }),
    }
  )
)

