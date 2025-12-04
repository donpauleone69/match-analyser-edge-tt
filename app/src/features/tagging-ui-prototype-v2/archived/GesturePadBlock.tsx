/**
 * GesturePadBlock — Gesture detection pad with rich per-zone gestures
 * 
 * Uses @use-gesture/react to detect tap, swipe, hold, hold+swipe, and double-tap on a 2x3 grid.
 * 
 * ARCHIVED: December 3, 2025 - Replaced with standard form controls
 */

import { useState, useRef } from 'react'
import { useDrag } from '@use-gesture/react'
import { cn } from '@/lib/utils'

export interface GesturePadBlockProps {
  onGestureDetected: (zone: number, gestureType: string, direction?: string) => void
  holdDurationMs?: number
  swipeThresholdPx?: number
  className?: string
}

const DOUBLE_TAP_WINDOW_MS = 300

export function GesturePadBlock({ 
  onGestureDetected, 
  holdDurationMs = 200,
  swipeThresholdPx = 50,
  className 
}: GesturePadBlockProps) {
  const [lastTap, setLastTap] = useState<{ zone: number; time: number } | null>(null)
  const startZoneRef = useRef<number | null>(null)
  const hasReportedHoldRef = useRef<boolean>(false)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isGestureActiveRef = useRef<boolean>(false)

  // Helper: determine which zone (1-6) was touched based on element
  const getZoneFromElement = (target: EventTarget | null): number | null => {
    if (!target || !(target instanceof HTMLElement)) return null
    const zoneEl = (target as HTMLElement).closest('[data-zone]')
    if (!zoneEl) return null
    return parseInt(zoneEl.getAttribute('data-zone') || '0', 10)
  }

  const bind = useDrag(({ down, movement: [mx, my], elapsedTime, event, first, last }) => {
    if (first) {
      // Store the starting zone and mark gesture as active
      const zone = getZoneFromElement(event?.target)
      startZoneRef.current = zone
      hasReportedHoldRef.current = false
      isGestureActiveRef.current = true

      // Start timer-based hold detection (independent of movement)
      if (zone !== null && zone >= 1 && zone <= 6) {
        holdTimerRef.current = setTimeout(() => {
          // Only log hold if gesture is still active and we haven't reported it yet
          if (isGestureActiveRef.current && !hasReportedHoldRef.current) {
            hasReportedHoldRef.current = true
            onGestureDetected(zone, 'hold')
          }
          holdTimerRef.current = null
        }, holdDurationMs)
      }
    }

    const zone = startZoneRef.current
    if (zone === null || zone < 1 || zone > 6) return

    const movementMagnitude = Math.sqrt(mx * mx + my * my)
    const isSwipe = movementMagnitude > swipeThresholdPx

    // If movement exceeds swipe threshold, cancel the hold timer (this will become a swipe)
    if (isSwipe && holdTimerRef.current && !hasReportedHoldRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    // On release, classify the gesture
    if (last && !down) {
      isGestureActiveRef.current = false
      
      // Cancel hold timer if still running
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }

      const isHold = hasReportedHoldRef.current
      
      if (isHold && isSwipe) {
        // Hold + swipe: log swipe with direction (hold was already logged by timer)
        const direction = getSwipeDirection(mx, my)
        onGestureDetected(zone, 'swipe', direction)
      } else if (isHold && !isSwipe) {
        // Hold only - already reported by timer, no additional action
      } else if (!isHold && isSwipe) {
        // Quick swipe: log tap then swipe
        onGestureDetected(zone, 'tap')
        const direction = getSwipeDirection(mx, my)
        onGestureDetected(zone, 'swipe', direction)
      } else {
        // Tap (no hold, no swipe) - check for double-tap
        const now = Date.now()
        if (lastTap && lastTap.zone === zone && (now - lastTap.time) < DOUBLE_TAP_WINDOW_MS) {
          // Double-tap detected: cancel pending tap and log double-tap only
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current)
            tapTimeoutRef.current = null
          }
          onGestureDetected(zone, 'double-tap')
          setLastTap(null) // Reset to avoid triple-tap
        } else {
          // Single tap: delay logging to allow double-tap detection
          setLastTap({ zone, time: now })
          tapTimeoutRef.current = setTimeout(() => {
            onGestureDetected(zone, 'tap')
            tapTimeoutRef.current = null
          }, DOUBLE_TAP_WINDOW_MS)
        }
      }
      
      // Clear refs
      startZoneRef.current = null
      hasReportedHoldRef.current = false
    }
  })

  const getSwipeDirection = (mx: number, my: number): string => {
    if (Math.abs(mx) > Math.abs(my)) {
      return mx > 0 ? 'right' : 'left'
    } else {
      return my > 0 ? 'down' : 'up'
    }
  }

  return (
    <div className={cn('w-full max-w-md flex flex-col gap-2', className)}>
      {/* Column labels (above the grid) */}
      <div className="flex gap-2">
        <div className="w-24" /> {/* Spacer for row labels */}
        <div className="flex-1 text-center font-semibold text-neutral-50 text-sm">
          BH
        </div>
        <div className="flex-1 text-center font-semibold text-neutral-50 text-sm">
          FH
        </div>
      </div>

      {/* Main grid with row labels on the left */}
      <div className="flex gap-2">
        {/* Row labels (left side) */}
        <div className="flex flex-col gap-0 w-24">
          <div className="flex-1 flex items-center justify-center font-semibold text-neutral-50 text-sm">
            Aggressive
          </div>
          <div className="flex-1 flex items-center justify-center font-semibold text-neutral-50 text-sm border-t border-neutral-700 pt-1">
            Neutral
          </div>
          <div className="flex-1 flex items-center justify-center font-semibold text-neutral-50 text-sm border-t border-neutral-700 pt-1">
            Passive
          </div>
        </div>

        {/* Touch zones grid */}
        <div
          {...bind()}
          className="flex-1 grid grid-cols-2 grid-rows-3 border-2 border-neutral-50 select-none"
          style={{ touchAction: 'none' }}
        >
          {/* Zone 1: BH Aggressive */}
          <div 
            data-zone="1"
            className="flex items-center justify-center p-8 bg-neutral-700 hover:bg-neutral-600 transition-colors cursor-pointer"
          >
            <span className="text-neutral-400 text-lg pointer-events-none">1</span>
          </div>

          {/* Zone 2: FH Aggressive */}
          <div 
            data-zone="2"
            className="flex items-center justify-center p-8 bg-neutral-700 hover:bg-neutral-600 border-l border-neutral-50 transition-colors cursor-pointer"
          >
            <span className="text-neutral-400 text-lg pointer-events-none">2</span>
          </div>

          {/* Zone 3: BH Neutral */}
          <div 
            data-zone="3"
            className="flex items-center justify-center p-8 bg-neutral-700 hover:bg-neutral-600 border-t border-neutral-50 transition-colors cursor-pointer"
          >
            <span className="text-neutral-400 text-lg pointer-events-none">3</span>
          </div>

          {/* Zone 4: FH Neutral */}
          <div 
            data-zone="4"
            className="flex items-center justify-center p-8 bg-neutral-700 hover:bg-neutral-600 border-l border-t border-neutral-50 transition-colors cursor-pointer"
          >
            <span className="text-neutral-400 text-lg pointer-events-none">4</span>
          </div>

          {/* Zone 5: BH Passive */}
          <div 
            data-zone="5"
            className="flex items-center justify-center p-8 bg-neutral-700 hover:bg-neutral-600 border-t border-neutral-50 transition-colors cursor-pointer"
          >
            <span className="text-neutral-400 text-lg pointer-events-none">5</span>
          </div>

          {/* Zone 6: FH Passive */}
          <div 
            data-zone="6"
            className="flex items-center justify-center p-8 bg-neutral-700 hover:bg-neutral-600 border-l border-t border-neutral-50 transition-colors cursor-pointer"
          >
            <span className="text-neutral-400 text-lg pointer-events-none">6</span>
          </div>
        </div>
      </div>
    </div>
  )
}


