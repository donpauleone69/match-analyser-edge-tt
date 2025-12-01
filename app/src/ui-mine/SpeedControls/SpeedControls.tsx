/**
 * SpeedControls — Video playback speed selector
 * 
 * Provides preset speeds for different tagging phases:
 * - Tagging: 0.25x, 0.5x, 0.75x, 1x
 * - FF (Fast Forward): 1.5x, 2x, 4x
 * - Loop preview speeds
 */

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SpeedControlsProps {
  /** Current playback speed */
  value: number
  /** Speed change handler */
  onChange: (speed: number) => void
  /** Show tagging presets (slower speeds) */
  showTaggingPresets?: boolean
  /** Show fast-forward presets */
  showFFPresets?: boolean
  /** Disable interaction */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Compact mode (smaller buttons) */
  compact?: boolean
}

// Speed presets
const TAGGING_SPEEDS = [0.25, 0.5, 0.75, 1]
const FF_SPEEDS = [1.5, 2, 4]

const formatSpeed = (speed: number): string => {
  if (speed === 1) return '1×'
  if (speed < 1) return `${speed}×`
  return `${speed}×`
}

const SpeedControls = forwardRef<HTMLDivElement, SpeedControlsProps>(
  ({ 
    value, 
    onChange, 
    showTaggingPresets = true, 
    showFFPresets = true, 
    disabled = false, 
    className,
    compact = false,
  }, ref) => {
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-1',
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        role="radiogroup"
        aria-label="Playback speed"
      >
        {showTaggingPresets && (
          <>
            <span className="text-xs text-neutral-400 mr-1">Tag:</span>
            {TAGGING_SPEEDS.map(speed => (
              <SpeedButton
                key={speed}
                speed={speed}
                isSelected={value === speed}
                onClick={() => onChange(speed)}
                compact={compact}
                disabled={disabled}
              />
            ))}
          </>
        )}
        
        {showTaggingPresets && showFFPresets && (
          <div className="w-px h-6 bg-neutral-600 mx-2" />
        )}
        
        {showFFPresets && (
          <>
            <span className="text-xs text-neutral-400 mr-1">FF:</span>
            {FF_SPEEDS.map(speed => (
              <SpeedButton
                key={speed}
                speed={speed}
                isSelected={value === speed}
                onClick={() => onChange(speed)}
                compact={compact}
                disabled={disabled}
              />
            ))}
          </>
        )}
      </div>
    )
  }
)

SpeedControls.displayName = 'SpeedControls'

// Speed button sub-component
interface SpeedButtonProps {
  speed: number
  isSelected: boolean
  onClick: () => void
  compact?: boolean
  disabled?: boolean
}

function SpeedButton({ speed, isSelected, onClick, compact, disabled }: SpeedButtonProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded font-mono text-xs font-medium',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 focus:ring-offset-neutral-800',
        compact ? 'px-2 py-1' : 'px-3 py-1.5',
        isSelected
          ? 'bg-brand-primary text-white'
          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 hover:text-neutral-100'
      )}
    >
      {formatSpeed(speed)}
    </button>
  )
}

export { SpeedControls, TAGGING_SPEEDS, FF_SPEEDS, formatSpeed }

