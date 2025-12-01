/**
 * TaggingScreenComposer — Main tagging screen orchestration
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
  useDeriveMatchPanel, 
  useDerivePointDetailsTree,
  useDeriveVideoControls,
  useDeriveTaggingControls,
} from '../derive'
import { MatchPanelSection } from '../sections/MatchPanelSection'
import { TaggingControlsSection } from '../sections/TaggingControlsSection'
import { WinnerSelectBlock } from '../blocks/WinnerSelectBlock'
import { MatchDetailsModalBlock, type MatchDetailsFormData } from '../blocks/MatchDetailsModalBlock'
import { VideoPlayer, type VideoPlayerHandle } from '@/components/tagging/VideoPlayer'
import { cn } from '@/lib/utils'
import type { PlayerId } from '@/rules/types'

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
    setIsPlaying,
    initMatch,
    setMatchDetails,
    rallies,
    showWinnerDialog,
    showMatchDetailsModal,
    player1Name,
    player2Name,
    videoUrl,
    isPlaying,
    matchId,
    taggingMode,
  } = useTaggingStore()
  
  // Show setup modal when explicitly requested (for editing match details)
  const [showSetupModal, setShowSetupModal] = useState(false)
  
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
    const index = rallies.findIndex(r => r.id === rallyId)
    if (index >= 0) {
      setCurrentReviewRally(index)
    }
  }, [rallies, setCurrentReviewRally])
  
  const handleSelectWinner = useCallback((winnerId: PlayerId) => {
    selectWinner(winnerId)
  }, [selectWinner])
  
  const handleVideoSelect = useCallback((url: string) => {
    setVideoUrl(url)
  }, [setVideoUrl])
  
  const handleMatchSetup = useCallback((data: MatchDetailsFormData) => {
    // Initialize match with form data
    initMatch(data.player1Name, data.player2Name, data.firstServerId, null)
    setMatchDetails({
      matchDate: data.matchDate,
      videoStartSetScore: data.videoStartSetScore,
      videoStartPointsScore: data.videoStartPointsScore,
      firstServeTimestamp: 0,
      taggingMode: data.taggingMode,
    })
    setShowSetupModal(false)
  }, [initMatch, setMatchDetails])
  
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
          onRallyClick={handleRallyClick}
        />
      </div>
      
      {/* Center - Video + Controls */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Video Player */}
        <div className="flex-1 bg-neutral-900 rounded-lg overflow-hidden">
          <VideoPlayer
            ref={videoRef}
            videoSrc={videoUrl || undefined}
            onVideoSelect={handleVideoSelect}
            showTimeOverlay={true}
          />
        </div>
        
        {/* Tagging Controls */}
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
        </div>
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
      
      {/* Match Setup Modal */}
      <MatchDetailsModalBlock
        isOpen={showSetupModal || showMatchDetailsModal}
        initialData={{
          player1Name,
          player2Name,
          taggingMode,
        }}
        onSubmit={handleMatchSetup}
        onCancel={matchId ? () => setShowSetupModal(false) : undefined}
      />
    </div>
  )
}

