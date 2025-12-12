/**
 * VideoControlsBar - Single-row compact controls for video playback
 * 
 * Fixed height bar with all video controls in a single horizontal row:
 * - Frame step buttons (backward/forward)
 * - Shot navigation buttons (Phase 1 only)
 * - Delete/Loop button (context-dependent)
 * - Play/Pause button
 * 
 * All buttons use consistent height for visual uniformity.
 * Speed settings moved to Status Bar.
 * Designed to sit between video player and status bar.
 */

import { SkipBack, SkipForward, ChevronLeft, ChevronRight, Repeat, Rewind, FastForward } from 'lucide-react'
import { cn } from '@/helpers/utils'
import { Button } from '@/ui-mine'

// Consistent button height across both bars
const BUTTON_HEIGHT = 'h-8'

export interface VideoControlsBarProps {
  // Playback controls
  isPlaying: boolean
  onTogglePlay: () => void
  
  // Frame stepping
  onFrameStepBack: () => void
  onFrameStepForward: () => void
  
  // Video seek (FF/Rewind)
  onRewind?: () => void  // Skip back 10 seconds
  onFastForward?: () => void  // Skip forward 10 seconds
  
  // Phase 1 specific: Shot navigation & delete
  showShotNavigation?: boolean
  canNavigateBack?: boolean
  canNavigateForward?: boolean
  onShotBack?: () => void
  onShotForward?: () => void
  canDelete?: boolean
  onDelete?: () => void
  
  // Phase 2 specific: Loop toggle
  showLoopToggle?: boolean
  loopEnabled?: boolean
  onToggleLoop?: () => void
  
  // Phase 2 specific: Rotate button (replaces shot navigation in column 3)
  showRotateButton?: boolean
  rotateEnabled?: boolean
  onRotate?: () => void
}

export function VideoControlsBar({
  isPlaying,
  onTogglePlay,
  onFrameStepBack,
  onFrameStepForward,
  onRewind,
  onFastForward,
  showShotNavigation = false,
  canNavigateBack = false,
  canNavigateForward = false,
  onShotBack,
  onShotForward,
  canDelete = false,
  onDelete,
  showLoopToggle = false,
  loopEnabled = false,
  onToggleLoop,
  showRotateButton = false,
  rotateEnabled = false,
  onRotate,
}: VideoControlsBarProps) {
  return (
    <div className="h-[48px] bg-neutral-900 border-t border-neutral-700 px-2 grid grid-cols-5 w-full">
      {/* Column 1: Frame Controls */}
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span className="text-[8px] text-neutral-500 font-medium uppercase tracking-wider leading-none">Frame</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            onClick={onFrameStepBack}
            className={cn("px-1.5 min-w-0", BUTTON_HEIGHT)}
            title="Frame back"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            onClick={onFrameStepForward}
            className={cn("px-1.5 min-w-0", BUTTON_HEIGHT)}
            title="Frame forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Column 2: Video Seek (FF/Rewind) */}
      {(onRewind || onFastForward) ? (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-[8px] text-neutral-500 font-medium uppercase tracking-wider leading-none">Seek</span>
          <div className="flex items-center gap-0.5">
            {onRewind && (
              <Button
                variant="ghost"
                onClick={onRewind}
                className={cn("px-1.5 min-w-0", BUTTON_HEIGHT)}
                title="Rewind 10 seconds"
              >
                <Rewind className="w-3.5 h-3.5" />
              </Button>
            )}
            {onFastForward && (
              <Button
                variant="ghost"
                onClick={onFastForward}
                className={cn("px-1.5 min-w-0", BUTTON_HEIGHT)}
                title="Fast forward 10 seconds"
              >
                <FastForward className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : <div />}
      
      {/* Column 3: Shot Navigation (Phase 1) or Rotate Button (Phase 2) */}
      {showShotNavigation ? (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-[8px] text-neutral-500 font-medium uppercase tracking-wider leading-none">Shot</span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              onClick={onShotBack}
              disabled={!canNavigateBack}
              className={cn("px-1.5 min-w-0", BUTTON_HEIGHT)}
              title="Previous shot"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={onShotForward}
              disabled={!canNavigateForward}
              className={cn("px-1.5 min-w-0", BUTTON_HEIGHT)}
              title="Next shot"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : showRotateButton && onRotate ? (
        <div className="flex items-center justify-center">
          <Button
            variant={rotateEnabled ? "primary" : "secondary"}
            onClick={onRotate}
            className={cn("px-2 text-xs", BUTTON_HEIGHT)}
            title="Rotate direction buttons 180°"
          >
            Rotate
          </Button>
        </div>
      ) : <div />}
      
      {/* Column 4: Delete Button (Phase 1) or Loop Toggle (Phase 2) */}
      <div className="flex items-center justify-center">
        {showShotNavigation && onDelete ? (
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={!canDelete}
            className={cn("px-2 text-xs", BUTTON_HEIGHT)}
            title="Delete last tag"
          >
            Delete Tag
          </Button>
        ) : showLoopToggle && onToggleLoop ? (
          <Button
            variant={loopEnabled ? "primary" : "secondary"}
            onClick={onToggleLoop}
            className={cn("gap-1 px-2 text-xs", BUTTON_HEIGHT)}
            title="Toggle loop"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loop</span>
          </Button>
        ) : <div />}
      </div>
      
      {/* Column 5: Play/Pause Button */}
      <div className="flex items-center justify-center">
        <Button
          variant="primary"
          onClick={onTogglePlay}
          className={cn("px-3 text-xs font-medium", BUTTON_HEIGHT)}
          title="Play/Pause (Space)"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </div>
    </div>
  )
}

