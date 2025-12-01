/**
 * TaggingScreenComposer — Main tagging screen orchestration
 * 
 * Unified screen for both Part 1 (Match Framework) and Part 2 (Rally Detail).
 * Uses taggingPhase to determine which mode to render:
 * - 'setup': Show Match Details Modal (CRITICAL FIRST STEP)
 * - 'part1': Contact tagging mode
 * - 'part2': Sequential shot tagging mode
 * 
 * Composer component:
 * - Accesses stores
 * - Calls derive hooks
 * - Passes view models to sections
 * - Handles actions
 */

import { useCallback, useEffect, useRef } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import { 
  useDeriveMatchPanel, 
  useDerivePointDetailsTree,
  useDeriveVideoControls,
  useDeriveTaggingControls,
} from '../derive'
import { MatchPanelSection } from '../sections/MatchPanelSection'
import { TaggingControlsSection } from '../sections/TaggingControlsSection'
import { ShotQuestionSection } from '../sections/ShotQuestionSection'
import { WinnerSelectBlock } from '../blocks/WinnerSelectBlock'
import { MatchDetailsModalBlock, type MatchDetailsFormData } from '../blocks/MatchDetailsModalBlock'
import { VideoPlayer, type VideoPlayerHandle, type ConstrainedPlayback } from '@/components/tagging/VideoPlayer'
import { cn } from '@/lib/utils'
import type { PlayerId, ServeType, ServeSpin, ShotQuality, EssentialShotType } from '@/rules/types'

export interface TaggingScreenComposerProps {
  className?: string
}

