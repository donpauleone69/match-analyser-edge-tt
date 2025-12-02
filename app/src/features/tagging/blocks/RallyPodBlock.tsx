/**
 * RallyPodBlock — Compact rally indicator in point tree
 * 
 * Presentational component — props in, JSX out.
 */

import { cn } from '@/lib/utils'
import { Icon } from '@/ui-mine'
import type { PlayerId } from '@/rules/types'

export interface RallyPodBlockProps {
  rallyIndex: number
  isScoring: boolean
  winnerId?: PlayerId
  serverId: PlayerId
  scoreAfter: string
  shotCount: number
  isCurrentReview: boolean
  isHighlight: boolean
  hasError: boolean
  onClick?: () => void
  onDelete?: () => void
  className?: string
}

export function RallyPodBlock({
  rallyIndex,
  isScoring,
  winnerId,
  serverId,
  scoreAfter,
  shotCount,
  isCurrentReview,
  isHighlight,
  hasError,
  onClick,
  onDelete,
  className,
}: RallyPodBlockProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }
  
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1 rounded text-xs',
        'transition-all duration-150',
        'hover:bg-neutral-700',
        isCurrentReview && 'bg-brand-primary-muted border border-brand-primary',
        hasError && 'border border-danger',
        isHighlight && 'ring-1 ring-warning',
        !isCurrentReview && !hasError && 'bg-neutral-800',
        className
      )}
    >
      {/* Clickable content */}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 flex-1"
      >
        {/* Rally number */}
        <span className="font-mono text-neutral-400 w-6">
          {rallyIndex}
        </span>
        
        {/* Server indicator */}
        <span className={cn(
          'w-4 h-4 rounded-full flex items-center justify-center text-[10px]',
          serverId === 'player1' ? 'bg-info/20 text-info' : 'bg-warning/20 text-warning'
        )}>
          {serverId === 'player1' ? '1' : '2'}
        </span>
        
        {/* Shot count */}
        <span className="font-mono text-neutral-300">
          {shotCount} shots
        </span>
        
        {/* Score after */}
        <span className="font-mono text-neutral-400">
          {scoreAfter}
        </span>
        
        {/* Winner indicator */}
        {isScoring && winnerId && (
          <span className={cn(
            'px-1 rounded text-[10px] font-medium',
            winnerId === 'player1' ? 'bg-info/20 text-info' : 'bg-warning/20 text-warning'
          )}>
            P{winnerId === 'player1' ? '1' : '2'}
          </span>
        )}
        
        {/* Non-scoring indicator */}
        {!isScoring && (
          <span className="px-1 rounded text-[10px] font-medium bg-neutral-600 text-neutral-300">
            LET
          </span>
        )}
        
        {/* Error indicator */}
        {hasError && (
          <Icon name="alert" size="xs" className="text-danger" />
        )}
        
        {/* Highlight indicator */}
        {isHighlight && (
          <Icon name="star" size="xs" className="text-warning" />
        )}
      </button>
      
      {/* Delete button (hidden until hover) */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/20 text-neutral-500 hover:text-danger transition-all"
          title="Delete rally (Shift+Delete)"
        >
          <Icon name="trash" size="xs" />
        </button>
      )}
    </div>
  )
}


