/**
 * RallyDetailComposer — Part 2 rally review orchestration
 * 
 * Per-rally review with shot tagging.
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import { useDeriveMatchPanel, useDerivePointDetailsTree, useDeriveRallyDetail } from '../derive'
import { MatchPanelSection } from '../sections/MatchPanelSection'
import { RallyDetailSection } from '../sections/RallyDetailSection'
import { VideoPlayer, type VideoPlayerHandle } from '@/components/tagging/VideoPlayer'
import { cn } from '@/lib/utils'

export interface RallyDetailComposerProps {
  className?: string
}

export function RallyDetailComposer({ className }: RallyDetailComposerProps) {
  const videoRef = useRef<VideoPlayerHandle>(null)
  const [selectedShotIndex, setSelectedShotIndex] = useState<number | null>(null)
  
  // Store state and actions
  const {
    nextReviewRally,
    prevReviewRally,
    setCurrentReviewRally,
    rallies,
    videoUrl,
    currentReviewRallyIndex,
  } = useTaggingStore()
  
  // Derived view models
  const matchPanel = useDeriveMatchPanel()
  const pointTree = useDerivePointDetailsTree()
  const rallyDetail = useDeriveRallyDetail()
  // const videoControls = useDeriveVideoControls() // Available for future use
  
  // Get current rally for constrained playback
  const currentRally = rallies[currentReviewRallyIndex]
  const constrainedPlayback = currentRally && currentRally.contacts.length > 0
    ? {
        enabled: true,
        startTime: currentRally.contacts[0].time,
        endTime: currentRally.endOfPointTime || currentRally.contacts[currentRally.contacts.length - 1].time,
        loopOnEnd: false,
      }
    : undefined
  
  // Action handlers
  const handleRallyClick = useCallback((rallyId: string) => {
    const index = rallies.findIndex(r => r.id === rallyId)
    if (index >= 0) {
      setCurrentReviewRally(index)
      setSelectedShotIndex(null)
    }
  }, [rallies, setCurrentReviewRally])
  
  const handleShotSelect = useCallback((shotIndex: number) => {
    setSelectedShotIndex(shotIndex)
    
    // Seek to shot time
    const shot = rallyDetail?.shots.find(s => s.shotIndex === shotIndex)
    if (shot) {
      videoRef.current?.seek(shot.time)
    }
  }, [rallyDetail])
  
  const handleShotPlay = useCallback((time: number) => {
    videoRef.current?.seek(time)
    videoRef.current?.play()
  }, [])
  
  const handlePrevRally = useCallback(() => {
    prevReviewRally()
    setSelectedShotIndex(null)
  }, [prevReviewRally])
  
  const handleNextRally = useCallback(() => {
    nextReviewRally()
    setSelectedShotIndex(null)
  }, [nextReviewRally])
  
  const handleCompleteRally = useCallback(() => {
    // For now, just move to next rally
    // TODO: Add shot tagging validation
    handleNextRally()
  }, [handleNextRally])
  
  // Seek to rally start when rally changes
  useEffect(() => {
    if (currentRally && currentRally.contacts.length > 0) {
      videoRef.current?.seek(currentRally.contacts[0].time)
    }
  }, [currentReviewRallyIndex, currentRally])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.code) {
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault()
            handlePrevRally()
          } else {
            e.preventDefault()
            videoRef.current?.stepFrame('backward')
          }
          break
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault()
            handleNextRally()
          } else {
            e.preventDefault()
            videoRef.current?.stepFrame('forward')
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (selectedShotIndex !== null && selectedShotIndex > 1) {
            handleShotSelect(selectedShotIndex - 1)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (rallyDetail && selectedShotIndex !== null && selectedShotIndex < rallyDetail.totalShots) {
            handleShotSelect(selectedShotIndex + 1)
          }
          break
        case 'Space':
          e.preventDefault()
          if (videoRef.current) {
            // Toggle play/pause
            const video = document.querySelector('video')
            if (video?.paused) {
              videoRef.current.play()
            } else {
              videoRef.current.pause()
            }
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedShotIndex, rallyDetail, handlePrevRally, handleNextRally, handleShotSelect])
  
  return (
    <div className={cn('flex h-full gap-4 p-4', className)}>
      {/* Left Panel - Match Info */}
      <div className="w-72 shrink-0">
        <MatchPanelSection
          matchPanel={matchPanel}
          pointTree={pointTree}
          onRallyClick={handleRallyClick}
        />
      </div>
      
      {/* Center - Video */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 bg-neutral-900 rounded-lg overflow-hidden">
          <VideoPlayer
            ref={videoRef}
            videoSrc={videoUrl || undefined}
            constrainedPlayback={constrainedPlayback}
            showTimeOverlay={true}
            compact={true}
          />
        </div>
        
        {/* Video info bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-neutral-800 rounded-lg text-sm">
          <span className="text-neutral-400">
            Rally {currentReviewRallyIndex + 1} of {rallies.length}
          </span>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>← → Frame step</span>
            <span>Shift+← → Rally nav</span>
            <span>↑ ↓ Shot nav</span>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Rally Detail */}
      <div className="w-80 shrink-0">
        <RallyDetailSection
          rally={rallyDetail}
          selectedShotIndex={selectedShotIndex}
          onShotSelect={handleShotSelect}
          onShotPlay={handleShotPlay}
          onPrevRally={handlePrevRally}
          onNextRally={handleNextRally}
          onCompleteRally={handleCompleteRally}
        />
      </div>
    </div>
  )
}

