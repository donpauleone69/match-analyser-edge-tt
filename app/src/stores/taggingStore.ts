import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Contact, Rally, TimelineMarker } from '../types'
import type {
  PlayerId,
  TaggingMode,
  VideoCoverage,
  MatchResult,
  PointEndType,
  LuckType,
  Game,
} from '../rules/types'
import {
  calculateServer as calculateServerRule,
} from '../rules/calculateServer'

// =============================================================================
// TYPES
// =============================================================================

// Tagging phases
export type TaggingPhase = 'setup' | 'part1' | 'part2'

interface TaggingState {
  // Match setup info
  matchId: string | null
  player1Name: string
  player2Name: string
  firstServerId: PlayerId
  videoUrl: string | null // Object URL for the video file
  
  // v0.8.0 - Match details
  matchDate: string | null
  videoStartSetScore: string
  videoStartPointsScore: string
  firstServeTimestamp: number | null
  videoCoverage: VideoCoverage
  taggingMode: TaggingMode
  
  // v0.8.0 - Match completion
  matchResult: MatchResult | null
  finalSetScore: string | null
  finalPointsScore: string | null
  
  // Video playback state (not persisted)
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackSpeed: number
  
  // Game state
  currentGameIndex: number
  games: Game[]
  player1Score: number
  player2Score: number
  currentServerId: PlayerId
  
  // Tagging data
  contacts: Contact[]
  rallies: Rally[]
  currentRallyContacts: Contact[] // Contacts in current open rally
  
  // Workflow state - v0.9.4 unified workflow
  taggingPhase: TaggingPhase // 'setup' | 'part1' | 'part2'
  step1Complete: boolean // Part 1: Match Framework complete
  step2Complete: boolean // Part 2: Rally Detail complete
  
  // Part 2 - Sequential rally/shot navigation
  activeRallyIndex: number // Current rally being tagged in Part 2
  activeShotIndex: number // Current shot within rally (1-based)
  shotQuestionStep: number // Current question step (1-4 for Essential)
  
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
  lastPrunedContacts: Contact[]
  
  // Actions - Match Setup
  initMatch: (p1: string, p2: string, firstServer: PlayerId, videoUrl: string | null) => void
  setVideoUrl: (url: string | null) => void
  setMatchDetails: (details: {
    matchDate: string
    videoStartSetScore: string
    videoStartPointsScore: string
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
    videoStartSetScore: string
    videoStartPointsScore: string
    firstServeTimestamp: number
  }) => void
  
  // Actions - Part 2 Sequential Navigation
  advanceToNextShot: () => void
  advanceToNextRally: () => void
  setShotQuestionStep: (step: number) => void
  
  // Actions - Video
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  
  // Actions - Tagging (Part 1)
  addContact: () => void
  endRallyScore: () => void
  endRallyNoScore: () => void
  endRallyWithoutWinner: () => void // Ends rally, winner set in review
  selectWinner: (winnerId: PlayerId) => void
  undoLastContact: () => void
  markEndOfSet: () => void // Mark current time as end of set
  
  // Actions - Review (Part 1)
  updateContactTime: (contactId: string, newTime: number) => void
  updateRallyServer: (rallyId: string, serverId: PlayerId) => void
  updateRallyWinner: (rallyId: string, winnerId: PlayerId) => void
  updateEndOfPointTime: (rallyId: string, time: number) => void
  deleteContact: (rallyId: string, contactId: string) => void
  deleteRally: (rallyId: string) => void
  addContactToRally: (rallyId: string, time: number) => void
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
  autoPruneContacts: (rallyId: string, errorShotIndex: number) => void
  undoLastPrune: (rallyId: string) => void
  
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
  videoStartSetScore: '0-0',
  videoStartPointsScore: '0-0',
  firstServeTimestamp: null as number | null,
  videoCoverage: 'full' as VideoCoverage,
  taggingMode: 'essential' as TaggingMode,
  
  // v0.8.0 - Match completion
  matchResult: null as MatchResult | null,
  finalSetScore: null as string | null,
  finalPointsScore: null as string | null,
  
  // Video state
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: 1,
  
  // Game state
  currentGameIndex: 0,
  games: [] as Game[],
  player1Score: 0,
  player2Score: 0,
  currentServerId: 'player1' as PlayerId,
  
  // Tagging data
  contacts: [] as Contact[],
  rallies: [] as Rally[],
  currentRallyContacts: [] as Contact[],
  
  // Workflow - v0.9.4
  taggingPhase: 'setup' as TaggingPhase,
  step1Complete: false,
  step2Complete: false,
  activeRallyIndex: 0,
  activeShotIndex: 1,
  shotQuestionStep: 1,
  currentReviewRallyIndex: 0,
  
