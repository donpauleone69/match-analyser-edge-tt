/**
 * SpeedSettingsButton - Compact speed indicator with settings access
 * 
 * Shows current speed mode (Tag/FF/Normal) with speed value.
 * Click to open speed settings modal.
 */

import { Icon } from '@/ui-mine/Icon'
import { cn } from '@/helpers/utils'

export interface SpeedSettingsButtonProps {
  currentSpeedMode: 'normal' | 'tag' | 'ff'
  speedValue: number
  onClick: () => void
  className?: string
  compact?: boolean
}

export function SpeedSettingsButton({ 
  currentSpeedMode, 
  speedValue, 
  onClick,
  className,
  compact = false,
}: SpeedSettingsButtonProps) {
  // Map mode to display label
  const modeLabel = {
    tag: 'Tag',
    ff: 'FF',
    normal: 'Norm',
  }[currentSpeedMode]
  
  // Map mode to color
  const modeColor = {
    tag: 'text-success',
    ff: 'text-warning',
    normal: 'text-neutral-300',
  }[currentSpeedMode]
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all',
        'bg-black/90 border border-neutral-600 hover:bg-black hover:border-neutral-500',
        'touch-manipulation',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
      title="Click to configure speed settings"
      style={{ minHeight: '44px' }} // Touch-friendly
    >
      <span className={cn('font-medium', modeColor)}>
        {modeLabel}
      </span>
      <span className="font-mono font-semibold text-white">
        {speedValue}×
      </span>
      <Icon name="settings" className="w-3.5 h-3.5 text-neutral-400" />
    </button>
  )
}


