/**
 * TaggingUIPrototypeComposer — Gesture-based tagging UI prototype
 * 
 * Experimental interface using hold-then-swipe gestures on a grid pad.
 * 
 * ARCHIVED: December 3, 2025 - Replaced with standard form controls
 */

import { useState } from 'react'
import { cn } from '@/helpers/utils'
import { GesturePadBlock } from './GesturePadBlock'
import { VideoPlayer } from '@/ui-mine/VideoPlayer'

export interface TaggingUIPrototypeComposerProps {
  className?: string
}

interface GestureEvent {
  id: string
  timestamp: string
  zone: number
  gestureType: string
  direction?: string
}

const MAX_LOG_ENTRIES = 50

export function TaggingUIPrototypeComposer({ className }: TaggingUIPrototypeComposerProps) {
  const [logEvents, setLogEvents] = useState<GestureEvent[]>([])
  // Fixed parameters - tuned for optimal gesture detection
  const holdDuration = 300
  const swipeThreshold = 30

  const handleGestureDetected = (zone: number, gestureType: string, direction?: string) => {
    const newEvent: GestureEvent = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      zone,
      gestureType,
      direction,
    }
    
    setLogEvents(prev => [newEvent, ...prev].slice(0, MAX_LOG_ENTRIES))
  }

  return (
    <div className={cn('h-dvh overflow-hidden flex flex-col bg-bg-surface', className)}>
      {/* Zone 1: Video Player - Top (takes remaining space) */}
      <div className="flex-1 min-h-0">
        <VideoPlayer showTimeOverlay />
      </div>
      
      {/* Zone 2: Latest Gesture Strip - Middle (thin status bar) */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-3 py-1.5">
        <div className="flex items-center justify-between text-xs">
          {logEvents.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-neutral-500">Latest:</span>
              <span className="font-semibold text-brand-primary">Z{logEvents[0].zone}</span>
              <span className="text-neutral-300">
                {logEvents[0].gestureType}
                {logEvents[0].direction && ` (${logEvents[0].direction})`}
              </span>
            </div>
          ) : (
            <span className="text-neutral-500">No gestures yet</span>
          )}
          <button
            onClick={() => setLogEvents([])}
            className="px-2 py-0.5 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Zone 3: Gesture Pad - Bottom (compact, finger-friendly) */}
      <div className="shrink-0 flex items-stretch justify-center px-3 py-2 sm:px-4 sm:py-3 min-h-[200px] sm:min-h-[240px] md:min-h-[260px]">
        <GesturePadBlock 
          onGestureDetected={handleGestureDetected}
          holdDurationMs={holdDuration}
          swipeThresholdPx={swipeThreshold}
        />
      </div>
    </div>
  )
}


