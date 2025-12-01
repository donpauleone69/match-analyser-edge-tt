import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Contact, Rally, TimelineMarker } from '../types'

interface TaggingState {
  // Match setup info
  matchId: string | null
  player1Name: string
  player2Name: string
  firstServerId: 'player1' | 'player2'
  videoUrl: string | null // Object URL for the video file
  
  // Video playback state (not persisted)
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackSpeed: number
  
  // Game state
  player1Score: number
  player2Score: number
  currentServerId: 'player1' | 'player2'
  
  // Tagging data
  contacts: Contact[]
  rallies: Rally[]
  currentRallyContacts: Contact[] // Contacts in current open rally
  
  // Workflow state
  step1Complete: boolean
  
  // UI state
  showWinnerDialog: boolean
  
  // Actions - Match Setup
  initMatch: (p1: string, p2: string, firstServer: 'player1' | 'player2', videoUrl: string | null) => void
  setVideoUrl: (url: string | null) => void
  
  // Actions - Video
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  
  // Actions - Tagging
  addContact: () => void
  endRallyScore: () => void
  endRallyNoScore: () => void
  endRallyWithoutWinner: () => void // Ends rally, winner set in review
  selectWinner: (winnerId: 'player1' | 'player2') => void
  undoLastContact: () => void
  
  // Actions - Review
  updateContactTime: (contactId: string, newTime: number) => void
  updateRallyServer: (rallyId: string, serverId: 'player1' | 'player2') => void
  updateRallyWinner: (rallyId: string, winnerId: 'player1' | 'player2') => void
  updateEndOfPointTime: (rallyId: string, time: number) => void
  deleteContact: (rallyId: string, contactId: string) => void
  deleteRally: (rallyId: string) => void
  addContactToRally: (rallyId: string, time: number) => void
  toggleRallyHighlight: (rallyId: string) => void
  insertRallyAtTime: (time: number) => string // Returns the new rally ID
  setFirstServerAndRecalculate: (firstServer: 'player1' | 'player2') => void
  recalculateServersFromRally: (rallyId: string) => void // After manual server change
  completeStep1: () => void
  
  // Helpers
  getTimelineMarkers: () => TimelineMarker[]
  reset: () => void
}

const generateId = () => Math.random().toString(36).substr(2, 9)

// Calculate server based on score (2 serves each, alternate at 10-10)
const calculateServer = (
  p1Score: number,
  p2Score: number,
  firstServer: 'player1' | 'player2'
): 'player1' | 'player2' => {
  const totalPoints = p1Score + p2Score
  
  // Deuce (10-10 or higher with both >= 10): alternate every serve
  if (p1Score >= 10 && p2Score >= 10) {
    return totalPoints % 2 === 0 ? firstServer : (firstServer === 'player1' ? 'player2' : 'player1')
  }
  
  // Normal: 2 serves each
  const serveBlock = Math.floor(totalPoints / 2)
  return serveBlock % 2 === 0 ? firstServer : (firstServer === 'player1' ? 'player2' : 'player1')
}

const initialState = {
  // Match setup
  matchId: null as string | null,
  player1Name: 'Player 1',
  player2Name: 'Player 2',
  firstServerId: 'player1' as const,
  videoUrl: null as string | null,
  
  // Video state
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: 1,
  
  // Game state
  player1Score: 0,
  player2Score: 0,
  currentServerId: 'player1' as const,
  
  // Tagging data
  contacts: [] as Contact[],
  rallies: [] as Rally[],
  currentRallyContacts: [] as Contact[],
  
  // Workflow
  step1Complete: false,
  
  // UI
  showWinnerDialog: false,
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
            receiverId: serverId === 'player1' ? 'player2' : 'player1',
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
        
        const updatedRallies = rallies.map((rally, index) => {
          // Calculate who should be serving based on score
          const serverId = calculateServer(p1Score, p2Score, firstServer)
          const receiverId = serverId === 'player1' ? 'player2' : 'player1'
          
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
          const serverId = serveBlocksSinceManual % 2 === 0 
            ? manualServer 
            : (manualServer === 'player1' ? 'player2' : 'player1')
          
          if (rally.isScoring && rally.winnerId) {
            if (rally.winnerId === 'player1') p1Score++
            else p2Score++
          }
          
          return {
            ...rally,
            serverId,
            receiverId: serverId === 'player1' ? 'player2' : 'player1',
          }
        })
        
        set({ rallies: updatedRallies })
      },
      
      completeStep1: () => {
        const { currentRallyContacts } = get()
        // Don't allow completion if there's an open rally
        if (currentRallyContacts.length > 0) return
        set({ step1Complete: true })
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
        player1Score: state.player1Score,
        player2Score: state.player2Score,
        currentServerId: state.currentServerId,
        contacts: state.contacts,
        rallies: state.rallies,
        currentRallyContacts: state.currentRallyContacts,
        step1Complete: state.step1Complete,
      }),
    }
  )
)
