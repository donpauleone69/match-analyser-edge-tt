import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Shot, Rally, Set, TimelineMarker } from '../types'
import type {
  PlayerId,
  TaggingMode,
  VideoCoverage,
  MatchResult,
  PointEndType,
  LuckType,
  ShotQuality,
  LandingType,
  InferredSpin,
  ShotType,
  PlayerProfile,
} from '../rules/types'
import {
  deriveLandingType,
  deriveInferredSpin,
} from '../rules/types'
import {
  calculateServer as calculateServerRule,
} from '../rules/calculateServer'

// =============================================================================
// TYPES
// =============================================================================

// Legacy tagging phases (being replaced)
export type TaggingPhase = 'setup' | 'part1' | 'part2'

// NEW: Framework state machine for Rally Checkpoint Flow
export type FrameworkState = 
  | 'setup'           // Match setup, mark first serve
  | 'tagging'         // Marking shots for current rally
  | 'checkpoint'      // Rally ended, confirm or redo
  | 'ff_mode'         // Fast forward to find next serve
  | 'shot_detail'     // Part 2: answering questions per shot
  | 'rally_review'    // End of rally summary with video sync
  | 'set_complete'    // Set finished, move to next or complete match
  | 'match_complete'  // All sets done

interface TaggingState {
  // Match setup info
  matchId: string | null
  player1Name: string
  player2Name: string
  firstServerId: PlayerId
  videoUrl: string | null // Object URL for the video file
  
  // v0.8.0 - Match details
  matchDate: string | null
  player1StartSets: number
  player2StartSets: number
  player1StartPoints: number
  player2StartPoints: number
  firstServeTimestamp: number | null
  videoCoverage: VideoCoverage
  taggingMode: TaggingMode
  matchFormat: string
  tournament: string
  
  // v0.8.0 - Match completion
  matchResult: MatchResult | null
  finalSetScore: string | null
  finalPointsScore: string | null
  
  // Video playback state (not persisted)
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackSpeed: number
  
  // Set state
  currentSetIndex: number
  sets: Set[]
  player1Score: number
  player2Score: number
  currentServerId: PlayerId
  
  // Player profiles (for future use)
  players: PlayerProfile[]
  
  // Tagging data
  shots: Shot[]
  rallies: Rally[]
  currentRallyShots: Shot[] // Shots in current open rally
  
  // Workflow state - v0.9.4 unified workflow
  taggingPhase: TaggingPhase // 'setup' | 'part1' | 'part2' (legacy)
  step1Complete: boolean // Part 1: Match Framework complete
  step2Complete: boolean // Part 2: Rally Detail complete
  
  // NEW: Rally Checkpoint Flow state machine
  frameworkState: FrameworkState
  currentSetNumber: number
  
  // Part 2 - Sequential rally/shot navigation
  activeRallyIndex: number // Current rally being tagged in Part 2
  activeShotIndex: number // Current shot within rally (1-based)
  shotQuestionStep: number // Current question step (1-4 for Essential)
  
  // Part 2 - Preview settings
  loopSpeed: number // Playback speed for shot preview loop (0.25-1x)
  previewBufferSeconds: number // Time after shot to include in loop (0.1-0.5s)
  
  // Legacy - for backwards compatibility
  currentReviewRallyIndex: number // Index of rally being reviewed in Part 2
  
  // UI state
  showWinnerDialog: boolean
  showMatchDetailsModal: boolean
  showMatchCompletionModal: boolean
  showEndOfPointModal: boolean
  pendingEndOfPoint: {
    winnerId: PlayerId
    needsForcedUnforced: boolean
  } | null
  
  // Undo stack for auto-prune
  lastPrunedShots: Shot[]
  
  // Actions - Match Setup
  resetForNewMatch: () => void // Clear all state for a fresh new match
  initMatch: (p1: string, p2: string, firstServer: PlayerId, videoUrl: string | null) => void
  setVideoUrl: (url: string | null) => void
  setMatchDetails: (details: {
    matchDate: string
    player1StartSets: number
    player2StartSets: number
    player1StartPoints: number
    player2StartPoints: number
    firstServeTimestamp: number
    taggingMode: TaggingMode
  }) => void
  setMatchCompletion: (completion: {
    matchResult: MatchResult
    finalSetScore: string
    finalPointsScore: string
    videoCoverage: VideoCoverage
  }) => void
  
  // Actions - Phase transitions
  setTaggingPhase: (phase: TaggingPhase) => void
  initMatchFramework: (data: {
    player1Name: string
    player2Name: string
    matchDate: string
    firstServerId: PlayerId
    taggingMode: TaggingMode
    matchFormat: string
    tournament: string
    player1StartSets: number
    player2StartSets: number
    player1StartPoints: number
    player2StartPoints: number
    firstServeTimestamp: number
  }) => void
  completeMatchFramework: (data: {
    matchResult: MatchResult
    finalSetScore: string
    finalPointsScore: string
    videoCoverage: VideoCoverage
  }) => void
  
  // Actions - Part 2 Sequential Navigation
  advanceToNextShot: () => void
  advanceToNextRally: () => void
  setShotQuestionStep: (step: number) => void
  goToPreviousShot: () => void
  
  // Actions - Part 2 Preview Settings
  setLoopSpeed: (speed: number) => void
  setPreviewBuffer: (seconds: number) => void
  
  // Actions - Video
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  
  // Actions - Tagging (Part 1)
  addShot: () => void
  startNewRallyWithServe: () => void // Creates new rally with serve shot at current time
  endRallyScore: () => void
  endRallyNoScore: () => void
  endRallyWithoutWinner: () => void // Ends rally, winner set in review
  selectWinner: (winnerId: PlayerId) => void
  undoLastContact: () => void
  markEndOfSet: () => void // Mark current time as end of set
  
  // NEW: Rally Checkpoint Flow actions
  confirmRally: () => void // Checkpoint → save rally → FF mode
  redoCurrentRally: () => number // Checkpoint → clear → seek back → returns seek time
  redoFromRally: (rallyIndex: number) => number // Delete rallies from index, returns seek time
  endSetFramework: () => void // FF mode → shot_detail phase
  confirmRallyReview: () => void // Rally review → next rally or set complete
  startNextSet: () => void // Start framework for next set
  setFrameworkState: (state: FrameworkState) => void
  
