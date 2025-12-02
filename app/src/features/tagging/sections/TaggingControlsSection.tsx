/**
 * TaggingControlsSection — Main tagging controls for Part 1
 * 
 * Split layout per spec:
 * - Left: Tagging buttons (Contact, End Rally, Let, Undo, End Set)
 * - Right: Speed controls (both Tag and FF speeds always visible)
 */

import { cn } from '@/lib/utils'
import { Button, Icon, Card } from '@/ui-mine'
import { ContactButtonBlock } from '../blocks/ContactButtonBlock'
import type { TaggingControlsVM, VideoControlsVM } from '../models'

// Speed presets per spec
const TAGGING_SPEEDS = [0.125, 0.25, 0.5, 0.75, 1]
const FF_SPEEDS = [0.5, 1, 2, 3, 4, 5]

export interface TaggingControlsSectionProps {
  controls: TaggingControlsVM
  videoControls: VideoControlsVM
  isInFFMode?: boolean
  taggingSpeed?: number
  ffSpeed?: number
  onContact: () => void
  onEndRallyScore: () => void
  onEndRallyNoScore: () => void
  onUndo: () => void
  onEndOfSet: () => void
  onTaggingSpeedChange?: (speed: number) => void
  onFFSpeedChange?: (speed: number) => void
  // Legacy prop for backwards compatibility
  onSpeedChange?: (speed: number) => void
  className?: string
}

export function TaggingControlsSection({
  controls,
  videoControls,
  isInFFMode = false,
  taggingSpeed = 0.5,
  ffSpeed = 1,
  onContact,
  onEndRallyScore,
  onEndRallyNoScore,
  onUndo,
  onEndOfSet,
  onTaggingSpeedChange,
  onFFSpeedChange,
  onSpeedChange,
  className,
}: TaggingControlsSectionProps) {
  // Handle speed change for either mode
  const handleTaggingSpeed = (speed: number) => {
    if (onTaggingSpeedChange) {
      onTaggingSpeedChange(speed)
    } else if (onSpeedChange) {
      onSpeedChange(speed)
    }
  }
  
  const handleFFSpeed = (speed: number) => {
    if (onFFSpeedChange) {
      onFFSpeedChange(speed)
    } else if (onSpeedChange) {
      onSpeedChange(speed)
    }
  }
  
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex gap-6">
        {/* Left Column: Tagging Buttons */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Main Contact Button */}
          <div className="flex justify-center">
            <ContactButtonBlock
              onClick={onContact}
              disabled={!controls.canAddContact}
              contactCount={controls.currentRallyContactCount}
            />
          </div>
          
          {/* Rally End Buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="success"
              size="md"
              onClick={onEndRallyScore}
              disabled={!controls.canEndRally}
              shortcut="→"
            >
              <Icon name="check" size="sm" />
              End Rally
            </Button>
            
            <Button
              variant="secondary"
              size="md"
              onClick={onEndRallyNoScore}
              disabled={!controls.canEndRally}
              shortcut="L"
            >
              Let
            </Button>
          </div>
          
          {/* Secondary Actions */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!controls.canUndo}
              shortcut="⌫"
            >
              <Icon name="rotate-ccw" size="sm" />
              Undo
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onEndOfSet}
              disabled={!controls.canEndSet}
              shortcut="E"
              title={controls.canEndSet ? 'Mark end of set' : 'End current rally first'}
            >
              <Icon name="flag" size="sm" />
              End Set
            </Button>
          </div>
        </div>
        
        {/* Divider */}
        <div className="w-px bg-neutral-700" />
        
        {/* Right Column: Speed Controls */}
        <div className="w-48 flex flex-col gap-3">
          {/* Tagging Speed */}
          <div>
            <label className={cn(
              'block text-xs font-medium mb-2',
              !isInFFMode ? 'text-brand-primary' : 'text-neutral-400'
            )}>
              Tag Speed {!isInFFMode && '(active)'}
            </label>
            <div className="flex flex-wrap gap-1">
              {TAGGING_SPEEDS.map(speed => (
                <SpeedButton
                  key={speed}
                  speed={speed}
                  isActive={taggingSpeed === speed}
                  isCurrentMode={!isInFFMode}
                  onClick={() => handleTaggingSpeed(speed)}
                />
              ))}
            </div>
          </div>
          
          {/* FF Speed */}
          <div>
            <label className={cn(
              'block text-xs font-medium mb-2',
              isInFFMode ? 'text-warning' : 'text-neutral-400'
            )}>
              FF Speed {isInFFMode && '(active)'}
            </label>
            <div className="flex flex-wrap gap-1">
              {FF_SPEEDS.map(speed => (
                <SpeedButton
                  key={speed}
                  speed={speed}
                  isActive={ffSpeed === speed}
                  isCurrentMode={isInFFMode}
                  onClick={() => handleFFSpeed(speed)}
                  variant="ff"
                />
              ))}
            </div>
          </div>
          
          {/* Help text */}
          <div className="text-[10px] text-neutral-500 leading-tight">
            <p>← → Arrow keys adjust FF speed</p>
            <p>K to play/pause</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Speed button sub-component
interface SpeedButtonProps {
  speed: number
  isActive: boolean
  isCurrentMode: boolean
  onClick: () => void
  variant?: 'tag' | 'ff'
}

function SpeedButton({ speed, isActive, isCurrentMode, onClick, variant = 'tag' }: SpeedButtonProps) {
  const formatSpeed = (s: number) => {
    if (s < 1) return `.${String(s).split('.')[1]}`
    return `${s}x`
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded text-xs font-mono transition-all',
        isActive && isCurrentMode
          ? variant === 'ff'
            ? 'bg-warning text-black font-bold'
            : 'bg-brand-primary text-white font-bold'
          : isActive
            ? 'bg-neutral-600 text-neutral-200'
            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
      )}
    >
      {formatSpeed(speed)}
    </button>
  )
}
