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
  isActive?: boolean  // Active tag (navigated to in Phase 1)
  playerColor?: 'player1' | 'player2'  // Player color for visual feedback
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
  isActive,
  playerColor,
  details,
  className
}: ShotListItemProps) {
  const typeLabel = shotType === 'serve' ? 'Serve' : shotType === 'receive' ? 'Receive' : 'Shot'
  
  return (
    <div className={cn(
      'space-y-0.5 py-1.5 px-2 -mx-2 rounded transition-all duration-200',
      // Active tag highlighting
      isActive && playerColor === 'player1' && 'border-l-4 border-blue-500 bg-blue-500/10 pl-1',
      isActive && playerColor === 'player2' && 'border-l-4 border-orange-500 bg-orange-500/10 pl-1',
      className
    )}>
      {/* Shot main info */}
      <div className="flex items-center gap-2 text-sm">
        {/* Player color dot */}
        <div className={cn(
          'rounded-full transition-all duration-200',
          playerColor === 'player1' && 'bg-blue-500',
          playerColor === 'player2' && 'bg-orange-500',
          !playerColor && 'bg-neutral-600',
          // Size varies by state
          isActive ? 'w-3 h-3' : 'w-2 h-2',
          isActive && playerColor === 'player1' && 'shadow-md shadow-blue-500/50',
          isActive && playerColor === 'player2' && 'shadow-md shadow-orange-500/50'
        )} />
        
        <span className="font-mono text-xs text-neutral-600">#{shotNumber}</span>
        <span className={cn('text-xs', isCompleted ? 'text-neutral-400' : 'text-neutral-600')}>
          {typeLabel}
        </span>
        <span className={cn(
          'text-xs font-medium',
          playerColor === 'player1' && 'text-blue-400',
          playerColor === 'player2' && 'text-orange-400',
          !playerColor && 'text-neutral-300'
        )}>{playerName}</span>
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