  // Actions - Review (Part 1)
  nudgeShot: (setId: string, direction: 'earlier' | 'later', frameMs?: number) => void
  updateShotTime: (setId: string, newTime: number) => void
  updateRallyServer: (rallyId: string, serverId: PlayerId) => void
  updateRallyWinner: (rallyId: string, winnerId: PlayerId) => void
  updateEndOfPointTime: (rallyId: string, time: number) => void
  deleteShot: (rallyId: string, setId: string) => void
  deleteInProgressShot: (setId: string) => void // Delete from currentRallyShots
  deleteRally: (rallyId: string) => void
  addShotToRally: (rallyId: string, time: number) => void
  toggleRallyHighlight: (rallyId: string) => void
  insertRallyAtTime: (time: number) => string // Returns the new rally ID
  setFirstServerAndRecalculate: (firstServer: PlayerId) => void
  recalculateServersFromRally: (rallyId: string) => void // After manual server change
  completeStep1: () => void
  
  // Actions - Rally Detail (Part 2)
  setCurrentReviewRally: (index: number) => void
  nextReviewRally: () => void
  prevReviewRally: () => void
  setRallyPointEndType: (rallyId: string, pointEndType: PointEndType) => void
  setRallyLuckType: (rallyId: string, luckType: LuckType) => void
  completeStep2: () => void
  
  // Actions - End of Point Modal
  openEndOfPointModal: (winnerId: PlayerId, needsForcedUnforced: boolean) => void
  closeEndOfPointModal: () => void
  confirmEndOfPoint: (pointEndType: PointEndType) => void
  
  // Actions - Auto-prune
  autoPruneShots: (rallyId: string, errorShotIndex: number) => { prunedCount: number }
  undoLastPrune: (rallyId: string) => void
  
  // Actions - Shot Shot Data (Part 2)
  updateShotData: (setId: string, data: Partial<Shot>) => void
  completeShotTagging: (setId: string, finalQuality: ShotQuality) => void
  
  // Helpers
  getTimelineMarkers: () => TimelineMarker[]
  getCurrentRally: () => Rally | null
  reset: () => void
}

const generateId = () => Math.random().toString(36).substr(2, 9)

// Wrapper for rules layer server calculation
const calculateServer = (
  p1Score: number,
  p2Score: number,
  firstServer: PlayerId
): PlayerId => {
  const result = calculateServerRule({
    firstServerId: firstServer,
    player1Score: p1Score,
    player2Score: p2Score,
  })
  return result.serverId
}

const initialState = {
  // Match setup
  matchId: null as string | null,
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  firstServerId: 'player1' as PlayerId,
  videoUrl: null as string | null,
  
  // v0.8.0 - Match details
  matchDate: null as string | null,
  player1StartSets: 0,
  player2StartSets: 0,
  player1StartPoints: 0,
  player2StartPoints: 0,
  firstServeTimestamp: null as number | null,
  videoCoverage: 'full' as VideoCoverage,
  taggingMode: 'essential' as TaggingMode,
  matchFormat: 'bestOf5',
  tournament: 'friendly',
  
  // v0.8.0 - Match completion
  matchResult: null as MatchResult | null,
  finalSetScore: null as string | null,
  finalPointsScore: null as string | null,
  
  // Video state
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: 0.5, // Default tagging speed
  
  // Set state
  currentSetIndex: 0,
  sets: [] as Set[],
  player1Score: 0,
  player2Score: 0,
  currentServerId: 'player1' as PlayerId,
  
  // Player profiles (for future use)
  players: [] as PlayerProfile[],
  
  // Tagging data
  shots: [] as Shot[],
  rallies: [] as Rally[],
  currentRallyShots: [] as Shot[],
  
  // Workflow - v0.9.4
  taggingPhase: 'setup' as TaggingPhase,
  step1Complete: false,
  step2Complete: false,
  activeRallyIndex: 0,
  activeShotIndex: 1,
  shotQuestionStep: 1,
  currentReviewRallyIndex: 0,
  
  // NEW: Rally Checkpoint Flow
  frameworkState: 'setup' as FrameworkState,
  currentSetNumber: 1,
  
  // Part 2 - Preview settings
  loopSpeed: 0.5,
  previewBufferSeconds: 0.2,
  
  // UI
  showWinnerDialog: false,
  showMatchDetailsModal: false,
  showMatchCompletionModal: false,
  showEndOfPointModal: false,
  pendingEndOfPoint: null as { winnerId: PlayerId; needsForcedUnforced: boolean } | null,
  
  // Undo stack
  lastPrunedShots: [] as Shot[],
}

