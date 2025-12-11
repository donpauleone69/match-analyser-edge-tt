/**
 * ShotListItem - Standard shot display item
 * 
 * Displays shot information with adaptive detail level:
 * - Phase 1: Basic info (shot type, player, timestamp)
 * - Phase 2: + detailed tagging data (stroke, direction, intent, etc.)
 * - Phase 3: + inferred data
 * 
 * Details array allows flexible data display without changing component.
 */

import { cn } from '@/helpers/utils'

export type ShotType = 'serve' | 'receive' | 'shot'

export interface ShotListItemProps {
  shotNumber: number
  shotType: ShotType
  playerName: string
  timestamp: number
  isError?: boolean
  isCurrent?: boolean  // Currently being tagged (Phase 2)
  isCompleted?: boolean  // Already tagged (Phase 2)
  isEnding?: boolean  // Last shot of rally (Phase 1)
  details?: string[]  // Array of detail strings like ["BH", "left→mid", "aggressive"]
  className?: string
}

export function ShotListItem({
  shotNumber,
  shotType,
  playerName,
  timestamp,
  isError,
  isCurrent,
  isCompleted,
  isEnding,
  details,
  className
}: ShotListItemProps) {
  const typeLabel = shotType === 'serve' ? 'Serve' : shotType === 'receive' ? 'Receive' : 'Shot'
  
  return (
    <div className={cn('space-y-0.5', className)}>
      {/* Shot main info */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs text-neutral-600">#{shotNumber}</span>
        <span className={cn('text-xs', isCompleted ? 'text-neutral-400' : 'text-neutral-600')}>
          {typeLabel}
        </span>
        <span className="text-xs text-neutral-300 font-medium">{playerName}</span>
        {isError && <span className="text-xs text-danger">(error)</span>}
        {isEnding && <span className="text-xs text-neutral-500">(ending shot)</span>}
        <span className="ml-auto font-mono text-xs text-neutral-600">{timestamp.toFixed(2)}s</span>
        {isCurrent && <span className="text-xs text-brand-primary font-medium ml-2">←</span>}
      </div>
      
      {/* Shot details (if available) */}
      {details && details.length > 0 && (
        <div className="pl-8 text-xs text-neutral-500">
          {details.join(' • ')}
        </div>
      )}
    </div>
  )
}


