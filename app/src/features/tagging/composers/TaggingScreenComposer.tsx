/**
 * TaggingScreenComposer — Main tagging screen orchestration
 * 
 * Unified screen for both Part 1 (Match Framework) and Part 2 (Rally Detail).
 * Uses taggingPhase to determine which mode to render:
 * - 'setup': Show Match Setup Panel inline below video
 * - 'part1': shot tagging mode
 * - 'part2': Sequential shot tagging mode
 * 
 * Composer component:
 * - Accesses stores
 * - Calls derive hooks
 * - Passes view models to sections
 * - Handles actions
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import { 
  useDeriveVideoControls,
  useDeriveTaggingControls,
} from '../derive'
import { TaggingControlsSection } from '../sections/TaggingControlsSection'
import { ShotQuestionSection } from '../sections/ShotQuestionSection'
import { Part2SpeedControlsSection } from '../sections/Part2SpeedControlsSection'
import { MatchTimelinePanelSection } from '../sections/MatchTimelinePanelSection'
import { EndOfRallySection } from '../sections/EndOfRallySection'
import { CheckpointSection } from '../sections/CheckpointSection'
import { RallyReviewSection } from '../sections/RallyReviewSection'
import { WinnerSelectBlock } from '../blocks/WinnerSelectBlock'
import { MatchSetupPanelBlock, type MatchSetupFormData } from '../blocks/MatchSetupPanelBlock'
import { MatchCompletionModalBlock, type MatchCompletionData } from '../blocks/MatchCompletionModalBlock'
import { Part2CompletionBlock } from '../blocks/Part2CompletionBlock'
import { VideoPlayer, type VideoPlayerHandle, type ConstrainedPlayback } from '@/components/tagging/VideoPlayer'
import { cn } from '@/lib/utils'
import type { PlayerId, ServeType, ServeSpin, ShotQuality, EssentialShotType, LandingZone } from '@/rules/types'
import { deriveServeWing } from '@/rules/types'
import { deriveEndOfPoint } from '@/rules/deriveEndOfPoint'

// Speed presets per spec
const FF_SPEEDS = [0.5, 1, 2, 3, 4, 5]
const DEFAULT_TAGGING_SPEED = 0.5  // User preference: 0.5x default
const DEFAULT_FF_SPEED = 1

export interface TaggingScreenComposerProps {
  className?: string
}

export function TaggingScreenComposer({ className }: TaggingScreenComposerProps) {
  const videoRef = useRef<VideoPlayerHandle>(null)
  
  // Local state for FF mode (not persisted)
  const [isInFFMode, setIsInFFMode] = useState(false)
  const [taggingSpeed, setTaggingSpeed] = useState(DEFAULT_TAGGING_SPEED)
  const [ffSpeed, setFFSpeed] = useState(DEFAULT_FF_SPEED)
  
  // State for pending error data (used in EndOfRallySection)
  const [pendingErrorData, setPendingErrorData] = useState<{
    shotId: string
    errorPlayerId: PlayerId
    winnerId: PlayerId
    shotIndex: number
  } | null>(null)
  
  // State for auto-prune undo toast
  const [pruneToast, setPruneToast] = useState<{ count: number; rallyId: string } | null>(null)
  
  // State for match completion modal (local state to toggle, store has showMatchCompletionModal)
  const [localShowCompletionModal, setLocalShowCompletionModal] = useState(false)
  
  // State for End of Rally step (Part 2)
  // When true, show EndOfRallySection instead of ShotQuestionSection
  const [isEndOfRallyStep, setIsEndOfRallyStep] = useState(false)
  const [endOfRallyWinner, setEndOfRallyWinner] = useState<PlayerId | null>(null)
  const [endOfRallyEndType, setEndOfRallyEndType] = useState<'forcedError' | 'unforcedError' | 'winnerShot' | null>(null)
  
  // Store state and actions
  const {
    addShot,
    startNewRallyWithServe,
    endRallyScore,
    endRallyNoScore,
    undoLastContact,
    markEndOfSet,
    setPlaybackSpeed,
    setCurrentReviewRally,
    selectWinner,
    setVideoUrl,
    initMatchFramework,
    advanceToNextShot,
    advanceToNextRally,
    setShotQuestionStep,
    deleteShot,
    deleteRally,
    toggleRallyHighlight,
    updateShotData,
    completeShotTagging,
    autoPruneShots,
    undoLastPrune,
    setRallyPointEndType,
    updateRallyWinner,
    updateEndOfPointTime,
    completeMatchFramework,
    rallies,
    showWinnerDialog,
    player1Name,
    player2Name,
    player1Score,
    player2Score,
    videoUrl,
    isPlaying,
    taggingMode,
    taggingPhase,
    currentTime,
    activeRallyIndex,
    activeShotIndex,
    shotQuestionStep,
    loopSpeed,
    previewBufferSeconds,
    setLoopSpeed,
    setPreviewBuffer,
    goToPreviousShot,
    step2Complete,
    matchId,
    sets,
    currentSetIndex,
    matchDate,
    matchFormat,
    matchResult,
    finalSetScore,
    currentRallyShots,
    currentServerId,
    nudgeShot,
    deleteInProgressShot,
    // Rally Checkpoint Flow
    frameworkState,
    confirmRally,
    redoCurrentRally,
    endSetFramework,
    confirmRallyReview,
  } = useTaggingStore()
  
  // Get current rally and shot for Part 2
  const currentRally = rallies[activeRallyIndex]
  const currentShot = currentRally?.shots[activeShotIndex - 1]
  const nextContact = currentRally?.shots[activeShotIndex]
  const isLastShot = currentRally && activeShotIndex >= currentRally.shots.length
  
  // Initialize shot playerId when entering Part 2
  useEffect(() => {
    if (taggingPhase !== 'part2' || !currentRally || !currentShot) return
    
    // Skip if already has playerId
    if (currentShot.playerId) return
    
    // Determine player for this shot (alternating from server)
    // Shot 1 (serve) = server, Shot 2 (return) = receiver, Shot 3 = server, etc.
    const isServerShot = activeShotIndex % 2 === 1
    const playerId: PlayerId = isServerShot 
      ? currentRally.serverId 
      : currentRally.receiverId
    
    updateShotData(currentShot.id, { playerId })
  }, [taggingPhase, activeRallyIndex, activeShotIndex, currentShot?.id, currentShot?.playerId, currentRally?.serverId, currentRally?.receiverId, updateShotData])
  
  // Calculate constrained playback based on current state
  // - rally_review: Loop entire rally (for RallyReviewSection)
  // - shot_detail: Loop current shot
  // - Part 2 with EndOfRallyStep: Show end of point area
  const constrainedPlayback: ConstrainedPlayback | undefined = 
    frameworkState === 'rally_review' && currentRally
      ? {
          // Rally review: Loop entire rally for synced highlights
          enabled: true,
          startTime: currentRally.shots[0]?.time || 0,
          endTime: currentRally.endOfPointTime || currentRally.shots[currentRally.shots.length - 1]?.time || 0,
          loopOnEnd: true,
        }
      : taggingPhase === 'part2' && currentRally
        ? isEndOfRallyStep
          ? {
              // End of rally step: Show end of point area (no loop)
              enabled: true,
              startTime: Math.max(0, (currentRally.endOfPointTime || currentShot?.time || 0) - 1),
              endTime: (currentRally.endOfPointTime || currentShot?.time || 0) + 1,
              loopOnEnd: false,
            }
          : currentShot
            ? {
                enabled: true,
                startTime: currentShot.time,
                endTime: nextContact 
                  ? nextContact.time + previewBufferSeconds // Use store value
                  : (currentRally?.endOfPointTime || currentShot.time + 1),
                loopOnEnd: !isLastShot, // Loop for shots, still frame for end-of-point
              }
            : undefined
        : undefined
  
  // Apply loop speed and auto-play when entering Part 2
  useEffect(() => {
    if (taggingPhase === 'part2') {
      setPlaybackSpeed(loopSpeed)
      // Auto-play the video loop when entering Part 2
      setTimeout(() => {
        if (currentShot) {
          videoRef.current?.seek(currentShot.time)
          videoRef.current?.play()
        }
      }, 100)
    }
  }, [taggingPhase, loopSpeed, setPlaybackSpeed, currentShot?.time])
  
  // Derived view models
  const videoControls = useDeriveVideoControls()
  const taggingControls = useDeriveTaggingControls()
  
  // Apply speed changes
  const applySpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
  }, [setPlaybackSpeed])
  
  // Enter FF mode
  const enterFFMode = useCallback(() => {
    setIsInFFMode(true)
    applySpeed(ffSpeed)
    videoRef.current?.play()
  }, [ffSpeed, applySpeed])
  
  // Exit FF mode
  const exitFFMode = useCallback(() => {
    setIsInFFMode(false)
    applySpeed(taggingSpeed)
  }, [taggingSpeed, applySpeed])
  
  // Update tagging speed
  const handleTaggingSpeedChange = useCallback((speed: number) => {
    setTaggingSpeed(speed)
    if (!isInFFMode) {
      applySpeed(speed)
    }
  }, [isInFFMode, applySpeed])
  
  // Update FF speed
  const handleFFSpeedChange = useCallback((speed: number) => {
    setFFSpeed(speed)
    if (isInFFMode) {
      applySpeed(speed)
    }
  }, [isInFFMode, applySpeed])
  
  // Action handlers
  const handleContact = useCallback(() => {
    addShot()
  }, [addShot])
  
  const handleEndRallyScore = useCallback(() => {
    endRallyScore()
  }, [endRallyScore])
  
  const handleEndRallyNoScore = useCallback(() => {
    endRallyNoScore()
  }, [endRallyNoScore])
  
  const handleUndo = useCallback(() => {
    undoLastContact()
  }, [undoLastContact])
  
  const handleEndOfSet = useCallback(() => {
    markEndOfSet()
  }, [markEndOfSet])
  
  const handleRallyClick = useCallback((rallyId: string) => {
    // In Part 2, clicking rallies is disabled (sequential only)
    if (taggingPhase === 'part2') return
    
    const index = rallies.findIndex(r => r.id === rallyId)
    if (index >= 0) {
      setCurrentReviewRally(index)
    }
  }, [rallies, setCurrentReviewRally, taggingPhase])
  
  const handleShotClick = useCallback((_contactId: string) => {
    // In Part 2, clicking shots is disabled (sequential only per REQ-6)
    // This is intentionally a no-op - navigation is via Next/Prev only
    // Could be enabled in future for jumping to specific shots
  }, [])
  
  // Panel shot manipulation
  const handleNudgeContact = useCallback((shotId: string, direction: 'earlier' | 'later') => {
    nudgeShot(shotId, direction)
  }, [nudgeShot])
  
  const handleDeleteContact = useCallback((shotId: string) => {
    // Check if this is in-progress or completed rally
    const inProgress = currentRallyShots.find(c => c.id === shotId)
    if (inProgress) {
      if (confirm('Delete this shot?')) {
        deleteInProgressShot(shotId)
      }
    } else {
      // For completed rallies, find the rally and delete
      const rally = rallies.find(r => r.shots.some(c => c.id === shotId))
      if (rally && confirm('Delete this shot?')) {
        deleteShot(rally.id, shotId)
      }
    }
  }, [currentRallyShots, rallies, deleteInProgressShot, deleteShot])
  
  const handleSelectWinner = useCallback((winnerId: PlayerId) => {
    selectWinner(winnerId)
  }, [selectWinner])
  
  const handleVideoSelect = useCallback((url: string) => {
    setVideoUrl(url)
  }, [setVideoUrl])
  
  const handleMatchSetup = useCallback((data: MatchSetupFormData) => {
    // Initialize match framework - CRITICAL FIRST STEP
    // This establishes the framework for all server derivation
    if (data.firstServeTimestamp === null) {
      console.error('First serve timestamp is required')
      return
    }
    
    initMatchFramework({
      player1Name: data.player1Name,
      player2Name: data.player2Name,
      matchDate: data.matchDate,
      firstServerId: data.firstServerId,
      taggingMode: data.taggingMode,
      matchFormat: data.matchFormat,
      tournament: data.tournament,
      player1StartSets: data.player1StartSets,
      player2StartSets: data.player2StartSets,
      player1StartPoints: data.player1StartPoints,
      player2StartPoints: data.player2StartPoints,
      firstServeTimestamp: data.firstServeTimestamp!,
    })
    
    // Seek video to first serve timestamp
    videoRef.current?.seek(data.firstServeTimestamp)
    
    // Set initial speed to default tagging speed
    applySpeed(DEFAULT_TAGGING_SPEED)
    
    // Small delay to let the seek complete, then start playing
    setTimeout(() => {
      videoRef.current?.play()
    }, 100)
  }, [initMatchFramework, applySpeed])
  
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      videoRef.current?.pause()
    } else {
      videoRef.current?.play()
    }
  }, [isPlaying])
  
  const handleStepFrame = useCallback((direction: 'forward' | 'backward') => {
    videoRef.current?.stepFrame(direction)
  }, [])
  
  // Delete last rally (Shift+Delete)
  const handleDeleteRally = useCallback((rallyId: string) => {
    if (confirm('Delete this rally and all its shots?')) {
      deleteRally(rallyId)
    }
  }, [deleteRally])
  
  const handleToggleHighlight = useCallback((rallyId: string) => {
    toggleRallyHighlight(rallyId)
  }, [toggleRallyHighlight])
  
  // Part 1 -> Part 2 transition
  const handleOpenCompletionModal = useCallback(() => {
    if (rallies.length === 0) return
    setLocalShowCompletionModal(true)
    exitFFMode()
  }, [rallies.length, exitFFMode])
  
  const handleCloseCompletionModal = useCallback(() => {
    setLocalShowCompletionModal(false)
  }, [])
  
  const handleCompleteMatchFramework = useCallback((data: MatchCompletionData) => {
    completeMatchFramework(data)
    setLocalShowCompletionModal(false)
    exitFFMode()
  }, [completeMatchFramework, exitFFMode])
  
  // Part 2 completion handlers
  const handleViewStats = useCallback(() => {
    // Navigate to Match Analysis page
    window.location.href = '/matches/analysis'
  }, [])
  
  const handleBackToMatches = useCallback(() => {
    window.location.href = '/matches'
  }, [])
  
  // Shot question handlers for Part 2
  const handleServeTypeSelect = useCallback((type: ServeType) => {
    if (!currentShot) return
    
    // Persist serve type and auto-derive wing
    updateShotData(currentShot.id, { 
      serveType: type,
      wing: deriveServeWing(type)
    })
    
    // Move to next question (spin)
    setShotQuestionStep(2)
  }, [currentShot, setShotQuestionStep, updateShotData])
  
  const handleSpinSelect = useCallback((spin: ServeSpin) => {
    if (!currentShot) return
    
    // Persist spin
    updateShotData(currentShot.id, { serveSpin: spin })
    
    // Move to next question (quality — REORDERED)
    setShotQuestionStep(3)
  }, [currentShot, setShotQuestionStep, updateShotData])
  
  const handleLandingZoneSelect = useCallback((zone: LandingZone) => {
    if (!currentShot || !currentRally) return
    
    // Persist landing zone
    updateShotData(currentShot.id, { landingZone: zone })
    
    // Landing is the last step for non-errors, complete the shot
    completeShotTagging(currentShot.id, currentShot.shotQuality!)
    
    // If this is the last shot, enter End of Rally step instead of advancing
    if (isLastShot) {
      // Derive end-of-point for winner shot (in-play quality)
      const playerId = currentShot.playerId || (activeShotIndex % 2 === 1 ? currentRally.serverId : currentRally.receiverId)
      const derived = deriveEndOfPoint({
        playerId,
        shotIndex: activeShotIndex,
        shotQuality: currentShot.shotQuality!,
      })
      
      // Winner shot: player who hit last shot wins, point end type is 'winnerShot'
      setIsEndOfRallyStep(true)
      setEndOfRallyWinner(derived.winnerId || playerId)
      setEndOfRallyEndType('winnerShot')
      
      // Persist to rally immediately (winner shots are auto-derived, no user input needed)
      setRallyPointEndType(currentRally.id, 'winnerShot')
      updateRallyWinner(currentRally.id, derived.winnerId || playerId)
      // Initialize endOfPointTime to the shot's timestamp (user can adjust with arrow keys)
      updateEndOfPointTime(currentRally.id, currentShot.time)
    } else {
      advanceToNextShot()
    }
  }, [currentShot, currentRally, isLastShot, activeShotIndex, advanceToNextShot, updateShotData, completeShotTagging, setRallyPointEndType, updateRallyWinner])
  
  const handleWingSelect = useCallback((wing: 'forehand' | 'backhand') => {
    if (!currentShot) return
    
    // Persist wing
    updateShotData(currentShot.id, { wing: wing === 'forehand' ? 'FH' : 'BH' })
    
    // Move to next question (shot type)
    setShotQuestionStep(2)
  }, [currentShot, setShotQuestionStep, updateShotData])
  
  const handleShotTypeSelect = useCallback((type: EssentialShotType) => {
    if (!currentShot) return
    
    // Persist shot type
    updateShotData(currentShot.id, { shotType: type })
    
    // Move to next question (quality — REORDERED)
    setShotQuestionStep(3)
  }, [currentShot, setShotQuestionStep, updateShotData])
  
  const handleQualitySelect = useCallback((quality: ShotQuality) => {
    if (!currentShot || !currentRally) return
    
    const isError = ['inNet', 'missedLong', 'missedWide'].includes(quality)
    
    if (isError) {
      // Error quality: skip landing zone, complete immediately
      completeShotTagging(currentShot.id, quality)
      
      // Derive end-of-point
      const playerId = currentShot.playerId || (activeShotIndex % 2 === 1 ? currentRally.serverId : currentRally.receiverId)
      const derived = deriveEndOfPoint({
        playerId,
        shotIndex: activeShotIndex,
        shotQuality: quality,
      })
      
      // Auto-prune if error is not on last shot (shot after this one shouldn't exist)
      if (!isLastShot) {
        const pruneResult = autoPruneShots(currentRally.id, activeShotIndex)
        if (pruneResult.prunedCount > 0) {
          setPruneToast({ count: pruneResult.prunedCount, rallyId: currentRally.id })
          setTimeout(() => setPruneToast(null), 5000)
        }
      }
      
      // Enter End of Rally step with derived/pending data
      setIsEndOfRallyStep(true)
      setEndOfRallyWinner(derived.winnerId || null)
      // Initialize endOfPointTime to the shot's timestamp (user can adjust with arrow keys)
      updateEndOfPointTime(currentRally.id, currentShot.time)
      
      if (derived.needsForcedUnforcedQuestion) {
        // Need to ask forced/unforced
        setPendingErrorData({
          shotId: currentShot.id,
          errorPlayerId: playerId,
          winnerId: derived.winnerId!,
          shotIndex: activeShotIndex,
        })
        setEndOfRallyEndType(null) // Will be set by user
      } else {
        // Auto-derived (service fault or receive error)
        setEndOfRallyEndType(derived.pointEndType as 'forcedError' | 'unforcedError' | 'winnerShot' | null)
        // Set the rally data immediately for auto-derived cases
        if (derived.pointEndType) {
          setRallyPointEndType(currentRally.id, derived.pointEndType)
        }
        if (derived.winnerId) {
          updateRallyWinner(currentRally.id, derived.winnerId)
        }
      }
    } else {
      // In-play quality: persist and move to landing zone (step 4)
      updateShotData(currentShot.id, { shotQuality: quality })
      setShotQuestionStep(4)
    }
  }, [currentShot, currentRally, activeShotIndex, isLastShot, completeShotTagging, updateShotData, setShotQuestionStep, setRallyPointEndType, updateRallyWinner, autoPruneShots])
  
  // Forced/Unforced handler (now used in EndOfRallySection)
  const handleForcedUnforcedSelect = useCallback((type: 'forcedError' | 'unforcedError') => {
    if (!pendingErrorData || !currentRally) return
    
    // Set the point end type based on user selection
    setRallyPointEndType(currentRally.id, type)
    updateRallyWinner(currentRally.id, pendingErrorData.winnerId)
    
    // Update local state for EndOfRallySection display
    setEndOfRallyEndType(type)
    setPendingErrorData(null)
  }, [pendingErrorData, currentRally, setRallyPointEndType, updateRallyWinner])
  
  // End of Rally step handlers
  const handleEndOfRallyWinnerSelect = useCallback((winnerId: PlayerId) => {
    if (!currentRally) return
    setEndOfRallyWinner(winnerId)
    updateRallyWinner(currentRally.id, winnerId)
  }, [currentRally, updateRallyWinner])
  
  const handleEndOfRallyTimeChange = useCallback((time: number) => {
    if (!currentRally) return
    updateEndOfPointTime(currentRally.id, time)
  }, [currentRally, updateEndOfPointTime])
  
  const handleEndOfRallyStepFrame = useCallback((direction: 'forward' | 'backward') => {
    if (!currentRally) return
    const currentTime = currentRally.endOfPointTime || 0
    const delta = direction === 'forward' ? 0.033 : -0.033 // ~1 frame at 30fps
    const newTime = Math.max(0, currentTime + delta)
    updateEndOfPointTime(currentRally.id, newTime)
    videoRef.current?.seek(newTime)
  }, [currentRally, updateEndOfPointTime])
  
  const handleEndOfRallyConfirm = useCallback(() => {
    // Reset end-of-rally state
    setIsEndOfRallyStep(false)
    setEndOfRallyWinner(null)
    setEndOfRallyEndType(null)
    setPendingErrorData(null)
    
    // Advance to next rally
    advanceToNextRally()
  }, [advanceToNextRally])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Don't process shortcuts in setup phase (except for video navigation)
      if (taggingPhase === 'setup') {
        // Allow arrow keys for video navigation during setup
        if (e.code === 'ArrowLeft') {
          e.preventDefault()
          handleStepFrame('backward')
        } else if (e.code === 'ArrowRight') {
          e.preventDefault()
          handleStepFrame('forward')
        } else if (e.code === 'KeyK') {
          e.preventDefault()
          handleTogglePlay()
        }
        return
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (showWinnerDialog) {
            // Don't add shot while winner dialog is open
            return
          }
          // Rally Checkpoint Flow: Space behavior depends on frameworkState
          if (frameworkState === 'ff_mode') {
            // Space in FF mode = mark serve → go to tagging state
            startNewRallyWithServe()
            // Don't call exitFFMode - frameworkState transition handles speed
            applySpeed(taggingSpeed)
          } else if (frameworkState === 'tagging') {
            // Normal tagging mode = add shot
            if (taggingControls.canAddContact) {
              handleContact()
            }
          } else if (taggingPhase === 'part2') {
            // Part 2 mode - existing logic
            if (taggingControls.canAddContact) {
              handleContact()
            }
          }
          break
          
        case 'ArrowRight':
          e.preventDefault()
          // Rally Checkpoint Flow: ArrowRight behavior depends on frameworkState
          if (frameworkState === 'ff_mode') {
            // In FF mode: Increase FF speed
            const idx = FF_SPEEDS.indexOf(ffSpeed)
            if (idx < FF_SPEEDS.length - 1) {
              handleFFSpeedChange(FF_SPEEDS[idx + 1])
            }
          } else if (frameworkState === 'tagging') {
            if (taggingControls.canEndRally) {
              // End rally → go to checkpoint (video pauses)
              handleEndRallyScore()
              videoRef.current?.pause()
            } else {
              // No rally in progress: step frame forward
              handleStepFrame('forward')
            }
          } else if (taggingPhase === 'part2') {
            // In Part 2: Step frame forward
            handleStepFrame('forward')
          } else {
            handleStepFrame('forward')
          }
          break
          
        case 'ArrowLeft':
          e.preventDefault()
          // Rally Checkpoint Flow: ArrowLeft in FF mode decreases speed
          if (frameworkState === 'ff_mode') {
            const idx = FF_SPEEDS.indexOf(ffSpeed)
            if (idx <= 0) {
              // Can't go slower, just stay at minimum
              handleFFSpeedChange(FF_SPEEDS[0])
            } else {
              handleFFSpeedChange(FF_SPEEDS[idx - 1])
            }
          } else {
            // Normal mode: Step frame backward
            handleStepFrame('backward')
          }
          break
          
        case 'KeyK':
          e.preventDefault()
          handleTogglePlay()
          break
          
        case 'Enter':
          e.preventDefault()
          // Rally Checkpoint Flow: Enter behavior depends on state
          if (frameworkState === 'checkpoint') {
            // Checkpoint: Confirm rally → FF mode
            confirmRally()
            applySpeed(ffSpeed)
            videoRef.current?.play()
          } else if (frameworkState === 'rally_review') {
            // Rally review: Confirm → next rally or set complete
            confirmRallyReview()
            // Seek to next rally if available
            const nextRally = rallies[activeRallyIndex + 1]
            if (nextRally && nextRally.shots.length > 0) {
              videoRef.current?.seek(nextRally.shots[0].time)
              videoRef.current?.play()
            }
          } else if (taggingControls.canEndRally) {
            handleEndRallyScore()
          }
          break
          
        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          // Check Shift modifier first (takes priority over checkpoint state)
          if (e.shiftKey) {
            // Shift+Delete: Delete last rally (works in any state)
            if (rallies.length > 0) {
              const lastRally = rallies[rallies.length - 1]
              handleDeleteRally(lastRally.id)
            }
          } else if (frameworkState === 'checkpoint') {
            // Rally Checkpoint Flow: Backspace at checkpoint = redo rally
            const seekTime = redoCurrentRally()
            videoRef.current?.seek(seekTime)
            applySpeed(ffSpeed)
            videoRef.current?.play()
          } else {
            // Delete/Backspace: Delete last shot (only when not at checkpoint)
            if (taggingControls.canUndo) {
              handleUndo()
            }
          }
          break
          
        case 'KeyL':
          e.preventDefault()
          if (taggingControls.canEndRally) {
            handleEndRallyNoScore()
          }
          break
          
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (taggingControls.canUndo) {
              handleUndo()
            }
          }
          break
          
        case 'KeyE':
          e.preventDefault()
          // Rally Checkpoint Flow: E in FF mode = end set framework → shot detail
          if (frameworkState === 'ff_mode') {
            if (rallies.length > 0) {
              endSetFramework()
              // Seek to first rally for shot detail
              const firstRally = rallies[0]
              if (firstRally.shots.length > 0) {
                videoRef.current?.seek(firstRally.shots[0].time)
              }
              videoRef.current?.play()
            }
          } else {
            handleEndOfSet()
          }
          break
          
        case 'KeyH':
          e.preventDefault()
          // Toggle highlight on last rally
          if (rallies.length > 0) {
            const lastRally = rallies[rallies.length - 1]
            handleToggleHighlight(lastRally.id)
          }
          break
          
        case 'Digit1':
        case 'Numpad1':
          if (showWinnerDialog) {
            e.preventDefault()
            handleSelectWinner('player1')
            // Enter FF mode after winner selection
            setTimeout(() => enterFFMode(), 100)
          }
          break
          
        case 'Digit2':
        case 'Numpad2':
          if (showWinnerDialog) {
            e.preventDefault()
            handleSelectWinner('player2')
            // Enter FF mode after winner selection
            setTimeout(() => enterFFMode(), 100)
          }
          break
          
        // Forced/Unforced shortcuts are handled in EndOfRallySection
        case 'KeyF':
        case 'KeyU':
          // Handled by EndOfRallySection's keyboard handler
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    taggingPhase,
    frameworkState,  // CRITICAL: Used in Space, ArrowLeft, ArrowRight, Enter, Backspace, KeyE handlers
    taggingSpeed,  // Used in Space handler when exiting FF mode (line 617)
    applySpeed,  // Used to set playback speed (lines 617, 685, 708, 902, 908)
    taggingControls,
    handleContact,
    startNewRallyWithServe,
    handleEndRallyScore,
    handleEndRallyNoScore,
    handleUndo,
    handleEndOfSet,
    showWinnerDialog,
    handleSelectWinner,
    handleTogglePlay,
    handleStepFrame,
    isInFFMode,
    ffSpeed,
    handleFFSpeedChange,
    exitFFMode,
    enterFFMode,
    rallies,
    handleDeleteRally,
    handleToggleHighlight,
    confirmRally,  // Used in Enter handler (line 684)
    redoCurrentRally,  // Used in Backspace handler (line 706)
    endSetFramework,  // Used in KeyE handler (line 746)
    confirmRallyReview,  // Used in Enter handler (line 689)
  ])
  
  return (
    <div className={cn('flex h-full gap-4 p-4 relative', className)}>
      {/* Left Panel - Match Timeline (persistent across all phases) */}
      <div className="w-80 shrink-0 h-full">
        <MatchTimelinePanelSection
          player1Name={player1Name}
          player2Name={player2Name}
          matchDate={matchDate}
          matchFormat={matchFormat}
          sets={sets}
          rallies={rallies}
          currentRallyShots={currentRallyShots}
          currentServerId={currentServerId}
          currentSetIndex={currentSetIndex}
          currentRallyIndex={taggingPhase === 'part2' ? activeRallyIndex : undefined}
          currentShotIndex={taggingPhase === 'part2' ? activeShotIndex : undefined}
          matchResult={matchResult}
          finalSetScore={finalSetScore}
          taggingPhase={taggingPhase}
          onRallyClick={handleRallyClick}
          onShotClick={handleShotClick}
          onNudgeContact={handleNudgeContact}
          onDeleteContact={handleDeleteContact}
        />
      </div>
      
      {/* Center - Video + Controls */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Video Player - Adaptive height based on phase */}
        <div className={cn(
          'bg-neutral-900 rounded-lg overflow-hidden min-h-0',
          taggingPhase === 'part2' ? 'h-[50%]' : 
          taggingPhase === 'setup' ? 'h-[40%]' :  // Setup: Leave room for form below
          'flex-1'  // Part 1: Full height
        )}>
          <VideoPlayer
            ref={videoRef}
            videoSrc={videoUrl || undefined}
            onVideoSelect={handleVideoSelect}
            showTimeOverlay={true}
            constrainedPlayback={constrainedPlayback}
          />
        </div>
        
        {/* Setup Phase: Inline Setup Panel below video */}
        {taggingPhase === 'setup' && (
          <div className="flex-1 overflow-y-auto">
            <MatchSetupPanelBlock
              currentVideoTime={currentTime}
              initialData={{
                player1Name,
                player2Name,
                taggingMode,
              }}
              onSubmit={handleMatchSetup}
            />
          </div>
        )}
        
        {/* Part 1: Controls based on frameworkState */}
        {taggingPhase === 'part1' && (
          <div className="shrink-0">
            {/* Checkpoint UI */}
            {frameworkState === 'checkpoint' && (
              <CheckpointSection
                rallyNumber={rallies.length + 1}
                contactCount={currentRallyShots.length}
                serverName={currentServerId === 'player1' ? player1Name : player2Name}
                serverId={currentServerId}
                receiverName={currentServerId === 'player1' ? player2Name : player1Name}
                duration={currentRallyShots.length > 0 
                  ? currentTime - currentRallyShots[0].time 
                  : 0}
                shots={currentRallyShots}
                onConfirm={() => {
                  confirmRally()
                  applySpeed(ffSpeed)
                  videoRef.current?.play()
                }}
                onRedo={() => {
                  const seekTime = redoCurrentRally()
                  videoRef.current?.seek(seekTime)
                  applySpeed(ffSpeed)
                  videoRef.current?.play()
                }}
              />
            )}
            
            {/* Tagging Controls (when in tagging or ff_mode) */}
            {(frameworkState === 'tagging' || frameworkState === 'ff_mode') && (
              <>
                <TaggingControlsSection
                  controls={taggingControls}
                  videoControls={videoControls}
                  isInFFMode={frameworkState === 'ff_mode'}
                  taggingSpeed={taggingSpeed}
                  ffSpeed={ffSpeed}
                  onContact={handleContact}
                  onEndRallyScore={handleEndRallyScore}
                  onEndRallyNoScore={handleEndRallyNoScore}
                  onUndo={handleUndo}
                  onEndOfSet={handleEndOfSet}
                  onTaggingSpeedChange={handleTaggingSpeedChange}
                  onFFSpeedChange={handleFFSpeedChange}
                />
                
                {/* FF Mode indicator */}
                {frameworkState === 'ff_mode' && (
                  <div className="mt-2 text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-warning/20 text-warning rounded-full text-sm font-medium">
                      <span className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                      Fast Forward Mode ({ffSpeed}x) — Press Space to mark next serve, E to end set
                    </span>
                  </div>
                )}
              </>
            )}
            
            {/* Complete Part 1 button */}
            {rallies.length > 0 && !isInFFMode && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleOpenCompletionModal}
                  className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors"
                >
                  Complete Part 1 → Start Shot Tagging
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Part 2: Shot Questions + Speed Controls */}
        {taggingPhase === 'part2' && currentRally && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Shot Questions, End of Rally, or Rally Review */}
            <div className="flex-1 overflow-y-auto">
              {/* Rally Review (after all shots tagged - with video sync) */}
              {frameworkState === 'rally_review' && currentRally ? (
                <RallyReviewSection
                  rallyNumber={activeRallyIndex + 1}
                  serverName={currentRally.serverId === 'player1' ? player1Name : player2Name}
                  serverId={currentRally.serverId}
                  receiverName={currentRally.serverId === 'player1' ? player2Name : player1Name}
                  shots={currentRally.shots}
                  endOfPointTime={currentRally.endOfPointTime || 0}
                  winnerId={currentRally.winnerId}
                  winnerName={currentRally.winnerId === 'player1' ? player1Name : currentRally.winnerId === 'player2' ? player2Name : undefined}
                  pointEndType={currentRally.pointEndType}
                  currentVideoTime={currentTime}
                  player1Name={player1Name}
                  player2Name={player2Name}
                  onEndTimeNudge={(direction) => {
                    if (currentRally) {
                      const frameMs = 1000 / 30 // 30fps
                      const newTime = (currentRally.endOfPointTime || 0) + (direction === 'later' ? frameMs : -frameMs) / 1000
                      updateEndOfPointTime(currentRally.id, newTime)
                    }
                  }}
                  onConfirm={() => {
                    confirmRallyReview()
                    // Seek to next rally if available
                    const nextRally = rallies[activeRallyIndex + 1]
                    if (nextRally && nextRally.shots.length > 0) {
                      videoRef.current?.seek(nextRally.shots[0].time)
                      videoRef.current?.play()
                    }
                  }}
                />
              ) : isEndOfRallyStep && currentRally ? (
                /* End of Rally step (transitional - winner/forced-unforced selection) */
                <EndOfRallySection
                  rallyIndex={activeRallyIndex}
                  totalRallies={rallies.length}
                  player1Name={player1Name}
                  player2Name={player2Name}
                  lastShotPlayerId={currentShot?.playerId || (activeShotIndex % 2 === 1 ? currentRally.serverId : currentRally.receiverId)}
                  lastShotQuality={currentShot?.shotQuality}
                  endOfPointTime={currentRally.endOfPointTime || currentShot?.time || 0}
                  derivedWinnerId={endOfRallyWinner || undefined}
                  derivedPointEndType={endOfRallyEndType || undefined}
                  needsWinnerSelection={!endOfRallyWinner}
                  needsForcedUnforced={!!pendingErrorData && !endOfRallyEndType}
                  onEndOfPointTimeChange={handleEndOfRallyTimeChange}
                  onWinnerSelect={handleEndOfRallyWinnerSelect}
                  onForcedUnforcedSelect={handleForcedUnforcedSelect}
                  onConfirm={handleEndOfRallyConfirm}
                  onStepFrame={handleEndOfRallyStepFrame}
                />
              ) : (
                /* Shot Questions */
                <ShotQuestionSection
                  isServe={activeShotIndex === 1}
                  isReturn={activeShotIndex === 2}
                  shotIndex={activeShotIndex}
                  currentStep={shotQuestionStep}
                  onServeTypeSelect={handleServeTypeSelect}
                  onSpinSelect={handleSpinSelect}
                  onLandingZoneSelect={handleLandingZoneSelect}
                  onQualitySelect={handleQualitySelect}
                  onWingSelect={handleWingSelect}
                  onShotTypeSelect={handleShotTypeSelect}
                />
              )}
              
              {/* Rally progress indicator + navigation */}
              <div className="mt-4 text-center text-sm text-neutral-400">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <button
                    onClick={() => goToPreviousShot()}
                    disabled={activeRallyIndex === 0 && activeShotIndex === 1}
                    className="px-3 py-1 text-xs bg-neutral-700 rounded hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span>
                    Rally {activeRallyIndex + 1} of {rallies.length} • 
                    Shot {activeShotIndex} of {currentRally.shots.length}
                  </span>
                  <button
                    onClick={() => advanceToNextShot()}
                    disabled={isLastShot}
                    className="px-3 py-1 text-xs bg-neutral-700 rounded hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
            
            {/* Speed Controls (right side) */}
            <div className="w-48 shrink-0">
              <Part2SpeedControlsSection
                loopSpeed={loopSpeed}
                previewBuffer={previewBufferSeconds}
                onLoopSpeedChange={setLoopSpeed}
                onPreviewBufferChange={setPreviewBuffer}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Winner Selection Modal */}
      {showWinnerDialog && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <WinnerSelectBlock
            player1Name={player1Name}
            player2Name={player2Name}
            onSelect={handleSelectWinner}
          />
        </div>
      )}
      
      {/* Match Completion Modal (Part 1 -> Part 2 transition) */}
      {localShowCompletionModal && (() => {
        // Calculate sets won by each player
        const player1SetsWon = sets.filter(s => s.winnerId === 'player1').length
        const player2SetsWon = sets.filter(s => s.winnerId === 'player2').length
        
        return (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <MatchCompletionModalBlock
              player1Name={player1Name}
              player2Name={player2Name}
              currentSetScore={`${player1SetsWon}-${player2SetsWon}`}  // Sets won
              currentPointsScore={`${player1Score}-${player2Score}`}  // Points in current set
              onSubmit={handleCompleteMatchFramework}
              onCancel={handleCloseCompletionModal}
            />
          </div>
        )
      })()}
      
      {/* Part 2 Completion Modal */}
      {taggingPhase === 'part2' && step2Complete && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <Part2CompletionBlock
            matchId={matchId || ''}
            player1Name={player1Name}
            player2Name={player2Name}
            ralliesTagged={rallies.length}
            onViewStats={handleViewStats}
            onBackToMatches={handleBackToMatches}
          />
        </div>
      )}
      
      {/* Auto-Prune Undo Toast */}
      {pruneToast && (
        <div className="fixed bottom-4 right-4 bg-warning text-black px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <span className="font-medium">Auto-removed {pruneToast.count} shot(s) after error</span>
          <button
            onClick={() => {
              undoLastPrune(pruneToast.rallyId)
              setPruneToast(null)
            }}
            className="ml-2 px-2 py-1 bg-black/20 rounded text-sm font-medium hover:bg-black/30"
          >
            Undo
          </button>
          <button 
            onClick={() => setPruneToast(null)} 
            className="text-black/60 hover:text-black"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}


