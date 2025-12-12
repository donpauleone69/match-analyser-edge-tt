/**
 * Phase1TimestampComposer — V2 timestamp capture with 1x3 button layout
 * 
 * Layout: Fault | Win | Serve/Shot
 * 
 * Error detection:
 * - Fault triggers In-Net or Long placement choice
 * - In-Net and Long mark rally as error
 * - Win does NOT mark as error
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/helpers/utils'
import { Phase1ControlsBlock, SetupControlsBlock, SetEndWarningBlock, CompletionModal, RallyCard, ShotListItem, VideoControlsBar, type RallyState, type EndCondition, type SetupData } from '../blocks'
import { PhaseLayoutTemplate } from '../layouts'
import { UserInputSection, VideoPlayerSection, StatusBarSection, RallyListSection } from '../sections'
import { type VideoPlayerHandle, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { SpeedSettingsModal } from '@/ui-mine/SpeedSettingsModal'
import { Button } from '@/ui-mine'
import { calculateServer, calculateShotPlayer, calculatePreviousServers } from '@/rules'
import { deriveRally_winner_id, getOpponentId } from '@/rules/derive/rally/deriveRally_winner_id'
import { deriveSetEndConditions } from '@/rules/derive/set/deriveSetEndConditions'
import { validateSetScore } from '@/rules/validate/validateSetScore'
import { mapPhase1RallyToDBRally, mapPhase1ShotToDBShot } from './dataMapping'
import { rallyDb, shotDb, setDb } from '@/data'

interface ShotHistoryItem {
  type: 'shot' | 'rally-end'
  timestamp: number
  rallyId: string | null  // null for shots in current rally
  shotId?: string
  rallyEndCondition?: EndCondition
}

export interface PlayerContext {
  firstServerId: 'player1' | 'player2'
  startingScore: { player1: number; player2: number }
  player1Name: string
  player2Name: string
}

export interface Phase1TimestampComposerProps {
  playerContext?: PlayerContext | null
  setId?: string | null  // For DB saving
  player1Id?: string | null  // For DB saving
  player2Id?: string | null  // For DB saving
  className?: string
}

export interface Phase1Shot {
  id: string
  timestamp: number
  shotIndex: number
  isServe: boolean
}

export interface Phase1Rally {
  id: string
  shots: Phase1Shot[]
  endCondition: EndCondition
  endTimestamp: number
  isError: boolean  // true if ended with 'innet' or 'long'
  errorPlacement?: 'innet' | 'long'  // stores which type of fault
  serverId: 'player1' | 'player2'  // who served this rally
  winnerId: 'player1' | 'player2'  // who won this rally
  // Player names for UI display
  player1Name: string
  player2Name: string
  serverName: string
  winnerName: string
}

export function Phase1TimestampComposer({ playerContext, setId, player1Id, player2Id, className }: Phase1TimestampComposerProps) {
  const currentTime = useVideoPlaybackStore(state => state.currentTime)
  const videoUrl = useVideoPlaybackStore(state => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore(state => state.setVideoUrl)
  const setSpeedMode = useVideoPlaybackStore(state => state.setSpeedMode)
  const currentSpeedMode = useVideoPlaybackStore(state => state.currentSpeedMode)
  const speedPresets = useVideoPlaybackStore(state => state.speedPresets)
  const isPlaying = useVideoPlaybackStore(state => state.isPlaying)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  
  // Speed settings modal state
  const [speedSettingsOpen, setSpeedSettingsOpen] = useState(false)
  
  // Rally state
  const [rallyState, setRallyState] = useState<RallyState>('before-serve')
  const [currentShots, setCurrentShots] = useState<Phase1Shot[]>([])
  const [completedRallies, setCompletedRallies] = useState<Phase1Rally[]>([])
  
  // Shot history for navigation and undo
  const [shotHistory, setShotHistory] = useState<ShotHistoryItem[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1) // -1 = playing live
  const [isNavigating, setIsNavigating] = useState(false) // true when paused on a historical tag
  const [activeTagIndex, setActiveTagIndex] = useState<number>(-1) // Track active tag for visual feedback (-1 = none active)
  
  // NEW: Constrained playback for shot review during navigation
  const [constrainedPlayback, setConstrainedPlayback] = useState<{ enabled: boolean; startTime: number; endTime: number; loopOnEnd: boolean }>({
    enabled: false,
    startTime: 0,
    endTime: 0,
    loopOnEnd: true,
  })
  
  // Score tracking for server calculation
  const [currentScore, setCurrentScore] = useState({
    player1: playerContext?.startingScore.player1 || 0,
    player2: playerContext?.startingScore.player2 || 0,
  })
  
  // Saving indicator (state tracked but not displayed in compact status bar)
  const [_isSaving, setIsSaving] = useState(false)
  
  // NEW: Setup flow state
  const [setupComplete, setSetupComplete] = useState(false)
  const [setupStartingScore, setSetupStartingScore] = useState({ player1: 0, player2: 0 })
  const [setupNextServer, setSetupNextServer] = useState<'player1' | 'player2'>('player1')
  const [setEndDetected, setSetEndDetected] = useState(false)
  const [setEndScore, setSetEndScore] = useState<{ player1: number; player2: number } | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  
  // NEW: Initialize - Check for existing rallies
  useEffect(() => {
    const checkExistingRallies = async () => {
      if (!setId || !player1Id || !player2Id) return
      
      try {
        const existingRallies = await rallyDb.getBySetId(setId)
        const taggedRallies = existingRallies.filter(r => !r.is_stub_rally)
        
        if (taggedRallies.length > 0) {
          // Skip setup - resume existing session
          console.log('[Phase1] Resuming existing session with', taggedRallies.length, 'rallies')
          setSetupComplete(true)
          
          // Load setup data from set record if exists
          const setRecord = await setDb.getById(setId)
          if (setRecord && setRecord.setup_starting_score_p1 !== null && setRecord.setup_starting_score_p2 !== null) {
            setSetupStartingScore({
              player1: setRecord.setup_starting_score_p1,
              player2: setRecord.setup_starting_score_p2
            })
            
            // Load next server from setup (convert DB ID to player1/player2)
            if (setRecord.setup_next_server_id) {
              const nextServer = setRecord.setup_next_server_id === player1Id ? 'player1' : 'player2'
              setSetupNextServer(nextServer)
            }
            
            // Calculate current score from last rally
            const lastRally = taggedRallies.sort((a, b) => b.rally_index - a.rally_index)[0]
            if (lastRally && lastRally.player1_score_after !== null && lastRally.player2_score_after !== null) {
              setCurrentScore({
                player1: lastRally.player1_score_after,
                player2: lastRally.player2_score_after
              })
            }
          }
          
          // Load existing rallies into completedRallies state (would need mapping - skip for now)
          // User can continue from current state
        } else {
          // Show setup screen
          console.log('[Phase1] No existing rallies - showing setup screen')
          setSetupComplete(false)
        }
      } catch (error) {
        console.error('[Phase1] Error checking existing rallies:', error)
        // Default to showing setup
        setSetupComplete(false)
      }
    }
    
    checkExistingRallies()
  }, [setId, player1Id, player2Id])
  
  // NEW: Handle setup completion
  const handleSetupComplete = async (setup: SetupData) => {
    if (!setId || !player1Id || !player2Id) {
      alert('Cannot complete setup - missing database context')
      return
    }
    
    console.log('[Phase1] Setup completed:', setup)
    
    try {
      // 1. Validate score (already done in SetupControlsBlock, but double-check)
      const validation = validateSetScore(setup.p1Score, setup.p2Score)
      if (!validation.valid) {
        alert(validation.error)
        return
      }
      
      // 2. Calculate previous servers
      const totalPoints = setup.p1Score + setup.p2Score
      if (totalPoints > 0) {
        const previousServers = calculatePreviousServers(
          totalPoints,
          setup.nextServerId,
          player1Id,
          player2Id
        )
        
        console.log('[Phase1] Creating', totalPoints, 'stub rallies')
        
        // 3. Create stub rallies
        for (let i = 0; i < previousServers.length; i++) {
          const rallyIndex = i + 1
          const serverId = previousServers[i]
          const receiverId = serverId === player1Id ? player2Id : player1Id
          
          await rallyDb.create({
            set_id: setId,
            rally_index: rallyIndex,
            video_id: null,
            server_id: serverId,
            receiver_id: receiverId,
            is_scoring: true,
            winner_id: null,  // Unknown
            player1_score_before: 0,  // Don't track for stub rallies
            player2_score_before: 0,
            player1_score_after: 0,
            player2_score_after: 0,
            timestamp_start: null,  // No video for stub rallies
            timestamp_end: null,
            end_of_point_time: null,
            point_end_type: null,
            has_video_data: false,
            is_highlight: false,
            framework_confirmed: false,  // Not confirmed
            detail_complete: false,
            server_corrected: false,
            score_corrected: false,
            correction_notes: null,
            is_stub_rally: true,  // Mark as stub
          })
        }
        
        console.log('[Phase1] Created', previousServers.length, 'stub rallies')
      }
      
      // 4. Save setup to set record
      await setDb.update(setId, {
        setup_starting_score_p1: setup.p1Score,
        setup_starting_score_p2: setup.p2Score,
        setup_next_server_id: setup.nextServerId === 'player1' ? player1Id : player2Id,
        setup_completed_at: new Date().toISOString(),
      })
      
      console.log('[Phase1] Setup saved to database')
      
      // 5. Initialize score for tagging
      setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
      setSetupStartingScore({ player1: setup.p1Score, player2: setup.p2Score })
      setSetupNextServer(setup.nextServerId)
      setSetupComplete(true)
      
      console.log('[Phase1] Ready to start tagging from score', setup.p1Score, '-', setup.p2Score)
    } catch (error) {
      console.error('[Phase1] Error completing setup:', error)
      alert('Failed to complete setup. Check console for details.')
    }
  }
  
  // Refs for auto-scroll
  const shotLogRef = useRef<HTMLDivElement>(null)
  const rallyRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const shotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  const setRallyRef = (rallyId: string, element: HTMLDivElement | null) => {
    if (element) {
      rallyRefs.current.set(rallyId, element)
    } else {
      rallyRefs.current.delete(rallyId)
    }
  }
  
  const setShotRef = (shotId: string, element: HTMLDivElement | null) => {
    if (element) {
      shotRefs.current.set(shotId, element)
    } else {
      shotRefs.current.delete(shotId)
    }
  }
  
  // Helper to get player name
  const getPlayerName = (playerId: 'player1' | 'player2') => {
    if (!playerContext) return playerId === 'player1' ? 'Player 1' : 'Player 2'
    return playerId === 'player1' ? playerContext.player1Name : playerContext.player2Name
  }
  
  // Helper to check if a tag already exists at or after current time (duplicate prevention)
  const hasTagAtOrAfter = (timestamp: number): boolean => {
    const tolerance = 0.01 // 0.01 seconds (exact match)
    return shotHistory.some(item => item.timestamp >= timestamp - tolerance)
  }
  
  // Helper to get player for active tag (for visual feedback)
  const getActiveTagPlayer = (): 'player1' | 'player2' | null => {
    if (activeTagIndex < 0 || activeTagIndex >= shotHistory.length) return null
    
    const tag = shotHistory[activeTagIndex]
    
    if (tag.type === 'rally-end') {
      // For rally-end, get the last shot's player (the one who hit the winning/error shot)
      const rally = completedRallies.find(r => r.id === tag.rallyId)
      if (!rally) return null
      const lastShotIndex = rally.shots.length
      return calculateShotPlayer(rally.serverId, lastShotIndex) as 'player1' | 'player2'
    } else {
      // For shot tag, calculate which player hit it
      const serverResult = playerContext 
        ? calculateServer({
            firstServerId: setupNextServer,
            player1Score: currentScore.player1,
            player2Score: currentScore.player2,
          })
        : { serverId: 'player1' as const }
      
      // Find shot index by counting shots before this tag
      let shotCount = 0
      for (let i = 0; i <= activeTagIndex; i++) {
        if (shotHistory[i].type === 'shot') shotCount++
        if (i === activeTagIndex) break
      }
      
      return calculateShotPlayer(serverResult.serverId, shotCount) as 'player1' | 'player2'
    }
  }
  
  // Handle serve/shot button press
  const handleServeShot = () => {
    // If navigating, disable constrained playback and resume live tagging
    if (isNavigating) {
      setIsNavigating(false)
      setCurrentHistoryIndex(-1)
      setConstrainedPlayback({
        enabled: false,
        startTime: 0,
        endTime: 0,
        loopOnEnd: true,
      })
    }
    
    // Tag shot at current time
    const shotIndex = currentShots.length + 1  // 1-based: serve = 1, receive = 2, etc.
    const isServe = shotIndex === 1
    
    const newShot: Phase1Shot = {
      id: `shot-${Date.now()}-${Math.random()}`,
      timestamp: currentTime,
      shotIndex,
      isServe,
    }
    
    setCurrentShots(prev => [...prev, newShot])
    
    // Add to history
    setShotHistory(prev => [...prev, {
      type: 'shot',
      timestamp: currentTime,
      rallyId: null, // current rally not completed yet
      shotId: newShot.id,
    }])
    
    // Set active tag to the new shot
    setActiveTagIndex(shotHistory.length)
    
    // Set to tag speed
    setSpeedMode('tag')
    
    // After first shot (serve), activate end condition buttons
    if (isServe) {
      setRallyState('after-serve')
    }
  }
  
  // Unified rally completion handler
  const completeRally = async (endCondition: EndCondition) => {
    // Calculate current server using inference
    const serverResult = playerContext 
      ? calculateServer({
          firstServerId: setupNextServer,
          player1Score: currentScore.player1,
          player2Score: currentScore.player2,
        })
      : { serverId: 'player1' as const, receiverId: 'player2' as const }
    
    // Determine winner based on end condition and who hit last shot
    const lastShotIndex = currentShots.length
    const lastShotPlayer = calculateShotPlayer(serverResult.serverId, lastShotIndex) as 'player1' | 'player2'
    
    // Derive rally winner using rules
    // const isError = endCondition === 'innet' || endCondition === 'long'
    const opponentId = player1Id && player2Id 
      ? getOpponentId(lastShotPlayer, 'player1' as 'player1' | 'player2', 'player2' as 'player1' | 'player2')
      : lastShotPlayer
    
    // Determine shot_result based on end condition for winner derivation
    const shotResult = 
      endCondition === 'innet' ? 'in_net' :
      endCondition === 'long' ? 'missed_long' :
      endCondition === 'forcederror' ? 'missed_long' :  // forced errors default to missed_long for winner derivation
      endCondition === 'let' ? 'in_play' :  // let rallies have in_play result
      'in_play' // 'winner' end condition - shot stayed in play
    
    const winnerId = deriveRally_winner_id(
      {
        player_id: lastShotPlayer as 'player1' | 'player2',
        shot_result: shotResult as any, // Pass correct shot_result for error detection
      },
      opponentId as 'player1' | 'player2'
    ) || lastShotPlayer
    
    const rally: Phase1Rally = {
      id: `rally-${Date.now()}-${Math.random()}`,
      shots: [...currentShots],
      endCondition,
      endTimestamp: currentTime,
      isError: endCondition === 'innet' || endCondition === 'long' || endCondition === 'forcederror',
      errorPlacement: endCondition === 'innet' ? 'innet' : endCondition === 'long' ? 'long' : endCondition === 'forcederror' ? 'long' : undefined,
      serverId: serverResult.serverId as 'player1' | 'player2',
      winnerId: winnerId as 'player1' | 'player2',
      // Player names for UI
      player1Name: playerContext?.player1Name || 'Player 1',
      player2Name: playerContext?.player2Name || 'Player 2',
      serverName: getPlayerName(serverResult.serverId as 'player1' | 'player2'),
      winnerName: getPlayerName(winnerId as 'player1' | 'player2'),
    }
    
    setCompletedRallies(prev => [...prev, rally])
    
    // Add to history
    setShotHistory(prev => [...prev, {
      type: 'rally-end',
      timestamp: currentTime,
      rallyId: rally.id,
      rallyEndCondition: endCondition,
    }])
    
    // Set active tag to the rally-end
    setActiveTagIndex(prevIndex => prevIndex + 1)
    
    // NEW: Calculate scores for database
    const newScore = endCondition === 'let' 
      ? currentScore
      : {
          player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
          player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
        }
    
      // Save to database immediately (if context available)
    if (setId && player1Id && player2Id) {
      setIsSaving(true)
      try {
        // Get existing rallies for this set to determine correct rally_index
        const existingRallies = await rallyDb.getBySetId(setId)
        const maxRallyIndex = existingRallies.reduce((max, r) => Math.max(max, r.rally_index || 0), 0)
        const rallyIndex = maxRallyIndex + 1
        
        // NEW: Get score BEFORE this rally (from previous rally or setup)
        const taggedRallies = existingRallies.filter(r => !r.is_stub_rally)
        const previousRally = taggedRallies.sort((a, b) => b.rally_index - a.rally_index)[0]
        
        const scoreBefore = previousRally 
          ? { 
              player1: previousRally.player1_score_after ?? 0, 
              player2: previousRally.player2_score_after ?? 0 
            }
          : setupStartingScore  // First tagged rally uses setup scores
        
        console.log(`[Phase1] === SAVING RALLY ${rallyIndex} (max existing: ${maxRallyIndex}) ===`)
        console.log(`[Phase1] Score before:`, scoreBefore)
        console.log(`[Phase1] Score after:`, newScore)
        console.log(`[Phase1] Rally data:`, {
          serverId: rally.serverId,
          winnerId: rally.winnerId,
          endCondition: rally.endCondition,
          isError: rally.isError,
          shotCount: rally.shots.length,
        })
        
        // Calculate rally timestamps
        const rallyTimestampStart = rally.shots[0].timestamp
        const rallyTimestampEnd = rally.endTimestamp
        
        // Map and save rally WITH SCORES AND TIMESTAMPS
        const dbRally = mapPhase1RallyToDBRally(rally, setId, rallyIndex, player1Id, player2Id)
        dbRally.player1_score_before = scoreBefore.player1
        dbRally.player2_score_before = scoreBefore.player2
        dbRally.player1_score_after = newScore.player1
        dbRally.player2_score_after = newScore.player2
        dbRally.timestamp_start = rallyTimestampStart
        dbRally.timestamp_end = rallyTimestampEnd
        dbRally.end_of_point_time = rallyTimestampEnd  // Keep existing field populated
        
        console.log(`[Phase1] DB Rally to save:`, {
          server_id: dbRally.server_id,
          receiver_id: dbRally.receiver_id,
          winner_id: dbRally.winner_id,
          is_scoring: dbRally.is_scoring,
          point_end_type: dbRally.point_end_type,
          timestamp_start: rallyTimestampStart,
          timestamp_end: rallyTimestampEnd,
        })
        const savedRally = await rallyDb.create(dbRally)
        console.log(`[Phase1] ✓ Rally saved with ID: ${savedRally.id}`)
        
        // Map and save all shots for this rally
        console.log(`[Phase1] Saving ${rally.shots.length} shots...`)
        for (let i = 0; i < rally.shots.length; i++) {
          const shot = rally.shots[i]
          const nextShot = rally.shots[i + 1] // undefined for last shot
          
          const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
          const playerId = shotPlayer === 'player1' ? player1Id : player2Id
          const isLastShot = i === rally.shots.length - 1
          
          // Calculate timestamp_end
          const timestamp_end = nextShot 
            ? nextShot.timestamp          // Next shot's start time
            : rally.endTimestamp          // Rally end time for last shot
          
          const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, playerId, isLastShot, rally.endCondition)
          dbShot.timestamp_end = timestamp_end  // ✓ Set timestamp_end!
          
          console.log(`[Phase1] Shot ${shot.shotIndex}:`, {
            player_id: dbShot.player_id,
            time_start: dbShot.timestamp_start,
            time_end: dbShot.timestamp_end,
            shot_index: dbShot.shot_index,
            shot_result: dbShot.shot_result,
          })
          await shotDb.create(dbShot)
        }
        console.log(`[Phase1] ✓ All ${rally.shots.length} shots saved with timestamp_end`)
        
        // Update set progress
        await setDb.update(setId, {
          tagging_phase: 'phase1_in_progress',
          phase1_last_rally: rallyIndex,
          has_video: true,
        })
        
        // NEW: Check for set end
        const setEndCheck = deriveSetEndConditions(newScore.player1, newScore.player2)
        if (setEndCheck.isSetEnd && !setEndDetected) {
          console.log('[Phase1] Set end detected!', newScore)
          setSetEndDetected(true)
          setSetEndScore(newScore)
        }
        
        console.log(`[Phase1] ✓ Rally ${rallyIndex} complete!`)
      } catch (error) {
        console.error('Failed to save rally to database:', error)
        // Don't block UI - data is still in localStorage
      } finally {
        setIsSaving(false)
      }
    }
    
    // Update local score state
    setCurrentScore(newScore)
    
    // Set speed to FF mode
    setSpeedMode('ff')
    
    // Reset for next rally
    setCurrentShots([])
    setRallyState('before-serve')
  }
  
  // Handle shot missed (long/missed)
  const handleShotMissed = () => {
    completeRally('long').catch(console.error)
  }
  
  // Handle in net
  const handleInNet = () => {
    completeRally('innet').catch(console.error)
  }
  
  // Handle forced error
  const handleForcedError = () => {
    completeRally('forcederror').catch(console.error)
  }
  
  // Handle winning shot
  const handleWin = () => {
    completeRally('winner').catch(console.error)
  }
  
  // NEW: Handle Save Set
  const handleSaveSet = async () => {
    if (!setId || !player1Id || !player2Id) {
      alert('Cannot save set - missing database context')
      return
    }
    
    console.log('[Phase1] Saving set...', currentScore)
    
    try {
      // 1. Calculate final winner and score
      const finalScore = currentScore
      const winner = finalScore.player1 > finalScore.player2 ? player1Id : player2Id
      
      // 2. Update set record (overwrites pre-entered data)
      await setDb.update(setId, {
        tagging_phase: 'phase1_complete',
        winner_id: winner,
        player1_score_final: finalScore.player1,
        player2_score_final: finalScore.player2,
      })
      
      console.log('[Phase1] ✓ Set saved successfully')
      
      // 3. Show completion modal
      setShowCompletionModal(true)
    } catch (error) {
      console.error('[Phase1] Error saving set:', error)
      alert('Failed to save set. Check console for details.')
    }
  }
  
  // NEW: Handle Tag Next Set
  const handleTagNextSet = async () => {
    if (!setId) return
    
    try {
      // 1. Get current set info
      const currentSet = await setDb.getById(setId)
      if (!currentSet) {
        alert('Cannot find current set')
        return
      }
      const nextSetNumber = currentSet.set_number + 1
      
      // 2. Check if next set exists
      const matchSets = await setDb.getByMatchId(currentSet.match_id)
      let nextSet = matchSets.find(s => s.set_number === nextSetNumber)
      
      // 3. Create if doesn't exist
      if (!nextSet) {
        console.log('[Phase1] Creating next set:', nextSetNumber)
        // For now, just navigate - set creation should happen in match setup
        alert('Next set not found. Please create it in match setup first.')
        return
      }
      
      console.log('[Phase1] Navigating to next set:', nextSet.id)
      
      // 4. Navigate to Phase1 with next set (will show setup or resume)
      window.location.href = `/matches/${currentSet.match_id}/tag?set=${nextSetNumber}`
    } catch (error) {
      console.error('[Phase1] Error navigating to next set:', error)
      alert('Failed to load next set. Check console for details.')
    }
  }
  
  /**
   * Delete rally and its shots from database
   * Used when deleting completed rallies (reverse sequential only)
   */
  const deleteRallyFromDatabase = async (rally: Phase1Rally, setId: string) => {
    try {
      // Find rally in DB by matching timestamps (rally IDs differ in memory vs DB)
      const existingRallies = await rallyDb.getBySetId(setId)
      const rallyToDelete = existingRallies.find(r => 
        Math.abs((r.timestamp_start ?? 0) - rally.shots[0].timestamp) < 0.01 &&
        Math.abs((r.timestamp_end ?? 0) - rally.endTimestamp) < 0.01
      )
      
      if (!rallyToDelete) {
        if (import.meta.env.DEV) {
          console.log(`[Phase1] Rally not found in DB (not saved yet or already deleted)`)
        }
        return
      }
      
      if (import.meta.env.DEV) {
        console.log(`[Phase1] Deleting rally ${rallyToDelete.rally_index} from DB (ID: ${rallyToDelete.id})`)
      }
      
      // Delete rally (this also deletes all associated shots via cascade)
      await rallyDb.remove(rallyToDelete.id)
      
      // Update set progress (decrement last rally counter)
      const newLastRally = Math.max(0, (rallyToDelete.rally_index ?? 1) - 1)
      await setDb.update(setId, {
        phase1_last_rally: newLastRally
      })
      
      if (import.meta.env.DEV) {
        console.log(`[Phase1] ✓ Rally ${rallyToDelete.rally_index} deleted from DB. Set progress updated to ${newLastRally}`)
      }
    } catch (error) {
      console.error('[Phase1] Error deleting rally from database:', error)
      throw error // Re-throw so caller can handle
    }
  }
  
  // Handle delete - remove last tag and navigate back
  const handleDelete = () => {
    if (shotHistory.length === 0) return
    
    const lastItem = shotHistory[shotHistory.length - 1]
    
    if (lastItem.type === 'rally-end') {
      // Delete end condition, reopen rally, REVERT SCORE
      const lastRally = completedRallies[completedRallies.length - 1]
      setCompletedRallies(prev => prev.slice(0, -1))
      setCurrentShots(lastRally.shots)
      setRallyState('after-serve')
      
      // Revert score (decrement winner's score)
      const winnerWasPlayer1 = lastRally.winnerId === 'player1'
      const winnerWasPlayer2 = lastRally.winnerId === 'player2'
      setCurrentScore(prev => ({
        player1: winnerWasPlayer1 ? prev.player1 - 1 : prev.player1,
        player2: winnerWasPlayer2 ? prev.player2 - 1 : prev.player2,
      }))
      
      // Delete from database
      if (setId && player1Id && player2Id) {
        // Don't await - let it run in background to avoid blocking UI
        deleteRallyFromDatabase(lastRally, setId).catch(error => {
          console.error('[Phase1] Failed to delete rally from DB:', error)
        })
      }
    } else {
      // Delete last shot
      if (currentShots.length > 0) {
        // Remove from current rally
        setCurrentShots(prev => prev.slice(0, -1))
        if (currentShots.length === 1) {
          // Deleting the only shot (serve) - reset to before-serve
          setRallyState('before-serve')
        }
      } else {
        // Current rally empty, need to delete from last completed rally
        const lastRally = completedRallies[completedRallies.length - 1]
        setCompletedRallies(prev => prev.slice(0, -1))
        const shotsWithoutLast = lastRally.shots.slice(0, -1)
        
        if (shotsWithoutLast.length === 0) {
          // Rally now empty - delete rally entirely
          setCurrentShots([])
          setRallyState('before-serve')
        } else {
          // Restore rally with remaining shots
          setCurrentShots(shotsWithoutLast)
          setRallyState('after-serve')
        }
        
        // Delete rally from DB (will be re-saved when rally completed again)
        if (setId && player1Id && player2Id) {
          deleteRallyFromDatabase(lastRally, setId).catch(error => {
            console.error('[Phase1] Failed to delete partial rally from DB:', error)
          })
        }
      }
    }
    
    // Remove from history
    setShotHistory(prev => prev.slice(0, -1))
    
    // Navigate to previous item or back to live
    if (shotHistory.length > 1) {
      const prevItem = shotHistory[shotHistory.length - 2]
      videoPlayerRef.current?.seek(prevItem.timestamp)
      videoPlayerRef.current?.pause()
      const newIndex = shotHistory.length - 2
      setCurrentHistoryIndex(newIndex)
      setIsNavigating(true)
      setActiveTagIndex(newIndex) // Set active tag to previous
      // Set speed to tag mode (ready to resume)
      setSpeedMode('tag')
    } else {
      // No more history, back to start
      setCurrentHistoryIndex(-1)
      setIsNavigating(false)
      setActiveTagIndex(-1) // Clear active tag
      setSpeedMode('normal')
    }
  }
  
  // Handle shot back navigation
  const handleShotBack = () => {
    if (currentHistoryIndex <= 0 && !isNavigating) {
      // At live position, jump to last history item
      if (shotHistory.length > 0) {
        const lastItem = shotHistory[shotHistory.length - 1]
        const newIndex = shotHistory.length - 1
        
        // Enable constrained playback loop
        const nextItem = shotHistory.length > newIndex + 1 ? shotHistory[newIndex + 1] : null
        const startTime = Math.max(0, lastItem.timestamp - 0.3) // 300ms before
        const endTime = nextItem ? nextItem.timestamp : lastItem.timestamp + 2.0 // Next shot or +2s
        
        setConstrainedPlayback({
          enabled: true,
          startTime,
          endTime,
          loopOnEnd: true,
        })
        
        videoPlayerRef.current?.seek(startTime)
        videoPlayerRef.current?.play() // Auto-play the loop
        setCurrentHistoryIndex(newIndex)
        setIsNavigating(true)
        setSpeedMode('tag')
        setActiveTagIndex(newIndex) // Set active tag
      }
    } else if (currentHistoryIndex > 0) {
      // Jump to previous item
      const prevItem = shotHistory[currentHistoryIndex - 1]
      const newIndex = currentHistoryIndex - 1
      
      // Enable constrained playback loop
      const nextItem = currentHistoryIndex < shotHistory.length ? shotHistory[currentHistoryIndex] : null
      const startTime = Math.max(0, prevItem.timestamp - 0.3) // 300ms before
      const endTime = nextItem ? nextItem.timestamp : prevItem.timestamp + 2.0 // Next shot or +2s
      
      setConstrainedPlayback({
        enabled: true,
        startTime,
        endTime,
        loopOnEnd: true,
      })
      
      videoPlayerRef.current?.seek(startTime)
      videoPlayerRef.current?.play() // Auto-play the loop
      setCurrentHistoryIndex(newIndex)
      setActiveTagIndex(newIndex) // Set active tag
    }
  }
  
  // Handle shot forward navigation
  const handleShotForward = () => {
    if (isNavigating && currentHistoryIndex < shotHistory.length - 1) {
      // Jump to next item
      const nextItem = shotHistory[currentHistoryIndex + 1]
      const newIndex = currentHistoryIndex + 1
      
      // Enable constrained playback loop
      const followingItem = newIndex + 1 < shotHistory.length ? shotHistory[newIndex + 1] : null
      const startTime = Math.max(0, nextItem.timestamp - 0.3) // 300ms before
      const endTime = followingItem ? followingItem.timestamp : nextItem.timestamp + 2.0 // Next shot or +2s
      
      setConstrainedPlayback({
        enabled: true,
        startTime,
        endTime,
        loopOnEnd: true,
      })
      
      videoPlayerRef.current?.seek(startTime)
      videoPlayerRef.current?.play() // Auto-play the loop
      setCurrentHistoryIndex(newIndex)
      setActiveTagIndex(newIndex) // Set active tag
    } else if (currentHistoryIndex === shotHistory.length - 1) {
      // At end of history, back to live
      setIsNavigating(false)
      setCurrentHistoryIndex(-1)
      setActiveTagIndex(-1) // Clear active tag
      
      // Disable constrained playback
      setConstrainedPlayback({
        enabled: false,
        startTime: 0,
        endTime: 0,
        loopOnEnd: true,
      })
      
      videoPlayerRef.current?.play()
    }
  }
  
  // Auto-scroll to top of completed rallies when new rally added or shots updated
  useEffect(() => {
    if (shotLogRef.current) {
      shotLogRef.current.scrollTop = 0
    }
  }, [completedRallies.length, currentShots.length])
  
  // Scroll to active shot when navigating
  useEffect(() => {
    if (activeTagIndex >= 0 && activeTagIndex < shotHistory.length) {
      const historyItem = shotHistory[activeTagIndex]
      
      if (historyItem.type === 'shot' && historyItem.shotId) {
        // Scroll to the specific shot
        const shotElement = shotRefs.current.get(historyItem.shotId)
        if (shotElement) {
          shotElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      } else if (historyItem.type === 'rally-end' && historyItem.rallyId) {
        // Scroll to the rally (rally-end doesn't have its own ref, so scroll to rally)
        const rallyElement = rallyRefs.current.get(historyItem.rallyId)
        if (rallyElement) {
          rallyElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }
  }, [activeTagIndex, shotHistory])
  
  // Toggle play/pause handler
  const handleTogglePlay = () => {
    if (isPlaying) {
      videoPlayerRef.current?.pause()
    } else {
      videoPlayerRef.current?.play()
    }
  }
  
  // Rewind handler (skip back 10 seconds)
  const handleRewind = () => {
    const newTime = Math.max(0, currentTime - 10)
    videoPlayerRef.current?.seek(newTime)
  }
  
  // Fast forward handler (skip forward 10 seconds)
  const handleFastForward = () => {
    videoPlayerRef.current?.seek(currentTime + 10)
  }
  
  // Calculate server for current rally
  const serverResult = playerContext 
    ? calculateServer({
        firstServerId: setupNextServer,
        player1Score: currentScore.player1,
        player2Score: currentScore.player2,
      })
    : { serverId: 'player1' as const, receiverId: 'player2' as const }
  
  return (
    <>
      <PhaseLayoutTemplate
        shotLogRef={shotLogRef}
        className={className}
        
        shotLog={
        <RallyListSection 
          title="Shot Log"
          emptyMessage={completedRallies.length === 0 && currentShots.length === 0 ? "No shots recorded yet. Press Serve/Shot to begin." : undefined}
        >
          {/* Current rally (in progress) */}
          {currentShots.length > 0 && (
            <RallyCard
              rallyNumber={completedRallies.length + 1}
              serverName={getPlayerName(serverResult.serverId as 'player1' | 'player2')}
              winnerName=""
              endCondition="winner"
              isCurrent
            >
              {currentShots.map((shot, idx) => {
                const shotPlayer = calculateShotPlayer(serverResult.serverId, shot.shotIndex) as 'player1' | 'player2'
                const playerName = getPlayerName(shotPlayer)
                
                // Find if this shot is the active tag
                const shotHistoryIndex = shotHistory.findIndex(h => h.shotId === shot.id)
                const isActive = shotHistoryIndex === activeTagIndex
                
                return (
                  <div key={shot.id} ref={(el) => setShotRef(shot.id, el)}>
                    <ShotListItem
                      shotNumber={idx + 1}
                      shotType={shot.isServe ? 'serve' : 'shot'}
                      playerName={playerName}
                      timestamp={shot.timestamp}
                      isActive={isActive}
                      playerColor={shotPlayer}
                    />
                  </div>
                )
              })}
            </RallyCard>
          )}
          
          {/* Completed rallies */}
          {completedRallies.slice().reverse().map((rally, reverseIdx) => {
            const rallyNumber = completedRallies.length - reverseIdx
            const serverName = getPlayerName(rally.serverId)
            const winnerName = getPlayerName(rally.winnerId)
            
            return (
              <div key={rally.id} ref={(el) => setRallyRef(rally.id, el)}>
                <RallyCard
                  rallyNumber={rallyNumber}
                  serverName={serverName}
                  winnerName={winnerName}
                  endCondition={rally.endCondition}
                  isError={rally.isError}
                  serverColor={rally.serverId}
                  winnerColor={rally.winnerId}
                >
                  {rally.shots.map((shot, idx) => {
                    const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex) as 'player1' | 'player2'
                    const playerName = getPlayerName(shotPlayer)
                    const isLastShot = idx === rally.shots.length - 1
                    
                    // Find if this shot is the active tag
                    const shotHistoryIndex = shotHistory.findIndex(h => h.shotId === shot.id)
                    const isActive = shotHistoryIndex === activeTagIndex
                    
                    return (
                      <div key={shot.id} ref={(el) => setShotRef(shot.id, el)}>
                        <ShotListItem
                          shotNumber={idx + 1}
                          shotType={shot.isServe ? 'serve' : 'shot'}
                          playerName={playerName}
                          timestamp={shot.timestamp}
                          isEnding={isLastShot}
                          isActive={isActive}
                          playerColor={shotPlayer}
                        />
                      </div>
                    )
                  })}
                  {/* Rally End timestamp */}
                  {(() => {
                    // Find if this rally-end is the active tag
                    const rallyEndHistoryIndex = shotHistory.findIndex(h => h.type === 'rally-end' && h.rallyId === rally.id)
                    const isRallyEndActive = rallyEndHistoryIndex === activeTagIndex
                    const rallyEndPlayer = rally.winnerId // Rally ended by winner's opponent (last shot player)
                    
                    return (
                      <div className={cn(
                        "flex items-center gap-2 text-sm pt-1 border-t border-neutral-700/50 -mx-2 px-2 py-1.5 rounded transition-all duration-200",
                        isRallyEndActive && rallyEndPlayer === 'player1' && 'border-l-4 border-blue-500 bg-blue-500/10 pl-1',
                        isRallyEndActive && rallyEndPlayer === 'player2' && 'border-l-4 border-orange-500 bg-orange-500/10 pl-1'
                      )}>
                        <span className="font-mono text-xs text-neutral-600"></span>
                        <span className="text-xs text-neutral-500">Rally End</span>
                        <span className="ml-auto font-mono text-xs text-neutral-600">{rally.endTimestamp.toFixed(2)}s</span>
                      </div>
                    )
                  })()}
                </RallyCard>
              </div>
            )
          })}
        </RallyListSection>
      }
      
      videoPlayer={
        <VideoPlayerSection
          ref={videoPlayerRef}
          videoUrl={videoUrl}
          onVideoSelect={setVideoUrl}
          constrainedPlayback={constrainedPlayback}
        />
      }
      
      videoControls={
        <VideoControlsBar
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onFrameStepBack={() => videoPlayerRef.current?.stepFrame('backward')}
          onFrameStepForward={() => videoPlayerRef.current?.stepFrame('forward')}
          onRewind={handleRewind}
          onFastForward={handleFastForward}
          showShotNavigation={true}
          canNavigateBack={shotHistory.length > 0}
          canNavigateForward={isNavigating && currentHistoryIndex < shotHistory.length - 1}
          onShotBack={handleShotBack}
          onShotForward={handleShotForward}
          canDelete={shotHistory.length > 0}
          onDelete={handleDelete}
        />
      }
      
      statusBar={
        <StatusBarSection
          playerTint={getActiveTagPlayer()}
          warningBanner={
            setEndDetected && setEndScore ? (
              <SetEndWarningBlock
                currentScore={currentScore}
                setEndScore={setEndScore}
                onSaveSet={handleSaveSet}
                onContinueTagging={() => {
                  console.log('[Phase1] User chose to continue tagging past set end')
                  setSetEndDetected(false)
                }}
              />
            ) : undefined
          }
          items={[
            // Column 1: Rally/Shots (vertically stacked)
            <div key="rally-shots" className="flex flex-col text-[11px] leading-tight">
              <div className="flex justify-between gap-2">
                <span className="text-neutral-400">Rally</span>
                <span className="text-neutral-200 font-semibold">{completedRallies.length + 1}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-neutral-400">Shots</span>
                <span className="text-neutral-200 font-semibold">{currentShots.length}</span>
              </div>
            </div>,
            
            // Column 2: Player names with scores (vertically stacked)
            <div key="players-scores" className="flex flex-col text-[11px] leading-tight">
              <div className="flex justify-between gap-2">
                <span className="text-blue-400 font-medium">{playerContext?.player1Name || 'P1'}</span>
                <span className="text-success font-bold">{currentScore.player1}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-orange-400 font-medium">{playerContext?.player2Name || 'P2'}</span>
                <span className="text-success font-bold">{currentScore.player2}</span>
              </div>
            </div>,
            
            // Column 3: Saved (centered, stacked)
            <div key="saved" className="flex flex-col items-center text-[11px] leading-tight">
              <span className="text-neutral-400">Saved</span>
              <span className="text-neutral-200 font-semibold">{completedRallies.length}</span>
            </div>,
            
            // Column 4: Speed button (clickable, opens settings)
            <Button
              key="speed" 
              variant="secondary"
              onClick={() => setSpeedSettingsOpen(true)}
              className={cn(
                'h-8 px-2 text-[11px] font-medium leading-none gap-0.5',
                currentSpeedMode === 'tag' && 'bg-success/20 text-success hover:bg-success/30',
                currentSpeedMode === 'ff' && 'bg-warning/20 text-warning hover:bg-warning/30',
                currentSpeedMode === 'normal' && 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              )}
              title="Click to configure speed settings"
            >
              <span>{currentSpeedMode === 'tag' ? 'Tag' : currentSpeedMode === 'ff' ? 'FF' : 'Normal'}</span>
              <span>{currentSpeedMode === 'tag' ? `${speedPresets.tag}x` : currentSpeedMode === 'ff' ? `${speedPresets.ff}x` : '1x'}</span>
            </Button>,
            
            // Column 5: Save Set button (always present)
            <Button
              key="save-set"
              variant={setEndDetected ? "success" : "primary"}
              onClick={handleSaveSet}
              disabled={!setupComplete || completedRallies.length === 0}
              className="h-8 px-3 text-[11px] font-medium"
            >
              Save Set
            </Button>,
          ]}
        />
      }
      
      userInput={
        <UserInputSection>
          {!setupComplete ? (
            <SetupControlsBlock
              player1Name={playerContext?.player1Name || 'Player 1'}
              player2Name={playerContext?.player2Name || 'Player 2'}
              onComplete={handleSetupComplete}
            />
          ) : (
            <Phase1ControlsBlock
              rallyState={rallyState}
              currentShotCount={currentShots.length}
              onServeShot={handleServeShot}
              onShotMissed={handleShotMissed}
              onInNet={handleInNet}
              onForcedError={handleForcedError}
              onWin={handleWin}
              isDuplicateTag={hasTagAtOrAfter(currentTime)}
            />
          )}
        </UserInputSection>
      }
      />
      
      {/* Completion Modal (rendered outside template as modal overlay) */}
      {showCompletionModal && playerContext && (
        <CompletionModal
          setNumber={1}  // TODO: Get from set record
          finalScore={currentScore}
          player1Name={playerContext.player1Name}
          player2Name={playerContext.player2Name}
          onTagNextSet={handleTagNextSet}
          onBackToMatches={() => {
            // Navigate back to matches
            window.location.href = '/matches'
          }}
          onViewData={() => {
            // Navigate to data viewer
            window.location.href = `/data-viewer?setId=${setId}`
          }}
        />
      )}
      
      {/* Speed Settings Modal */}
      <SpeedSettingsModal 
        isOpen={speedSettingsOpen} 
        onClose={() => setSpeedSettingsOpen(false)} 
      />
    </>
  )
}
