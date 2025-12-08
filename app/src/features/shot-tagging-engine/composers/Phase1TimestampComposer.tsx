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
import { Phase1ControlsBlock, type RallyState, type EndCondition } from '../blocks'
import { VideoPlayer, type VideoPlayerHandle, type TaggingModeControls, useVideoPlaybackStore } from '@/ui-mine/VideoPlayer'
import { calculateServer, calculateShotPlayer } from '@/rules'
import { deriveRally_winner_id, getOpponentId } from '@/rules/derive/rally/deriveRally_winner_id'
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
  onCompletePhase1?: (rallies: Phase1Rally[]) => void
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

export function Phase1TimestampComposer({ onCompletePhase1, playerContext, setId, player1Id, player2Id, className }: Phase1TimestampComposerProps) {
  const currentTime = useVideoPlaybackStore(state => state.currentTime)
  const videoUrl = useVideoPlaybackStore(state => state.videoUrl)
  const setVideoUrl = useVideoPlaybackStore(state => state.setVideoUrl)
  const setSpeedMode = useVideoPlaybackStore(state => state.setSpeedMode)
  const currentSpeedMode = useVideoPlaybackStore(state => state.currentSpeedMode)
  const speedPresets = useVideoPlaybackStore(state => state.speedPresets)
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  
  // Rally state
  const [rallyState, setRallyState] = useState<RallyState>('before-serve')
  const [currentShots, setCurrentShots] = useState<Phase1Shot[]>([])
  const [completedRallies, setCompletedRallies] = useState<Phase1Rally[]>([])
  
  // Shot history for navigation and undo
  const [shotHistory, setShotHistory] = useState<ShotHistoryItem[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1) // -1 = playing live
  const [isNavigating, setIsNavigating] = useState(false) // true when paused on a historical tag
  
  // Score tracking for server calculation
  const [currentScore, setCurrentScore] = useState({
    player1: playerContext?.startingScore.player1 || 0,
    player2: playerContext?.startingScore.player2 || 0,
  })
  
  // Saving indicator
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  
  // Manual save all progress to DB
  const handleManualSave = async () => {
    if (!setId || !player1Id || !player2Id) {
      alert('Cannot save - missing database context')
      return
    }
    
    if (completedRallies.length === 0) {
      alert('No rallies to save yet')
      return
    }
    
    setIsSaving(true)
    console.log(`[Manual Save] Saving ${completedRallies.length} rallies...`)
    
    try {
      // Get existing rallies to determine correct starting rally_index
      const existingRallies = await rallyDb.getBySetId(setId)
      const maxRallyIndex = existingRallies.reduce((max, r) => Math.max(max, r.rally_index || 0), 0)
      let savedCount = 0
      
      console.log(`[Manual Save] Max existing rally_index: ${maxRallyIndex}, saving ${completedRallies.length} new rallies`)
      
      // Save all rallies starting from maxRallyIndex + 1
      for (let i = 0; i < completedRallies.length; i++) {
        const rally = completedRallies[i]
        const rallyIndex = maxRallyIndex + i + 1 // Continue from max existing index
        
        // Save new rally
        {
          savedCount++
          const dbRally = mapPhase1RallyToDBRally(rally, setId, rallyIndex, player1Id, player2Id)
          const savedRally = await rallyDb.create(dbRally)
          
          // Save shots for this rally
          for (const shot of rally.shots) {
            const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
            const shotPlayerId = shotPlayer === 'player1' ? player1Id : player2Id
            const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, shotPlayerId)
            await shotDb.create(dbShot)
          }
        }
      }
      
      // Update set progress
      await setDb.update(setId, {
        tagging_phase: 'phase1_in_progress',
        phase1_last_rally: completedRallies.length,
        phase1_total_rallies: completedRallies.length,
        has_video: true,
      })
      
      setLastSaveTime(new Date())
      console.log(`[Manual Save] ✓ Saved ${savedCount} new rallies (${completedRallies.length} total)`)
      alert(`Successfully saved ${savedCount} new rallies! (${completedRallies.length} total rallies)`)
    } catch (error) {
      console.error('[Manual Save] ✗ Failed:', error)
      alert('Failed to save progress. Check console for details.')
    } finally {
      setIsSaving(false)
    }
  }
  
  // Refs for auto-scroll
  const shotLogRef = useRef<HTMLDivElement>(null)
  const rallyRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  const setRallyRef = (rallyId: string, element: HTMLDivElement | null) => {
    if (element) {
      rallyRefs.current.set(rallyId, element)
    } else {
      rallyRefs.current.delete(rallyId)
    }
  }
  
  // Helper to get player name
  const getPlayerName = (playerId: 'player1' | 'player2') => {
    if (!playerContext) return playerId === 'player1' ? 'Player 1' : 'Player 2'
    return playerId === 'player1' ? playerContext.player1Name : playerContext.player2Name
  }
  
  // Handle serve/shot button press
  const handleServeShot = () => {
    // RESUME case: paused on last tag, pressing button to continue
    if (isNavigating && currentHistoryIndex === shotHistory.length - 1) {
      setIsNavigating(false)
      setCurrentHistoryIndex(-1)
      videoPlayerRef.current?.play()
      setSpeedMode('tag') // Resume at tag speed
      return // Don't add new shot
    }
    
    // NEW TAG case: normal behavior
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
          firstServerId: playerContext.firstServerId,
          player1Score: currentScore.player1,
          player2Score: currentScore.player2,
        })
      : { serverId: 'player1' as const, receiverId: 'player2' as const }
    
    // Determine winner based on end condition and who hit last shot
    const lastShotIndex = currentShots.length
    const lastShotPlayer = calculateShotPlayer(serverResult.serverId, lastShotIndex)
    
    // Derive rally winner using rules
    // const isError = endCondition === 'innet' || endCondition === 'long'
    const opponentId = player1Id && player2Id 
      ? getOpponentId(lastShotPlayer, 'player1', 'player2')
      : lastShotPlayer
    
    // Determine shot_result based on end condition for winner derivation
    const shotResult = 
      endCondition === 'innet' ? 'in_net' :
      endCondition === 'long' ? 'missed_long' :
      'good' // 'winner' end condition
    
    const winnerId = deriveRally_winner_id(
      {
        player_id: lastShotPlayer,
        shot_result: shotResult as any, // Pass correct shot_result for error detection
      },
      opponentId
    ) || lastShotPlayer
    
    const rally: Phase1Rally = {
      id: `rally-${Date.now()}-${Math.random()}`,
      shots: [...currentShots],
      endCondition,
      endTimestamp: currentTime,
      isError: endCondition === 'innet' || endCondition === 'long',
      errorPlacement: endCondition === 'innet' ? 'innet' : endCondition === 'long' ? 'long' : undefined,
      serverId: serverResult.serverId,
      winnerId,
      // Player names for UI
      player1Name: playerContext?.player1Name || 'Player 1',
      player2Name: playerContext?.player2Name || 'Player 2',
      serverName: getPlayerName(serverResult.serverId),
      winnerName: getPlayerName(winnerId),
    }
    
    setCompletedRallies(prev => [...prev, rally])
    
    // Update score
    const newScore = {
      player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
      player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
    }
    setCurrentScore(newScore)
    
    // Add to history
    setShotHistory(prev => [...prev, {
      type: 'rally-end',
      timestamp: currentTime,
      rallyId: rally.id,
      rallyEndCondition: endCondition,
    }])
    
      // Save to database immediately (if context available)
    if (setId && player1Id && player2Id) {
      setIsSaving(true)
      try {
        // Get existing rallies for this set to determine correct rally_index
        const existingRallies = await rallyDb.getBySetId(setId)
        const maxRallyIndex = existingRallies.reduce((max, r) => Math.max(max, r.rally_index || 0), 0)
        const rallyIndex = maxRallyIndex + 1
        
        console.log(`[Phase1] === SAVING RALLY ${rallyIndex} (max existing: ${maxRallyIndex}) ===`)
        console.log(`[Phase1] Rally data:`, {
          serverId: rally.serverId,
          winnerId: rally.winnerId,
          endCondition: rally.endCondition,
          isError: rally.isError,
          shotCount: rally.shots.length,
        })
        
        // Map and save rally
        const dbRally = mapPhase1RallyToDBRally(rally, setId, rallyIndex, player1Id, player2Id)
        console.log(`[Phase1] DB Rally to save:`, {
          server_id: dbRally.server_id,
          receiver_id: dbRally.receiver_id,
          winner_id: dbRally.winner_id,
          is_scoring: dbRally.is_scoring,
          point_end_type: dbRally.point_end_type,
        })
        const savedRally = await rallyDb.create(dbRally)
        console.log(`[Phase1] ✓ Rally saved with ID: ${savedRally.id}`)
        
        // Map and save all shots for this rally
        console.log(`[Phase1] Saving ${rally.shots.length} shots...`)
        for (const shot of rally.shots) {
          const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
          const playerId = shotPlayer === 'player1' ? player1Id : player2Id
          const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, playerId)
          console.log(`[Phase1] Shot ${shot.shotIndex}:`, {
            player_id: dbShot.player_id,
            time: dbShot.timestamp_start,
            shot_index: dbShot.shot_index,
          })
          await shotDb.create(dbShot)
        }
        console.log(`[Phase1] ✓ All ${rally.shots.length} shots saved`)
        
        // Update set progress
        await setDb.update(setId, {
          tagging_phase: 'phase1_in_progress',
          phase1_last_rally: rallyIndex,
          has_video: true,
        })
        
        console.log(`[Phase1] ✓ Rally ${rallyIndex} complete!`)
      } catch (error) {
        console.error('Failed to save rally to database:', error)
        // Don't block UI - data is still in localStorage
      } finally {
        setIsSaving(false)
      }
    }
    
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
  
  // Handle winning shot
  const handleWin = () => {
    completeRally('winner').catch(console.error)
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
      }
    }
    
    // Remove from history
    setShotHistory(prev => prev.slice(0, -1))
    
    // Navigate to previous item or back to live
    if (shotHistory.length > 1) {
      const prevItem = shotHistory[shotHistory.length - 2]
      videoPlayerRef.current?.seek(prevItem.timestamp)
      videoPlayerRef.current?.pause()
      setCurrentHistoryIndex(shotHistory.length - 2)
      setIsNavigating(true)
      // Set speed to tag mode (ready to resume)
      setSpeedMode('tag')
    } else {
      // No more history, back to start
      setCurrentHistoryIndex(-1)
      setIsNavigating(false)
      setSpeedMode('normal')
    }
  }
  
  // Handle shot back navigation
  const handleShotBack = () => {
    if (currentHistoryIndex <= 0 && !isNavigating) {
      // At live position, jump to last history item
      if (shotHistory.length > 0) {
        const lastItem = shotHistory[shotHistory.length - 1]
        videoPlayerRef.current?.seek(lastItem.timestamp)
        videoPlayerRef.current?.pause()
        setCurrentHistoryIndex(shotHistory.length - 1)
        setIsNavigating(true)
        setSpeedMode('tag')
      }
    } else if (currentHistoryIndex > 0) {
      // Jump to previous item
      const prevItem = shotHistory[currentHistoryIndex - 1]
      videoPlayerRef.current?.seek(prevItem.timestamp)
      videoPlayerRef.current?.pause()
      setCurrentHistoryIndex(currentHistoryIndex - 1)
    }
  }
  
  // Handle shot forward navigation
  const handleShotForward = () => {
    if (isNavigating && currentHistoryIndex < shotHistory.length - 1) {
      // Jump to next item
      const nextItem = shotHistory[currentHistoryIndex + 1]
      videoPlayerRef.current?.seek(nextItem.timestamp)
      videoPlayerRef.current?.pause()
      setCurrentHistoryIndex(currentHistoryIndex + 1)
    } else if (currentHistoryIndex === shotHistory.length - 1) {
      // At end of history, back to live
      setIsNavigating(false)
      setCurrentHistoryIndex(-1)
      videoPlayerRef.current?.play()
    }
  }
  
  // Auto-scroll to top of completed rallies when new rally added or shots updated
  useEffect(() => {
    if (shotLogRef.current) {
      shotLogRef.current.scrollTop = 0
    }
  }, [completedRallies.length, currentShots.length])
  
  // Scroll to rally when navigating
  useEffect(() => {
    if (isNavigating && currentHistoryIndex >= 0) {
      const historyItem = shotHistory[currentHistoryIndex]
      if (historyItem?.rallyId) {
        const rallyElement = rallyRefs.current.get(historyItem.rallyId)
        if (rallyElement) {
          rallyElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }
  }, [isNavigating, currentHistoryIndex, shotHistory])
  
  // Build tagging mode controls
  const taggingModeControls: TaggingModeControls = {
    enabled: true,
    currentSpeedMode: currentSpeedMode,
    speedPresets: { tag: speedPresets.tag, ff: speedPresets.ff },
    canNavigateBack: shotHistory.length > 0,
    canNavigateForward: isNavigating && currentHistoryIndex < shotHistory.length - 1,
    canDelete: shotHistory.length > 0,
    onShotBack: handleShotBack,
    onShotForward: handleShotForward,
    onDelete: handleDelete,
    onFrameStepBack: () => videoPlayerRef.current?.stepFrame('backward'),
    onFrameStepForward: () => videoPlayerRef.current?.stepFrame('forward'),
  }
  
  return (
    <div className={cn('fixed inset-0 flex flex-col bg-bg-surface overflow-hidden', className)}>
      {/* Shot Log - Top (scrollable) */}
      <div 
        ref={shotLogRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-bg-surface"
      >
        <div className="text-sm text-neutral-500 mb-3">Shot Log</div>
        {completedRallies.length === 0 && currentShots.length === 0 && (
          <div className="text-center text-neutral-600 py-8">
            No shots recorded yet. Press Serve/Shot to begin.
          </div>
        )}
        
        {/* Current rally (in progress) */}
        {currentShots.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/30">
            <div className="text-xs font-medium text-brand-primary mb-2">
              Rally {completedRallies.length + 1} (In Progress)
              {playerContext && (
                <span className="ml-2 text-neutral-400">
                  Server: {
                    calculateServer({
                      firstServerId: playerContext.firstServerId,
                      player1Score: currentScore.player1,
                      player2Score: currentScore.player2,
                    }).serverId === 'player1' 
                      ? playerContext.player1Name 
                      : playerContext.player2Name
                  }
                </span>
              )}
            </div>
            <div className="space-y-1">
              {currentShots.map((shot, idx) => {
                const serverId = playerContext ? calculateServer({
                  firstServerId: playerContext.firstServerId,
                  player1Score: currentScore.player1,
                  player2Score: currentScore.player2,
                }).serverId : 'player1' as const
                const shotPlayer = calculateShotPlayer(serverId, shot.shotIndex)
                const playerName = getPlayerName(shotPlayer)
                
                return (
                  <div key={shot.id} className="flex items-center gap-2 text-sm text-neutral-300">
                    <span className="font-mono text-xs text-neutral-500">#{idx + 1}</span>
                    <span>{shot.isServe ? 'Serve' : 'Shot'}</span>
                    <span className="text-brand-primary font-medium">• {playerName}</span>
                    <span className="ml-auto font-mono text-xs text-neutral-500">{shot.timestamp.toFixed(2)}s</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Completed rallies */}
        {completedRallies.slice().reverse().map((rally, reverseIdx) => {
          const rallyNumber = completedRallies.length - reverseIdx
          const endConditionLabel = 
            rally.endCondition === 'winner' ? 'Winner' :
            rally.endCondition === 'innet' ? 'In-Net' : 'Long'
          const endConditionColor = 
            rally.endCondition === 'winner' ? 'text-success' : 'text-danger'
          const serverName = getPlayerName(rally.serverId)
          const winnerName = getPlayerName(rally.winnerId)
          
          return (
            <div 
              key={rally.id} 
              ref={(el) => setRallyRef(rally.id, el)}
              className="p-3 rounded-lg bg-neutral-800"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs">
                  <span className="font-medium text-neutral-400">Rally {rallyNumber}</span>
                  <span className="ml-2 text-neutral-500">Server: {serverName}</span>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-success mr-2">{winnerName} won</span>
                  <span className={cn('font-medium', endConditionColor)}>
                    {endConditionLabel}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {rally.shots.map((shot, idx) => {
                  const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
                  const playerName = getPlayerName(shotPlayer)
                  const isLastShot = idx === rally.shots.length - 1
                  
                  return (
                    <div key={shot.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-neutral-600">#{idx + 1}</span>
                      <span className="text-xs text-neutral-400">{shot.isServe ? 'Serve' : 'Shot'}</span>
                      <span className="text-xs text-neutral-300 font-medium">{playerName}</span>
                      {isLastShot && <span className="text-xs text-neutral-500">(ending shot)</span>}
                      <span className="ml-auto font-mono text-xs text-neutral-600">{shot.timestamp.toFixed(2)}s</span>
                    </div>
                  )
                })}
                {/* Rally End timestamp */}
                <div className="flex items-center gap-2 text-sm pt-1 border-t border-neutral-700/50">
                  <span className="font-mono text-xs text-neutral-600"></span>
                  <span className="text-xs text-neutral-500">Rally End</span>
                  <span className="ml-auto font-mono text-xs text-neutral-600">{rally.endTimestamp.toFixed(2)}s</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Video Player - Fixed height, full width */}
      <div className="shrink-0 w-full aspect-video bg-black">
        <VideoPlayer
          ref={videoPlayerRef}
          videoSrc={videoUrl || undefined}
          onVideoSelect={setVideoUrl}
          compact={true}
          showTimeOverlay={true}
          taggingMode={taggingModeControls}
        />
      </div>
      
      {/* Status Strip - Below Video */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-neutral-500">Rally {completedRallies.length + 1}</span>
            {playerContext && (
              <span className="text-neutral-400">
                Score: {playerContext.player1Name} {currentScore.player1} - {currentScore.player2} {playerContext.player2Name}
              </span>
            )}
            <span className="text-neutral-400">{currentShots.length} shot{currentShots.length !== 1 ? 's' : ''}</span>
            <div className={cn(
              'px-3 py-1 rounded text-xs font-medium',
              currentSpeedMode === 'tag' && 'bg-success/20 text-success',
              currentSpeedMode === 'ff' && 'bg-warning/20 text-warning',
              currentSpeedMode === 'normal' && 'bg-neutral-700 text-neutral-300'
            )}>
              {currentSpeedMode === 'tag' && `Tag ${speedPresets.tag}x`}
              {currentSpeedMode === 'ff' && `FF ${speedPresets.ff}x`}
              {currentSpeedMode === 'normal' && 'Normal 1x'}
            </div>
            {isSaving && (
              <span className="text-xs text-brand-primary flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            )}
            {isNavigating && (
              <span className="text-xs text-brand-primary">
                Navigating ({currentHistoryIndex + 1}/{shotHistory.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-500">Total: {completedRallies.length} rallies</span>
            {lastSaveTime && (
              <span className="text-xs text-green-400">
                Saved {new Date(lastSaveTime).toLocaleTimeString()}
              </span>
            )}
            {completedRallies.length > 0 && (
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="px-3 py-1 rounded bg-neutral-700 text-white text-xs font-medium hover:bg-neutral-600 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Progress'}
              </button>
            )}
            {onCompletePhase1 && completedRallies.length > 0 && (
              <button
                onClick={() => {
                  // Save video URL to ensure it persists to Phase 2
                  if (videoUrl) {
                    console.log('Saving video URL for Phase 2:', videoUrl)
                  }
                  onCompletePhase1(completedRallies)
                }}
                className="px-3 py-1 rounded bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90"
              >
                Complete Phase 1 →
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Controls - Bottom - 1x4 button layout */}
      <div className="shrink-0 bg-bg-card border-t border-neutral-700">
        <Phase1ControlsBlock
          rallyState={rallyState}
          onServeShot={handleServeShot}
          onShotMissed={handleShotMissed}
          onInNet={handleInNet}
          onWin={handleWin}
        />
      </div>
    </div>
  )
}
