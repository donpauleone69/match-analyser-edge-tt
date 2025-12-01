/**
 * TaggingScreenComposer — Main tagging screen orchestration
 * 
 * Composer component:
 * - Accesses stores
 * - Calls derive hooks
 * - Passes view models to sections
 * - Handles actions
 */

import { useCallback, useEffect } from 'react'
import { useTaggingStore } from '@/stores/taggingStore'
import { 
  useDeriveMatchPanel, 
  useDerivePointDetailsTree,
  useDeriveVideoControls,
  useDeriveTaggingControls,
} from '../derive'
import { MatchPanelSection } from '../sections/MatchPanelSection'
import { TaggingControlsSection } from '../sections/TaggingControlsSection'
import { cn } from '@/lib/utils'

export interface TaggingScreenComposerProps {
  className?: string
}

export function TaggingScreenComposer({ className }: TaggingScreenComposerProps) {
  // Store actions
  const {
    addContact,
    endRallyScore,
    endRallyNoScore,
    undoLastContact,
    markEndOfSet,
    setPlaybackSpeed,
    setCurrentReviewRally,
    rallies,
  } = useTaggingStore()
  
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
          if (taggingControls.canAddContact) {
            handleContact()
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
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [taggingControls, handleContact, handleEndRallyScore, handleEndRallyNoScore, handleUndo, handleEndOfSet])
  
  return (
    <div className={cn('flex h-full gap-4 p-4', className)}>
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
        {/* Video Player Area (placeholder for now) */}
        <div className="flex-1 bg-neutral-900 rounded-lg flex items-center justify-center">
          <span className="text-neutral-500">Video Player Area</span>
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
      
      {/* Right Panel - Timeline/Preview (optional) */}
      {/* <div className="w-64 shrink-0">
        <TimelineSection />
      </div> */}
    </div>
  )
}