export function TaggingScreenComposer({ className }: TaggingScreenComposerProps) {
  const videoRef = useRef<VideoPlayerHandle>(null)
  
  // Store state and actions
  const {
    addContact,
    endRallyScore,
    endRallyNoScore,
    undoLastContact,
    markEndOfSet,
    setPlaybackSpeed,
    setCurrentReviewRally,
    selectWinner,
    setVideoUrl,
    initMatchFramework,
    setTaggingPhase,
    advanceToNextShot,
    advanceToNextRally,
    setShotQuestionStep,
    rallies,
    showWinnerDialog,
    player1Name,
    player2Name,
    videoUrl,
    isPlaying,
    taggingMode,
    taggingPhase,
    currentTime,
    activeRallyIndex,
    activeShotIndex,
    shotQuestionStep,
  } = useTaggingStore()
  
  // Get current rally and shot for Part 2
  const currentRally = rallies[activeRallyIndex]
  const currentContact = currentRally?.contacts[activeShotIndex - 1]
  const nextContact = currentRally?.contacts[activeShotIndex]
  const isLastShot = currentRally && activeShotIndex >= currentRally.contacts.length
  
  // Calculate constrained playback for Part 2 (video loops within shot bounds)
  const constrainedPlayback: ConstrainedPlayback | undefined = 
    taggingPhase === 'part2' && currentContact
      ? {
          enabled: true,
          startTime: currentContact.time,
          endTime: nextContact 
            ? nextContact.time + 0.2 // Preview buffer
            : (currentRally?.endOfPointTime || currentContact.time + 1),
          loopOnEnd: !isLastShot, // Loop for shots, still frame for end-of-point
        }
      : undefined
  
  // Derived view models
  const matchPanel = useDeriveMatchPanel()
  const pointTree = useDerivePointDetailsTree()
  const videoControls = useDeriveVideoControls()
  const taggingControls = useDeriveTaggingControls()
  
  // Action handlers
  const handleContact = useCallback(() => {
    addContact()
  }, [addContact])
  
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
  
  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
  }, [setPlaybackSpeed])
  
  const handleRallyClick = useCallback((rallyId: string) => {
    // In Part 2, clicking rallies is disabled (sequential only)
    if (taggingPhase === 'part2') return
    
    const index = rallies.findIndex(r => r.id === rallyId)
    if (index >= 0) {
      setCurrentReviewRally(index)
    }
  }, [rallies, setCurrentReviewRally, taggingPhase])
  
  const handleShotClick = useCallback((_rallyId: string, _shotIndex: number) => {
    // In Part 2, clicking shots is disabled (sequential only per REQ-6)
    // This is intentionally a no-op - navigation is via Next/Prev only
  }, [])
  
  const handleSelectWinner = useCallback((winnerId: PlayerId) => {
    selectWinner(winnerId)
  }, [selectWinner])
  
  const handleVideoSelect = useCallback((url: string) => {
    setVideoUrl(url)
  }, [setVideoUrl])
  
  const handleMatchSetup = useCallback((data: MatchDetailsFormData) => {
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
      videoStartSetScore: data.videoStartSetScore,
      videoStartPointsScore: data.videoStartPointsScore,
      firstServeTimestamp: data.firstServeTimestamp,
    })
    
    // Seek video to first serve timestamp
    videoRef.current?.seek(data.firstServeTimestamp)
  }, [initMatchFramework])
  
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
  
  // Part 1 -> Part 2 transition
  const handleCompletePart1 = useCallback(() => {
    if (rallies.length === 0) return
    setTaggingPhase('part2')
  }, [rallies.length, setTaggingPhase])
  
  // Shot question handlers for Part 2
  const handleServeTypeSelect = useCallback((_type: ServeType) => {
    // Move to next question (spin)
    setShotQuestionStep(2)
  }, [setShotQuestionStep])
  
  const handleSpinSelect = useCallback((_spin: ServeSpin) => {
    // Move to next question (landing zone)
    setShotQuestionStep(3)
  }, [setShotQuestionStep])
  
  const handleLandingZoneSelect = useCallback((_zone: number) => {
    // Move to next question (quality)
    setShotQuestionStep(4)
  }, [setShotQuestionStep])
  
  const handleWingSelect = useCallback((_wing: 'forehand' | 'backhand') => {
    // Move to next question (shot type)
    setShotQuestionStep(2)
  }, [setShotQuestionStep])
  
  const handleShotTypeSelect = useCallback((_type: EssentialShotType) => {
    // Move to next question (landing zone)
    setShotQuestionStep(3)
  }, [setShotQuestionStep])
  
  const handleQualitySelect = useCallback((quality: ShotQuality) => {
    // Check if this is an error quality
    const isError = ['inNet', 'missedLong', 'missedWide'].includes(quality)
    
    if (isError && !isLastShot) {
      // Auto-prune subsequent contacts (REQ-10)
      // TODO: Implement autoPruneContacts action
      console.log('Auto-pruning subsequent contacts due to error')
    }
    
    // Move to next shot or complete rally
    if (isLastShot) {
      // This was the last shot, advance to next rally
      advanceToNextRally()
    } else {
      // Move to next shot
      advanceToNextShot()
    }
  }, [isLastShot, advanceToNextShot, advanceToNextRally])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (showWinnerDialog) {
            // Don't add contact while winner dialog is open
            return
          }
          // Space adds contact (video pauses automatically on contact)
          if (taggingControls.canAddContact) {
            handleContact()
          } else {
            // Toggle play/pause when no video or can't add contact
            handleTogglePlay()
          }
          break
        case 'Enter':
          e.preventDefault()
          if (taggingControls.canEndRally) {
            handleEndRallyScore()
          }
          break
        case 'KeyL':
          e.preventDefault()
          if (taggingControls.canEndRally) {
            handleEndRallyNoScore()
          }
          break
        case 'Backspace':
          e.preventDefault()
          if (taggingControls.canUndo) {
            handleUndo()
          }
          break
        case 'KeyS':
          if (e.shiftKey) {
            e.preventDefault()
            handleEndOfSet()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleStepFrame('backward')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleStepFrame('forward')
          break
        case 'Digit1':
        case 'Numpad1':
          if (showWinnerDialog) {
            e.preventDefault()
            handleSelectWinner('player1')
          }
          break
        case 'Digit2':
        case 'Numpad2':
          if (showWinnerDialog) {
            e.preventDefault()
            handleSelectWinner('player2')
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [taggingControls, handleContact, handleEndRallyScore, handleEndRallyNoScore, handleUndo, handleEndOfSet, showWinnerDialog, handleSelectWinner, handleTogglePlay, handleStepFrame])
  
  return (
    <div className={cn('flex h-full gap-4 p-4 relative', className)}>
      {/* Left Panel - Match Info */}
      <div className="w-80 shrink-0">
        <MatchPanelSection
          matchPanel={matchPanel}
          pointTree={pointTree}
          taggingPhase={taggingPhase}
          activeRallyIndex={activeRallyIndex}
          activeShotIndex={activeShotIndex}
          onRallyClick={handleRallyClick}
          onShotClick={handleShotClick}
        />
      </div>
      
      {/* Center - Video + Controls */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Video Player */}
        <div className={cn(
          'bg-neutral-900 rounded-lg overflow-hidden',
          taggingPhase === 'part2' ? 'h-[50%]' : 'flex-1'
        )}>
          <VideoPlayer
            ref={videoRef}
            videoSrc={videoUrl || undefined}
            onVideoSelect={handleVideoSelect}
            showTimeOverlay={true}
            constrainedPlayback={constrainedPlayback}
          />
        </div>
        
        {/* Part 1: Tagging Controls */}
        {taggingPhase === 'part1' && (
          <div className="shrink-0">
            <TaggingControlsSection
              controls={taggingControls}
              videoControls={videoControls}
              onContact={handleContact}
              onEndRallyScore={handleEndRallyScore}
              onEndRallyNoScore={handleEndRallyNoScore}
              onUndo={handleUndo}
              onEndOfSet={handleEndOfSet}
              onSpeedChange={handleSpeedChange}
            />
            
            {/* Complete Part 1 button */}
            {rallies.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleCompletePart1}
                  className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors"
                >
                  Complete Part 1 → Start Shot Tagging
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Part 2: Shot Questions */}
        {taggingPhase === 'part2' && currentRally && (
          <div className="flex-1 overflow-y-auto">
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
            
            {/* Rally progress indicator */}
            <div className="mt-4 text-center text-sm text-neutral-400">
              Rally {activeRallyIndex + 1} of {rallies.length} • 
              Shot {activeShotIndex} of {currentRally.contacts.length}
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
      
      {/* Match Setup Modal - Shows in 'setup' phase */}
      <MatchDetailsModalBlock
        isOpen={taggingPhase === 'setup'}
        currentVideoTime={currentTime}
        initialData={{
          player1Name,
          player2Name,
          taggingMode,
        }}
        onSubmit={handleMatchSetup}
      />
    </div>
  )
}