export const useTaggingStore = create<TaggingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Match Setup
      resetForNewMatch: () => {
        // Clear ALL match state for a fresh new match
        set({
          ...initialState,
          matchId: null,
          player1Name: 'Player 1',
          player2Name: 'Player 2',
          firstServerId: 'player1',
          currentServerId: 'player1',
          videoUrl: null,
          matchDate: null,
          player1StartSets: 0,
          player2StartSets: 0,
          player1StartPoints: 0,
          player2StartPoints: 0,
          firstServeTimestamp: null,
          taggingMode: 'essential',
          matchFormat: 'bestOf5',
          tournament: 'friendly',
          matchResult: null,
          finalSetScore: null,
          finalPointsScore: null,
          // Clear game state
          sets: [],
          rallies: [],
          shots: [],
          currentRallyShots: [],
          player1Score: 0,
          player2Score: 0,
          currentSetIndex: 0,
          // Reset workflow
          taggingPhase: 'setup',
          step1Complete: false,
          step2Complete: false,
          activeRallyIndex: 0,
          activeShotIndex: 1,
          shotQuestionStep: 1,
          // Rally Checkpoint Flow
          frameworkState: 'setup',
          currentSetNumber: 1,
          // Clear UI state
          showWinnerDialog: false,
          showMatchDetailsModal: false,
          showMatchCompletionModal: false,
          showEndOfPointModal: false,
          pendingEndOfPoint: null,
          lastPrunedShots: [],
        })
      },
      
      initMatch: (p1, p2, firstServer, videoUrl) => {
        set({
          ...initialState,
          matchId: generateId(),
          player1Name: p1,
          player2Name: p2,
          firstServerId: firstServer,
          currentServerId: firstServer,
          videoUrl,
        })
      },
      
      setVideoUrl: (url) => set({ videoUrl: url }),
      
      setMatchDetails: (details) => {
        set({
          matchDate: details.matchDate,
          player1StartSets: details.player1StartSets,
          player2StartSets: details.player2StartSets,
          player1StartPoints: details.player1StartPoints,
          player2StartPoints: details.player2StartPoints,
          firstServeTimestamp: details.firstServeTimestamp,
          taggingMode: details.taggingMode,
          showMatchDetailsModal: false,
        })
      },
      
      setMatchCompletion: (completion) => {
        set({
          matchResult: completion.matchResult,
          finalSetScore: completion.finalSetScore,
          finalPointsScore: completion.finalPointsScore,
          videoCoverage: completion.videoCoverage,
          showMatchCompletionModal: false,
        })
      },
      
      // Phase transitions
      setTaggingPhase: (phase) => set({ taggingPhase: phase }),
      
      initMatchFramework: (data) => {
        // This is the CRITICAL first step that establishes the framework
        // for all server derivation throughout the match
        const matchId = generateId()
        const string = generateId()
        const shotId = generateId()
        
        // Create the first shot (serve) at the marked timestamp
        // Rally is NOT created here - it's created when user ends the rally
        const firstContact: Shot = {
          id: string,
          rallyId: '', // Will be assigned when rally ends
          time: data.firstServeTimestamp,
          shotIndex: 1,
        }
        
        // Create the first game
        const firstGame: Set = {
          id: string,
          matchId: matchId,
          setNumber: data.player1StartSets + data.player2StartSets + 1,
          player1FinalScore: data.player1StartPoints,
          player2FinalScore: data.player2StartPoints,
          hasVideo: true,
        }
        
        set({
          matchId: matchId,
          player1Name: data.player1Name,
          player2Name: data.player2Name,
          matchDate: data.matchDate,
          firstServerId: data.firstServerId,
          currentServerId: data.firstServerId,
          taggingMode: data.taggingMode,
          matchFormat: data.matchFormat,
          tournament: data.tournament,
          player1StartSets: data.player1StartSets,
          player2StartSets: data.player2StartSets,
          player1StartPoints: data.player1StartPoints,
          player2StartPoints: data.player2StartPoints,
          player1Score: data.player1StartPoints,
          player2Score: data.player2StartPoints,
          firstServeTimestamp: data.firstServeTimestamp,
          taggingPhase: 'part1',
          showMatchDetailsModal: false,
          // Initialize with first game, NO rally yet (created at end)
          sets: [firstGame],
          rallies: [],
          shots: [],
          // First serve is the first shot in the open rally
          currentRallyShots: [firstContact],
          currentSetIndex: 0,
          // NEW: Rally Checkpoint Flow - start in tagging state
          frameworkState: 'tagging',
          currentSetNumber: 1,
        })
      },
      
      completeMatchFramework: (data) => {
        // Complete Part 1 and transition to Part 2
        set({
          matchResult: data.matchResult,
          finalSetScore: data.finalSetScore,
          finalPointsScore: data.finalPointsScore,
          videoCoverage: data.videoCoverage,
          step1Complete: true,
          showMatchCompletionModal: false,
          taggingPhase: 'part2',
          activeRallyIndex: 0,
          activeShotIndex: 1,
          shotQuestionStep: 1,
        })
      },
      
      // Part 2 Sequential Navigation
      advanceToNextShot: () => {
        const { activeRallyIndex, activeShotIndex, rallies } = get()
        const currentRally = rallies[activeRallyIndex]
        if (!currentRally) return
        
        const totalShots = currentRally.shots.length
        
        if (activeShotIndex < totalShots) {
          // Move to next shot in same rally
          set({ 
            activeShotIndex: activeShotIndex + 1,
            shotQuestionStep: 1,
          })
        } else {
          // All shots done, this is end-of-point
          // The end-of-point logic will handle advancing to next rally
        }
      },
      
      advanceToNextRally: () => {
        const { activeRallyIndex, rallies } = get()
        
        if (activeRallyIndex < rallies.length - 1) {
          set({
            activeRallyIndex: activeRallyIndex + 1,
            activeShotIndex: 1,
            shotQuestionStep: 1,
          })
        } else {
          // All rallies complete
          set({ step2Complete: true })
        }
      },
      
      setShotQuestionStep: (step) => set({ shotQuestionStep: step }),
      
      goToPreviousShot: () => {
        const { activeRallyIndex, activeShotIndex, rallies } = get()
        
        if (activeShotIndex > 1) {
          // Go to previous shot in same rally
          set({ 
            activeShotIndex: activeShotIndex - 1,
            shotQuestionStep: 1,
          })
        } else if (activeRallyIndex > 0) {
          // Go to last shot of previous rally
          const prevRally = rallies[activeRallyIndex - 1]
          set({
            activeRallyIndex: activeRallyIndex - 1,
            activeShotIndex: prevRally.shots.length,
            shotQuestionStep: 1,
          })
        }
        // If at first shot of first rally, do nothing
      },
      
      // Part 2 Preview Settings
      setLoopSpeed: (speed) => set({ loopSpeed: speed }),
      setPreviewBuffer: (seconds) => set({ previewBufferSeconds: seconds }),
      
      // Video controls
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
      
      // Tagging
      addShot: () => {
        const { currentTime, currentRallyShots, frameworkState } = get()
        
        // Only allow adding shots when in tagging state
        if (frameworkState !== 'tagging') return
        
        const shotIndex = currentRallyShots.length + 1
        const newShot: Shot = {
          id: generateId(),
          rallyId: '', // Will be assigned when rally is confirmed
          time: currentTime,
          shotIndex,
          // Auto-populate shotType='serve' for first shot
          ...(shotIndex === 1 ? { shotType: 'serve' as const } : {}),
        }
        set({ currentRallyShots: [...currentRallyShots, newShot] })
      },
      
      startNewRallyWithServe: () => {
        // Rally Checkpoint Flow: Mark serve → transition to tagging state
        // Called when user presses Space in FF mode to mark next serve
        const { currentTime, rallies, firstServerId, currentRallyShots, frameworkState } = get()
        
        // Only allow marking serve when in FF mode
        if (frameworkState !== 'ff_mode') {
          console.warn('startNewRallyWithServe called but not in ff_mode')
          return
        }
        
        // Safety check: If there are already shots in the buffer, don't overwrite
        if (currentRallyShots.length > 0) {
          console.warn('startNewRallyWithServe called but currentRallyShots is not empty')
          return
        }
        
        // Calculate next server based on RALLY COUNT (not score)
        // In Part 1, we don't know winners yet, so we can't use score
        // Table tennis rule: serves change every 2 points
        const rallyCount = rallies.length
        const serveBlock = Math.floor(rallyCount / 2)
        const isFirstServerBlock = serveBlock % 2 === 0
        const nextServerId: PlayerId = isFirstServerBlock ? firstServerId : (firstServerId === 'player1' ? 'player2' : 'player1')
        
        // Create serve shot - rallyId will be assigned when confirmed
        const serveContact: Shot = {
          id: generateId(),
          rallyId: '', // Assigned when rally is confirmed at checkpoint
          time: currentTime,
          shotIndex: 1,
        }
        
        // Add serve to currentRallyShots buffer and transition to tagging state
        set({
          currentRallyShots: [serveContact],
          currentServerId: nextServerId,
          frameworkState: 'tagging',
        })
      },
      
      endRallyScore: () => {
        // Rally Checkpoint Flow: End rally → transition to checkpoint state
        // Rally creation happens when user confirms at checkpoint
        const { currentRallyShots, frameworkState } = get()
        
        // Only allow ending rally when in tagging state
        if (frameworkState !== 'tagging') return
        if (currentRallyShots.length === 0) return
        
        // Transition to checkpoint state - rally NOT created yet
        // Video should be paused by the component
        set({
          frameworkState: 'checkpoint',
          showWinnerDialog: false,
        })
      },
      
      endRallyNoScore: () => {
        const { currentRallyShots, rallies, player1Score, player2Score, currentServerId } = get()
        
        if (currentRallyShots.length === 0) return
        
        const rallyId = generateId()
        const newRally: Rally = {
          id: rallyId,
          setId: 'game1',
          rallyIndex: rallies.length + 1,
          isScoring: false,
          player1ScoreAfter: player1Score,
          player2ScoreAfter: player2Score,
          serverId: currentServerId,
          receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          shots: currentRallyShots.map(c => ({ ...c, rallyId })),
        }
        
        set({
          rallies: [...rallies, newRally],
          shots: [...get().shots, ...newRally.shots],
          currentRallyShots: [],
        })
      },

      endRallyWithoutWinner: () => {
        // Ends rally as scoring but without winner assigned yet
        // Winner will be set in Step 1 Review
        const { currentRallyShots, rallies, player1Score, player2Score, currentServerId, currentTime } = get()
        
        if (currentRallyShots.length === 0) return
        
        const rallyId = generateId()
        const newRally: Rally = {
          id: rallyId,
          setId: 'game1',
          rallyIndex: rallies.length + 1,
          isScoring: true,
          winnerId: undefined, // To be set in review
          endOfPointTime: currentTime, // Use current time as placeholder
          player1ScoreAfter: player1Score, // Score not updated until winner is set
          player2ScoreAfter: player2Score,
          serverId: currentServerId,
          receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          shots: currentRallyShots.map(c => ({ ...c, rallyId })),
        }
        
        set({
          rallies: [...rallies, newRally],
          shots: [...get().shots, ...newRally.shots],
          currentRallyShots: [],
        })
      },
      
      selectWinner: (winnerId) => {
        const { currentTime, currentRallyShots, rallies, player1Score, player2Score, currentServerId, firstServerId } = get()
        
        if (currentRallyShots.length === 0) {
          set({ showWinnerDialog: false })
          return
        }
        
        const rallyId = generateId()
        const newP1Score = winnerId === 'player1' ? player1Score + 1 : player1Score
        const newP2Score = winnerId === 'player2' ? player2Score + 1 : player2Score
        
        // End of point time = current video time when rally ends
        const endOfPointTime = currentTime
        
        const newRally: Rally = {
          id: rallyId,
          setId: 'game1',
          rallyIndex: rallies.length + 1,
          isScoring: true,
          winnerId,
          endOfPointTime,
          player1ScoreAfter: newP1Score,
          player2ScoreAfter: newP2Score,
          serverId: currentServerId,
          receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          shots: currentRallyShots.map(c => ({ ...c, rallyId })),
        }
        
        // Calculate next server
        const nextServer = calculateServer(newP1Score, newP2Score, firstServerId)
        
        set({
          rallies: [...rallies, newRally],
          shots: [...get().shots, ...newRally.shots],
          currentRallyShots: [],
          player1Score: newP1Score,
          player2Score: newP2Score,
          currentServerId: nextServer,
          showWinnerDialog: false,
        })
      },
      
      undoLastContact: () => {
        const { currentRallyShots } = get()
        if (currentRallyShots.length > 0) {
          set({ currentRallyShots: currentRallyShots.slice(0, -1) })
        }
      },
      
      // Review actions
      nudgeShot: (shotId, direction, frameMs = 33) => {
        // Nudge a shot time by one frame (~33ms for 30fps)
        const delta = direction === 'earlier' ? -frameMs : frameMs
        const { rallies, shots, currentRallyShots } = get()
        
        // Check if it's in currentRallyShots (in-progress rally)
        const inProgressIndex = currentRallyShots.findIndex(c => c.id === shotId)
        if (inProgressIndex >= 0) {
          const shot = currentRallyShots[inProgressIndex]
          const newTime = Math.max(0, shot.time + delta)
          const updated = [...currentRallyShots]
          updated[inProgressIndex] = { ...shot, time: newTime }
          set({ currentRallyShots: updated })
          return
        }
        
        // Otherwise update in completed rallies
        const shot = shots.find(c => c.id === shotId)
        if (!shot) return
        
        const newTime = Math.max(0, shot.time + delta)
        
        const updatedContacts = shots.map(c => 
          c.id === shotId ? { ...c, time: newTime } : c
        )
        
        const updatedRallies = rallies.map(rally => ({
          ...rally,
          shots: rally.shots.map(c => 
            c.id === shotId ? { ...c, time: newTime } : c
          ),
        }))
        
        set({ shots: updatedContacts, rallies: updatedRallies })
      },
      
      updateShotTime: (shotId, newTime) => {
        const { rallies, shots } = get()
        
        // Update in shots array
        const updatedContacts = shots.map(c => 
          c.id === shotId ? { ...c, time: newTime } : c
        )
        
        // Update in rallies
        const updatedRallies = rallies.map(rally => ({
          ...rally,
          shots: rally.shots.map(c => 
            c.id === shotId ? { ...c, time: newTime } : c
          ),
        }))
        
        set({ shots: updatedContacts, rallies: updatedRallies })
      },
      
      updateRallyServer: (rallyId, serverId) => {
        const { rallies } = get()
        const updatedRallies = rallies.map(rally => 
          rally.id === rallyId 
            ? { 
                ...rally, 
                serverId, 
                receiverId: serverId === 'player1' ? 'player2' : 'player1' as 'player1' | 'player2'
              } 
            : rally
        )
        set({ rallies: updatedRallies })
      },
      
      updateRallyWinner: (rallyId, winnerId) => {
        const { rallies } = get()
        const updatedRallies = rallies.map(rally => {
          if (rally.id !== rallyId || !rally.isScoring) return rally
          
          // Recalculate scores based on winner change
          const rallyIndex = rallies.findIndex(r => r.id === rallyId)
          const prevRally = rallyIndex > 0 ? rallies[rallyIndex - 1] : null
          const prevP1Score = prevRally ? prevRally.player1ScoreAfter : 0
          const prevP2Score = prevRally ? prevRally.player2ScoreAfter : 0
          
          return {
            ...rally,
            winnerId,
            player1ScoreAfter: winnerId === 'player1' ? prevP1Score + 1 : prevP1Score,
            player2ScoreAfter: winnerId === 'player2' ? prevP2Score + 1 : prevP2Score,
          }
        })
        
        // Recalculate all subsequent scores
        let p1Score = 0
        let p2Score = 0
        const recalculatedRallies = updatedRallies.map(rally => {
          if (rally.isScoring && rally.winnerId) {
            if (rally.winnerId === 'player1') p1Score++
            else p2Score++
          }
          return {
            ...rally,
            player1ScoreAfter: p1Score,
            player2ScoreAfter: p2Score,
          }
        })
        
        set({ 
          rallies: recalculatedRallies,
          player1Score: p1Score,
          player2Score: p2Score,
        })
      },
      
      updateEndOfPointTime: (rallyId, time) => {
        const { rallies } = get()
        const updatedRallies = rallies.map(rally => 
          rally.id === rallyId ? { ...rally, endOfPointTime: time } : rally
        )
        set({ rallies: updatedRallies })
      },
      
      deleteShot: (rallyId, shotId) => {
        const { rallies, shots } = get()
        
        // Remove from shots array
        const updatedContacts = shots.filter(c => c.id !== shotId)
        
        // Remove from rally and re-index
        const updatedRallies = rallies.map(rally => {
          if (rally.id !== rallyId) return rally
          
          const filteredContacts = rally.shots.filter(c => c.id !== shotId)
          // Re-index shot numbers
          const reindexedContacts = filteredContacts.map((c, idx) => ({
            ...c,
            shotIndex: idx + 1
          }))
          
          return { ...rally, shots: reindexedContacts }
        })
        
        set({ shots: updatedContacts, rallies: updatedRallies })
      },
      
      deleteInProgressShot: (shotId) => {
        const { currentRallyShots } = get()
        const filtered = currentRallyShots.filter(c => c.id !== shotId)
        // Re-index shot numbers
        const reindexed = filtered.map((c, idx) => ({ ...c, shotIndex: idx + 1 }))
        set({ currentRallyShots: reindexed })
      },

      deleteRally: (rallyId) => {
        const { rallies, shots, firstServerId } = get()
        
        // Remove rally
        const remainingRallies = rallies.filter(r => r.id !== rallyId)
        
        // Remove shots belonging to this rally
        const remainingContacts = shots.filter(c => c.rallyId !== rallyId)
        
        // Recalculate rally indices and scores
        let p1Score = 0
        let p2Score = 0
        const updatedRallies = remainingRallies.map((rally, idx) => {
          const serverId = calculateServer(p1Score, p2Score, firstServerId)
          
          if (rally.isScoring && rally.winnerId) {
            if (rally.winnerId === 'player1') p1Score++
            else p2Score++
          }
          
          return {
            ...rally,
            rallyIndex: idx + 1,
            serverId,
            receiverId: (serverId === 'player1' ? 'player2' : 'player1') as PlayerId,
            player1ScoreAfter: p1Score,
            player2ScoreAfter: p2Score,
          }
        })
        
        set({ 
          rallies: updatedRallies, 
          shots: remainingContacts,
          player1Score: p1Score,
          player2Score: p2Score,
        })
      },
      
      addShotToRally: (rallyId, time) => {
        const { rallies, shots } = get()
        
        const rally = rallies.find(r => r.id === rallyId)
        if (!rally) return
        
        const newContact: Shot = {
          id: Math.random().toString(36).substr(2, 9),
          rallyId,
          time,
          shotIndex: rally.shots.length + 1,
        }
        
        // Add to shots array
        const updatedContacts = [...shots, newContact]
        
        // Add to rally and sort by time, then re-index
        const updatedRallies = rallies.map(r => {
          if (r.id !== rallyId) return r
          
          const newContacts = [...r.shots, newContact]
            .sort((a, b) => a.time - b.time)
            .map((c, idx) => ({ ...c, shotIndex: idx + 1 }))
          
          return { ...r, shots: newContacts }
        })
        
        set({ shots: updatedContacts, rallies: updatedRallies })
      },
      
      toggleRallyHighlight: (rallyId) => {
        const { rallies } = get()
        const updatedRallies = rallies.map(rally => 
          rally.id === rallyId 
            ? { ...rally, isHighlight: !rally.isHighlight }
            : rally
        )
        set({ rallies: updatedRallies })
      },

      insertRallyAtTime: (time) => {
        const { rallies, firstServerId, shots } = get()
        
        // Find where to insert based on time
        // Look at first shot time of each rally to determine position
        let insertIndex = rallies.length
        for (let i = 0; i < rallies.length; i++) {
          const rallyFirstContactTime = rallies[i].shots[0]?.time ?? Infinity
          if (time < rallyFirstContactTime) {
            insertIndex = i
            break
          }
        }
        
        // Calculate score at this point (sum of all rallies before this)
        let p1Score = 0
        let p2Score = 0
        for (let i = 0; i < insertIndex; i++) {
          if (rallies[i].isScoring && rallies[i].winnerId === 'player1') p1Score++
          if (rallies[i].isScoring && rallies[i].winnerId === 'player2') p2Score++
        }
        
        const serverId = calculateServer(p1Score, p2Score, firstServerId)
        
        // Create new rally with a single shot at the given time
        const rallyId = generateId()
        const shotId = generateId()
        const newShot: Shot = {
          id: shotId,
          rallyId,
          time,
          shotIndex: 1,
          shotType: 'serve',  // Auto-populate serve
        }
        
        const newRally: Rally = {
          id: rallyId,
          setId: 'game1',
          rallyIndex: insertIndex + 1,
          isScoring: true,
          winnerId: undefined, // Needs to be set
          endOfPointTime: undefined, // Needs to be set
          player1ScoreAfter: p1Score,
          player2ScoreAfter: p2Score,
          serverId,
          receiverId: serverId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          shots: [newShot],
          isHighlight: false,
        }
        
        // Insert rally and update indices/scores for rallies after
        const updatedRallies = [...rallies]
        updatedRallies.splice(insertIndex, 0, newRally)
        
        // Recalculate rally indices and scores for subsequent rallies
        let runningP1 = p1Score
        let runningP2 = p2Score
        for (let i = insertIndex; i < updatedRallies.length; i++) {
          updatedRallies[i] = {
            ...updatedRallies[i],
            rallyIndex: i + 1,
          }
          // Update scores for rallies after the inserted one
          if (i > insertIndex && updatedRallies[i].isScoring) {
            if (updatedRallies[i].winnerId === 'player1') runningP1++
            if (updatedRallies[i].winnerId === 'player2') runningP2++
            updatedRallies[i] = {
              ...updatedRallies[i],
              player1ScoreAfter: runningP1,
              player2ScoreAfter: runningP2,
            }
          }
        }
        
        set({ 
          rallies: updatedRallies,
          shots: [...shots, newShot],
        })
        
        return rallyId
      },

      setFirstServerAndRecalculate: (firstServer) => {
        const { rallies } = get()
        
        // Recalculate all server assignments based on new first server
        let p1Score = 0
        let p2Score = 0
        
        const updatedRallies = rallies.map((rally) => {
          // Calculate who should be serving based on score
          const serverId = calculateServer(p1Score, p2Score, firstServer)
          const receiverId: PlayerId = serverId === 'player1' ? 'player2' : 'player1'
          
          // Update score after this rally if it's scoring
          if (rally.isScoring && rally.winnerId) {
            if (rally.winnerId === 'player1') p1Score++
            else p2Score++
          }
          
          return {
            ...rally,
            serverId,
            receiverId,
          }
        })
        
        set({ 
          firstServerId: firstServer,
          currentServerId: firstServer,
          rallies: updatedRallies,
        })
      },

      recalculateServersFromRally: (rallyId) => {
        // After manual server change, recalculate all subsequent rallies
        // based on the manually set server for this rally
        const { rallies } = get()
        
        const rallyIndex = rallies.findIndex(r => r.id === rallyId)
        if (rallyIndex === -1) return
        
        const manualRally = rallies[rallyIndex]
        const manualServer = manualRally.serverId
        
        // Calculate score at this rally
        let p1Score = 0
        let p2Score = 0
        for (let i = 0; i < rallyIndex; i++) {
          if (rallies[i].isScoring && rallies[i].winnerId === 'player1') p1Score++
          if (rallies[i].isScoring && rallies[i].winnerId === 'player2') p2Score++
        }
        
        // Determine what first server would need to be for this rally to have manualServer
        // We'll use the manual server as the "anchor" and calculate forward from there
        const updatedRallies = rallies.map((rally, idx) => {
          if (idx < rallyIndex) return rally // Don't change rallies before
          
          if (idx === rallyIndex) {
            // This is the manually changed rally - keep it as is
            if (rally.isScoring && rally.winnerId) {
              if (rally.winnerId === 'player1') p1Score++
              else p2Score++
            }
            return rally
          }
          
          // For subsequent rallies, alternate every 2 serves from the manual server
          const pointsSinceManual = (idx - rallyIndex)
          // Every 2 points, server changes
          const serveBlocksSinceManual = Math.floor(pointsSinceManual / 2)
          const serverId: PlayerId = serveBlocksSinceManual % 2 === 0 
            ? manualServer 
            : (manualServer === 'player1' ? 'player2' : 'player1')
          
          if (rally.isScoring && rally.winnerId) {
            if (rally.winnerId === 'player1') p1Score++
            else p2Score++
          }
          
          return {
            ...rally,
            serverId,
            receiverId: (serverId === 'player1' ? 'player2' : 'player1') as PlayerId,
          }
        })
        
        set({ rallies: updatedRallies })
      },
      
      completeStep1: () => {
        const { currentRallyShots } = get()
        // Don't allow completion if there's an open rally
        if (currentRallyShots.length > 0) return
        set({ step1Complete: true, currentReviewRallyIndex: 0 })
      },
      
      // Part 2 - Rally Detail Actions
      setCurrentReviewRally: (index) => {
        const { rallies } = get()
        if (index >= 0 && index < rallies.length) {
          set({ currentReviewRallyIndex: index })
        }
      },
      
      nextReviewRally: () => {
        const { currentReviewRallyIndex, rallies } = get()
        if (currentReviewRallyIndex < rallies.length - 1) {
          set({ currentReviewRallyIndex: currentReviewRallyIndex + 1 })
        }
      },
      
      prevReviewRally: () => {
        const { currentReviewRallyIndex } = get()
        if (currentReviewRallyIndex > 0) {
          set({ currentReviewRallyIndex: currentReviewRallyIndex - 1 })
        }
      },
      
      setRallyPointEndType: (rallyId, pointEndType) => {
        const { rallies } = get()
        const updatedRallies = rallies.map(rally =>
          rally.id === rallyId ? { ...rally, pointEndType } : rally
        )
        set({ rallies: updatedRallies })
      },
      
      setRallyLuckType: (rallyId, luckType) => {
        const { rallies } = get()
        const updatedRallies = rallies.map(rally =>
          rally.id === rallyId ? { ...rally, luckType } : rally
        )
        set({ rallies: updatedRallies })
      },
      
      completeStep2: () => {
        set({ step2Complete: true })
      },
      
      // End of Point Modal Actions
      openEndOfPointModal: (winnerId, needsForcedUnforced) => {
        set({
          showEndOfPointModal: true,
          pendingEndOfPoint: { winnerId, needsForcedUnforced },
        })
      },
      
      closeEndOfPointModal: () => {
        set({
          showEndOfPointModal: false,
          pendingEndOfPoint: null,
        })
      },
      
      confirmEndOfPoint: (_pointEndType) => {
        const { pendingEndOfPoint } = get()
        if (!pendingEndOfPoint) return
        
        // This would be called after user selects forced/unforced
        // The actual rally creation happens in selectWinner
        // pointEndType is used for setting the rally's end type
        set({
          showEndOfPointModal: false,
          pendingEndOfPoint: null,
        })
      },
      
      // Auto-prune Actions
      autoPruneShots: (rallyId, errorShotIndex) => {
        const { rallies, shots } = get()
        
        const rally = rallies.find(r => r.id === rallyId)
        if (!rally) return { prunedCount: 0 }
        
        // Find shots to prune (shot index > error shot index)
        const contactsToPrune = rally.shots.filter(c => c.shotIndex > errorShotIndex)
        if (contactsToPrune.length === 0) return { prunedCount: 0 }
        
        const contactIdsToRemove = contactsToPrune.map(c => c.id)
        
        // Store pruned shots for undo
        const prunedContacts = shots.filter(c => contactIdsToRemove.includes(c.id))
        
        // Remove from shots array
        const updatedContacts = shots.filter(c => !contactIdsToRemove.includes(c.id))
        
        // Remove from rally
        const updatedRallies = rallies.map(r => {
          if (r.id !== rallyId) return r
          return {
            ...r,
            shots: r.shots.filter(c => !contactIdsToRemove.includes(c.id)),
          }
        })
        
        set({
          shots: updatedContacts,
          rallies: updatedRallies,
          lastPrunedShots: prunedContacts,
        })
        
        return { prunedCount: prunedContacts.length }
      },
      
      undoLastPrune: (rallyId) => {
        const { rallies, shots, lastPrunedShots } = get()
        
        if (lastPrunedShots.length === 0) return
        
        // Restore shots
        const restoredContacts = [...shots, ...lastPrunedShots]
        
        // Restore to rally and re-sort by time
        const updatedRallies = rallies.map(r => {
          if (r.id !== rallyId) return r
          const allContacts = [...r.shots, ...lastPrunedShots]
            .sort((a, b) => a.time - b.time)
            .map((c, idx) => ({ ...c, shotIndex: idx + 1 }))
          return { ...r, shots: allContacts }
        })
        
        set({
          shots: restoredContacts,
          rallies: updatedRallies,
          lastPrunedShots: [],
        })
      },
      
      // Shot Shot Data Actions (Part 2)
      updateShotData: (shotId, data) => {
        const { shots, rallies } = get()
        
        // Update in shots array
        const updatedContacts = shots.map(c => 
          c.id === shotId ? { ...c, ...data } : c
        )
        
        // Update in rally's shots array
        const updatedRallies = rallies.map(rally => ({
          ...rally,
          shots: rally.shots.map(c => 
            c.id === shotId ? { ...c, ...data } : c
          ),
        }))
        
        set({ shots: updatedContacts, rallies: updatedRallies })
      },
      
      completeShotTagging: (shotId, finalQuality) => {
        const { shots, rallies } = get()
        
        // Find the shot
        const shot = shots.find(c => c.id === shotId)
        if (!shot) return
        
        // Derive landing type from quality
        const landingType: LandingType = deriveLandingType(finalQuality)
        
        // Derive inferred spin from shot type (if applicable)
        const inferredSpin: InferredSpin | undefined = shot.shotType 
          ? deriveInferredSpin(shot.shotType as ShotType)
          : undefined
        
        const updateData: Partial<Shot> = { 
          shotQuality: finalQuality, 
          landingType, 
          inferredSpin, 
          isTagged: true 
        }
        
        // Update in shots array
        const updatedContacts = shots.map(c => 
          c.id === shotId ? { ...c, ...updateData } : c
        )
        
        // Update in rally's shots array
        const updatedRallies = rallies.map(rally => ({
          ...rally,
          shots: rally.shots.map(c => 
            c.id === shotId ? { ...c, ...updateData } : c
          ),
        }))
        
        set({ shots: updatedContacts, rallies: updatedRallies })
      },
      
      // Mark end of set
      markEndOfSet: () => {
        const { currentTime, sets, currentSetIndex, player1Score, player2Score, matchFormat } = get()
        
        // Calculate max sets based on match format
        const getMaxSets = (format: string): number => {
          if (format === 'bestOf3') return 3
          if (format === 'bestOf5') return 5
          if (format === 'bestOf7') return 7
          if (format === 'bestOf3_21') return 3
          if (format === 'bestOf5_21') return 5
          if (format === 'singleSet') return 1
          return 5 // Default
        }
        
        const maxSets = getMaxSets(matchFormat || 'bestOf5')
        const currentSetNumber = currentSetIndex + 1
        
        // Don't allow ending more sets than the match format allows
        if (currentSetNumber >= maxSets) {
          // This is the final set - just update it, don't create a new one
          const updatedGames = [...sets]
          if (updatedGames[currentSetIndex]) {
            updatedGames[currentSetIndex] = {
              ...updatedGames[currentSetIndex],
              endOfSetTimestamp: currentTime,
              player1FinalScore: player1Score,
              player2FinalScore: player2Score,
            }
          }
          set({ sets: updatedGames })
          return
        }
        
        // Update current game with end timestamp
        const updatedGames = [...sets]
        if (updatedGames[currentSetIndex]) {
          updatedGames[currentSetIndex] = {
            ...updatedGames[currentSetIndex],
            endOfSetTimestamp: currentTime,
            player1FinalScore: player1Score,
            player2FinalScore: player2Score,
          }
        } else {
          // Create new game record
          updatedGames.push({
            id: generateId(),
            matchId: get().matchId || '',
            setNumber: currentSetIndex + 1,
            player1FinalScore: player1Score,
            player2FinalScore: player2Score,
            hasVideo: true,
            endOfSetTimestamp: currentTime,
          })
        }
        
        // Create next game
        updatedGames.push({
          id: generateId(),
          matchId: get().matchId || '',
          setNumber: currentSetIndex + 2,
          player1FinalScore: 0,
          player2FinalScore: 0,
          hasVideo: true,
        })
        
        // Start new game
        set({
          sets: updatedGames,
          currentSetIndex: currentSetIndex + 1,
          player1Score: 0,
          player2Score: 0,
        })
      },
      
      // =========================================================================
      // NEW: Rally Checkpoint Flow Actions
      // =========================================================================
      
      setFrameworkState: (state) => set({ frameworkState: state }),
      
      confirmRally: () => {
        const { currentRallyShots, rallies, currentServerId, currentTime, firstServerId, sets, currentSetIndex } = get()
        
        if (currentRallyShots.length === 0) return
        
        // Create rally from current shots
        const rallyId = generateId()
        const setId = sets[currentSetIndex]?.id || generateId()
        const receiverId: PlayerId = currentServerId === 'player1' ? 'player2' : 'player1'
        
        const newRally: Rally = {
          id: rallyId,
          setId: setId,
          rallyIndex: rallies.length + 1,
          isScoring: true,
          endOfPointTime: currentTime,
          serverId: currentServerId,
          receiverId: receiverId,
          hasVideoData: true,
          player1ScoreAfter: 0,  // Will be calculated by scoreAfterRally
          player2ScoreAfter: 0,  // Will be calculated by scoreAfterRally
          shots: currentRallyShots.map(c => ({ ...c, rallyId })),
          // NEW: Framework tracking
          frameworkConfirmed: true,
          detailComplete: false,
        }
        
        // Calculate next server based on rally count (not score - that's Part 2)
        const newRallyCount = rallies.length + 1
        const serveBlock = Math.floor(newRallyCount / 2)
        const isFirstServerBlock = serveBlock % 2 === 0
        const nextServerId: PlayerId = isFirstServerBlock 
          ? firstServerId 
          : (firstServerId === 'player1' ? 'player2' : 'player1')
        
        set({
          rallies: [...rallies, newRally],
          shots: [...get().shots, ...currentRallyShots.map(c => ({ ...c, rallyId }))],
          currentRallyShots: [],
          currentServerId: nextServerId,
          frameworkState: 'ff_mode',
        })
      },
      
      redoCurrentRally: () => {
        const { rallies, firstServeTimestamp } = get()
        
        // Get previous rally's end time (or first serve time if Rally 1)
        const seekTime = rallies.length > 0 
          ? rallies[rallies.length - 1].endOfPointTime || 0
          : firstServeTimestamp || 0
        
        set({
          currentRallyShots: [],
          frameworkState: 'ff_mode',
        })
        
        return seekTime
      },
      
      redoFromRally: (rallyIndex: number) => {
        const { rallies, shots, firstServeTimestamp, firstServerId } = get()
        
        if (rallyIndex < 0 || rallyIndex >= rallies.length) {
          return firstServeTimestamp || 0
        }
        
        // Get seek time (previous rally's end or first serve)
        const seekTime = rallyIndex > 0 
          ? rallies[rallyIndex - 1].endOfPointTime || 0
          : firstServeTimestamp || 0
        
        // Delete rallies from index onward
        const remainingRallies = rallies.slice(0, rallyIndex)
        
        // Delete shots from deleted rallies
        const deletedRallyIds = new Set(rallies.slice(rallyIndex).map(r => r.id))
        const remainingContacts = shots.filter(c => !deletedRallyIds.has(c.rallyId))
        
        // Recalculate server for next rally
        const newRallyCount = remainingRallies.length
        const serveBlock = Math.floor(newRallyCount / 2)
        const isFirstServerBlock = serveBlock % 2 === 0
        const nextServerId: PlayerId = isFirstServerBlock 
          ? firstServerId 
          : (firstServerId === 'player1' ? 'player2' : 'player1')
        
        set({
          rallies: remainingRallies,
          shots: remainingContacts,
          currentRallyShots: [],
          currentServerId: nextServerId,
          frameworkState: 'ff_mode',
        })
        
        return seekTime
      },
      
      endSetFramework: () => {
        // Transition from FF mode to shot detail phase
        const { rallies } = get()
        
        if (rallies.length === 0) return
        
        set({
          frameworkState: 'shot_detail',
          activeRallyIndex: 0,
          activeShotIndex: 1,
          shotQuestionStep: 1,
          // Also update legacy phase for compatibility
          taggingPhase: 'part2',
        })
      },
      
      confirmRallyReview: () => {
        const { activeRallyIndex, rallies, currentSetNumber } = get()
        
        // Mark current rally detail as complete
        const updatedRallies = rallies.map((r, idx) => 
          idx === activeRallyIndex ? { ...r, detailComplete: true } : r
        )
        
        if (activeRallyIndex < rallies.length - 1) {
          // Move to next rally
          set({
            rallies: updatedRallies,
            activeRallyIndex: activeRallyIndex + 1,
            activeShotIndex: 1,
            shotQuestionStep: 1,
            frameworkState: 'shot_detail',
          })
        } else {
          // All rallies in set complete
          set({
            rallies: updatedRallies,
            frameworkState: 'set_complete',
            step2Complete: true,
          })
        }
      },
      
      startNextSet: () => {
        const { currentSetNumber, sets, matchId } = get()
        const nextSetNumber = currentSetNumber + 1
        
        // Create new game for next set
        const newGame: Set = {
          id: generateId(),
          matchId: matchId || '',
          setNumber: nextSetNumber,
          player1FinalScore: 0,
          player2FinalScore: 0,
          hasVideo: true,
        }
        
        set({
          currentSetNumber: nextSetNumber,
          currentSetIndex: sets.length,
          sets: [...sets, newGame],
          // Clear rally data for new set
          rallies: [],
          shots: [],
          currentRallyShots: [],
          // Reset to framework state
          frameworkState: 'ff_mode',
          activeRallyIndex: 0,
          activeShotIndex: 1,
          shotQuestionStep: 1,
          step2Complete: false,
        })
      },
      
      // Get current rally being reviewed
      getCurrentRally: () => {
        const { rallies, currentReviewRallyIndex } = get()
        return rallies[currentReviewRallyIndex] || null
      },
      
      getTimelineMarkers: () => {
        const { shots, rallies, currentRallyShots } = get()
        const markers: TimelineMarker[] = []
        
        // Add shot markers from completed rallies
        shots.forEach(shot => {
          markers.push({
            id: shot.id,
            time: shot.time,
            type: 'shot',
            rallyId: shot.rallyId,
          })
        })
        
        // Add current rally shots
        currentRallyShots.forEach(shot => {
          markers.push({
            id: shot.id,
            time: shot.time,
            type: 'shot',
          })
        })
        
        // Add rally end markers (use last shot time of each rally)
        rallies.forEach(rally => {
          const lastContact = rally.shots[rally.shots.length - 1]
          if (lastContact) {
            markers.push({
              id: `rally-end-${rally.id}`,
              time: lastContact.time,
              type: rally.isScoring ? 'rally-end-score' : 'rally-end-no-score',
              rallyId: rally.id,
            })
          }
        })
        
        return markers.sort((a, b) => a.time - b.time)
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'tt-tagger-session',
      // Only persist certain fields - NOT videoUrl (blob URLs can't be persisted)
      partialize: (state) => ({
        matchId: state.matchId,
        player1Name: state.player1Name,
        player2Name: state.player2Name,
        firstServerId: state.firstServerId,
        // videoUrl is NOT persisted - must be re-set each session
        
        // v0.8.0 - Match details
        matchDate: state.matchDate,
        player1StartSets: state.player1StartSets,
        player2StartSets: state.player2StartSets,
        player1StartPoints: state.player1StartPoints,
        player2StartPoints: state.player2StartPoints,
        firstServeTimestamp: state.firstServeTimestamp,
        videoCoverage: state.videoCoverage,
        taggingMode: state.taggingMode,
        matchFormat: state.matchFormat,
        tournament: state.tournament,
        
        // v0.8.0 - Match completion
        matchResult: state.matchResult,
        finalSetScore: state.finalSetScore,
        finalPointsScore: state.finalPointsScore,
        
        // Set state
        currentSetIndex: state.currentSetIndex,
        sets: state.sets,
        player1Score: state.player1Score,
        player2Score: state.player2Score,
        currentServerId: state.currentServerId,
        
        // Player profiles
        players: state.players,
        
        // Tagging data
        shots: state.shots,
        rallies: state.rallies,
        currentRallyShots: state.currentRallyShots,
        
        // Workflow
        taggingPhase: state.taggingPhase,
        step1Complete: state.step1Complete,
        step2Complete: state.step2Complete,
        activeRallyIndex: state.activeRallyIndex,
        activeShotIndex: state.activeShotIndex,
        shotQuestionStep: state.shotQuestionStep,
        currentReviewRallyIndex: state.currentReviewRallyIndex,
        // Rally Checkpoint Flow
        frameworkState: state.frameworkState,
        currentSetNumber: state.currentSetNumber,
        
        // Part 2 preview settings
        loopSpeed: state.loopSpeed,
        previewBufferSeconds: state.previewBufferSeconds,
      }),
    }
  )
)