  // UI
  showWinnerDialog: false,
  showMatchDetailsModal: false,
  showMatchCompletionModal: false,
  showEndOfPointModal: false,
  pendingEndOfPoint: null as { winnerId: PlayerId; needsForcedUnforced: boolean } | null,
  
  // Undo stack
  lastPrunedContacts: [] as Contact[],
}

export const useTaggingStore = create<TaggingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Match Setup
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
          videoStartSetScore: details.videoStartSetScore,
          videoStartPointsScore: details.videoStartPointsScore,
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
        set({
          matchId: generateId(),
          player1Name: data.player1Name,
          player2Name: data.player2Name,
          matchDate: data.matchDate,
          firstServerId: data.firstServerId,
          currentServerId: data.firstServerId,
          taggingMode: data.taggingMode,
          videoStartSetScore: data.videoStartSetScore,
          videoStartPointsScore: data.videoStartPointsScore,
          firstServeTimestamp: data.firstServeTimestamp,
          taggingPhase: 'part1',
          showMatchDetailsModal: false,
        })
      },
      
      // Part 2 Sequential Navigation
      advanceToNextShot: () => {
        const { activeRallyIndex, activeShotIndex, rallies } = get()
        const currentRally = rallies[activeRallyIndex]
        if (!currentRally) return
        
        const totalShots = currentRally.contacts.length
        
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
      
      // Video controls
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
      
      // Tagging
      addContact: () => {
        const { currentTime, currentRallyContacts } = get()
        const newContact: Contact = {
          id: generateId(),
          rallyId: '', // Will be assigned when rally ends
          time: currentTime,
          shotIndex: currentRallyContacts.length + 1,
        }
        set({ currentRallyContacts: [...currentRallyContacts, newContact] })
      },
      
      endRallyScore: () => {
        const { currentRallyContacts } = get()
        if (currentRallyContacts.length === 0) return
        set({ showWinnerDialog: true })
      },
      
      endRallyNoScore: () => {
        const { currentRallyContacts, rallies, player1Score, player2Score, currentServerId } = get()
        
        if (currentRallyContacts.length === 0) return
        
        const rallyId = generateId()
        const newRally: Rally = {
          id: rallyId,
          gameId: 'game1',
          rallyIndex: rallies.length + 1,
          isScoring: false,
          player1ScoreAfter: player1Score,
          player2ScoreAfter: player2Score,
          serverId: currentServerId,
          receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          contacts: currentRallyContacts.map(c => ({ ...c, rallyId })),
        }
        
        set({
          rallies: [...rallies, newRally],
          contacts: [...get().contacts, ...newRally.contacts],
          currentRallyContacts: [],
        })
      },

      endRallyWithoutWinner: () => {
        // Ends rally as scoring but without winner assigned yet
        // Winner will be set in Step 1 Review
        const { currentRallyContacts, rallies, player1Score, player2Score, currentServerId, currentTime } = get()
        
        if (currentRallyContacts.length === 0) return
        
        const rallyId = generateId()
        const newRally: Rally = {
          id: rallyId,
          gameId: 'game1',
          rallyIndex: rallies.length + 1,
          isScoring: true,
          winnerId: undefined, // To be set in review
          endOfPointTime: currentTime, // Use current time as placeholder
          player1ScoreAfter: player1Score, // Score not updated until winner is set
          player2ScoreAfter: player2Score,
          serverId: currentServerId,
          receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          contacts: currentRallyContacts.map(c => ({ ...c, rallyId })),
        }
        
        set({
          rallies: [...rallies, newRally],
          contacts: [...get().contacts, ...newRally.contacts],
          currentRallyContacts: [],
        })
      },
      
      selectWinner: (winnerId) => {
        const { currentRallyContacts, rallies, player1Score, player2Score, currentServerId, firstServerId } = get()
        
        if (currentRallyContacts.length === 0) {
          set({ showWinnerDialog: false })
          return
        }
        
        const rallyId = generateId()
        const newP1Score = winnerId === 'player1' ? player1Score + 1 : player1Score
        const newP2Score = winnerId === 'player2' ? player2Score + 1 : player2Score
        
        // Set winner time to the last contact's time
        const lastContact = currentRallyContacts[currentRallyContacts.length - 1]
        const endOfPointTime = lastContact ? lastContact.time : 0
        
        const newRally: Rally = {
          id: rallyId,
          gameId: 'game1',
          rallyIndex: rallies.length + 1,
          isScoring: true,
          winnerId,
          endOfPointTime,
          player1ScoreAfter: newP1Score,
          player2ScoreAfter: newP2Score,
          serverId: currentServerId,
          receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          contacts: currentRallyContacts.map(c => ({ ...c, rallyId })),
        }
        
        // Calculate next server
        const nextServer = calculateServer(newP1Score, newP2Score, firstServerId)
        
        set({
          rallies: [...rallies, newRally],
          contacts: [...get().contacts, ...newRally.contacts],
          currentRallyContacts: [],
          player1Score: newP1Score,
          player2Score: newP2Score,
          currentServerId: nextServer,
          showWinnerDialog: false,
        })
      },
      
      undoLastContact: () => {
        const { currentRallyContacts } = get()
        if (currentRallyContacts.length > 0) {
          set({ currentRallyContacts: currentRallyContacts.slice(0, -1) })
        }
      },
      
      // Review actions
      updateContactTime: (contactId, newTime) => {
        const { rallies, contacts } = get()
        
        // Update in contacts array
        const updatedContacts = contacts.map(c => 
          c.id === contactId ? { ...c, time: newTime } : c
        )
        
        // Update in rallies
        const updatedRallies = rallies.map(rally => ({
          ...rally,
          contacts: rally.contacts.map(c => 
            c.id === contactId ? { ...c, time: newTime } : c
          ),
        }))
        
        set({ contacts: updatedContacts, rallies: updatedRallies })
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
      
      deleteContact: (rallyId, contactId) => {
        const { rallies, contacts } = get()
        
        // Remove from contacts array
        const updatedContacts = contacts.filter(c => c.id !== contactId)
        
        // Remove from rally and re-index
        const updatedRallies = rallies.map(rally => {
          if (rally.id !== rallyId) return rally
          
          const filteredContacts = rally.contacts.filter(c => c.id !== contactId)
          // Re-index shot numbers
          const reindexedContacts = filteredContacts.map((c, idx) => ({
            ...c,
            shotIndex: idx + 1
          }))
          
          return { ...rally, contacts: reindexedContacts }
        })
        
        set({ contacts: updatedContacts, rallies: updatedRallies })
      },

      deleteRally: (rallyId) => {
        const { rallies, contacts, firstServerId } = get()
        
        // Remove rally
        const remainingRallies = rallies.filter(r => r.id !== rallyId)
        
        // Remove contacts belonging to this rally
        const remainingContacts = contacts.filter(c => c.rallyId !== rallyId)
        
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
          contacts: remainingContacts,
          player1Score: p1Score,
          player2Score: p2Score,
        })
      },
      
      addContactToRally: (rallyId, time) => {
        const { rallies, contacts } = get()
        
        const rally = rallies.find(r => r.id === rallyId)
        if (!rally) return
        
        const newContact: Contact = {
          id: Math.random().toString(36).substr(2, 9),
          rallyId,
          time,
          shotIndex: rally.contacts.length + 1,
        }
        
        // Add to contacts array
        const updatedContacts = [...contacts, newContact]
        
        // Add to rally and sort by time, then re-index
        const updatedRallies = rallies.map(r => {
          if (r.id !== rallyId) return r
          
          const newContacts = [...r.contacts, newContact]
            .sort((a, b) => a.time - b.time)
            .map((c, idx) => ({ ...c, shotIndex: idx + 1 }))
          
          return { ...r, contacts: newContacts }
        })
        
        set({ contacts: updatedContacts, rallies: updatedRallies })
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
        const { rallies, firstServerId, contacts } = get()
        
        // Find where to insert based on time
        // Look at first contact time of each rally to determine position
        let insertIndex = rallies.length
        for (let i = 0; i < rallies.length; i++) {
          const rallyFirstContactTime = rallies[i].contacts[0]?.time ?? Infinity
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
        
        // Create new rally with a single contact at the given time
        const rallyId = generateId()
        const contactId = generateId()
        const newContact: Contact = {
          id: contactId,
          rallyId,
          time,
          shotIndex: 1,
        }
        
        const newRally: Rally = {
          id: rallyId,
          gameId: 'game1',
          rallyIndex: insertIndex + 1,
          isScoring: true,
          winnerId: undefined, // Needs to be set
          endOfPointTime: undefined, // Needs to be set
          player1ScoreAfter: p1Score,
          player2ScoreAfter: p2Score,
          serverId,
          receiverId: serverId === 'player1' ? 'player2' : 'player1',
          hasVideoData: true,
          contacts: [newContact],
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
          contacts: [...contacts, newContact],
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
        const { currentRallyContacts } = get()
        // Don't allow completion if there's an open rally
        if (currentRallyContacts.length > 0) return
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
      autoPruneContacts: (rallyId, errorShotIndex) => {
        const { rallies, contacts } = get()
        
        const rally = rallies.find(r => r.id === rallyId)
        if (!rally) return
        
        // Find contacts to prune (shot index > error shot index)
        const contactsToPrune = rally.contacts.filter(c => c.shotIndex > errorShotIndex)
        if (contactsToPrune.length === 0) return
        
        const contactIdsToRemove = contactsToPrune.map(c => c.id)
        
        // Store pruned contacts for undo
        const prunedContacts = contacts.filter(c => contactIdsToRemove.includes(c.id))
        
        // Remove from contacts array
        const updatedContacts = contacts.filter(c => !contactIdsToRemove.includes(c.id))
        
        // Remove from rally
        const updatedRallies = rallies.map(r => {
          if (r.id !== rallyId) return r
          return {
            ...r,
            contacts: r.contacts.filter(c => !contactIdsToRemove.includes(c.id)),
          }
        })
        
        set({
          contacts: updatedContacts,
          rallies: updatedRallies,
          lastPrunedContacts: prunedContacts,
        })
      },
      
      undoLastPrune: (rallyId) => {
        const { rallies, contacts, lastPrunedContacts } = get()
        
        if (lastPrunedContacts.length === 0) return
        
        // Restore contacts
        const restoredContacts = [...contacts, ...lastPrunedContacts]
        
        // Restore to rally and re-sort by time
        const updatedRallies = rallies.map(r => {
          if (r.id !== rallyId) return r
          const allContacts = [...r.contacts, ...lastPrunedContacts]
            .sort((a, b) => a.time - b.time)
            .map((c, idx) => ({ ...c, shotIndex: idx + 1 }))
          return { ...r, contacts: allContacts }
        })
        
        set({
          contacts: restoredContacts,
          rallies: updatedRallies,
          lastPrunedContacts: [],
        })
      },
      
      // Mark end of set
      markEndOfSet: () => {
        const { currentTime, games, currentGameIndex, player1Score, player2Score } = get()
        
        // Update current game with end timestamp
        const updatedGames = [...games]
        if (updatedGames[currentGameIndex]) {
          updatedGames[currentGameIndex] = {
            ...updatedGames[currentGameIndex],
            endOfSetTimestamp: currentTime,
            player1FinalScore: player1Score,
            player2FinalScore: player2Score,
          }
        } else {
          // Create new game record
          updatedGames.push({
            id: generateId(),
            matchId: get().matchId || '',
            gameNumber: currentGameIndex + 1,
            player1FinalScore: player1Score,
            player2FinalScore: player2Score,
            hasVideo: true,
            endOfSetTimestamp: currentTime,
          })
        }
        
        // Start new game
        set({
          games: updatedGames,
          currentGameIndex: currentGameIndex + 1,
          player1Score: 0,
          player2Score: 0,
        })
      },
      
      // Get current rally being reviewed
      getCurrentRally: () => {
        const { rallies, currentReviewRallyIndex } = get()
        return rallies[currentReviewRallyIndex] || null
      },
      
      getTimelineMarkers: () => {
        const { contacts, rallies, currentRallyContacts } = get()
        const markers: TimelineMarker[] = []
        
        // Add contact markers from completed rallies
        contacts.forEach(contact => {
          markers.push({
            id: contact.id,
            time: contact.time,
            type: 'contact',
            rallyId: contact.rallyId,
          })
        })
        
        // Add current rally contacts
        currentRallyContacts.forEach(contact => {
          markers.push({
            id: contact.id,
            time: contact.time,
            type: 'contact',
          })
        })
        
        // Add rally end markers (use last contact time of each rally)
        rallies.forEach(rally => {
          const lastContact = rally.contacts[rally.contacts.length - 1]
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
        videoStartSetScore: state.videoStartSetScore,
        videoStartPointsScore: state.videoStartPointsScore,
        firstServeTimestamp: state.firstServeTimestamp,
        videoCoverage: state.videoCoverage,
        taggingMode: state.taggingMode,
        
        // v0.8.0 - Match completion
        matchResult: state.matchResult,
        finalSetScore: state.finalSetScore,
        finalPointsScore: state.finalPointsScore,
        
        // Game state
        currentGameIndex: state.currentGameIndex,
        games: state.games,
        player1Score: state.player1Score,
        player2Score: state.player2Score,
        currentServerId: state.currentServerId,
        
        // Tagging data
        contacts: state.contacts,
        rallies: state.rallies,
        currentRallyContacts: state.currentRallyContacts,
        
        // Workflow
        taggingPhase: state.taggingPhase,
        step1Complete: state.step1Complete,
        step2Complete: state.step2Complete,
        activeRallyIndex: state.activeRallyIndex,
        activeShotIndex: state.activeShotIndex,
        shotQuestionStep: state.shotQuestionStep,
        currentReviewRallyIndex: state.currentReviewRallyIndex,
      }),
    }
  )
)
